---
source: engram
topic_key: sdd/desktop-redesign/spec
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Spec: desktop-redesign — Cachy Bar Phase 1

## Constraints (apply to ALL capabilities)

- Hyprland config MUST use Lua API (`config/hypr/hyprland.lua`). MUST NOT edit `.conf` files for Phase 1 changes.
- GTK4 CSS: MUST NOT use `backdrop-filter`, runtime `color-mix()`, or CSS `transform` keyframe animations.
- All `color-mix()` calls MUST be resolved at SCSS build time via `dart-sass` `color.mix()`.
- Glass blur MUST be achieved via Hyprland `hl.layerrule("blur", "ags")` + `hl.layerrule("ignorezero", "ags")`.
- Reduced-motion is MANDATORY for every animated element.
- Every interactive widget MUST have `accessible-name`, `accessible-role`, ≥44px hit target, and `:focus-visible` ring.
- No color MUST be hardcoded outside a palette token variable.

---

## 1. theme-tokens

### Purpose
A dart-sass SCSS token system providing Catppuccin Mocha palette, shape, spacing, motion, and typography variables consumed by all widgets and shells.

### Requirements

#### REQ-TT-01: Palette CSS Custom Properties
The token system SHALL expose all Catppuccin Mocha surface, text, and accent colors as CSS custom properties on `:root` / `[data-theme="mocha"]`. Every widget MUST read colors exclusively via these vars. Hardcoding hex values in widget stylesheets is PROHIBITED.

##### Scenario: Token consumption
- GIVEN the SCSS build has completed
- WHEN a widget stylesheet references `var(--mauve)` or `var(--green)`
- THEN the rendered color matches the Catppuccin Mocha palette value from `tokens.css`

##### Scenario: No hardcoded colors
- GIVEN the compiled CSS is inspected
- WHEN any widget rule is found
- THEN no hex or rgb literal appears outside `_tokens.scss`

#### REQ-TT-02: color.mix() Precompute
All tinted-background values that would require `color-mix()` at runtime MUST be precomputed at SCSS build time using `@use sass:color; color.mix(...)`. No `color-mix()` string SHALL appear in the compiled `.css` output.

##### Scenario: Tinted bg build
- GIVEN `_tokens.scss` defines a tinted bg helper
- WHEN `dart-sass` compiles the bundle
- THEN the emitted CSS contains `rgba(...)` or `#rrggbbaa` values, NOT `color-mix(...)`

#### REQ-TT-03: Shape and Spacing Tokens
The token system SHALL expose `--radius` (14px default), `--radius-inner` (10px), `--radius-popover` (14px), `--pad` (8px default), and motion vars `--t-fast` (0.12s), `--t-base` (0.15s), `--t-morph` (0.18s) on `:root`.

##### Scenario: Radius inheritance
- GIVEN a widget uses `border-radius: var(--radius-inner)`
- WHEN the token sheet loads
- THEN the computed border-radius is 10px

#### REQ-TT-04: Hybrid Font System
Bar chips, numerals, and data labels SHALL use `--font-mono` ("JetBrains Mono", fallbacks). Popover prose (calendar date labels, notification body, multi-line text) SHALL use `--font-sans` ("IBM Plex Sans", fallbacks). Both vars MUST be declared in `_typography.scss`.

##### Scenario: Bar chip font
- GIVEN the Clock widget renders in the bar
- WHEN computed font-family is inspected
- THEN it resolves to "JetBrains Mono" (or first available monospace fallback)

##### Scenario: Popover prose font
- GIVEN the Calendar popover renders month day labels
- WHEN computed font-family is inspected
- THEN it resolves to "IBM Plex Sans" (or first available sans fallback)

#### REQ-TT-05: Tabular Numerals
All numeric display elements (clock digits, percentage values, badge counts, calendar day numbers) MUST apply `font-variant-numeric: tabular-nums`. The `.tabular` utility class SHALL provide this.

##### Scenario: Clock layout stability
- GIVEN the Clock widget ticks from 09:59 to 10:00
- WHEN the digit changes
- THEN the chip width does not shift (tabular-nums prevents reflow)

#### REQ-TT-06: Latte Theme Support
The token system SHALL expose a `[data-theme="latte"]` selector with all surface/text/accent vars overridden to Catppuccin Latte values, with `bar_bg` alpha 0.92.

##### Scenario: Theme swap
- GIVEN `data-theme="latte"` is set on the root element
- WHEN any widget reads `var(--bg)`
- THEN the computed value matches `rgba(239,241,245,0.92)`

---

## 2. bar-shell

### Purpose
The Aurora 3-module floating bar surface: three independent BarShell containers (left / center / right) positioned at the top of each monitor with Hyprland-compositor blur applied.

### Requirements

#### REQ-BS-01: Aurora 3-Module Layout
`Bar.tsx` SHALL render three independent floating BarShell modules — left, center, right — horizontally distributed along the top edge. Each module is a separate GTK Layer Shell window or a positioned container. The bar height MUST NOT exceed 30px in any resting state.

##### Scenario: Three modules present
- GIVEN AGS starts with the Aurora layout
- WHEN the top bar is rendered
- THEN three visually separated glass-surface containers appear at the top of the monitor

##### Scenario: Height constraint
- GIVEN the bar is rendered
- WHEN the GTK allocation height is measured
- THEN it is ≤30px

#### REQ-BS-02: Glass Shell Composition
Each BarShell MUST apply: `background: var(--bg)` (rgba at 0.82 alpha Mocha / 0.92 Latte), `border: 1px solid` precomputed tinted border (7% --text mix), `border-radius: var(--radius)` (14px), shadow `0 8px 28px -8px rgba(0,0,0,0.45)` plus inset highlight. MUST NOT use CSS `backdrop-filter` (GTK4 does not support it; blur comes from Hyprland layerrule).

##### Scenario: Glass appearance without backdrop-filter
- GIVEN the compiled bar-shell CSS is inspected
- WHEN the `.bar-shell` rule is found
- THEN `backdrop-filter` does not appear; background uses rgba with alpha

#### REQ-BS-03: Hyprland Blur Layerrule
`config/hypr/hyprland.lua` SHALL add `hl.layerrule("blur", "ags")` and `hl.layerrule("ignorezero", "ags")`. These lines MUST appear in the same commit as the BarShell changes.

##### Scenario: Blur layerrule active
- GIVEN the Lua config is loaded by Hyprland
- WHEN the AGS bar namespace is matched
- THEN compositor blur is applied behind all BarShell surfaces

#### REQ-BS-04: Multi-Monitor Mirror
The bar MUST render identically on every connected monitor. All monitors share the same widget state in Phase 1 (no per-monitor workspace filtering). `app.ts` SHALL iterate `gdkmonitor` list and mount the same Bar instance per monitor.

##### Scenario: Dual monitor
- GIVEN two monitors are connected
- WHEN AGS starts
- THEN a bar appears on both monitors with identical layout and state

#### REQ-BS-05: Module Gap
The three Aurora modules SHALL have a gap of 10–12px between them (not a single continuous bar).

##### Scenario: Visual gap
- GIVEN the three modules are rendered
- WHEN the pixel distance between module edges is measured
- THEN it is between 10px and 12px

---

## 3. core-widgets

### 3a. Workspaces

#### REQ-WS-01: Hyprland Workspace Binding
The Workspaces widget SHALL subscribe to the `libastal-hyprland` service and reactively display all currently existing workspaces. The active workspace indicator MUST update within one render frame of a `workspace` Hyprland event.

##### Scenario: Workspace switch
- GIVEN the bar is running
- WHEN the user switches to workspace 3
- THEN the indicator for workspace 3 becomes active immediately

#### REQ-WS-02: Dot/Pill Morph
Inactive workspaces SHALL render as 8px diameter dots. The active workspace SHALL morph to a pill shape via `min-width` transition (width animates from 8px to 22px) over 0.18s. MUST NOT use CSS `transform: scaleX`.

##### Scenario: Active morph
- GIVEN workspace 2 is inactive (dot)
- WHEN the user activates workspace 2
- THEN the dot expands to a pill via min-width transition over 0.18s

##### Scenario: Reduced motion
- GIVEN `gtk-enable-animations` is false and `.motion-off` is on root
- WHEN the workspace changes
- THEN the morph occurs instantly (no transition delay)

#### REQ-WS-03: Click to Switch
Clicking a workspace dot/pill SHALL call `hyprland.dispatch("workspace", n)`. Scroll-up/scroll-down on the widget SHALL cycle workspaces.

##### Scenario: Click switch
- GIVEN workspace 4 exists
- WHEN the user clicks the workspace 4 indicator
- THEN the active workspace becomes 4

#### REQ-WS-04: A11y
The Workspaces widget container SHALL have `accessible-name: "Workspaces"`. Each dot/pill SHALL have `accessible-label: "Workspace N"` and `accessible-role: button`. Hit target for each dot SHALL be padded to ≥44px via invisible padding even when the dot is 8px wide.

---

### 3b. ActiveWindow

#### REQ-AW-01: Title Binding
ActiveWindow SHALL subscribe to `libastal-hyprland` active client title. The displayed text MUST update within one render frame of a `activewindow` Hyprland event.

##### Scenario: Window focus change
- GIVEN a terminal and a browser are open
- WHEN the user focuses the browser
- THEN the ActiveWindow chip displays the browser's title

#### REQ-AW-02: Ellipsis
The title label SHALL be clamped to a max width (≤220px) with text-overflow ellipsis. Overflow MUST NOT expand the bar height or push sibling widgets.

##### Scenario: Long title
- GIVEN a window has a title exceeding 220px
- WHEN the bar renders
- THEN the title is truncated with "…" and the bar width is unchanged

#### REQ-AW-03: Empty State
When no window is active (all workspaces empty), the widget SHALL render nothing (zero width) or display a configured placeholder, but MUST NOT crash or emit an error.

---

### 3c. LauncherPill

#### REQ-LP-01: Launcher Trigger
LauncherPill SHALL render as a pill-styled chip. Clicking it SHALL call `App.toggle_window("launcher")` (or equivalent AGS v2 API) to open the existing Launcher overlay. No new launcher logic is introduced in this widget.

##### Scenario: Opens launcher
- GIVEN the Launcher window exists in AGS
- WHEN the user clicks LauncherPill
- THEN the Launcher overlay becomes visible

#### REQ-LP-02: A11y
LauncherPill SHALL have `accessible-name: "Open launcher"` and `accessible-role: button`. Hit target ≥44px.

---

### 3d. Clock + Calendar Popover

#### REQ-CL-01: Time Display
The Clock widget SHALL display the current local time in `HH:MM` format using tabular numerals. The label SHALL update every 60 seconds (or on the minute boundary).

##### Scenario: Minute change
- GIVEN the clock shows "14:29"
- WHEN the system clock advances to 14:30
- THEN the widget updates to "14:30" within 5 seconds of the minute boundary

#### REQ-CL-02: Date Sub-label
Below or adjacent to the time, a sub-label SHALL display the weekday, abbreviated month, and date (e.g., "Mon · May 26") using `--dim` color and `--font-mono`.

#### REQ-CL-03: Calendar Popover
Clicking the Clock widget SHALL toggle a Calendar popover widget. The Calendar popover:
- SHALL display the current month grid
- SHALL highlight today's date with `var(--accent)` fill
- SHALL use IBM Plex Sans for day labels and `--font-mono` for numeric dates (tabular-nums)
- SHALL be dismissible via Escape key and click-outside
- SHALL render below the bar with `--radius-popover` (14px) corners

##### Scenario: Calendar opens
- GIVEN the bar is running
- WHEN the user clicks the Clock chip
- THEN the Calendar popover becomes visible with the current month

##### Scenario: Calendar dismisses on Esc
- GIVEN the Calendar popover is open
- WHEN the user presses Escape
- THEN the popover closes

#### REQ-CL-04: A11y
Clock widget: `accessible-name: "Clock, open calendar"`, `accessible-role: button`. Calendar popover root: `accessible-role: dialog`, `accessible-name: "Calendar"`.

---

### 3e. Volume

#### REQ-VO-01: WirePlumber Binding
The Volume widget SHALL subscribe to `libastal-wireplumber` (WirePlumber) for current output volume level (0–100). The displayed percentage MUST update reactively.

##### Scenario: Volume change
- GIVEN the bar is running
- WHEN the user changes system volume via any external method
- THEN the Volume chip percentage updates within one render frame

#### REQ-VO-02: Scroll to Adjust
Scroll-up on the widget SHALL increase volume by 5%. Scroll-down SHALL decrease by 5%. Volume SHALL be clamped to [0, 100].

##### Scenario: Scroll up at 95
- GIVEN volume is at 95%
- WHEN the user scrolls up once on the Volume widget
- THEN volume becomes 100% (clamped)

#### REQ-VO-03: Mute Toggle
Clicking the Volume widget SHALL toggle mute state. The icon SHALL change to indicate mute (semantic color `--red` or muted icon). Percentage label SHALL remain visible showing pre-mute level.

##### Scenario: Mute toggle
- GIVEN volume is unmuted at 60%
- WHEN the user clicks the Volume chip
- THEN audio is muted, icon reflects mute state, "60%" label remains

#### REQ-VO-04: A11y
Volume widget: `accessible-name: "Volume N%, click to mute"`, `accessible-role: button`.

---

### 3f. Battery

#### REQ-BA-01: AstalBattery Binding
Battery widget SHALL subscribe to `libastal-battery` for charge level (0–100) and charging state. Display SHALL update reactively.

##### Scenario: Battery update
- GIVEN the laptop is discharging at 75%
- WHEN the system reports 74%
- THEN the widget updates to "74%" within one render frame

#### REQ-BA-02: Color Thresholds
Battery percentage SHALL render in semantic colors:
- >50%: `var(--green)`
- >20% and ≤50%: `var(--yellow)`
- ≤20%: `var(--red)`

##### Scenario: Critical battery
- GIVEN battery is at 15%
- WHEN the widget renders
- THEN the text and icon use `var(--red)`

#### REQ-BA-03: Hide on Desktop
The Battery widget SHALL not render (zero allocation) when no battery is detected by AstalBattery (i.e., desktop environment without a battery). The slot MUST be vacated — no empty space left.

##### Scenario: Desktop without battery
- GIVEN the system has no battery device
- WHEN the bar renders
- THEN the Battery widget is absent with no reserved space

#### REQ-BA-04: A11y
Battery widget: `accessible-name: "Battery N%, charging|discharging"`, `accessible-role: status`.

---

### 3g. Network

#### REQ-NW-01: AstalNetwork Binding
Network widget SHALL subscribe to `libastal-network` (NetworkManager) for connection type and SSID. State SHALL update reactively.

#### REQ-NW-02: Icon Swap
When connected via Wi-Fi, the widget SHALL display the Wi-Fi icon (`var(--sky)` color) and SSID (truncated if >12 chars). When connected via Ethernet, the widget SHALL display an Ethernet icon and omit SSID. When disconnected, the widget SHALL display a disconnected icon in `var(--dim)` color.

##### Scenario: Wifi connected
- GIVEN network is connected to "HomeNetwork"
- WHEN the widget renders
- THEN a Wi-Fi icon and "HomeNetwork" label appear in `var(--sky)` color

##### Scenario: Ethernet
- GIVEN network is connected via Ethernet
- WHEN the widget renders
- THEN an Ethernet icon appears; no SSID label is shown

##### Scenario: Disconnected
- GIVEN network is disconnected
- WHEN the widget renders
- THEN a disconnected icon appears in `var(--dim)` color

#### REQ-NW-03: A11y
`accessible-name: "Network: [wifi SSID | ethernet | disconnected]"`, `accessible-role: status`.

---

### 3h. Mic (restyle)

#### REQ-MC-01: Token Adoption
Mic widget SHALL be restyled to use palette token vars exclusively. All hardcoded colors SHALL be replaced with `var(--red)` for active/muted state and `var(--dim)` or `var(--text)` for inactive state.

#### REQ-MC-02: Logic Preservation
The existing mute/unmute logic and WirePlumber/PipeWire binding MUST remain unchanged. Only CSS classes and color references are modified.

##### Scenario: Mute preserved
- GIVEN the Mic widget was previously toggling mute
- AFTER the restyle is applied
- THEN clicking the Mic widget still toggles microphone mute state

#### REQ-MC-03: Semantic State Icons
Active mic SHALL display mic icon in `var(--red)`. Muted mic SHALL display muted-mic icon in `var(--dim)`. States MUST be distinguishable without relying on color alone (icon shape differs).

---

## 4. notifications

### Purpose
AGS-native notification daemon via `libastal-notifd`, replacing swaync as the notification handler. Phase 1 includes bell widget + full notifications panel with history, dismiss, and clear-all.

### Requirements

#### REQ-NT-01: swaync Autostart Removal
`config/hypr/hyprland.lua` SHALL have `hl.exec_cmd("swaync")` removed from autostart in the SAME commit that introduces AGS notifd binding. MUST NOT leave both running simultaneously.

##### Scenario: No dual daemons
- GIVEN the Phase 1 config is applied
- WHEN `pgrep swaync` is run
- THEN swaync is not running (it was not autostarted)

##### Scenario: swaync package retained
- GIVEN the Phase 1 packages are installed
- WHEN `pacman -Qi swaync` is run
- THEN swaync is still installed (as fallback; only autostart is removed)

#### REQ-NT-02: AGS notifd Service Binding
AGS MUST import `libastal-notifd` and subscribe to the D-Bus `org.freedesktop.Notifications` interface. Incoming notifications MUST be captured and stored in reactive state accessible to all notification widgets.

##### Scenario: Notification received
- GIVEN AGS is running with notifd active
- WHEN an application sends a D-Bus notification
- THEN it appears in the reactive notification list within one render frame

#### REQ-NT-03: NotificationsBell Widget
A `NotificationsBell.tsx` widget SHALL appear in the bar's right module displaying a bell icon. When unread notifications exist, a count badge (integer) SHALL overlay the bell. Clicking the bell SHALL toggle the NotificationsPanel popover.

##### Scenario: Badge appears
- GIVEN 3 unread notifications exist
- WHEN the bar renders
- THEN the bell icon shows a badge with "3"

##### Scenario: No badge when empty
- GIVEN notification list is empty
- WHEN the bar renders
- THEN no badge is shown on the bell icon

##### Scenario: Opens panel
- GIVEN the NotificationsPanel is closed
- WHEN the user clicks the bell
- THEN the NotificationsPanel popover opens

#### REQ-NT-04: NotificationsPanel Popover
The NotificationsPanel SHALL be a popover widget (styled per `.popover` token class) containing:
- A header row: notification count label + DND toggle button + "Clear all" button
- A scrollable list of notification entries, each showing: app icon, title, body (truncated to 2 lines), and a dismiss (×) button
- Urgent notifications SHALL display a 3px left border in `var(--red)`
- "Clear all" SHALL dismiss all notifications from notifd state
- Per-notification dismiss (×) SHALL remove that single notification from notifd state

##### Scenario: Dismiss single
- GIVEN 3 notifications are in the panel
- WHEN the user clicks the × on notification 2
- THEN notifications 1 and 3 remain; notification 2 is gone

##### Scenario: Clear all
- GIVEN 5 notifications are in the panel
- WHEN the user clicks "Clear all"
- THEN the notification list is empty and the bell badge disappears

##### Scenario: Urgent notification styling
- GIVEN a notification with urgency=critical is received
- WHEN it appears in the panel
- THEN it has a 3px `var(--red)` left border

##### Scenario: Panel dismisses on Esc
- GIVEN the NotificationsPanel is open
- WHEN the user presses Escape
- THEN the panel closes

#### REQ-NT-05: Do Not Disturb Toggle
The DND toggle in the panel header SHALL suppress new notification popups (toast banners) when active. The bell icon in the bar SHALL display a visual indicator when DND is on (e.g., line through icon or `--dim` color).

##### Scenario: DND suppresses popups
- GIVEN DND is toggled on
- WHEN a new notification arrives
- THEN no toast banner appears; the notification is stored in history only

#### REQ-NT-06: A11y
NotificationsBell: `accessible-name: "Notifications, N unread"`, `accessible-role: button`. NotificationsPanel: `accessible-role: dialog`, `accessible-name: "Notifications"`. DND toggle: `accessible-name: "Do not disturb"`, `accessible-role: switch`. Each dismiss button: `accessible-name: "Dismiss [notification title]"`, `accessible-role: button`.

---

## 5. launcher-restyle

### Purpose
Restyle the existing `Launcher.tsx` to Catppuccin Mocha token palette. No functional changes.

### Requirements

#### REQ-LR-01: Token Adoption
All color references in Launcher SCSS/inline styles SHALL be replaced with palette token vars. The search input, result rows, and background SHALL use `--bg`, `--bg2`, `--bg3`, `--text`, `--dim`, `--accent` accordingly.

#### REQ-LR-02: Logic Preservation
Launch behavior, search filtering, keyboard navigation, and open/close toggle MUST remain identical to the pre-restyle implementation.

##### Scenario: Launch still works
- GIVEN the launcher is restyled
- WHEN the user types an app name and presses Enter
- THEN the application launches as before

#### REQ-LR-03: Radius and Shape
The launcher overlay SHALL use `--radius-hero` (18px) for the main card and `--radius-inner` for result rows.

---

## 6. a11y-baseline

### Purpose
A11y requirements applied uniformly to every interactive widget in the bar.

### Requirements

#### REQ-A11Y-01: 44px Minimum Hit Target
Every clickable or interactive widget element SHALL have a minimum hit area of 44×44px. If the visual element is smaller (e.g., 8px dot), invisible padding or an overlay element SHALL extend the touch/click target.

##### Scenario: Small workspace dot hit target
- GIVEN a workspace dot is 8px diameter
- WHEN the clickable hit area is measured via GTK allocation + padding
- THEN the interactive region is ≥44×44px

#### REQ-A11Y-02: Focus Ring
Every interactive widget SHALL display a visible focus ring when focused via keyboard navigation. The ring SHALL be rendered via `:focus-visible` CSS selector and use `var(--accent)` color with 2px outline offset.

##### Scenario: Keyboard focus visible
- GIVEN the user tabs to the Volume widget
- WHEN the widget has focus
- THEN a visible `var(--accent)` outline ring appears

#### REQ-A11Y-03: Accessible Name Coverage
Every interactive widget MUST have a non-empty `accessible-name` attribute. Widgets with dynamic state MUST include that state in the accessible-name (e.g., "Volume 60%, click to mute").

#### REQ-A11Y-04: Contrast
Bar chip text MUST achieve ≥4.5:1 contrast ratio against the rendered glass background (including alpha compositing over the actual wallpaper). This SHALL be verified once per widget during implementation smoke-test.

##### Scenario: Contrast check
- GIVEN `--text` (#cdd6f4) over `--bg` (rgba 30,30,46,0.82)
- WHEN contrast is computed (assuming dark wallpaper beneath)
- THEN the ratio is ≥4.5:1

---

## 7. motion-gate

### Purpose
A reduced-motion gate that reads GTK's `gtk-enable-animations` setting and conditionally suppresses all animations.

### Requirements

#### REQ-MG-01: Animation Class Toggle
`config/ags/lib/motion.ts` SHALL read `gtk-enable-animations` via GSettings (or equivalent GLib API). When the value is `false`, SHALL add CSS class `.motion-off` to the AGS root element. When `true`, SHALL add `.motion-on`.

##### Scenario: Animations disabled
- GIVEN `gtk-enable-animations` is set to false in GNOME settings
- WHEN AGS starts (or reloads)
- THEN `.motion-off` is present on the root element

##### Scenario: Default motion-on
- GIVEN `gtk-enable-animations` is true (default)
- WHEN AGS starts
- THEN `.motion-on` is present on the root element

#### REQ-MG-02: CSS Suppression
Under `.motion-off`, ALL CSS transitions and animations SHALL be collapsed to ≤0.01s or disabled via `transition-duration: 0.01ms` and `animation-duration: 0.01ms`. This MUST be implemented in `_motion.scss` using a `.motion-off *` selector rule.

##### Scenario: Motion-off suppresses transition
- GIVEN `.motion-off` is on root
- WHEN the active workspace changes (would normally animate pill morph)
- THEN the transition completes instantly (imperceptibly fast)

#### REQ-MG-03: Reactive Update
If `gtk-enable-animations` changes at runtime (e.g., user toggles it in GNOME accessibility settings), the `.motion-on`/`.motion-off` class SHALL update within the same AGS reload cycle or via a GSettings change signal.

---

## Acceptance Criteria Summary

| Capability | Observable Signal |
|---|---|
| theme-tokens | `dart-sass` compiles without error; no `color-mix()` in output CSS; `--font-mono` and `--font-sans` both resolve |
| bar-shell | Three modules visible; height ≤30px; no CSS `backdrop-filter` in compiled output; Hyprland blur visible |
| workspaces | Active dot expands to 22px pill on switch; click switches workspace; reduced-motion collapses transition |
| active-window | Title updates on focus change; long titles ellipsize without layout shift |
| launcher-pill | Click opens launcher; launch works post-restyle |
| clock | Updates on minute; calendar opens/closes on click/Esc |
| volume | Percentage reactive; scroll ±5%; mute toggle changes icon; accessible-name includes current % |
| battery | Color threshold changes at 50%/20%; widget absent on desktop; accessible-name includes charging state |
| network | Icon swaps wifi/ethernet/disconnected; SSID shown for wifi only |
| mic | Mute still works post-restyle; token colors used; red=active, dim=muted |
| notifications | swaync not running; notifd captures notifications; bell badge count accurate; panel dismiss/clear-all work; DND suppresses toasts; no dual daemons |
| launcher-restyle | Token colors; launch behavior unchanged |
| a11y | Every interactive widget has accessible-name; all hit targets ≥44px; focus rings visible; chip text ≥4.5:1 contrast |
| motion-gate | `.motion-off` class present when gtk-enable-animations=false; all transitions suppressed under it |

---

## Affected Files (spec-level)

| File | Change |
|---|---|
| `config/ags/style/_tokens.scss` | New |
| `config/ags/style/_typography.scss` | New |
| `config/ags/style/_motion.scss` | New |
| `config/ags/style/_glass.scss` | New |
| `config/ags/style.scss` | Modified (imports partials) |
| `config/ags/widget/Bar.tsx` | Modified (Aurora 3-module) |
| `config/ags/widget/BarShell.tsx` | New |
| `config/ags/widget/Workspaces.tsx` | New |
| `config/ags/widget/ActiveWindow.tsx` | New |
| `config/ags/widget/LauncherPill.tsx` | New |
| `config/ags/widget/Clock.tsx` | New |
| `config/ags/widget/Volume.tsx` | New |
| `config/ags/widget/Battery.tsx` | New |
| `config/ags/widget/Network.tsx` | New |
| `config/ags/widget/NotificationsBell.tsx` | New |
| `config/ags/widget/NotificationsPanel.tsx` | New |
| `config/ags/widget/Mic.tsx` | Modified (restyle) |
| `config/ags/widget/Launcher.tsx` | Modified (restyle) |
| `config/ags/lib/motion.ts` | New |
| `config/ags/lib/a11y.ts` | New |
| `config/hypr/hyprland.lua` | Modified (layerrule + swaync removal) |
| `packages/aur.txt` | Modified (fonts) |
