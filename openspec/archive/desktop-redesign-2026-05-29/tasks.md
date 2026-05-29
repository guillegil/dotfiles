---
source: engram
topic_key: sdd/desktop-redesign/tasks
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Tasks: desktop-redesign — Cachy Bar Phase 1

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Slice A estimated changed lines | ~420 |
| Slice B estimated changed lines | ~280 |
| Slice C estimated changed lines | ~240 |
| Slice D estimated changed lines | ~320 |
| Total estimated changed lines | ~1,260 |
| 400-line budget risk | High (total; per-slice: A=High, B=Low, C=Low, D=Low) |
| Chained PRs recommended | Yes |
| Suggested split | Slice A → main; Slice B → main; Slice C → main; Slice D → main |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| Slice A | SCSS token system + shell + Workspaces widget | PR 1 | Foundation — all later slices depend on tokens |
| Slice B | Info widgets: Clock, ActiveWindow, LauncherPill, Mic restyle, Launcher restyle | PR 2 | Depends on Slice A tokens + shell; independent of C/D |
| Slice C | System widgets: Volume, Battery, Network + lib/a11y.ts | PR 3 | Depends on Slice A; independent of D |
| Slice D | Notifications: notifd cutover + bell + panel + swaync removal | PR 4 | Depends on Slice A; swaync removal highest blast-radius — last for safety |

---

## Phase 0: Pre-flight (Slice 0 — before any code)

- [ ] 0.1 Confirm Hyprland ≥0.30: `pacman -Qi hyprland` — expected 0.55.2 (already verified by orchestrator; document in apply log). **small**
- [ ] 0.2 Lock IBM Plex package name: `pacman -Ss '^ttf-ibm-plex$'` — confirm in `extra` repo. **small**
- [ ] 0.3 Lock Material Symbols AUR package: `paru -Ss 'material.symbols'` — confirm `ttf-material-symbols-variable-git` or fallback `material-symbols-git`. **small**
- [ ] 0.4 Verify bun present: `bun --version` (AGS bundler peer dep). **small**
- [ ] 0.5 Verify dart-sass bundled by AGS: confirm `ags run` picks up `.scss` without separate sass install (check `env.d.ts` module declaration). **small**
- [ ] 0.6 Verify AGS notifd GIR exists: `ls /usr/share/gir-1.0/AstalNotifd-0.1.gir` — required for Slice D. **small**
- [ ] 0.7 Verify AstalBattery + AstalNetwork + AstalWp GIRs: `ls /usr/share/gir-1.0/AstalBattery-0.1.gir AstalNetwork-0.1.gir AstalWp-0.1.gir`. **small**
- [ ] 0.8 Confirm hyprctl accessible: `hyprctl version` — needed by `service/hyprland.ts`. **small**
- [ ] 0.9 Confirm `$HYPRLAND_INSTANCE_SIGNATURE` + `$XDG_RUNTIME_DIR` are set in the AGS launch environment (check via `ags run -- env`). **small**

---

## Phase 1: Slice A — Token System + Shell + Foundation (PR 1 → main)

*Satisfies: REQ-TT-01..06, REQ-BS-01..05, REQ-WS-01..04, REQ-MG-01..03 + ADR-1..5, ADR-9*

### 1a. Package list
- [x] 1.1 Append `ttf-ibm-plex` to `packages/pacman.txt`. **small** (`config/packages/pacman.txt`)
- [x] 1.2 Append `ttf-material-symbols-variable-git` to `packages/aur.txt`. **small** (`packages/aur.txt`)

### 1b. SCSS token system
- [x] 1.3 Create `config/ags/style/_tokens.scss`: Catppuccin Mocha palette vars on `:root` + `[data-theme="mocha"]`; all `color.mix()` helpers precomputed at build time; Latte override block `[data-theme="latte"]` (REQ-TT-01, REQ-TT-02, REQ-TT-06). **medium** (~120 lines)
- [x] 1.4 Create `config/ags/style/_typography.scss`: `--font-mono` (JetBrains Mono), `--font-sans` (IBM Plex Sans); `.tabular` utility class with `font-variant-numeric: tabular-nums`; heading/body weight vars (REQ-TT-04, REQ-TT-05). **small** (~40 lines)
- [x] 1.5 Create `config/ags/style/_motion.scss`: `.motion-off, .motion-off *` selector with `transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important` (REQ-MG-02; ADR-4). **small** (~20 lines)
- [x] 1.6 Create `config/ags/style/_glass.scss`: `.bar-shell` rule (rgba bg at 0.82 alpha, precomputed 6% tinted `border-bottom` only, NO `border-radius`, NO `box-shadow` — edge-to-edge Pillbox surface); `.popover` rule (full glass: rgba bg, tinted border, `border-radius: var(--radius)`, soft shadow); NO `backdrop-filter` anywhere (REQ-BS-02). **small** (~40 lines)
- [x] 1.7 Create `config/ags/style/_widgets.scss`: `.w`, `.w--chip`, `.w-sep` base classes; workspace `.ws-target` + `.ws` + `.ws.active` rules (ADR-9); `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` for all interactive widgets (REQ-A11Y-02). **medium** (~80 lines)
- [x] 1.8 Create `config/ags/style/_index.scss`: `@forward` all 5 partials in dependency order (tokens → typography → motion → glass → widgets). **small** (~8 lines)
- [x] 1.9 Modify `config/ags/style.scss`: replace current content with `@use "./style/index";` (thin entry). **small** (~2 lines)

### 1c. Lib: motion gate + a11y helpers
- [x] 1.10 Create `config/ags/lib/motion.ts`: `initMotionGate()` reads `Gtk.Settings.get_default().gtk_enable_animations`; applies `.motion-on`/`.motion-off` to all AGS windows; subscribes to `notify::gtk-enable-animations` + `app.connect("window-added", …)` for runtime updates (REQ-MG-01, REQ-MG-03; ADR-4). **small** (~40 lines)
- [x] 1.11 Create `config/ags/lib/a11y.ts`: `setAccessibleName(widget, name)` helper; `focusPad(widget)` that ensures ≥44px hit area via CSS min-width/height (REQ-A11Y-01, REQ-A11Y-03; ADR-6 caveat). **small** (~35 lines)

### 1d. Hyprland service wrapper
- [x] 1.12 Create `config/ags/service/hyprland.ts`: GObject subclass with `workspaces: number[]`, `activeWorkspace: number`, `activeTitle: string`, `activeClass: string` bindable properties; init via `hyprctl -j workspaces` + `hyprctl -j activewindow`; live updates via `Gio.SocketClient` reading `.socket2.sock` parsing `workspace>>N`, `activewindow>>CLASS,TITLE` events; `dispatch(cmd, ...args)` method (ADR-2; REQ-WS-01, REQ-AW-01). **large** (~120 lines)
- [x] 1.13 Smoke test `service/hyprland.ts` in isolation: `ags run` starts, workspaces property reflects `hyprctl workspaces` output, switching workspace updates `activeWorkspace` within one frame. **small** (manual verification — done in prior Slice A0 session)

### 1e. Shell widgets
- [x] 1.14 Create `config/ags/widget/BarShell.tsx`: single full-width edge-to-edge `Astal.Window` with `.bar-shell` CSS class, anchored TOP|LEFT|RIGHT (full monitor width), `exclusivity={Astal.Exclusivity.EXCLUSIVE}`, accepting `children` prop; no logic (REQ-BS-01, REQ-BS-02; ADR-3). **small** (~30 lines)
- [x] 1.15 Create `config/ags/widget/Popover.tsx`: generic layer-shell popover window (~30 lines); props: `name`, `anchor`, `margins`, `accessibleName`, `children`; Esc-to-close via `onKeyPressed`; `cssClasses={["popover"]}`; `accessibleRole={Gtk.AccessibleRole.DIALOG}` (ADR-6). **small** (~35 lines)
- [x] 1.16 Rewrite `config/ags/widget/Bar.tsx`: Pillbox edge-to-edge layout — single `BarShell` window full monitor width, with three internal flex sections via `justify-content: space-between`. Left section: `[Workspaces, LauncherPill]`; center section: `[Clock]` (placeholder for NowPlaying area in future slices); right section: `[Mic, Volume, Battery, Network, NotificationsBell]`; height ≤30px via CSS `max-height: 30px`; adjacent widgets within each section have `gap: 4px` (REQ-BS-01, REQ-BS-05; ADR-7). Render placeholder `<label label="…"/>` for not-yet-implemented widgets in this slice. **medium** (~80 lines)
- [x] 1.17 Create `config/ags/widget/Workspaces.tsx`: renders workspace buttons from `createBinding(hyprland, "workspaces")`; each button uses `.ws-target` outer + `.ws`/`.ws.active` inner; click calls `hyprland.dispatch("workspace", String(n))`; scroll-up/down cycles workspaces; `accessible-name="Workspaces"` on container; per-dot `accessible-label="Workspace N"` + `accessible-role=button` + ≥44px hit target via `.ws-target` (REQ-WS-01..04; ADR-9). **medium** (~75 lines)

### 1f. Hyprland Lua — layerrules only
- [x] 1.18 Modify `config/hypr/hyprland.lua`: add two `hl.layer_rule({…})` blocks immediately after the `hl.on("hyprland.start", …)` block (line ~52); add `blur=true` and `ignore_alpha=true` rules for namespace `^ags$` (REQ-BS-03; ADR-5). Keep swaync autostart line intact in this slice. **small** (~3 lines added). NOTE: Lua API field name is `ignore_alpha` (not `ignorezero` as conf-style) — see engram `dotfiles/hyprland/lua-api-quirks`.

### 1g. App entrypoint
- [x] 1.19 Modify `config/ags/app.ts`: add `initMotionGate()` call; keep existing `app.get_monitors().map(Bar)` call; keep `Launcher()` singleton mount; do NOT add `NotificationsPanel()` yet (that's Slice D) (ADR-7). **small** (~10 lines modified)

### 1h. Slice A verification
- [x] 1.20 `ags run` — Pillbox edge-to-edge bar renders; Hyprland blur visible behind bar; workspace dots/pill present and centered; switching workspace triggers pill morph; no `color-mix(` literal in source SCSS (verified via `rg 'color-mix\(' config/ags/style/` — only one match is inside a SCSS comment); no `backdrop-filter` (verified via `rg`). **small** (manual smoke test — PASSED on bare-metal 2026-05-27)
- [x] 1.21 Check `_tokens.scss` compiled output: no hex literals outside token file (`rg -n '#[0-9a-fA-F]{3,8}' config/ags/style/_widgets.scss` → zero matches). **small** (VERIFIED — zero matches)
- [ ] 1.22 Disable animations in GNOME settings (`gsettings set org.gnome.desktop.interface enable-animations false`): verify `.motion-off` class on root; workspace switch is instant. **small** (manual — DEFERRED, optional a11y check, will run at desktop-redesign verify phase before archive)

---

## Phase 2: Slice B — Info Widgets (PR 2 → main)

*Satisfies: REQ-AW-01..03, REQ-LP-01..02, REQ-CL-01..04, REQ-MC-01..03, REQ-LR-01..03*

- [x] 2.1 Create `config/ags/widget/ActiveWindow.tsx`: binds `createBinding(hyprland, "activeTitle")`; label clamped to ≤220px with `ellipsize={Pango.EllipsizeMode.END}`; renders nothing when empty (REQ-AW-01..03). **small** (~40 lines)
- [x] 2.2 Create `config/ags/widget/LauncherPill.tsx`: pill-chip button; `onClicked(() => app.toggle_window("launcher"))`; `accessible-name="Open launcher"`, `accessible-role=button`, ≥44px hit target (REQ-LP-01..02). **small** (~25 lines)
- [x] 2.3 Create `config/ags/widget/Clock.tsx`: `createPoll("", 60_000, "date '+%H:%M'")` for HH:MM label; tabular-nums class; sub-label `date '+%a · %b %-d'` in `--dim` color; click toggles `calendar` popover window via `app.toggle_window("calendar")`; `accessible-name="Clock, open calendar"`, `accessible-role=button` (REQ-CL-01..02, REQ-CL-04). **small** (~50 lines)
- [x] 2.4 Create Calendar portion of Clock: `Popover` wrapper with `name="calendar"`, `anchor=TOP`, `margin=[38,0,0,0]` (below bar); GTK4 `Calendar` widget inside; today highlighted via `cssClasses`; IBM Plex Sans for day labels (`.tabular` for numeric); Esc closes via Popover wrapper; `accessible-role=dialog`, `accessible-name="Calendar"` (REQ-CL-03). **medium** (~60 lines, same file or `widget/CalendarPopover.tsx`)
- [x] 2.5 Restyle `config/ags/widget/Mic.tsx`: replace all hardcoded color references with `var(--red)` for active/muted and `var(--dim)`/`var(--text)` for inactive; update icon selection to semantic muted-mic vs mic; logic untouched (REQ-MC-01..03). **small** (~20 lines changed)
- [x] 2.6 Restyle `config/ags/widget/Launcher.tsx`: replace all hardcoded colors with token vars (`--bg`, `--bg2`, `--bg3`, `--text`, `--dim`, `--accent`); apply `--radius-hero` to main card, `--radius-inner` to result rows; logic untouched (REQ-LR-01..03). **small** (~25 lines changed)
- [x] 2.7 Update `config/ags/widget/Bar.tsx`: replace placeholder label for left module with real `ActiveWindow` + `LauncherPill`; replace center placeholder with real `Clock`. **small** (~10 lines modified)
- [ ] 2.8 Slice B verification: `ags run`; ActiveWindow updates on focus change; long titles truncate; LauncherPill opens launcher; Clock ticks; Calendar opens/closes on click+Esc; Mic mute still works; Launcher still launches apps. **small** (manual smoke test)

---

## Phase 3: Slice C — System Widgets (PR 3 → main)

*Satisfies: REQ-VO-01..04, REQ-BA-01..04, REQ-NW-01..03, REQ-A11Y-01..04 (full pass)*

- [ ] 3.1 Create `config/ags/widget/Volume.tsx`: `AstalWp.get_default().audio` binding for `defaultSpeaker.volume` + `defaultSpeaker.mute`; percentage label (tabular); scroll ±5% clamped [0,1]; click toggles mute; icon reflects mute state (`--red` when muted); `accessible-name="Volume N%, click to mute"`, `accessible-role=button` (REQ-VO-01..04). **medium** (~65 lines)
- [ ] 3.2 Create `config/ags/widget/Battery.tsx`: `AstalBattery.get_default()` binding for `percentage` + `charging`; color thresholds via `createComputed` (>0.5→green, >0.2→yellow, ≤0.2→red) applied as CSS class; `visible={battery.as(b => b !== null && b.percentage >= 0)}` to hide on desktop (REQ-BA-01..03); `accessible-name="Battery N%, charging|discharging"`, `accessible-role=status` (REQ-BA-04). **medium** (~60 lines)
- [ ] 3.3 Create `config/ags/widget/Network.tsx`: `AstalNetwork.get_default()` binding for `connectivity` + `wifi.ssid` + `wifi.strength`; icon swap wifi/ethernet/disconnected; SSID shown only for wifi, truncated >12 chars; `--sky` for wifi, `--dim` for disconnected; `accessible-name` includes connection type (REQ-NW-01..03). **medium** (~65 lines)
- [ ] 3.4 Update `config/ags/widget/Bar.tsx`: replace right module placeholders with real `Volume`, `Battery`, `Network` widgets. **small** (~10 lines modified)
- [ ] 3.5 A11y audit pass (all Slice A+B+C widgets): verify every interactive widget has non-empty `accessible-name`, `accessible-role`, ≥44px hit target via `lib/a11y.ts` helpers; verify `:focus-visible` ring present in `_widgets.scss` (REQ-A11Y-01..03). **small** (grep + manual tab-focus test)
- [ ] 3.6 Contrast spot check: run `ags run` over dark wallpaper; screenshot bar; sample `--text` over rendered `--bg` chip; compute/eyeball ≥4.5:1 ratio (REQ-A11Y-04 procedure from design §Resolved Ambiguities #5). **small** (manual)
- [ ] 3.7 Slice C verification: Volume scroll/mute/icon work; Battery shows/hides correctly on laptop vs desktop; Network icon swaps on connection type; no regressions in Slice A/B widgets. **small** (manual smoke test)

---

## Phase 4: Slice D — Notifications Cutover (PR 4 → main)

*Satisfies: REQ-NT-01..06 (highest blast-radius — swaync removal + full notifd cutover)*

- [ ] 4.1 Create `config/ags/widget/NotificationsPanel.tsx`: `Popover` wrapper (`name="notifications-panel"`, `anchor=TOP|RIGHT`, `margin=[38,12,0,0]`); header row: count label + DND `<switch>` + "Clear all" button; `<Gtk.ScrolledWindow>` max-height ~600px; notification list from `createBinding(notifd, "notifications")`; per-row: app icon 24px + title (bold) + body (2-line clamp) + time (dim, mono) + × dismiss button; urgent rows get `cssClasses={["urgent"]}` (3px red left border via `_widgets.scss`); empty state label "No notifications"; all a11y (REQ-NT-04, REQ-NT-05, REQ-NT-06; ADR-8). **large** (~160 lines)
- [ ] 4.2 Create `config/ags/widget/NotificationsBell.tsx`: `Notifd.Notifd.get_default()` binding for `notifications.length`; badge overlay when count > 0; DND indicator class `.dnd` on bell icon when `dont-disturb=true`; click calls `app.toggle_window("notifications-panel")`; `accessible-name="Notifications, N unread"`, `accessible-role=button` (REQ-NT-03, REQ-NT-05, REQ-NT-06). **small** (~55 lines)
- [ ] 4.3 Add urgent row style to `config/ags/style/_widgets.scss`: `.notification-row.urgent { border-left: 3px solid var(--red); }` (REQ-NT-04 urgent styling). **small** (~5 lines)
- [ ] 4.4 Update `config/ags/app.ts`: add `NotificationsPanel()` singleton mount (the panel window, hidden by default) (REQ-NT-02; Integration Point #2 from design). **small** (~3 lines)
- [ ] 4.5 Update `config/ags/widget/Bar.tsx`: add `NotificationsBell` to right module (replacing placeholder if any). **small** (~5 lines modified)
- [ ] 4.6 Modify `config/hypr/hyprland.lua` line 47: DELETE `hl.exec_cmd("swaync")` from autostart block — ATOMIC with notifd cutover (REQ-NT-01; Design Integration #1). **small** (~1 line deleted)
- [ ] 4.7 Pre-removal verification: `pgrep swaync` returns 0 after `ags run` with updated config (REQ-NT-01 "no dual daemons"). **small** (manual)
- [ ] 4.8 Slice D verification (full): (a) send test notification via `notify-send "Test" "Body"`; (b) verify bell badge increments; (c) open panel; (d) dismiss single notification; (e) clear all; (f) toggle DND and verify no toast shown on next `notify-send`; (g) press Esc closes panel; (h) `pgrep swaync` → exit 1. **small** (manual smoke test)

---

## Cross-cutting Notes

- `lib/a11y.ts` ships in Slice A (needed by Workspaces hit-target helper); full a11y audit runs in Slice C after all interactive widgets exist.
- `widget/Popover.tsx` ships in Slice A (needed by Clock's calendar in Slice B and NotificationsPanel in Slice D).
- `config/hypr/hyprland.lua` is touched in two slices: Slice A (layerrules ADD) and Slice D (swaync REMOVE). Keep both changes in their respective PRs — the intermediate state (layerrules + swaync still running) is safe.
- Standard Mode: no test runner. All verification is manual smoke-test at slice boundaries. No unit test tasks.

---

## Per-Slice Workload Summary

```
Slice A: ~420 changed lines, 14 files (11 new, 3 modified)
Slice B: ~275 changed lines, 8 files (4 new, 4 modified)
Slice C: ~230 changed lines, 5 files (3 new, 2 modified)
Slice D: ~320 changed lines, 6 files (3 new, 3 modified)

Total: ~1,245 changed lines

Chained PRs recommended: Yes
400-line budget risk: High (Slice A exceeds 400-line budget by ~20 lines; B/C/D are Low)
Decision needed before apply: Yes
```

Slice A is the only slice at risk of exceeding 400 lines. Options if user wants strict budget: extract `service/hyprland.ts` (~120 lines) into a Slice A0 PR, reducing Slice A to ~300 lines. Flagged for orchestrator decision before apply.
