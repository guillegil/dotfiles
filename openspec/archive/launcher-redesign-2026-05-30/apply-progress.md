# Apply Progress: launcher-redesign — Slice 1 + Slice 2

## Status: Slice 1 COMPLETE | Slice 2 COMPLETE (both smoke-confirmed on bare metal)

## Slice 1 Tasks Done
- [x] 1.1 lib/calc.ts — recursive-descent parser, never eval/new Function, constants+functions table, getLabel(), evaluate() total
- [x] 1.2 lib/launcher-history.ts — JSON recency store, Gio.File atomic write (temp+rename), readRecents/recordLaunch/getRecent
- [x] 1.3 Launcher.tsx rewrite — createState query/selectedIdx, createComputed results/calc, single clamp site via results.subscribe, window key controller (Up/Down/Enter/KP_Enter/Escape), launch/launchInTerminal, removeOnActivate
- [x] 1.4 Results count pill — REQ-LR-03
- [x] 1.5 selectedIdx-aware result rows — For<Apps.Application>, idx is Accessor<number>, createComputed for cssClasses/visible, prefix+rest labels
- [x] 1.6 Calculator banner — calc.as(c=>c!==null) visible, wl-copy, a11y
- [x] 1.7 RECENT chips — createState<string[]> + setRecent after each launch, For<string> over recent, apps.list.find(a=>a.entry===id)
- [x] 1.8 Footer — 5 hints + AI pill (cosmetic, D-LR-1)
- [x] 1.9 SCSS — .results-pill, .calc-banner (.calc-expr .calc-value .calc-label .calc-copy .calc-arrow), .recent-row, .recent-chip, .section-label, .ai-pill (SCSS comment documents D-LR-1), .row-enter, .match-prefix, .match-rest
- [x] 1.10 Smoke test — PASS (bare metal)

## Slice 2 Tasks Done
- [x] 2.1 ALL APPS section header — allApps = apps.list (static), launcher-section-header box with section-label "ALL APPS" + count, visible={query.as(q => q.length === 0)}
- [x] 2.2 Gtk.FlowBox grid in scrolledwindow $ setter — FlowBox built imperatively via new Gtk.FlowBox() + set_* methods, set_max/min_children_per_line(5, D-LR-3), set_homogeneous(true), set_selection_mode(SINGLE), set_row/column_spacing(8); tiles wrapped in new Gtk.FlowBoxChild() + set_child(buildGridTile(a)) + fb.append(child); child-activated connects to launch(gridApps[child.get_index()]); self.set_child(fb) sets it as scrolledwindow child (ADR-6)
- [x] 2.3 SCSS grid classes — .launcher-section-header, .app-grid-scroll, .app-grid, .grid-tile (hover/motion-off transition), .grid-tile-icon (-gtk-icon-size: 40px), .grid-tile-name (11px centered), flowboxchild:selected .grid-tile (color-mix accent bg + border)
- [x] 2.4 Smoke test — PASS (bare metal)

## Commits on main (apply phase)
- 17876bd — feat(launcher): add pure calc + history libs (Slice 1a)
- 4057791 — feat(launcher): rewrite Launcher.tsx + SCSS for Slice 1 Core UX
- 1d56ba2 — chore(sdd): mark Slice 1 tasks [x] in tasks.md (1.1-1.9 done)
- 5d3c4f4 — feat(launcher): add ALL APPS FlowBox grid (Slice 2)
- 7113c14 — chore(sdd): mark Slice 2 tasks [x] in tasks.md (2.1-2.3 done)

(Plus extensive post-apply polish on main: terminal `>` mode, calc Enter copies, grid nav, green accent #a6e3a1, Ask Cachy:ai gradient pill + hover animation, Arch pill icon, RECENT_LIMIT=5 + ellipsized chips fix, footer bottom-radius artifact fix.)

## Files Changed
- config/ags/lib/calc.ts (NEW, ~180 lines)
- config/ags/lib/launcher-history.ts (NEW, ~110 lines)
- config/ags/widget/Launcher.tsx (Slice 1 rewrite + Slice 2 additions, 474 lines total)
- config/ags/style/_widgets.scss (EXTENDED Slice 1 + Slice 2, +165 lines)

## Deviations / Discoveries
1. AstalApps.Application: `entry` property is the .desktop filename key (not desktop_id). `iconName` confirmed. `fuzzy_query(q)` returns GLib.List, sliceable in JS.
2. gnim Accessor API: `.get()` is deprecated in favour of `.peek()` for non-tracking reads; calling `accessor()` tracks it as a reactive dependency inside createComputed. Used `.peek()` for imperative reads in key controller.
3. `For` children callback: second arg is `Accessor<number>` (NOT plain number). Must call `idx()` inside createComputed for reactive tracking.
4. `recent` is createState (not createComputed) because getRecent() reads from GLib synchronously with no reactive deps — createComputed would only compute once. State is explicitly refreshed via setRecent(getRecent(RECENT_LIMIT)) after each launch.
5. No TextDecoder needed separately — Gio.File.load_contents returns Uint8Array that TextDecoder handles correctly, matching AGS's own file.ts pattern.
6. Results-pill visibility uses createComputed(() => query().length > 0 && results().length > 0) so both query and results changes trigger re-evaluation.
7. Slice 2 FlowBox: no `<flowbox>` intrinsic in this AGS build (ADR-6). Used `<scrolledwindow $={(self) => {...}}>` pattern — FlowBox created imperatively with set_* methods, then self.set_child(fb).
8. buildGridTile uses set_* methods exclusively (no constructor options) to avoid GJS camelCase mapping issues. Pango imported from "gi://Pango" for EllipsizeMode.
9. Result rows box `visible={query.as(q => q.length > 0)}` — mutually exclusive with the ALL APPS section (`visible={query.as(q => q.length === 0)}`). Calc banner bound to `calc.as(c => c !== null)`.
