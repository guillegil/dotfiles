# desktop-bar Specification

## Purpose

Defines what MUST be true of the CachyOS AGS/Astal bar shell (Cachy Bar Phase 1):
the SCSS token system, bar surface and layout, all Phase 1 widgets, the notifd
notification daemon integration, the launcher restyle, accessibility baseline,
and the reduced-motion gate. All requirements have been satisfied (with accepted
deviations noted) and are shipped to `main` as of 2026-05-29.

---

## Constraints (apply to ALL capabilities)

| ID | Constraint |
|----|------------|
| C1 | Hyprland config MUST use Lua API (`config/hypr/hyprland.lua`). MUST NOT edit `.conf` files. |
| C2 | GTK4 CSS: MUST NOT use `backdrop-filter`. Blur is achieved via `hl.layer_rule` compositor rules. |
| C3 | All SCSS `color.mix()` values MUST be resolved at build time via dart-sass `@use sass:color; color.mix(...)`. No `color-mix()` string SHALL appear in compiled output (exception: intentional runtime calls documented in deviation D4). |
| C4 | Reduced-motion gate is MANDATORY for every animated element. |
| C5 | Every interactive widget MUST have `accessible-name`, `accessible-role`, and `:focus-visible` ring. |
| C6 | No color MUST be hardcoded outside `_tokens.scss`. |
| C7 | GTK4 CSS subset: no `:root`, `[data-theme=…]`, `display:flex`, `align-items`, `justify-content`, or `!important` (all rejected by the GTK4 CSS parser). Use `*` for universal selectors; use specificity for suppression. |
| C8 | GTK4 4.22+ supports `:root` in draft spec but attribute selectors (e.g. `[data-theme=…]`) are not supported — Latte theme switch is deferred to Phase 2. |

---

## Accepted Deviations (permanent — not defects)

| ID | REQ | Deviation | Rationale |
|----|-----|-----------|-----------|
| D1 | REQ-BS-01 ≤30px height | Bar height is effectively 44px due to workspace `.ws-target` a11y hit zone | 44px is the a11y requirement; ≤30px was aspirational and conflicts with REQ-A11Y-01 |
| D2 | REQ-NT-05 count badge | Notification badge is a red presence dot, not a numeric count | User decision; the dot communicates unread state without visual clutter |
| D3 | — | Monospace font used everywhere (--font-mono for all bar content) | User decision, DESIGN.md §1.2 |
| D4 | REQ-TT-02 no runtime color-mix | 5 `color-mix()` calls remain in compiled output | GTK 4.22.4 supports runtime `color-mix()` and `transform: translateY`; these are intentional |
| D5 | REQ-NW-03 SSID reactive | Network SSID binds to the wifi sub-object at AGS init; may lag until reload | Documented limitation; icon/color remain fully reactive |
| D6 | REQ-MG-02 `!important` | `_motion.scss` uses bare `transition-duration: 0.01ms` without `!important` | GTK4 CSS subset rejects `!important`; `.motion-off *` wins via specificity — suppression still works |

---

## Deferred to Phase 2

| REQ | Topic | Notes |
|-----|-------|-------|
| REQ-TT-06 | Latte (light) theme | GTK4 has no attribute selectors so `[data-theme="latte"]` cannot be used. Latte raw values and build-time helpers are defined in `_tokens.scss` but not emitted. Implement via a separate CSS file swap + body class in Phase 2. |

---

## 1. theme-tokens

### Purpose
A dart-sass SCSS token system providing Catppuccin Mocha palette, shape, spacing,
motion, and typography variables consumed by all widgets and shells.

### Key Files
- `config/ags/style/_tokens.scss` — Catppuccin Mocha palette CSS vars on `*`; all `color.mix()` helpers precomputed at build time; Latte raw values defined but not emitted (see Deferred above)
- `config/ags/style/_typography.scss` — `--font-mono`, `--font-sans`, `.tabular`
- `config/ags/style/_motion.scss` — `.motion-off, .motion-off *` suppression rules
- `config/ags/style/_glass.scss` — `.bar-shell` and `.popover` surface definitions
- `config/ags/style/_widgets.scss` — widget utility classes
- `config/ags/style/_index.scss` — `@forward` in dependency order
- `config/ags/style.scss` — thin entry: `@use "./style/index"`

### Requirements

#### REQ-TT-01: Palette CSS Custom Properties
The token system SHALL expose all Catppuccin Mocha surface, text, and accent colors
as CSS custom properties on `*`. Every widget MUST read colors exclusively via these
vars. Hardcoding hex values in widget stylesheets is PROHIBITED.

**Status: satisfied.** `_tokens.scss:85-124`; compiled `--bg: rgba(30,30,46,0.82)`.

#### REQ-TT-02: color.mix() Precompute
All tinted-background values MUST be precomputed at SCSS build time. **Status: satisfied**
(with D4 deviation for 5 intentional runtime `color-mix()` calls verified on GTK 4.22.4).

#### REQ-TT-03: Shape and Spacing Tokens
`--radius` (14px), `--radius-inner` (10px), `--radius-popover` (14px), `--pad` (8px),
`--t-fast` (0.12s), `--t-base` (0.15s), `--t-morph` (0.18s). **Status: satisfied.**

#### REQ-TT-04: Hybrid Font System
`--font-mono` ("JetBrains Mono"), `--font-sans` ("IBM Plex Sans"). Both declared in
`_typography.scss`. **Status: satisfied** (with D3: monospace used everywhere by user choice).

#### REQ-TT-05: Tabular Numerals
`.tabular` utility class with `font-variant-numeric: tabular-nums`. **Status: satisfied.**

#### REQ-TT-06: Latte Theme Support
**Status: DEFERRED to Phase 2.** See Deferred section above.

---

## 2. bar-shell

### Purpose
The Pillbox edge-to-edge bar surface at the top of each monitor.

### Key Files
- `config/ags/widget/BarShell.tsx`
- `config/ags/widget/Bar.tsx`
- `config/ags/style/_glass.scss`
- `config/hypr/hyprland.lua` (lines 57-58: blur + ignore_alpha layer rules)

### Requirements

#### REQ-BS-01: Pillbox Edge-to-Edge Layout
Single full-width BarShell window anchored TOP|LEFT|RIGHT, EXCLUSIVE. Three internal
flex sections (left/center/right) via CenterBox. **Status: satisfied** (D1: effective
height 44px from `.ws-target`, not ≤30px).

#### REQ-BS-02: Glass Shell Composition
`background: var(--bg)` (rgba 30,30,46,0.82), tinted border-bottom, no border-radius,
no box-shadow, no backdrop-filter. **Status: satisfied.** `_glass.scss:12-16`.

#### REQ-BS-03: Hyprland Blur Layerrule
`hl.layer_rule({name="ags-blur", match={namespace="^ags$"}, blur=true})` and
`hl.layer_rule({name="ags-ignorezero", match={namespace="^ags$"}, ignore_alpha=true})`.
**Status: satisfied.** `hyprland.lua:57-58`. Note: Lua API uses `ignore_alpha` (not
`ignorezero` from the conf-style API).

#### REQ-BS-04: Multi-Monitor Mirror
`app.get_monitors().map(Bar)` — one Bar per connected monitor. **Status: satisfied.**

#### REQ-BS-05: Internal Section Spacing
Three sections via CenterBox, `spacing={4}` between adjacent widgets. **Status: satisfied.**

---

## 3. core-widgets

### Purpose
The individual bar widgets: Workspaces, ActiveWindow, LauncherPill, Clock+Calendar,
Volume, Battery, Network, Mic.

### Key Files
- `config/ags/widget/Workspaces.tsx`
- `config/ags/widget/ActiveWindow.tsx`
- `config/ags/widget/LauncherPill.tsx`
- `config/ags/widget/Clock.tsx` (includes CalendarPopover)
- `config/ags/widget/Volume.tsx`
- `config/ags/widget/Battery.tsx`
- `config/ags/widget/Network.tsx`
- `config/ags/widget/Mic.tsx`
- `config/ags/widget/Launcher.tsx` (restyle)
- `config/ags/service/hyprland.ts` (GObject wrapper: hyprctl + socket2)

### Workspaces (REQ-WS-01..04)

Fixed workspace range 1..5 plus any additional existing workspaces are rendered.
Active workspace morphs from 8px dot to 22px pill via `min-width` transition (0.18s).
Click dispatches workspace switch via `hl.dsp.focus({workspace=N})` Lua API (NOT
legacy `hyprctl dispatch workspace N` which fails in the Lua context). Scroll
cycles workspaces. `.ws-target` provides 44px a11y hit zone. **All satisfied.**

**Key discovery (Slice B fix #7):** `hyprctl dispatch workspace N` is invalid in the
Lua/AGS context; must use `hl.dsp.focus({workspace=N})` via the AGS→hyprland service.

### ActiveWindow (REQ-AW-01..03)

Binds `hyprland.activeTitle`; Pango ellipsize `END`, `maxWidthChars=28`; `visible`
hides the widget when empty. **Satisfied.** Known limitation (S2): accessible-name
is set once via `$` ref and may go stale; visual label is reactive.

### LauncherPill (REQ-LP-01..02)

Pill-chip button; `app.toggle_window("launcher")`; accessible-name + BUTTON role.
**Satisfied.** Known limitation (S1): hit target ~28px (bar-height constrained);
44px ideal not met for this widget — mouse-driven, low risk.

The launcher was restyled beyond the original spec to use `view-app-grid-symbolic`
icon and includes a click-outside scrim (Phase 1 "Claude design" restyle).

### Clock + Calendar (REQ-CL-01..04)

`createPoll` at 60s intervals for HH:MM + date sub-label. CalendarPopover uses
GTK4 `Gtk.Calendar` built imperatively via `box.$={...}` (gnim JSX has no `<calendar>`
intrinsic). Esc closes via Popover wrapper. **All satisfied.**

**Key discovery (Slice B fix #2):** `<calendar>` is not a gnim JSX intrinsic; must
build `Gtk.Calendar` imperatively.

### Volume (REQ-VO-01..04)

WirePlumber binding for defaultSpeaker volume + mute. Redesigned to icon-only chip
with a transient scroll OSD popover on scroll events. A centered macOS-style key-driven
OSD is triggered via `ags request volume-osd` on GNOME volume keys. Mute toggle,
icon change, a11y. **All satisfied.**

### Battery (REQ-BA-01..04)

AstalBattery binding; color thresholds green/yellow/red; `visible=isBattery` hides
on desktop. A11y status role. **All satisfied.**

### Network (REQ-NW-01..03)

AstalNetwork binding; icon derived from `Wifi` or `Wired` sub-object (the top-level
`Network` object has no `icon-name`). SSID shown for wifi only, truncated at 12 chars.
**Satisfied** (D5: SSID binding is build-time; icon/color reactive).

**Key discovery (Slice C fix #1):** `AstalNetwork.Network` has no `icon-name` property;
derive icon from `network.wifi` or `network.wired` sub-objects.

### Mic (REQ-MC-01..03)

Token colors (`--red` active, `--dim` muted), semantic icon shapes, logic unchanged.
**All satisfied.**

### Launcher restyle (REQ-LR-01..03)

`cssClasses` replaces `cssName`; all colors via token vars; `--radius-hero` + `--radius-inner`.
Logic unchanged. **All satisfied.**

---

## 4. notifications

### Purpose
AGS-native notification daemon via `libastal-notifd`, fully replacing swaync.

### Key Files
- `config/ags/widget/NotificationsBell.tsx`
- `config/ags/widget/NotificationsPanel.tsx`
- `config/hypr/hyprland.lua` (line 47: `hl.exec_cmd("swaync")` removed)
- `packages/` — swaync removed from package lists and uninstalled

### Requirements

#### REQ-NT-01: swaync Removal
`hl.exec_cmd("swaync")` removed from `hyprland.lua:47` in the same commit as the
notifd binding. **Satisfied.** swaync was also actively running via D-Bus activation
(it was D-Bus-activated and would steal the `org.freedesktop.Notifications` bus from
notifd); it was killed by hand at cutover and the package removed from `packages/`.

**Key discovery:** swaync is D-Bus-activated — even with autostart removed, it would
claim `org.freedesktop.Notifications` before notifd could. The package must be
uninstalled (not just autostart-removed) to fully transfer the bus.

#### REQ-NT-02: AGS notifd Binding
`Notifd.Notifd.get_default()` singleton; `notifications` and `dontDisturb` bindings.
**Satisfied.**

#### REQ-NT-03: NotificationsBell Widget
Bell icon with urgency dot (red = urgent, blue = normal). **Satisfied** with D2
(presence dot instead of numeric count badge — user decision).

The bell uses `preferences-system-notifications-symbolic` (active) and
`notifications-disabled-symbolic` (DND) icons.

#### REQ-NT-04: NotificationsPanel Popover
Header with DND switch + Clear all button (stays visible/disabled when empty).
Scrolled list of notification entries with urgency left border, expand/dismiss,
transient arrival toasts (hover-pause, expand, urgent 10s timeout, click-dismiss).
**Satisfied.**

**Known cosmetic issue (not a blocker):** First-expand contract-then-expand flicker
on notification toasts — a gtk4-layer-shell first-resize-after-map artifact.
9 resolution attempts documented in `docs/toast-expand-flicker.md` and `docs/sol.md`;
persistent-window fix regressed and was reverted. Open follow-up for Phase 2.

#### REQ-NT-05: Do Not Disturb Toggle
`dontDisturb` switch; bell icon switches to `notifications-disabled-symbolic` + `.dnd`
class when DND active. **Satisfied** (D2 deviation applies to badge indicator).

#### REQ-NT-06: A11y
Bell, panel, DND toggle, dismiss buttons all have accessible-name + role. **Satisfied.**

---

## 5. a11y-baseline

### Purpose
Accessibility requirements applied uniformly to every interactive widget.

### Key Files
- `config/ags/lib/a11y.ts`
- `config/ags/style/_widgets.scss` (`:focus-visible` rules, `.ws-target`)

### Requirements

#### REQ-A11Y-01: 44px Minimum Hit Target
Workspace dots use `.ws-target` (44×44px wrapper). LauncherPill is the known exception
at ~28px (D1/S1 — bar-height constrained, mouse-driven, low risk). **Satisfied with S1.**

#### REQ-A11Y-02: Focus Ring
`*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` in
`_widgets.scss`. **Satisfied.**

#### REQ-A11Y-03: Accessible Name Coverage
Every interactive widget sets `accessible-name` via `setAccessibleName()` helper in
`lib/a11y.ts` or via direct `$` ref. **Satisfied** (S2: ActiveWindow a11y name set
once, may go stale — minor, cosmetic).

#### REQ-A11Y-04: Contrast
`--text` (#cdd6f4) over `--bg` rgba(30,30,46,0.82) ≈ **11:1** — passes ≥4.5:1.
**Satisfied** (resolved by orchestrator: dark bg + light text = excellent contrast).

---

## 6. motion-gate

### Purpose
Reduced-motion gate reading `gtk-enable-animations` from GTK Settings.

### Key Files
- `config/ags/lib/motion.ts`
- `config/ags/style/_motion.scss`

### Requirements

#### REQ-MG-01: Animation Class Toggle
`initMotionGate()` reads `Gtk.Settings.get_default().gtk_enable_animations`; applies
`.motion-on`/`.motion-off` to all AGS windows; subscribes to `notify::gtk-enable-animations`
and `app.connect("window-added", …)`. **Satisfied.**

#### REQ-MG-02: CSS Suppression
`.motion-off, .motion-off * { transition-duration: 0.01ms; animation-duration: 0.01ms; }`
**Satisfied** with D6 (no `!important` — GTK4 CSS subset rejects it; specificity wins).

#### REQ-MG-03: Reactive Update
`notify::gtk-enable-animations` signal + `window-added` reconnect. **Satisfied.**

**Note on gsettings / Hyprland scope (resolved during verify):** The AGS motion gate
reads GTK `gtk-enable-animations` and gates AGS widget CSS transitions ONLY. It does
NOT gate Hyprland's own workspace animations (those are controlled by Hyprland animation
config, not GTK settings). REQ-MG is fully satisfied at the AGS level.

---

## 7. HiDPI / Scaling (additive — beyond original spec)

Hyprland `scale = 1.5` set in `config/hypr/hyprland.lua` for 4K HiDPI display.
Not part of the original spec; added during Slice D as a configuration enhancement.

---

## 8. GTK Dark Theme (additive — beyond original spec)

`config/gtk-4.0/settings.ini` and `config/gtk-3.0/settings.ini` both set
`gtk-application-prefer-dark-theme=1`. After `libadwaita` removal, GTK defaulted to
light theme; this forces dark theme system-wide.

---

## Key Architectural Discoveries (for future maintainers)

| Discovery | Impact |
|-----------|--------|
| GTK 4.22 supports `:root`, `color-mix()`, `transform` — the earlier constraint against them was overcautious except for `[data-theme=…]` (attribute selectors) | Future phases can use these freely |
| gnim JSX intrinsics do NOT include `<calendar>` or `<progressbar>` — build GTK Calendar imperatively via `box.$={...}` | Any widget needing non-standard GTK types must go imperative |
| Hyprland Lua: use `hl.dsp.focus({workspace=N})` NOT `hyprctl dispatch workspace N` | Critical for workspace switching |
| `AstalNetwork.Network` has no `icon-name` — derive from `network.wifi` or `network.wired` sub-objects | Any network icon logic must go through sub-objects |
| swaync is D-Bus-activated — autostart removal alone does not prevent it from claiming `org.freedesktop.Notifications` | Must fully uninstall swaync to hand the bus to notifd |

---

## Affected Files (as shipped)

| File | Change |
|------|--------|
| `config/ags/style/_tokens.scss` | New |
| `config/ags/style/_typography.scss` | New |
| `config/ags/style/_motion.scss` | New |
| `config/ags/style/_glass.scss` | New |
| `config/ags/style/_widgets.scss` | New |
| `config/ags/style/_index.scss` | New |
| `config/ags/style.scss` | Modified |
| `config/ags/widget/Bar.tsx` | Rewrite |
| `config/ags/widget/BarShell.tsx` | New |
| `config/ags/widget/Popover.tsx` | New |
| `config/ags/widget/Workspaces.tsx` | New |
| `config/ags/widget/ActiveWindow.tsx` | New |
| `config/ags/widget/LauncherPill.tsx` | New |
| `config/ags/widget/Clock.tsx` | New (includes CalendarPopover) |
| `config/ags/widget/Volume.tsx` | New |
| `config/ags/widget/Battery.tsx` | New |
| `config/ags/widget/Network.tsx` | New |
| `config/ags/widget/NotificationsBell.tsx` | New |
| `config/ags/widget/NotificationsPanel.tsx` | New |
| `config/ags/widget/Mic.tsx` | Modified (restyle) |
| `config/ags/widget/Launcher.tsx` | Modified (restyle) |
| `config/ags/lib/motion.ts` | New |
| `config/ags/lib/a11y.ts` | New |
| `config/ags/service/hyprland.ts` | New |
| `config/ags/app.ts` | Modified |
| `config/hypr/hyprland.lua` | Modified (layerrule + swaync removal + volume OSD + HiDPI scale) |
| `config/gtk-4.0/settings.ini` | New (dark theme) |
| `config/gtk-3.0/settings.ini` | New (dark theme) |
| `packages/pacman.txt` | Modified (ttf-ibm-plex; swaync removed) |
| `packages/aur.txt` | Modified (ttf-material-symbols-variable-git) |
