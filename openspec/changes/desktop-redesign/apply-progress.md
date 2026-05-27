---
source: engram
topic_key: sdd/desktop-redesign/apply-progress
exported_at: 2026-05-27
---

# Apply Progress: desktop-redesign — Slice A0 + Slice A + Slice B

## Completed Tasks (Slice A0 — service/hyprland.ts only)

- [x] 1.12 Create `config/ags/service/hyprland.ts`: GObject subclass with `workspaces: number[]`, `activeWorkspace: number`, `activeTitle: string`, `activeClass: string` bindable properties using gnim `@register()` + `@property()` decorators; init via `hyprctl -j workspaces` + `hyprctl -j activewindow`; live updates via `Gio.SocketClient` + `Gio.DataInputStream.read_line_async` reading `.socket2.sock` parsing `workspace>>N`, `workspacev2>>N,name`, `createworkspace>>`, `destroyworkspace>>`, `activewindow>>CLASS,TITLE`, `closewindow>>` events; `dispatch(cmd, ...args)` method via `execAsync`; polling fallback (250ms GLib.timeout_add); singleton via `Hyprland.get_default()` (ADR-2; REQ-WS-01, REQ-AW-01). 137 lines.
- [x] 1.13 (partial — smoke-tested in Slice A0 session; `ags bundle` clean)

## Completed Tasks (Slice A — foundation)

Commit: `996960f` — `feat(ags): Pillbox bar foundation — token system, shell, Workspaces`

- [x] 1.1 packages/pacman.txt: ttf-ibm-plex
- [x] 1.2 packages/aur.txt: ttf-material-symbols-variable-git
- [x] 1.3 config/ags/style/_tokens.scss: Catppuccin Mocha + Latte, precomputed color.mix()
- [x] 1.4 config/ags/style/_typography.scss: --font-mono, --font-sans, .tabular
- [x] 1.5 config/ags/style/_motion.scss: .motion-off/* with 0.01ms durations
- [x] 1.6 config/ags/style/_glass.scss: .bar-shell (no border-radius/box-shadow/backdrop-filter) + .popover
- [x] 1.7 config/ags/style/_widgets.scss: .w, .w--chip, .w-sep, .ws-target, .ws, .ws.active, .mic.*, :focus-visible, .launcher-*, .notification-row.urgent
- [x] 1.8 config/ags/style/_index.scss: @forward in dependency order
- [x] 1.9 config/ags/style.scss: @use "./style/index"
- [x] 1.10 config/ags/lib/motion.ts: initMotionGate() with Gtk.Settings notify + window-added
- [x] 1.11 config/ags/lib/a11y.ts: setAccessibleName() + focusPad()
- [x] 1.14 config/ags/widget/BarShell.tsx: edge-to-edge Astal.Window, TOP|LEFT|RIGHT, EXCLUSIVE
- [x] 1.15 config/ags/widget/Popover.tsx: layer-shell overlay, Esc-to-close, .popover, DIALOG role
- [x] 1.16 config/ags/widget/Bar.tsx: Pillbox CenterBox layout, placeholder slots for B/C/D
- [x] 1.17 config/ags/widget/Workspaces.tsx: binding on workspaces+activeWorkspace, dot/pill morph, click+scroll dispatch, .ws-target 44px
- [x] 1.18 config/hypr/hyprland.lua: hl.layer_rule blur + ignorezero for ^ags$
- [x] 1.19 config/ags/app.ts: initMotionGate() added

## Static Verification Results (Slice A)

- color-mix() in style output: 0 matches
- backdrop-filter in style output: 0 matches
- hex literals in _widgets.scss: 0
- ags bundle: exits 0; sass compile: exits 0
- hl.layer_rule in hyprland.lua: 2 active lines (57-58)

## Pending (manual smoke tests — USER ACTION)

- [ ] 1.20 ags run smoke test (Slice A visual check)
- [ ] 1.22 gsettings disable-animations -> .motion-off class check

---

## Completed Tasks (Slice B — info widgets)

Commit: `5b36822` — `feat(ags): Slice B info widgets — Clock, ActiveWindow, LauncherPill, Mic+Launcher restyle`

- [x] 2.1 `config/ags/widget/ActiveWindow.tsx`: `createBinding(hyprland, "activeTitle")`; Pango.EllipsizeMode.END; `max_width_chars=28` (~220px equiv); `visible={title.as(t => t !== "")}` zero-alloc empty state. 42 lines. (REQ-AW-01..03)
- [x] 2.2 `config/ags/widget/LauncherPill.tsx`: pill-chip button; `app.toggle_window("launcher")`; accessible-name="Open launcher", BUTTON role; `set_size_request(44, 44)`. 31 lines. (REQ-LP-01..02)
- [x] 2.3 `config/ags/widget/Clock.tsx`: `createPoll("", 60_000, "date '+%H:%M'")` for HH:MM; date sub-label `createPoll("", 60_000, "date '+%a · %b %-d'")` in --dim color; `app.toggle_window("calendar")` on click; accessible-name="Clock, open calendar", BUTTON role. ~50 lines. (REQ-CL-01..02, REQ-CL-04)
- [x] 2.4 `CalendarPopover` export in Clock.tsx: Popover wrapper `name="calendar"`, anchor=TOP, margins=[38,0,0,0]; GTK4 `<calendar>` widget; `.tabular` class; IBM Plex Sans via .calendar-widget CSS; Esc via Popover wrapper; accessible-name="Calendar"; mounted singleton in app.ts. (REQ-CL-03)
- [x] 2.5 `config/ags/widget/Mic.tsx` restyle: added a11y accessible-name + BUTTON role + dynamic label via state.subscribe; colors token-driven via _widgets.scss (pre-existing from Slice A). Logic unchanged. (REQ-MC-01..03)
- [x] 2.6 `config/ags/widget/Launcher.tsx` restyle: cssName→cssClasses; class attr→cssClasses; a11y label; all colors via .launcher-box/--radius-hero and .app-item/--radius-inner in SCSS. Logic unchanged. (REQ-LR-01..03)
- [x] 2.7 `config/ags/widget/Bar.tsx`: left section [Workspaces, LauncherPill, ActiveWindow]; center [Clock]; right unchanged (placeholders for C/D). (REQ-BS-05 fulfilled)
- [x] also: `config/ags/app.ts` mounts CalendarPopover singleton
- [x] also: `config/ags/style/_widgets.scss` extended with .clock, .clock-time, .clock-date, .active-window, .launcher-pill, .calendar-popover, .calendar-widget
- [x] also: `config/ags/style/_typography.scss` fixed :root → * (GTK4 CSS compliance; pre-existing Slice A bug)

## Static Verification Results (Slice B)

- `rg 'color-mix\(' config/ags/style/` → 0 actual matches (comment only)
- `rg 'backdrop-filter' config/ags/style/` → 0 actual matches (comment only)
- `rg 'display:\s*flex|align-items|justify-content' config/ags/style/` → 0 matches
- `rg ':root\b|\[data-theme' config/ags/style/` → 0 matches (comments only after fix)
- `rg '!important' config/ags/style/` → 0 matches
- `rg '#[0-9a-fA-F]{3,8}' config/ags/widget/{Mic,Launcher,Clock,ActiveWindow,LauncherPill}.tsx config/ags/style/_widgets.scss` → 0 matches
- `ags bundle config/ags/app.ts` → exits 0, 519KB bundle
- `sass config/ags/style.scss` → exits 0, 0 color-mix(), 0 backdrop-filter in output

## Pending (manual smoke tests — USER ACTION)

- [ ] 2.8 `ags run` smoke: Clock ticks, Calendar opens/closes via click+Esc, ActiveWindow updates on focus, LauncherPill opens launcher, Mic mute works, Launcher launches apps.

## Risks / Flags for Slice B Smoke Test

1. **Calendar positioning**: Popover anchor=TOP with margin=[38,0,0,0]. If calendar appears at wrong edge, may need to also set LEFT anchor or adjust horizontal offset.
2. **GTK4 Calendar today**: GTK Calendar marks today automatically. `.tabular` class ensures day numbers don't reflow.
3. **Clock first poll**: `createPoll` may fire asynchronously — brief empty display on first mount is expected. First value arrives after the shell command completes.
4. **Launcher cssClasses vs cssName**: Changed from cssName to cssClasses for Slice B — functionally equivalent in AGS v3, verify .launcher-box styles still apply visually.

## Next Apply Batch (Slice C)

Tasks 3.1–3.7: Volume.tsx, Battery.tsx, Network.tsx + Bar.tsx right section wiring + a11y audit.
