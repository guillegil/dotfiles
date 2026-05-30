# Exploration: launcher-redesign

Target: bring the AGS app launcher to the full "Claude design" reference
(`docs/assets/App-Launcher.png`). Current launcher is a Phase-1 skeleton.

## Current state
`config/ags/widget/Launcher.tsx` — full-screen scrim + centered 18px card;
search row (icon + entry + esc kbd); `<For>` result list with real `.desktop`
icons, always-first-selected; 3-hint footer. No arrow-key nav, no app grid, no
recent commands, no calculator banner, no AI pill. Scrim-click-outside + Esc
close work. `caret-color: var(--accent)` already styled.
CSS in `config/ags/style/_widgets.scss` (`.launcher-*`, `.app-item`, `.kbd`).

## Target breakdown (reference)
Search row (magnifier + query + blinking caret + "N RESULTS" pill + esc) ·
calculator banner (`calc fi → 1.618033 · golden ratio` + `↵ copy`) · result rows
(icon tile + name + desc, selected = accent border + `⏎`) · RECENT chips
(› kitty › zen …) · ALL APPS · N + 6-col gradient app grid (one tile selected) ·
footer (`↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? ask AI` + gradient
"ask cachy::ai" pill). Exact values: `DESIGN.md` §6, `design/HANDOFF.md` §7,
`design/src/popovers.jsx` (AppLauncher/AppTile/ResultRow).

## Per-element feasibility

| Element | Feasible? | GTK4 note | Recommendation |
|---|---|---|---|
| Native entry caret | YES | blinks natively w/ `caret-color` | no custom blink |
| "N RESULTS" pill | YES | `color-mix` bg works | bind `results.length` |
| Arrow nav ↑↓ | YES | intercept KEY_Up/Down in key controller | add `selectedIdx` state, clamp on query change |
| Selected `⏎` glyph | YES | conditional `<label>` | `visible={selected}` |
| Query-prefix highlight | YES | two `<label>`s | standard |
| Calculator banner | PARTIAL | `qalc` maybe absent; raw `eval()` unsafe | hand-rolled JS evaluator + constants table; qalc optional |
| RECENT chips | YES + persistence | `AstalApps.frequency` is a COUNT, not recency | custom `launcher-recent.json` via GLib atomic write |
| 6-col grid | YES (workaround) | NO CSS grid; NO `<flowbox>`/`<grid>` intrinsic | `Gtk.FlowBox` (`max-children-per-line=6`) via `$` setter, OR nested rows of 6 |
| Scrollable grid | YES | `<scrolledwindow>` IS intrinsic | wrap grid |
| AppTile gradient bg | YES | `linear-gradient` background-image works | optional |
| AppTile gradient TEXT | **NO (hard)** | no `background-clip:text` / `-webkit-text-fill-color` | degrade to solid `var(--mauve)` |
| ⌘↵ terminal launch | YES | check SUPER mask on key-pressed | kitty / `$TERMINAL` |
| "? ask AI" mode | DEFER | no ollama anywhere in repo | footer hint cosmetic only |

## Recommended scope (2 slices)
- **Slice 1 — Core UX (~400 lines):** arrow nav + selection index; results pill;
  selected `⏎` + prefix highlight; calculator banner (`=` trigger + safe JS eval +
  constants table); ⌘↵ terminal; footer 5 hints + AI pill (gradient bg, solid
  text); RECENT chips + `lib/launcher-history.ts` (JSON, GLib I/O).
- **Slice 2 — App grid (~200 lines):** ALL APPS label + count; `Gtk.FlowBox` 6-col
  via `$` setter; scrolledwindow; real icons (gradient color-map optional later).
- **Deferred:** AI ask mode (separate multi-file feature); per-app gradient tile
  color map; custom caret blink.

## Risks
1. Gradient text impossible in GTK4 → "ask cachy::ai" degrades to solid (biggest fidelity gap).
2. `Gtk.FlowBox` needs `Gtk.FlowBoxChild` wrappers — silent no-op if missed (runtime-only bug).
3. Calculator eval must be sandboxed (no raw `eval()`); a ~20-line parser beats `new Function`.
4. `selectedIdx` must clamp to `min(idx, len-1)` on query change (bug magnet).
5. History file: use GLib atomic write to avoid rapid-toggle corruption.
6. `qalc` would add a runtime dep — keep JS path primary.

## Open questions for the user
1. Calculator backend: JS eval + constants table (default), or shell out to `qalc` (units/constants, needs install)?
2. App grid tiles: real `.desktop` icons (system-consistent) or procedural gradient tiles (reference look, needs per-app color map)?
3. Terminal for ⌘↵: hardcode `kitty` or read `$TERMINAL`?
4. Calc trigger: `=` prefix only, or always-try-evaluate every query?
5. Delivery: one PR (~550 lines, needs size exception) or split Slice 1 / Slice 2?

(Authoritative copy: engram `sdd/launcher-redesign/explore`, id 38.)
