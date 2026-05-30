---
source: engram
topic_key: sdd/launcher-redesign/design
exported_at: 2026-05-29
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Design: launcher-redesign — Spotlight-class AGS launcher

## Executive Summary

Rewrite `Launcher.tsx` around a single `selectedIdx` reactive cell that drives one
unified selection cursor over a flat list (Slice 1 result rows; Slice 2 the same
cursor extends across the FlowBox tiles). A key controller lives on the WINDOW
(not the entry) so `↑/↓/↵/⌘↵` are intercepted before the native entry consumes
them. Two new pure libs: `lib/calc.ts` (hand-rolled recursive-descent arithmetic
parser + constants table, never `eval`/`Function`, returns `null` for non-math)
and `lib/launcher-history.ts` (JSON recents under `$XDG_STATE_HOME`, GLib
write-temp-then-rename atomic write). Clipboard copy and terminal launch both go
through `execAsync` (`wl-copy`, `$TERMINAL||kitty`) — the repo's established
spawn path. CSS extends `_widgets.scss` with new classes only; the AI pill
degrades to solid `var(--mauve)` text on a gradient bg (GTK4 cannot clip gradient
into text). No changes to `app.ts` or `LauncherPill.tsx`.

---

## Pattern + Layering

Inherits the desktop-redesign architecture (Reactive Widget Composition over
service bindings, 3 thin layers: `widget/` · `lib/` · `service/`). This change
adds two pure `lib/` helpers and rewrites one widget. No new service, no new
window, no new entrypoint wiring.

```
app.ts                        ← UNCHANGED (Launcher already mounted)
   └── widget/Launcher.tsx    ← REWRITE (selection model, calc banner, recent
   │                            chips, footer, [Slice 2] app grid)
   └── lib/calc.ts            ← NEW  pure evaluator, no JSX, no GTK
   └── lib/launcher-history.ts← NEW  JSON persistence, GLib I/O, no JSX
   └── style/_widgets.scss    ← EXTEND (new launcher classes only)
```

Boundaries (carried from ADR-3 of desktop-redesign):
- `lib/calc.ts` and `lib/launcher-history.ts` are PURE — no JSX, no `Gtk` import
  (calc imports nothing; history imports only `GLib`/`Gio`). Widget owns all
  reactivity.
- The widget references `cssClasses` strings only; every color/radius/motion
  value stays in SCSS using existing `var(--…)` tokens. The single allowed
  inline style is none — discrete state classes (`.selected`) cover all states.
- `Launcher.tsx` does NOT import `LauncherPill` or any other widget. Close uses
  `app.toggle_window("launcher")` by name (unchanged).

---

## State Model

All state lives in module-local `createState` cells inside the `Launcher()`
function body. There is NO global store and NO cross-widget shared state.

| Cell | Type | Source of truth for |
|---|---|---|
| `query` | `string` | the entry text (set via `onNotifyText`) |
| `selectedIdx` | `number` | the single unified selection cursor |
| `apps` | `Apps.Apps()` (not reactive) | the AstalApps singleton, queried imperatively |

Derived (via `createComputed`, NOT `.as(arr => arr.map())` — that renders
`Accessor{}`):

| Derived | From | Definition |
|---|---|---|
| `results` | `query` | `query ? apps.fuzzy_query(q).slice(0, 8) : []` — array of `Apps.Application` |
| `resultCount` | `results` | `results.length` → "N RESULTS" pill |
| `calc` | `query` | `evaluate(query)` → `CalcResult \| null` (banner visible only when non-null) |
| `recent` | (init read + push) | array of recent command entries from history lib |
| `allApps` (Slice 2) | `apps.list` | full app list for the grid (static after init) |

### selectedIdx clamping (the bug-magnet — ADR-2)

`selectedIdx` is re-clamped on EVERY query change. Implemented by subscribing to
`results` (the derived count) and clamping in one place:

```ts
results.subscribe(() => {
  const len = results.get().length
  setSelectedIdx(i => len === 0 ? 0 : Math.min(i, len - 1))
})
```

Rule: `selectedIdx` is always in `[0, max(0, len-1)]`. When the list is empty the
cursor parks at 0 and Enter is a no-op (guarded in `launch`). Arrow handlers also
clamp on move: `Down → min(i+1, len-1)`, `Up → max(i-1, 0)`.

### Unified selection (Slice 1 + Slice 2) — ADR-2

ONE cursor, not two. The selection space is the visible result list:
- **Slice 1**: cursor indexes `results` (the fuzzy matches). The selected row gets
  `.selected` and shows the trailing `⏎` glyph.
- **Slice 2**: when `query` is EMPTY, the result list is empty, so the cursor has
  nothing to select among rows — in that state the FlowBox tiles are the
  navigable surface and selection is delegated to the FlowBox's OWN selection
  model (`Gtk.SelectionMode.SINGLE`, native arrow nav inside the grid). When
  `query` is non-empty, the result rows own the cursor and the grid is hidden or
  non-focused.

This avoids the trap of synchronizing two index spaces. Rationale in ADR-2:
result rows and grid tiles are never simultaneously the primary navigation
target — query-empty shows the grid, query-non-empty shows results. The single
`selectedIdx` governs rows; the FlowBox governs tiles via its built-in selection.

---

## Data Flow

```
keypress (window controller)
   ├── Escape           → app.toggle_window("launcher")
   ├── Up/Down          → setSelectedIdx(clamp) ; return true (consume)
   ├── Enter            → launch(results[selectedIdx])           ; recordLaunch()
   └── Super+Enter      → launchInTerminal(results[selectedIdx]) ; recordLaunch()

entry onNotifyText      → setQuery(text)
   → results recompute  → resultCount pill + clamp(selectedIdx)
   → calc recompute     → banner visible iff calc !== null

banner "↵ copy" click   → execAsync(["wl-copy", String(calc.value)])
recent chip click       → launch(appForEntry) / re-run command
grid tile activated      → launch(app) ; recordLaunch()   [Slice 2]
```

`recordLaunch(app)` pushes to history (dedupe + cap + recency reorder) and the
`recent` cell updates so the chips reflect the new MRU order on next open.

---

## Architectural Decisions (ADR-style)

### ADR-1: Key controller on the WINDOW, intercept before the entry

**Decision**: Keep ONE `Gtk.EventControllerKey` attached to the `<window>` (the
existing controller, extended). Handle `Up`/`Down`/`Enter`/`Super+Enter` there and
RETURN `true` to consume them so the focused `<entry>` never sees the navigation
keys. `Escape` is handled as today. Printable keys are NOT consumed (return
`false`) so typing flows into the entry normally.

```ts
controller.connect("key-pressed", (_c, keyval, _code, state) => {
  const sup = (state & Gdk.ModifierType.SUPER_MASK) !== 0
  switch (keyval) {
    case Gdk.KEY_Escape: app.toggle_window("launcher"); return true
    case Gdk.KEY_Up:     setSelectedIdx(i => Math.max(i - 1, 0)); return true
    case Gdk.KEY_Down:   setSelectedIdx(i => Math.min(i + 1, len() - 1)); return true
    case Gdk.KEY_Return:
    case Gdk.KEY_KP_Enter:
      const r = results.get()[selectedIdx.get()]
      if (r) sup ? launchInTerminal(r) : launch(r)
      return true
  }
  return false  // printable keys reach the entry
})
```

**Why**: GTK4 delivers key events to the focused widget first if the controller
sits on the entry; the entry would swallow `Up`/`Down` (cursor moves within text)
and `Enter` (its own `onActivate`). A WINDOW-level controller in the
`CAPTURE`/default phase sees the event and consuming it (`return true`) stops
propagation to the entry. The `onActivate` on the entry is REMOVED — Enter is now
handled centrally so terminal-vs-normal launch share one code path.

**Super detection**: the `state` (4th arg of `key-pressed`) is the modifier mask;
`state & Gdk.ModifierType.SUPER_MASK` distinguishes `⌘↵`. (The proposal/footer
write it as `⌘↵`; the physical key is Super/Logo, mask `SUPER_MASK`.)

**Rejected**: controller on the entry with `connect_after`. Cost: fights the
entry's own handlers, fragile ordering, and `Up`/`Down` still move the text
cursor before we see them. Reject.

### ADR-2: Single `selectedIdx` cursor + delegated grid selection

(Full mechanics in **State Model** above.) **Decision**: one `selectedIdx`
governs result rows; the Slice-2 FlowBox uses its native `SINGLE` selection mode
for tile navigation; the two never compete because grid is the query-empty
surface and rows are the query-non-empty surface.

**Why**: synchronizing two integer index spaces across a list and a 2-D grid is a
classic off-by-one/out-of-range bug source (Risk 3). Letting the FlowBox own its
own selection (it already does keyboard nav across rows/columns correctly) removes
the 2-D arithmetic entirely.

**Rejected**: one global index spanning `results.length + allApps.length` with
manual row/column math for the grid. Cost: reimplements FlowBox nav by hand,
guaranteed edge-case bugs at the row/grid boundary. Reject.

### ADR-3: `lib/calc.ts` — recursive-descent parser, never `eval`

**Decision**: A pure, dependency-free module exporting:

```ts
export type CalcResult = { value: number; expr: string; label?: string }
export function evaluate(input: string): CalcResult | null
```

Pipeline: **tokenizer → recursive-descent parser → numeric eval**. Grammar
(standard precedence climbing):

```
expr   := term (('+' | '-') term)*
term   := power (('*' | '/' | '%') power)*
power  := unary ('^' power)?            // right-associative
unary  := ('-' | '+')? primary
primary:= NUMBER | CONSTANT | FUNC '(' expr ')' | '(' expr ')'
```

Supported: `+ - * / % ^`, parentheses, unary minus, decimals, and a function +
constants table:

| Constants | Value |
|---|---|
| `pi`, `π` | `Math.PI` |
| `e` | `Math.E` |
| `phi`, `φ` | `(1 + √5) / 2` (golden ratio — matches the reference "golden ratio" label) |
| `tau`, `τ` | `2π` |
| `sqrt2` | `Math.SQRT2` |

| Functions (1-arg) | Maps to |
|---|---|
| `sqrt` | `Math.sqrt` |
| `sin cos tan` | `Math.sin/cos/tan` |
| `ln` / `log` | `Math.log` / `Math.log10` |
| `abs` | `Math.abs` |

**"Not a number" reporting**: `evaluate` returns `null` whenever the input fails to
tokenize, fails to parse, has trailing tokens, or yields `NaN`/`Infinity`. The
banner binds `visible={calc.as(c => c !== null)}` — so a plain app-name query like
`"firefox"` returns `null` and the banner stays hidden, while `"phi"` resolves to
the golden ratio and shows. A bare integer like `"7"` also resolves (returns 7) —
acceptable per always-on auto mode; the banner shows the trivial result.

**Constant-label affordance**: when the entire trimmed input is a single known
constant token, `evaluate` sets `label` (e.g. `"golden ratio"`) so the banner can
render `calc φ → 1.618033 · golden ratio` exactly like the reference. For
multi-term expressions `label` is undefined.

**Why hand-rolled**: `eval`/`new Function` execute arbitrary JS — a code-injection
and crash surface in a always-on evaluator that runs on every keystroke (Risk 4).
A ~120-line precedence-climbing parser is auditable, total (never throws to the
caller — wraps in try/catch and returns `null`), and dependency-free (no `qalc`,
honoring the locked decision).

**Rejected**: (a) `eval()` — unsafe, rejected by locked decision. (b) shelling out
to `qalc` — adds a runtime dependency, rejected by locked decision. (c)
shunting-yard to RPN — equivalent power but recursive-descent reads cleaner for
unary minus and function calls. Recursive-descent chosen.

### ADR-4: `lib/launcher-history.ts` — JSON recents via GLib atomic write

**Decision**: A pure module exporting:

```ts
export type RecentEntry = { id: string; name: string; icon?: string; ts: number }
export function readRecents(): RecentEntry[]
export function recordLaunch(app: { name: string; iconName?: string; ... }): void
```

- **Storage location**: `GLib.get_user_state_dir() + "/ags/launcher-recents.json"`
  (i.e. `$XDG_STATE_HOME/ags/…`, default `~/.local/state/ags/…`). Directory is
  created with `GLib.mkdir_with_parents(dir, 0o755)` on first write. State dir (not
  config or cache) because recents are durable user state, not config and not
  disposable cache.
- **Format**: a JSON array of `RecentEntry`, newest-first (MRU order). `id` is the
  app's `.desktop` id (or `executable` fallback) used for dedupe.
- **Read on init**: `GLib.file_get_contents(path)` → `JSON.parse`, wrapped in
  try/catch → returns `[]` on missing/corrupt file (never throws).
- **push-on-launch**: `recordLaunch` removes any existing entry with the same `id`
  (dedupe), unshifts the new entry, caps the array at **8** entries, then writes.
- **Atomic write** (Risk 5): write to `path + ".tmp"` via
  `GLib.file_set_contents(tmp, json)` then `Gio.File.new_for_path(tmp).move(dest,
  Gio.FileCopyFlags.OVERWRITE)` — write-temp-then-rename so a crash mid-write
  (rapid launcher toggling) never leaves a half-written file. (`GLib.file_set_contents`
  is itself atomic on most filesystems; the explicit temp+rename is belt-and-suspenders
  and guarantees the durable name is only ever a complete file.)
- **Recency order**: MRU — most recently launched first. The chips render the first
  N (≈5) entries left-to-right.

**Why a custom file**: `AstalApps` exposes `frequency` (a usage COUNT) and
`launch()` bumps it, but there is no recency timestamp — the reference's RECENT
chips are recency-ordered, not frequency-ordered. A tiny JSON file is the minimal
durable store.

**Rejected**: (a) sort AstalApps by `frequency` — wrong semantics (count, not
recency). (b) GSettings/dconf — heavyweight, schema ceremony for a 8-item list.
(c) naive single `file_set_contents` without temp — acceptable in practice but the
temp+rename removes any rapid-toggle corruption doubt. Reject.

### ADR-5: Clipboard + terminal launch via `execAsync` (the repo's spawn path)

**Decision**: Both side-effects use `execAsync` from `ags/process` (already the
established pattern — `service/hyprland.ts` uses it for every `hyprctl` call).

- **Copy** (calc banner `↵ copy`): `execAsync(["wl-copy", String(calc.value)])`.
  `wl-copy` (wl-clipboard) is the Wayland clipboard tool; the repo is
  Hyprland/Wayland and already uses `wl-paste` in `hyprland.lua`
  (`wl-paste --watch cliphist store`), so `wl-clipboard` is present.
- **Terminal launch** (`⌘↵`): resolve the terminal via
  `GLib.getenv("TERMINAL") || "kitty"`, then
  `execAsync([term, "-e", app.executable])`. `kitty` (and most terminals) accept
  `-e <cmd>` to run a command. After spawn: `app.toggle_window("launcher")` +
  `recordLaunch(app)`.

**Why `wl-copy` over a GTK clipboard call**: `Gdk.Display.get_clipboard()` +
`set_content` requires building a `Gdk.ContentProvider` and is awkward from this
AGS/gjs surface; `wl-copy` is one line, already-available, and matches the repo's
spawn convention. (`Gdk` clipboard noted as a fallback if `wl-copy` is ever
unavailable.)

**Why `$TERMINAL || kitty`**: locked decision — honor the user's `$TERMINAL` env
with `kitty` as the fallback (kitty is the repo's default terminal, referenced in
the existing recents/desktop config).

**Rejected**: hardcoding `kitty` only (ignores user preference — locked decision
says `$TERMINAL` first); GTK clipboard provider (more code, no benefit here).

### ADR-6: App grid via `Gtk.FlowBox` built imperatively in a `$` setter (Slice 2)

**Decision**: The 6-column grid is a `Gtk.FlowBox` constructed in a `$` setter
(there is no intrinsic `<flowbox>`/`<grid>` in this AGS build):

```ts
$={(self: Gtk.FlowBox) => {
  self.set_max_children_per_line(6)
  self.set_min_children_per_line(6)
  self.set_homogeneous(true)
  self.set_selection_mode(Gtk.SelectionMode.SINGLE)
  for (const a of allApps) {
    const child = new Gtk.FlowBoxChild()      // REQUIRED wrapper (Risk 2)
    child.set_child(buildTile(a))             // a <box>: icon tile + name label
    self.append(child)
  }
  self.connect("child-activated", (_fb, child) => {
    const a = allApps[child.get_index()]
    launch(a); recordLaunch(a)
  })
}}
```

- Each tile MUST be wrapped in a `Gtk.FlowBoxChild` — appending a raw box is a
  silent runtime no-op (Risk 2), not a compile error.
- Tile content: real `.desktop` icon via `Gtk.Image` with `iconName` (AstalApps
  `iconName`), plus a name label below. NO procedural gradient tiles (locked
  decision).
- Activation: the FlowBox `child-activated` signal (fires on click AND on
  Enter/Space when a child is selected). The child's `get_index()` maps back into
  `allApps`.
- The FlowBox lives inside a `<scrolledwindow>` with a capped content height
  (`maxContentHeight` ≈ 320px, `propagateNaturalHeight=true`,
  `hscrollbarPolicy=NEVER`, `vscrollbarPolicy=AUTOMATIC`) so the grid scrolls
  rather than overflowing the card.

**Selection/keyboard**: the FlowBox owns its selection (`SINGLE` mode) and native
GTK keyboard nav (arrows move across rows/columns) — see ADR-2. The grid is shown
when `query` is empty (the "ALL APPS" browse surface); when the user types, results
take over.

**Why `$` setter**: the grid is imperative-built once from a static list; a `<For>`
over an intrinsic flowbox is unavailable, and `<For>` inside a manual FlowBox
wouldn't produce `FlowBoxChild` wrappers. The `$` setter is the AGS-idiomatic
imperative escape hatch (same pattern as the existing scrim gesture setup).

**Rejected**: nested rows of 6 `<box>`es (the explore "OR" option). Cost: manual
wrap math, no built-in selection/keyboard nav, breaks on odd counts. FlowBox wins.

### ADR-7: Footer + AI pill — gradient bg, solid `var(--mauve)` text (Risk 1/6)

**Decision**: The footer renders 5 `KbdHint`s
(`↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? ask AI`) plus the
"ask cachy::ai" pill. The pill is a `<box>`/`<button>` with a `linear-gradient`
`background-image` and `color: var(--mauve)` SOLID text.

**Why**: GTK4 4.22 has NO `background-clip: text` / `-webkit-text-fill-color`, so
gradient-filled glyphs are impossible. Solid `var(--mauve)` on the gradient bg is
the accepted degradation (locked decision; flagged for verify). The `? ask AI`
hint and pill are COSMETIC — AI mode is deferred (no ollama in repo).

**Rejected**: rendering text as a drawn `Gtk.DrawingArea` with a gradient-clipped
Cairo paint. Cost: huge complexity for a cosmetic pill; loses font/accessibility.
Reject — accept the solid fallback.

### ADR-8: CSS extends `_widgets.scss` with new classes only

**Decision**: Add the following classes after the existing launcher block; reuse
existing tokens (`--mauve`, `--accent`, `--text`, `--dim`, `--bg2`, `--mantle`,
`--crust-50`, `--radius-inner`, `--t-base`). No token changes, no new partial.

| Class | Purpose | Key props |
|---|---|---|
| `.results-pill` | "N RESULTS" pill in search row | `color-mix(in oklab, var(--accent) 16%, transparent)` bg (matches existing `.app-item.selected` runtime color-mix test), tiny mono uppercase, `letter-spacing` |
| `.calc-banner` | calc result row above results | `background: var(--bg2)`, `border-radius: var(--radius-inner)`, accent left edge; `.calc-expr` (dim), `.calc-value` (`var(--mauve)` bold), `.calc-label` (dim), `.calc-copy` (kbd-style) |
| `.recent-row` / `.recent-chip` | RECENT chips strip | chip: `var(--bg2)` bg, `--radius-inner`, mono, `› name` leading glyph |
| `.section-label` | "RECENT" / "ALL APPS" labels | dim, 10px, uppercase, `letter-spacing: 0.08em` |
| `.app-grid` | the FlowBox | spacing via `row-spacing`/`column-spacing` set in `$` setter; tiles homogeneous |
| `.grid-tile` | a FlowBoxChild's inner box | padding, `--radius-inner`, `:hover { background: var(--bg2) }` |
| `.grid-tile-icon` | tile icon | `-gtk-icon-size: 40px` |
| `.grid-tile-name` | tile label | 11px, ellipsized via Pango in TSX, centered |
| `flowboxchild:selected .grid-tile` | selected tile | `color-mix(in oklab, var(--accent) 18%, transparent)` bg + accent border (mirrors `.app-item.selected`) |
| `.ai-pill` | "ask cachy::ai" | `background-image: linear-gradient(...)`, `color: var(--mauve)` SOLID (Risk 1 — note inline in SCSS comment that gradient TEXT is impossible) |
| `.row-enter` | trailing `⏎` on selected row | `visible` toggled in TSX; styled like `.kbd-hint` accent |
| `.match-prefix` / `.match-rest` | query-prefix highlight | prefix `color: var(--accent)` bold, rest `var(--text)` (two `<label>`s in a horizontal box) |

The SCSS comment above `.ai-pill` MUST state the gradient-text degradation
explicitly so verify and future readers know it's intentional.

**Why**: keeps the diff additive and within the established token system; reuses
the already-validated runtime `color-mix()` pattern from `.app-item.selected`.

### ADR-9: Integration points — nothing new wired

**Decision**: `app.ts` is UNCHANGED — `Launcher()` is already mounted as the
singleton overlay window (verified in desktop-redesign ADR / app.ts). `LauncherPill.tsx`
is UNCHANGED — it still calls `app.toggle_window("launcher")` by name. No new
window, no new service. The rewrite is contained to `Launcher.tsx` + the two new
`lib/` files + `_widgets.scss`.

**Why**: the window, the scrim/click-outside (`pick()` test pattern), the Esc
controller, and the launch path already exist; the redesign is internal to the
widget's body.

### ADR-10: Slice boundaries

**Slice 1 — Core UX** touches:
- `lib/calc.ts` (NEW — full evaluator + constants/functions table)
- `lib/launcher-history.ts` (NEW — full read/recordLaunch/atomic write)
- `Launcher.tsx` (selection model via `selectedIdx` + window key controller;
  results pill; selected `⏎` + prefix highlight; calc banner + `↵ copy`;
  `⌘↵` terminal launch; footer 5 hints + AI pill; RECENT chips)
- `_widgets.scss` (`.results-pill`, `.calc-banner` + children, `.recent-*`,
  `.section-label`, `.ai-pill`, `.row-enter`, `.match-*`)

**Slice 2 — App grid** touches:
- `Launcher.tsx` (ADD: "ALL APPS" section label + count; the `Gtk.FlowBox` `$`
  setter building `Gtk.FlowBoxChild` tiles from `apps.list`; wrap in
  `<scrolledwindow>`; query-empty visibility logic so grid shows when not
  searching)
- `_widgets.scss` (`.app-grid`, `.grid-tile`, `.grid-tile-icon`,
  `.grid-tile-name`, `flowboxchild:selected .grid-tile`)

Slice 1 ships and is smoke-tested before Slice 2 begins. Slice 2 adds only the
browse-grid surface; it does not alter the Slice 1 selection model for result
rows (it delegates tile selection to the FlowBox per ADR-2). Both commit straight
to `main` (solo-dev, no PRs — locked 2-slice delivery).

---

## Resolved Ambiguities

1. **Terminal for `⌘↵`** → `GLib.getenv("TERMINAL") || "kitty"`, spawned as
   `execAsync([term, "-e", app.executable])` (locked decision).
2. **Calc trigger** → ALWAYS-ON auto: every query passes through `evaluate`; the
   banner shows iff it returns non-`null`. No `=` prefix required (locked decision).
   The footer `= calc` hint stays as a cosmetic affordance.
3. **Clipboard tool** → `wl-copy` via `execAsync` (Wayland; `wl-clipboard` already
   present — `hyprland.lua` uses `wl-paste`). GTK `Gdk` clipboard is the documented
   fallback.
4. **Calc backend** → hand-rolled recursive-descent parser in `lib/calc.ts`, no
   `eval`/`Function`, no `qalc` dependency (locked decision).
5. **Grid tiles** → real `.desktop` icons via AstalApps `iconName`; no procedural
   gradient color map (locked + deferred).
6. **AI mode** → deferred; footer hint + pill are cosmetic, gradient text → solid
   `var(--mauve)` (locked decision).
7. **History store location** → `$XDG_STATE_HOME/ags/launcher-recents.json`
   (durable user state). Cap 8, MRU order, dedupe by `.desktop` id.
8. **Super-modifier detection** → `state & Gdk.ModifierType.SUPER_MASK` on the
   `key-pressed` signal's modifier arg.

---

## Constraint Compliance Matrix

| Constraint (GTK4 4.22 / AGS) | Design satisfies via |
|---|---|
| No width/height/max-width (min-* only) | Card uses `min-width`; grid scroll via `<scrolledwindow>` `maxContentHeight`; tile width via FlowBox `homogeneous` + `min-children-per-line` |
| No CSS grid/flex/position | 6-col grid via `Gtk.FlowBox` imperative `$` setter (ADR-6), not CSS grid |
| No `::before/::after`, no attribute selectors | `⏎` glyph + chip `›` are real `<label>`s; selection via `.selected`/`:selected` element state |
| No gradient-clipped text | AI pill = gradient bg + SOLID `var(--mauve)` text (ADR-7, Risk 1) |
| `color-mix`, transform, transition, linear-gradient bg, box-shadow OK | reused for pill/selected/banner/hover (matches existing `.app-item` block) |
| gnim intrinsics only (no flowbox/grid intrinsic) | FlowBox built imperatively in `$` setter (ADR-6) |
| AGS reactive: no `.as(arr=>arr.map())` | results/recent rendered via `<For each={accessor}>`; derived via `createComputed` (State Model) |
| No `eval`/`new Function` | recursive-descent parser (ADR-3) |
| Atomic file write | GLib write-temp-then-rename (ADR-4) |
| Window/scrim/Esc pattern preserved | unchanged window + `pick()` scrim + Esc controller (ADR-1, ADR-9) |

---

## Risks (architectural)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Window-level key controller also fires while typing; consuming printable keys would break the entry | Medium | High | Only `Up/Down/Enter/KP_Enter/Escape` return `true`; ALL other keyvals return `false` so the entry receives them. Verify by typing in apply smoke-test. |
| `Gtk.FlowBoxChild` wrapper omitted → silent no-op grid | Medium | High (Risk 2) | ADR-6 mandates the wrapper in the `$` setter; apply smoke-test must confirm tiles render and `child-activated` fires. |
| `selectedIdx` indexes past list on query shrink | Medium | High (Risk 3) | Single clamp site subscribed to `results` (State Model); arrow handlers also clamp. |
| Calc parser throws on pathological input on every keystroke | Low | Medium | `evaluate` wraps the whole pipeline in try/catch → returns `null`; parser is total. Property: never throws to caller. |
| `wl-copy` absent on a minimal system | Low | Low | `wl-clipboard` is already a dep (wl-paste in hyprland.lua); `Gdk` clipboard documented as fallback. |
| `$TERMINAL` set but lacks `-e` flag (exotic terminal) | Low | Low | `-e <cmd>` is the de-facto standard (xterm/kitty/alacritty/foot all honor it); kitty fallback covers the unset case. Accepted. |
| Runtime `color-mix()` may error on some GTK builds | Low | Low | Already in use at `.app-item.selected` (existing TEST comment in `_widgets.scss`); if it errors there it errors uniformly — revert both to token vars (`--accent-bg`/`--accent-border`). |
| Recents JSON corrupt after a crash | Low | Low | Atomic temp+rename (ADR-4) + try/catch read returning `[]`. |
| Gradient-text fidelity gap on AI pill | Confirmed | Low (cosmetic) | Accepted by design owner (Risk 1/6); SCSS comment documents the degradation for verify. |

---

## Next Recommended Phase

`sdd-tasks` — break this design into atomic tasks sequenced as Slice 1 then
Slice 2 (ADR-10), after the spec is also ready.
