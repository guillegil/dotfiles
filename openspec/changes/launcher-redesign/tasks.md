---
source: engram
topic_key: sdd/launcher-redesign/tasks
exported_at: 2026-05-29
notes: |
  Hybrid artifact — persisted in engram (topic sdd/launcher-redesign/tasks) and
  mirrored here for git history. Engram copy is authoritative for in-session use.
---

# Tasks: launcher-redesign — Spotlight-class AGS Launcher

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Slice 1 estimated changed lines | ~410 |
| Slice 2 estimated changed lines | ~180 |
| Total estimated changed lines | ~590 |
| Files touched — Slice 1 | 3 (2 new, 1 modified) |
| Files touched — Slice 2 | 2 (both already touched in Slice 1) |
| 400-line budget risk | Slice 1: Borderline (~410); Slice 2: Low (~180) |
| Chained PRs recommended | Informational — already locked as 2-slice, commit-to-main each |
| Suggested split | Slice 1 → smoke-test → commit; Slice 2 → smoke-test → commit |
| Delivery strategy | ask-on-risk (locked; 2-slice already chosen) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (2-slice delivery already locked by user).
Slice 1 is borderline at ~410 lines; if it feels risky, extract `lib/calc.ts`
(~120 lines, no widget deps) as a standalone micro-commit before the main Slice 1
commit — both still target `main` in order.

### Work Units

| Unit | Goal | Commit target | Deps |
|------|------|---------------|------|
| Slice 1 | libs (calc + history) + Launcher rewrite + SCSS Core UX | main | none |
| Slice 2 | app grid additions to Launcher.tsx + SCSS grid classes | main | Slice 1 |

---

## Cross-cutting Notes

- **No test runner** — AGS TSX widgets are verified by `ags run` + manual observation
  (Standard Mode). All verification tasks are manual smoke-tests.
- `app.ts` and `LauncherPill.tsx` are UNCHANGED (ADR-9). Zero wiring changes needed.
- `lib/calc.ts` and `lib/launcher-history.ts` are pure modules (no JSX, no Gtk import);
  they MUST be completed before Launcher.tsx imports them (tasks 1.1–1.2 before 1.3).
- CSS is additive only — new classes appended to `config/ags/style/_widgets.scss`.
  No existing class is modified or removed.
- `selectedIdx` clamp lives in ONE place (a subscription on `results`) — this is the
  spec-mandated single clamping site. Arrow handlers also clamp on move. Do not add
  a second clamping location.

---

## Slice 1 — Core UX

*Satisfies: REQ-CL-01..03, REQ-LH-01..04, REQ-LR-01..08, REQ-A11Y-LR-01..03*
*ADRs: ADR-1, ADR-2, ADR-3, ADR-4, ADR-5, ADR-7, ADR-8*

### Phase 1a: Pure libs (no widget deps — build these first)

- [x] **1.1** Create `config/ags/lib/calc.ts` — tokenizer + recursive-descent parser +
  eval pipeline. **medium** (~120 lines)
  - Exports: `type CalcResult = { value: number; expr: string; label?: string }` and
    `evaluate(input: string): CalcResult | null`.
  - Grammar: `expr → term ((+|-) term)*`; `term → power ((*|/|%) power)*`;
    `power → unary (^ power)?` (right-assoc); `unary → (-|+)? primary`;
    `primary → NUMBER | CONSTANT | FUNC(expr) | (expr)`.
  - Ops: `+ - * / % ^`, parentheses, unary minus, decimal literals.
  - Constants table: `pi`/`π` → `Math.PI`; `e` → `Math.E`; `phi`/`φ` → `(1+√5)/2`;
    `tau`/`τ` → `2*Math.PI`; `sqrt2` → `Math.SQRT2`.
  - Functions (1-arg): `sqrt sin cos tan ln log abs`.
  - Returns `null` on tokenize failure, parse failure, trailing tokens, NaN, or Infinity.
  - Sets `CalcResult.label` (e.g. "golden ratio") when the full trimmed input resolves
    to a single named constant (used by the banner's `· label` segment).
  - The entire pipeline is wrapped in `try/catch` — MUST never throw to the caller.
  - MUST NOT use `eval()` or `new Function` anywhere.
  - *Satisfies: REQ-CL-01, REQ-CL-02, REQ-CL-03*
  - **VERIFY risk**: calc must return `null` for `"process.exit(1)"` and `"firefox"`;
    must return a CalcResult for `"phi"` and `"2+2"`. Check by reading the parser code,
    not by running in a JS runtime.

- [x] **1.2** Create `config/ags/lib/launcher-history.ts` — JSON recency store. **small** (~70 lines)
  - Exports: `type RecentEntry = { id: string; name: string; icon?: string; ts: number }`,
    `readRecents(): RecentEntry[]`, `recordLaunch(app: { name: string; iconName?: string; ... }): void`,
    and `getRecent(limit: number): string[]` (returns array of entry IDs, MRU first).
  - Storage path: `GLib.get_user_state_dir() + "/ags/launcher-recents.json"`.
    Create directory with `GLib.mkdir_with_parents(dir, 0o755)` on first write.
  - Read: `GLib.file_get_contents(path)` → `JSON.parse` wrapped in `try/catch`; returns
    `[]` on missing file or invalid JSON (MUST NOT throw).
  - `recordLaunch`: remove existing entry with same id (dedupe), `unshift` new entry,
    cap array at **8** entries, write atomically.
  - Atomic write: write JSON to `path + ".tmp"` via `GLib.file_set_contents`, then
    `Gio.File.new_for_path(tmp).move(dest, Gio.FileCopyFlags.OVERWRITE)`.
    MUST NOT write directly to the destination path.
  - `getRecent(limit)` returns `history.slice(0, limit).map(e => e.id)`.
  - Imports: only `GLib` and `Gio` — no JSX, no Gtk.
  - *Satisfies: REQ-LH-01, REQ-LH-02, REQ-LH-03, REQ-LH-04*

### Phase 1b: Launcher.tsx — state model + key controller

- [x] **1.3** Rewrite `config/ags/widget/Launcher.tsx` — state model and window key
  controller. **large** (~220 lines total for the full Slice 1 widget; this sub-task
  covers the state layer and event wiring)
  - Import `evaluate` from `../lib/calc`; import `recordLaunch`, `getRecent` from
    `../lib/launcher-history`; import `GLib` from `gi://GLib`.
  - Remove the `{ a, first }` pairing. Replace with:
    - `const [query, setQuery] = createState("")`
    - `const [selectedIdx, setSelectedIdx] = createState(0)`
    - `const apps = new Apps.Apps()` (same as today)
    - `const results = createComputed(() => query.get() ? apps.fuzzy_query(query.get()).slice(0, 8) : [])`
      — returns `Apps.Application[]` directly (NOT `.map()` inside `.as()`, which
      renders `Accessor{}`).
    - Subscribe to results for the single clamp site:
      ```ts
      results.subscribe(() => {
        const len = results.get().length
        setSelectedIdx(i => len === 0 ? 0 : Math.min(i, len - 1))
      })
      ```
    - `const calc = createComputed(() => evaluate(query.get()))` — `CalcResult | null`.
    - `const recent = createComputed(() => getRecent(8))` — refreshed on mount (reads
      from disk; updated after each launch via re-read or push approach).
  - Rewrite the window `$` setter key controller (REPLACE the existing controller that
    only handles Escape). The new controller MUST:
    - Check `(state & Gdk.ModifierType.SUPER_MASK) !== 0` for ⌘ detection.
    - Handle `Gdk.KEY_Escape` → `app.toggle_window("launcher")`, return `true`.
    - Handle `Gdk.KEY_Up` → `setSelectedIdx(i => Math.max(i - 1, 0))`, return `true`.
    - Handle `Gdk.KEY_Down` →
      `setSelectedIdx(i => Math.min(i + 1, results.get().length - 1))`, return `true`.
    - Handle `Gdk.KEY_Return` / `Gdk.KEY_KP_Enter` → call `launch(r)` if `!sup`,
      `launchInTerminal(r)` if `sup` (where `r = results.get()[selectedIdx.get()]`),
      return `true`.
    - ALL other keyvals → return `false` (printable keys must reach the entry).
  - Define `launch(a: Apps.Application)` — `a.launch(); recordLaunch(a); app.toggle_window("launcher"); setQuery(""); setSelectedIdx(0)`.
  - Define `launchInTerminal(a: Apps.Application)` —
    `const term = GLib.getenv("TERMINAL") || "kitty"; execAsync([term, "-e", a.executable]); recordLaunch(a); app.toggle_window("launcher"); setQuery(""); setSelectedIdx(0)`.
  - REMOVE `onActivate` from the `<entry>` — Enter is handled by the window controller.
  - *Satisfies: REQ-LR-01, REQ-LR-02, REQ-LR-08 (state + key wiring)*
  - **VERIFY risk**: key controller MUST return `false` for printable characters —
    test by typing after wiring; if entry does not receive chars, check return values.

### Phase 1c: Launcher.tsx — UI sections

- [x] **1.4** Add **results count pill** to the search row in `Launcher.tsx`. **small**
  (~15 lines delta)
  - A `<label>` with `cssClasses={["results-pill"]}` positioned after the entry,
    `visible={results.as(r => query.get().length > 0 && r.length > 0)}`,
    `label={results.as(r => `${r.length} RESULTS`)}`.
  - The pill is invisible when query is empty (REQ-LR-03).
  - *Satisfies: REQ-LR-03*

- [x] **1.5** Replace static result rows with **selectedIdx-aware rows** in `Launcher.tsx`.
  **small** (~25 lines delta)
  - `<For each={results}>` iterates `Apps.Application[]` (not the `{a, first}` pairs).
  - Each row `cssClasses` computed from index vs `selectedIdx`: `selectedIdx.as(s => s === idx ? ["app-item", "selected"] : ["app-item"])`.
  - Trailing `⏎` glyph: a `<label label="⏎" cssClasses={["row-enter"]}` that is
    `visible` only when `selectedIdx.get() === idx`.
  - App name rendered as two adjacent `<label>`s: `.match-prefix` (the matched
    portion, `color: var(--accent)`, bold) + `.match-rest` (the tail). The split
    index is `query.get().length` characters into `a.name` (case-insensitive prefix
    match; fall back to full name in `.match-rest` if no match).
  - Row `accessible-name={a.name}`, `accessible-role={Gtk.AccessibleRole.LIST_ITEM}`.
  - *Satisfies: REQ-LR-04, REQ-A11Y-LR-01 (result rows)*

- [x] **1.6** Add **calculator banner** to `Launcher.tsx`. **small** (~30 lines delta)
  - A `<box cssClasses={["calc-banner"]} visible={calc.as(c => c !== null)}>` placed
    ABOVE the result rows in the card's vertical layout.
  - Contents: `<label cssClasses={["calc-expr"]} label={calc.as(c => c?.expr ?? "")}>`
    + `<label label="→">` + `<label cssClasses={["calc-value"]}
    label={calc.as(c => c ? String(c.value) : "")}>` + optional
    `<label cssClasses={["calc-label"]} label={calc.as(c => c?.label ?? "")}
    visible={calc.as(c => !!c?.label)}>` + copy affordance.
  - Copy affordance: `<button cssClasses={["calc-copy"]} label="↵ copy"
    accessible-name="Copy result" accessible-role={Gtk.AccessibleRole.BUTTON}
    onClicked={() => calc.get() && execAsync(["wl-copy", String(calc.get()!.value)])}`.
  - Banner respects `.motion-off` — any show/hide transition MUST use a CSS class
    transition gated by the existing `.motion-off` rule (no inline style duration).
  - *Satisfies: REQ-LR-05, REQ-A11Y-LR-01 (copy affordance), REQ-A11Y-LR-03*

- [x] **1.7** Add **RECENT chips row** to `Launcher.tsx`. **small** (~30 lines delta)
  - A `<box cssClasses={["recent-row"]}` with a `<label label="RECENT"
    cssClasses={["section-label"]}>` header.
  - Chips rendered via `<For each={recent}>` — each chip is a `<button
    cssClasses={["recent-chip"]} accessible-name={entryId}
    accessible-role={Gtk.AccessibleRole.BUTTON}` that looks up the app from `apps.list`
    by id and calls `launch(app)`.
  - The recent row is shown regardless of query state (always visible when history has
    entries), hidden when `recent.as(r => r.length === 0)`.
  - After launch from a chip, `recent` must refresh to reflect the updated MRU.
  - *Satisfies: REQ-LR-06, REQ-A11Y-LR-01 (chips)*

- [x] **1.8** Rewrite **footer** in `Launcher.tsx`. **small** (~20 lines delta)
  - Replace the 3-hint footer with the full 5-hint row + AI pill:
    `↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? ask AI`.
  - AI pill: `<box cssClasses={["ai-pill"]}>` (gradient bg, solid `var(--mauve)` text)
    — cosmetic only, no click handler.
  - The `KbdHint` helper function is reused as-is.
  - *Satisfies: REQ-LR-07*

### Phase 1d: SCSS — Core UX classes

- [x] **1.9** Extend `config/ags/style/_widgets.scss` with Slice 1 launcher classes.
  **medium** (~80 lines added at end of file)
  - Append after the existing launcher block. New classes:
    - `.results-pill` — `background: color-mix(in oklab, var(--accent) 16%, transparent)`;
      monospace uppercase; small font-size; `border-radius: var(--radius-inner)`;
      `letter-spacing: 0.06em`; `padding: 2px 8px`.
    - `.calc-banner` — `background: var(--bg2)`; `border-radius: var(--radius-inner)`;
      `border-left: 2px solid var(--mauve)`; `padding: 8px 12px`; flex row spacing.
      Children: `.calc-expr` (dim color), `.calc-value` (`var(--mauve)` bold),
      `.calc-label` (dim), `.calc-copy` (kbd-style).
    - `.recent-row` — flex row; `gap: 6px`; `padding: 4px 12px`.
    - `.recent-chip` — `background: var(--bg2)`; `border-radius: var(--radius-inner)`;
      mono font; `padding: 2px 8px`; `&:hover { background: var(--bg3) }`.
    - `.section-label` — dim color; `font-size: 10px`; uppercase; `letter-spacing: 0.08em`.
    - `.ai-pill` — `background-image: linear-gradient(90deg, var(--mauve), var(--pink))`;
      `color: var(--mauve)` (solid text — GTK4 4.22 cannot clip gradient to text;
      this is accepted degradation D-LR-1); `border-radius: var(--radius-inner)`;
      `padding: 2px 10px`. SCSS comment MUST document the degradation explicitly.
    - `.row-enter` — `color: var(--accent)`; matches `.kbd` style; `margin-left: auto`.
    - `.match-prefix` — `color: var(--accent)`; `font-weight: bold`.
    - `.match-rest` — `color: var(--text)`.
  - Any transition/animation rule MUST be nested inside a `:not(.motion-off) &` guard
    (or equivalent) to respect REQ-A11Y-LR-03 / REQ-MG-02.
  - *Satisfies: REQ-A11Y-LR-02 (focus rings inherited from base `:focus-visible` rule),
    REQ-A11Y-LR-03*

### Phase 1e: Slice 1 smoke test

- [ ] **1.10** **Smoke test — Slice 1**. **small** (manual `ags run` + observe)

  Checklist (run in order; stop at first failure and fix before continuing):

  1. `ags run` starts without errors; no output in `/tmp/ags-debug.log` from CSS parser.
  2. **Calculator banner**: type `2+2` → banner appears showing `2+2 → 4`; type `phi`
     → banner shows `≈1.618033 · golden ratio`; type `firefox` → banner hidden.
  3. **Copy affordance**: with banner visible, activate `↵ copy`; verify `wl-paste`
     returns the number string.
  4. **Results pill**: type `fire` → pill shows `N RESULTS` (visible); clear query →
     pill hidden.
  5. **Row selection + arrows**: type `ki` → multiple rows; press `↓` → selection
     moves to second row (⏎ glyph moves); press `↑` → back to first; press `↑` again
     → stays at 0 (no wrap).
  6. **Enter launches**: with a row selected, press `↵` → app launches, launcher
     closes, query cleared on reopen.
  7. **⌘↵ terminal**: with a row selected, press `Super+Enter` → app opens in
     `$TERMINAL` (or kitty); launcher closes.
  8. **Typing not blocked**: type a multi-char query freely → each character appears
     in the entry (key controller is NOT consuming printable keys).
  9. **Query shrink clamp**: type `kita` (few results, e.g. selectedIdx=2); delete
     chars so only 1 result remains → `selectedIdx` clamps to 0, no crash.
  10. **RECENT chips**: after step 6 launch, reopen launcher → the launched app
      appears as first chip; click a chip → app launches and chip moves to front on
      reopen.
  11. **Persistence**: close `ags`, re-run `ags run` → RECENT chips survive restart
      (read from `~/.local/state/ags/launcher-recents.json`).
  12. **Footer**: 5 hint segments visible in order
      `↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? ask AI`; AI pill rendered with
      gradient bg and visible text.
  13. **Esc / click-outside**: Esc closes launcher; clicking scrim outside card closes
      launcher; re-opening focuses the entry.
  14. **No CSS errors**: `rg 'CSS|Warning|Error' /tmp/ags-debug.log` → zero relevant
      launcher-class errors.

  *Commit Slice 1 to `main` after all checks pass.*

---

## Slice 2 — App Grid

*Satisfies: REQ-AG-01, REQ-AG-02, REQ-AG-03, REQ-AG-04, REQ-A11Y-LR-01 (grid tiles)*
*ADRs: ADR-2, ADR-6, ADR-8*

### Phase 2a: Launcher.tsx — app grid section

- [ ] **2.1** Add **ALL APPS section header** to `Launcher.tsx`. **small** (~10 lines delta)
  - `const allApps = apps.list` (evaluated once at init — static, not reactive).
  - A `<box cssClasses={["launcher-section-header"]}` with:
    - `<label label="ALL APPS" cssClasses={["section-label"]}>` and
    - `<label label={String(allApps.length)} cssClasses={["section-label"]}>`.
  - The entire ALL APPS section (header + grid + scrolledwindow) MUST be
    `visible={query.as(q => q.length === 0)}` — shown only when the query is empty
    (ADR-2: grid is the query-empty browse surface; result rows own query-non-empty).
  - *Satisfies: REQ-AG-01*

- [ ] **2.2** Add **Gtk.FlowBox grid** inside a `<scrolledwindow>` to `Launcher.tsx`.
  **medium** (~60 lines delta)
  - The FlowBox MUST be constructed imperatively in a `$` setter (no intrinsic
    `<flowbox>` in this AGS build):
    ```ts
    $={(self: Gtk.FlowBox) => {
      self.set_max_children_per_line(6)
      self.set_min_children_per_line(6)
      self.set_homogeneous(true)
      self.set_selection_mode(Gtk.SelectionMode.SINGLE)
      for (const a of allApps) {
        const child = new Gtk.FlowBoxChild()   // REQUIRED — raw append is a silent no-op
        child.set_child(buildGridTile(a))
        self.append(child)
      }
      self.connect("child-activated", (_fb, child) => {
        const a = allApps[child.get_index()]
        if (a) { launch(a) }
      })
    }}
    ```
  - `buildGridTile(a)` returns a `<box vertical cssClasses={["grid-tile"]}
    accessible-name={a.name} accessible-role={Gtk.AccessibleRole.BUTTON}>` with:
    - `<image iconName={a.iconName} cssClasses={["grid-tile-icon"]}>` (real .desktop icon)
    - `<label label={a.name} cssClasses={["grid-tile-name"]} ellipsize={Pango.EllipsizeMode.END}>`
  - The FlowBox is wrapped in `<scrolledwindow maxContentHeight={320}
    propagateNaturalHeight={true} hscrollbarPolicy={Gtk.PolicyType.NEVER}
    vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} cssClasses={["app-grid-scroll"]}>`.
  - **VERIFY risk**: every tile MUST be wrapped in `Gtk.FlowBoxChild` — omitting the
    wrapper causes a SILENT runtime no-op (tiles do not appear AND no error is thrown).
    Confirm tiles render by counting them visually.
  - **VERIFY risk**: `child-activated` fires on both click and keyboard Enter when a
    child is selected — confirm both paths work in smoke test.
  - *Satisfies: REQ-AG-02, REQ-AG-03, REQ-AG-04, REQ-A11Y-LR-01 (grid tiles)*

### Phase 2b: SCSS — app grid classes

- [ ] **2.3** Extend `config/ags/style/_widgets.scss` with Slice 2 grid classes.
  **small** (~40 lines added after Slice 1 block)
  - `.app-grid` — `row-spacing` and `column-spacing` via the `$` setter (set via
    `self.set_row_spacing(8)` / `self.set_column_spacing(8)` in TSX); CSS class is
    the selector for any visual overrides.
  - `.grid-tile` — `padding: 8px 4px`; `border-radius: var(--radius-inner)`;
    `min-width: 72px`; `:hover { background: var(--bg2) }`.
  - `.grid-tile-icon` — `-gtk-icon-size: 40px`.
  - `.grid-tile-name` — `font-size: 11px`; `color: var(--text)`; `text-align: center`.
  - `flowboxchild:selected .grid-tile` — `background: color-mix(in oklab, var(--accent) 18%, transparent)`; `border: 1px solid var(--accent)` (mirrors `.app-item.selected` runtime color-mix; already validated in desktop-redesign).

### Phase 2c: Slice 2 smoke test

- [ ] **2.4** **Smoke test — Slice 2**. **small** (manual `ags run` + observe)

  Checklist:

  1. `ags run` starts cleanly, no new CSS errors.
  2. **Grid visibility**: open launcher with empty query → ALL APPS grid visible;
     type any character → grid hidden, result rows take over; clear query → grid
     reappears.
  3. **Grid layout**: confirm apps appear in 6-column rows (measure visually); tiles
     are homogeneous (equal width).
  4. **Real icons**: Firefox, kitty, and a few other well-known apps show their
     correct `.desktop` icon from the system icon theme (not a generic fallback).
  5. **App count header**: "ALL APPS" label is visible; the count reflects the number
     of installed apps (compare with `ls /usr/share/applications/*.desktop | wc -l`
     approximately).
  6. **Click launch**: click a grid tile → app launches, launcher closes.
  7. **Keyboard activation**: use mouse to focus a tile, then press `↵` → tile's app
     launches (FlowBox `child-activated` fires on Enter when child focused).
  8. **History recorded**: after a grid tile launch, reopen launcher → the launched
     app appears as first chip in the RECENT row.
  9. **Scroll**: if more than ~36 apps (6×6), scroll the grid area → additional tiles
     become reachable without the launcher window growing.
  10. **Slice 1 regressions**: quickly re-verify calculator banner, arrow nav, Enter
      launch, and RECENT chips still work (no regression from the Slice 2 additions).
  11. **No CSS errors**: `rg 'CSS|Warning|Error' /tmp/ags-debug.log` → zero new
      errors beyond any pre-existing ones.

  *Commit Slice 2 to `main` after all checks pass.*

---

## Per-Slice Workload Summary

```
Slice 1: ~410 lines, 3 files (2 new: lib/calc.ts, lib/launcher-history.ts;
                               1 rewrite: Launcher.tsx + _widgets.scss additions)
  lib/calc.ts             ~120 lines (new)
  lib/launcher-history.ts  ~70 lines (new)
  Launcher.tsx            ~140 lines net change (rewrite core, add banner/chips/footer)
  _widgets.scss            ~80 lines added

Slice 2: ~180 lines, 2 files (both already established in Slice 1)
  Launcher.tsx             ~70 lines added (header, FlowBox $-setter, scrolledwindow)
  _widgets.scss            ~40 lines added (grid classes)
  buildGridTile helper     ~30 lines added (inline or extracted)

Total: ~590 changed lines across 4 files (2 new, 2 extended).

Slice 1 400-line budget: Borderline (~410). Mitigation option if needed:
  commit lib/calc.ts alone first (~120 lines), then the remaining Slice 1
  items together (~290 lines). Both micro-commits target main in order.
Slice 2: Low risk (~180 lines).
```

---

## Runtime Verify Checklist (reference for sdd-verify)

These are the four spec-flagged risks that cannot be caught by reading code alone.
Each must be confirmed during smoke-test:

| Risk | Verify step | Pass condition |
|------|-------------|----------------|
| Key controller consuming printable keys | Type a full query (e.g. "firefox") after Slice 1 install | All characters appear in the entry; no chars are dropped |
| FlowBoxChild wrapper omitted (silent no-op) | Count visible grid tiles after Slice 2 install | Tile count matches `allApps.length` (or first page if many); `child-activated` fires on click |
| `selectedIdx` past list on query shrink | Type query to get 5 results (selectedIdx=4), then delete chars to leave 1 result | No crash; `selectedIdx` clamps to 0, first row is selected |
| Calc uses `eval` / `new Function` | Read `lib/calc.ts` source | Neither string appears anywhere in the file |
