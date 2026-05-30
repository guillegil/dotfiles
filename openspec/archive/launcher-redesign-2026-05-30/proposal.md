# Proposal: launcher-redesign

## Intent

The AGS app launcher (`config/ags/widget/Launcher.tsx`) is a Phase-1 skeleton: scrim + card, a search row, a flat `<For>` result list with always-first-selected, and a 3-hint footer. It does not match the "Claude design" reference (`docs/assets/App-Launcher.png`), which is a Spotlight/Raycast-class launcher with keyboard navigation, a results counter, an auto-evaluating calculator banner, recent-command chips, a 6-column app grid, and a richer footer. This change brings the launcher up to that reference within the practical limits of GTK4 4.22 — closing the visible fidelity gap and turning the launcher into the primary, fast keyboard-driven entry point it was designed to be. We do it now because the design reference is frozen and the Phase-1 skeleton is the last major widget still off-spec.

## Scope (in)

Delivered as **2 sequential commit batches** ("slices") straight to `main` (solo-dev, no PRs). Each slice is independently smoke-tested before the next begins.

### Slice 1 — Core UX
- Arrow-key navigation (`↑`/`↓`) with a `selectedIdx` state; clamp to `min(idx, len-1)` whenever the query (and thus result count) changes.
- "N RESULTS" pill in the search row, bound to the live result count.
- Selected-row affordances: trailing `⏎` glyph visible only on the selected row, plus query-prefix highlight (matched prefix rendered distinct from the remainder).
- **Auto calculator banner** (always-on): every query is attempted as math; if it resolves, a calc banner is shown above the app results (Spotlight/Raycast style, no `=` prefix required). Backed by a hand-rolled JS evaluator + a constants table (π, e, φ, √2, …) in a new `lib/calc.ts`. The banner exposes `↵ copy` to copy the result.
- `⌘↵` (SUPER+Enter) launches the selected app in a terminal.
- Footer: 5 hints (`↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? ask AI`) plus the "ask cachy::ai" pill rendered as gradient background with solid `var(--mauve)` text (GTK4 cannot clip gradient into text — see Risks).
- RECENT command chips, backed by a new `lib/launcher-history.ts` (JSON persistence via GLib atomic write). AstalApps `frequency` is a usage *count*, not recency, so recency must be tracked separately.

### Slice 2 — App grid
- "ALL APPS" section label + app count.
- 6-column app grid built with `Gtk.FlowBox` (`max-children-per-line=6`), constructed imperatively in a `$` setter (no CSS grid / no intrinsic `<flowbox>` in this AGS build). Each app wrapped in a `Gtk.FlowBoxChild`.
- Tiles use **real `.desktop` icons** (AstalApps `iconName`), not procedural gradient tiles.
- Grid wrapped in a `<scrolledwindow>` viewport.
- Tile selection integrated into the same keyboard-navigation model as the result rows.

## Scope (out / deferred)
- **AI "? ask AI" mode** — no ollama anywhere in the repo; the footer hint and pill stay cosmetic. This is a separate multi-file feature.
- **Per-app gradient tile color map** — tiles use real icons; the reference's gradient tiles need a per-app color map, deferred.
- **Custom caret blink** — the native GTK entry caret already blinks with `caret-color`; no custom animation.
- **`qalc` dependency** — the JS evaluator is the primary and only calc path; no runtime dependency added.

## Approach summary
(High level — detailed mechanics are the next-phase design.)

- **Selection model**: a single `selectedIdx` state drives both result-row selection and (Slice 2) tile selection. A key controller intercepts `Up`/`Down`/`Enter`/`SUPER+Enter`; `selectedIdx` is re-clamped on every query change so it never points past the result list.
- **Calculator**: `lib/calc.ts` exposes a pure evaluator — a small tokenizer + recursive-descent (or shunting-yard) parser over `+ - * / ^ ( )` and a constants table. No raw `eval()` / `new Function`. Returns `null` for non-math input so the banner only appears when a query resolves.
- **History**: `lib/launcher-history.ts` reads/writes a JSON file under the AGS state dir using GLib atomic write (write-temp-then-rename) to survive rapid open/close toggling. Exposes recent entries for the RECENT chips and a "record launch" call.
- **App grid**: a `$` setter on the `Gtk.FlowBox` builds `Gtk.FlowBoxChild` wrappers imperatively from the AstalApps list, inside a `<scrolledwindow>`.
- **Styling**: extend `config/ags/style/_widgets.scss` for the pill, calc banner, recent chips, grid tiles, and the AI pill (gradient bg + solid text).
- Existing open/close/launch behavior (scrim click-outside, Esc, app activation) is preserved.

## Risks
1. **Gradient text is impossible in GTK4 4.22** (no `background-clip:text` / `-webkit-text-fill-color`) → the "ask cachy::ai" pill degrades to solid `var(--mauve)` text on a gradient background. This is the single biggest fidelity gap and is accepted.
2. **`Gtk.FlowBox` requires `Gtk.FlowBoxChild` wrappers** — adding a child without the wrapper is a silent runtime no-op, not a compile error. The `$` setter must wrap every tile.
3. **`selectedIdx` clamping** — must re-clamp to `min(idx, len-1)` on every query change or selection can index past the list (out-of-range / wrong-row bug magnet).
4. **Calculator sandboxing** — must use a hand-rolled parser, never raw `eval()` / `new Function`; the evaluator must reject/ignore non-arithmetic input safely.
5. **History file atomic write** — rapid launcher toggling can corrupt a naive write; use GLib write-temp-then-rename.
6. **Gradient-text degradation** acceptance — the design owner accepts the solid-text fallback (carried from Risk 1, flagged here for the verify phase).

## Affected files
- `config/ags/widget/Launcher.tsx` — rewrite (selection model, calc banner, recent chips, app grid, footer).
- `config/ags/style/_widgets.scss` — expand (`.launcher-*`, pill, calc banner, recent chips, grid tiles, AI pill).
- `config/ags/lib/launcher-history.ts` — **NEW** (JSON recent-command persistence via GLib atomic write).
- `config/ags/lib/calc.ts` — **NEW** (safe JS arithmetic evaluator + constants table).

## Acceptance
- The launcher visually matches the reference layout (`docs/assets/App-Launcher.png`, `DESIGN.md` §6) within documented GTK4 limits (notably the gradient-text fallback).
- Keyboard navigation, results pill, auto calculator banner with copy, `⌘↵` terminal launch, recent chips, and the 6-column real-icon app grid all function.
- Existing open / close (scrim + Esc) / app-launch behavior is preserved.
- No new runtime dependencies (no `qalc`); the calculator is pure JS with no `eval()`.
