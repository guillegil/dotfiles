---
source: engram
topic_key: sdd/desktop-redesign/design
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Design: desktop-redesign — Cachy Bar Phase 1 architecture

## Executive Summary

A reactive, token-driven AGS shell built on three pillars: (1) a dart-sass SCSS partial system whose `_tokens.scss` is the single source of truth for every color/radius/motion var; (2) a flat widget catalog under `config/ags/widget/` where each widget is one `.tsx` file owning one Astal service binding; (3) thin support libs (`lib/motion.ts`, `lib/a11y.ts`, `service/hyprland.ts`) that abstract cross-cutting concerns. Hyprland integration uses `hyprctl` JSON + socket2 subscription (NOT a missing `libastal-hyprland`). Notifications use `libastal-notifd` with `Notifd.get_default()` as the singleton state source. Glass effect = Hyprland `hl.layerrule("blur", "ags")` + rgba background (NEVER `backdrop-filter`).

---

## Pattern + Layering

### Architectural Pattern: **Reactive Widget Composition over Service Bindings**

- AGS/Astal is a reactive JSX-on-GTK4 runtime. Each widget is a pure function `(props?) => JSX` that returns a GTK widget tree with `bind(service, "prop")` expressions wherever state-driven UI is needed.
- No global store, no Redux-style state. Each service (`Wp.get_default()`, `Notifd.get_default()`, `Battery.get_default()`, our `Hyprland.get_default()` wrapper) is a long-lived GObject singleton; widgets subscribe via `createBinding(service, "propName")` from `ags`.
- Cross-widget state (e.g., "is the calendar popover open?") is held in module-scope `createState` cells, NOT in a global store. Popover ownership lives in the widget that opens it.

### Layering (3 thin layers, no further nesting)

```
app.ts                      ← entrypoint: mounts Bar per monitor, mounts Launcher,
                              calls Motion.init() once
   │
   ├── widget/*.tsx         ← presentation layer: JSX + Astal bindings + on-click handlers
   │                          one file per widget, no shared widget base class
   │
   ├── lib/*.ts             ← cross-cutting helpers (pure utilities, no JSX)
   │     ├── motion.ts      ← reduced-motion gate (REQ-MG-01..03)
   │     └── a11y.ts        ← accessible-name builder, focus-target padding helper
   │
   └── service/*.ts         ← service wrappers (only where Astal lacks a binding)
         └── hyprland.ts    ← hyprctl JSON + socket2 subscription wrapped as GObject
```

Why no `components/` (atomic) split? Single-developer dotfiles repo; widgets in the bar are leaves, not compositions. A `Chip`, `Pill`, `Badge` abstraction layer would add ceremony without payoff. Composition happens via SCSS utility classes (`.w`, `.w--chip`, `.tabular`).

### Boundaries

| Boundary | Rule |
|---|---|
| Widget ↔ Widget | NEVER import another widget except `Bar.tsx` which composes them. `LauncherPill` does NOT import `Launcher`; it calls `app.toggle_window("launcher")` by name. |
| Widget ↔ Service | Widget owns the `createBinding`/`createPoll` call. Service wrappers expose properties + signals only, never JSX. |
| Widget ↔ Style | Widgets reference `cssClasses` strings; ALL color/radius/motion values live in SCSS. Zero inline `style=` props except for dynamic `min-width` (workspace morph) — and even that uses `cssClasses` if a discrete state class suffices. |
| Style ↔ Tokens | Only `_tokens.scss` defines hex/rgba literals. Every other partial uses `var(--…)`. |
| SCSS ↔ GTK4 | Pre-compile `color-mix()` via `@use sass:color; color.mix(…)`. NEVER emit `color-mix(`, `backdrop-filter`, or `transform`-keyframe animations. |

---

## File Tree (canonical)

```
config/ags/
├── app.ts                          [modified] mount Bar per monitor, mount Launcher,
│                                              mount NotificationsPanel (hidden), Motion.init()
├── env.d.ts                        [unchanged]
├── tsconfig.json                   [unchanged]
├── package.json                    [unchanged] — ags already pulls dart-sass
├── style.scss                      [modified] becomes thin entry: `@use "./style/index";`
├── style/
│   ├── _index.scss                 [new] forwards all partials in correct order
│   ├── _tokens.scss                [new] Catppuccin Mocha + Latte vars, color.mix() helpers
│   ├── _typography.scss            [new] --font-mono, --font-sans, .tabular, font weights
│   ├── _motion.scss                [new] :root.motion-on/.motion-off rules
│   ├── _glass.scss                 [new] .bar-shell, .popover, shadow recipes
│   └── _widgets.scss               [new] .w / .w--chip / .w-sep / per-widget classes
├── lib/
│   ├── motion.ts                   [new] reduced-motion gate
│   └── a11y.ts                     [new] accessible-name builders, focus-pad helper
├── service/
│   └── hyprland.ts                 [new] hyprctl + socket2 → GObject wrapper
└── widget/
    ├── Bar.tsx                     [rewrite] Pillbox edge-to-edge: single window with left/center/right internal sections
    ├── BarShell.tsx                [new] edge-to-edge glass container wrapper
    ├── Workspaces.tsx              [new] dot/pill morph via min-width transition
    ├── ActiveWindow.tsx            [new]
    ├── LauncherPill.tsx            [new]
    ├── Clock.tsx                   [new] time + Calendar popover (uses generic Popover)
    ├── Volume.tsx                  [new]
    ├── Battery.tsx                 [new]
    ├── Network.tsx                 [new]
    ├── NotificationsBell.tsx      [new] badge + DND indicator
    ├── NotificationsPanel.tsx      [new] popover window (layer-shell)
    ├── Mic.tsx                     [restyle] token colors only
    └── Launcher.tsx                [restyle] token colors only
```

Conventions:
- PascalCase widget filenames matching default export name.
- SCSS partials lowercase with leading underscore (dart-sass convention).
- One widget = one file = one default export.
- No `index.ts` re-export barrels (AGS imports use explicit paths already).

---

## Data Flow

### State sources

| Source | Wrapper / API | Widgets that consume |
|---|---|---|
| Wireplumber audio sink/source | `AstalWp.get_default().audio` (existing) | Volume, Mic |
| AstalBattery | `AstalBattery.get_default()` | Battery |
| AstalNetwork | `AstalNetwork.get_default()` | Network |
| AstalNotifd | `AstalNotifd.Notifd.get_default()` | NotificationsBell, NotificationsPanel |
| Hyprland | our `service/hyprland.ts` wrapper | Workspaces, ActiveWindow |
| GLib time | `createPoll("", 60_000, "date '+%H:%M'")` | Clock |
| Gtk.Settings (gtk-enable-animations) | `Gtk.Settings.get_default()` | Motion gate (root class) |

### Reactivity pattern (lock-in)

**State → UI binding** (preferred):
```ts
import { createBinding } from "ags"
const battery = AstalBattery.get_default()
const pct = createBinding(battery, "percentage")
// in JSX:  <label label={pct.as(p => `${Math.round(p * 100)}%`)} />
```

**One-shot derived value**:
```ts
import { createComputed } from "ags"
const state = createComputed([muted, streams], (m, s) => m ? "muted" : "idle")
```

**Polled value (clock, pw-dump)**:
```ts
import { createPoll } from "ags/time"
const time = createPoll("", 60_000, "date '+%H:%M'")
```

**Module-scope cell for cross-widget toggle** (e.g., NotificationsPanel open):
```ts
import { createState } from "ags"
export const [panelOpen, setPanelOpen] = createState(false)
```

### Service write-side (commands)

| User action | Call | Where |
|---|---|---|
| Click workspace dot | `Hyprland.dispatch("workspace", String(n))` | Workspaces onClicked |
| Scroll volume up | `wp.audio.defaultSpeaker.set_volume(clamp(cur+0.05, 0, 1))` | Volume onScroll |
| Click mute | `wp.audio.defaultSpeaker.set_mute(!cur)` | Volume onClicked |
| Click launcher pill | `app.toggle_window("launcher")` | LauncherPill onClicked |
| Click bell | `setPanelOpen(o => !o)` + `App.get_window("notifications-panel").set_visible(...)` | NotificationsBell onClicked |
| Dismiss notification | `notif.dismiss()` (AstalNotifd.Notification method) | NotificationsPanel row × button |
| Clear all | `notifd.get_notifications().forEach(n => n.dismiss())` | NotificationsPanel header |
| Toggle DND | `notifd.set_dont_disturb(!notifd.get_dont_disturb())` | NotificationsPanel + bar indicator |

---

## Integration Points

### 1. Hyprland Lua additions (`config/hypr/hyprland.lua`)

**Exact diff** (3 surgical changes, all in the autostart block at lines 45–51):

```lua
-- BEFORE (current lines 45–51):
hl.on("hyprland.start", function () 
   hl.exec_cmd("ags run")
   hl.exec_cmd("swaync")               -- ← LINE 47: remove this
   hl.exec_cmd("hyprpaper")
   hl.exec_cmd("/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1")
   hl.exec_cmd("wl-paste --watch cliphist store")
end)

-- AFTER:
hl.on("hyprland.start", function () 
   hl.exec_cmd("ags run")
   hl.exec_cmd("hyprpaper")
   hl.exec_cmd("/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1")
   hl.exec_cmd("wl-paste --watch cliphist store")
end)

-- Layerrules: add NEW BLOCK immediately after the `hl.on("hyprland.start", ...)` block (insertion
-- point: between current line 52 (blank line after end) and line 53). Reason: layerrules are
-- compositor declarations, conceptually closer to autostart than to keybinds/window-rules.
hl.layer_rule({ name = "ags-blur",        match = { namespace = "^ags$" }, blur = true })
hl.layer_rule({ name = "ags-ignorezero",  match = { namespace = "^ags$" }, ignore_zero = true })
```

Notes:
- The Hyprland Lua API for layerrules is `hl.layer_rule({ … })` (matches the existing window_rule/workspace_rule pattern at lines 319–358), NOT the HyprLang shorthand `hl.layerrule("blur", "ags")` mentioned in the proposal. Verified against the existing commented example at lines 344–349 of `hyprland.lua` (`hl.layer_rule({ name = "no-anim-overlay", match = { namespace = "^my-overlay$" }, no_anim = true })`).
- AGS layer-shell windows are exposed under the namespace `ags` (verify in apply via `hyprctl layers`).
- `exec_cmd` (vs `exec_once`) — we keep `exec_cmd` because the existing autostart already uses it consistently; staying with the established pattern keeps the diff minimal. `exec_cmd` runs on every Hyprland reload; for a daemon like AGS this is desired so reloads pick up config changes.

### 2. AGS entrypoint (`app.ts`) — full rewrite

```ts
import app from "ags/gtk4/app"
import style from "./style.scss"
import { initMotionGate } from "./lib/motion"
import Bar from "./widget/Bar"
import Launcher from "./widget/Launcher.tsx"
import NotificationsPanel from "./widget/NotificationsPanel"

app.start({
  css: style,
  main() {
    initMotionGate()                       // attaches .motion-on/.motion-off to root
    app.get_monitors().map(Bar)            // mirror bar per monitor (Phase 1)
    Launcher()                             // singleton overlay window
    NotificationsPanel()                   // singleton popover window (hidden by default)
  },
})
```

### 3. SCSS build pipeline

AGS bundles `style.scss` automatically via its built-in dart-sass loader (declared in `env.d.ts` as `declare module "*.scss" { … }`). No additional `package.json` script needed. Watch-mode is provided by `ags run --inspector` or simply re-running `ags run` on file save (AGS auto-reloads).

`style.scss` becomes a thin entry:
```scss
@use "./style/index";
```

`_index.scss` forwards in dependency order:
```scss
@forward "tokens";       // must be first — defines vars
@forward "typography";   // depends on --font-* vars from tokens
@forward "motion";       // depends on .motion-on/.motion-off rules
@forward "glass";        // depends on --bg, --radius
@forward "widgets";      // depends on all of the above
```

### 4. NotificationsPanel popover anchoring decision

**Decision: separate GTK Layer Shell window** (`Astal.Window` with `anchor = TOP | RIGHT`, `layer = OVERLAY`, `keymode = ON_DEMAND`, `visible = false`), NOT a child of the bar window.

Rationale:
- The bar window has `exclusivity = EXCLUSIVE` and `anchor = TOP | LEFT | RIGHT` — making it the parent of a popover that needs to extend below would force the bar to grow or use overflow tricks (GTK4 doesn't reliably composite popovers outside parent allocation).
- A separate layer-shell window can have `exclusivity = NORMAL`, its own `keymode = ON_DEMAND` for Esc-to-close (REQ-NT-04 panel-dismisses-on-Esc), and its own `layer = OVERLAY` so it floats above the bar's `TOP` layer.
- This is the standard AGS/Astal pattern for popovers (the existing `Launcher.tsx` is the proof: it's a separate layer-shell window, not a popover-of-the-bar).

Window definition shape:
```tsx
<window
  name="notifications-panel"
  visible={false}
  layer={Astal.Layer.OVERLAY}
  anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
  margin={[10, 12, 0, 0]}          // top, right, bottom, left — align under bell
  keymode={Astal.Keymode.ON_DEMAND}
  onKeyPressed={(_, key) => { if (key === Gdk.KEY_Escape) closePanel() }}
  application={app}
>…</window>
```

The Calendar popover uses the SAME pattern (separate window, `name="calendar"`). See "Popover wrapper" decision below.

### 5. Hyprland service wrapper (`service/hyprland.ts`)

```ts
// Sketch — full implementation in apply phase.
import GObject from "gi://GObject"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

// Two state sources:
// (a) Initial snapshot: `hyprctl -j workspaces` + `hyprctl -j activewindow`
// (b) Live updates: read $XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock
//     events: "workspace>>N", "activewindow>>CLASS,TITLE", "focusedmon>>MON,WS"

class Hyprland extends GObject.Object {
  // GObject properties (auto-bindable via createBinding):
  //   workspaces: number[]            (existing workspace IDs)
  //   activeWorkspace: number
  //   activeTitle: string
  //   activeClass: string
  static [GObject.properties] = { … }
  static [GObject.signals] = { workspace: {}, activewindow: {} }

  static #instance: Hyprland | null = null
  static get_default() { return this.#instance ??= new Hyprland() }

  dispatch(cmd: string, ...args: string[]) {
    return execAsync(["hyprctl", "dispatch", cmd, ...args])
  }
  // private: subscribe via Gio.SocketClient to .socket2.sock, emit notify::… on events
}
```

This replaces the `libastal-hyprland` reference in the spec (REQ-WS-01, REQ-AW-01). The Astal package does NOT exist on this system (no `AstalHyprland-0.1.gir` in `/usr/share/gir-1.0/`).

---

## Resolved Ambiguities (the 5 from sdd-spec)

### 1. NotificationsPanel popover anchoring → Separate layer-shell window
See Integration Point #4 above. Approach: standalone `<window>` with `layer={Astal.Layer.OVERLAY}`, anchored top-right, hidden by default, toggled via `App.get_window("notifications-panel").set_visible(b)`. This is the same pattern the existing `Launcher.tsx` uses (verified at `/home/guille/dotfiles/config/ags/widget/Launcher.tsx:18-28`).

### 2. libastal-notifd TypeScript API surface (VERIFIED from `/usr/share/gir-1.0/AstalNotifd-0.1.gir`)

**Import** (matches existing pattern in `Mic.tsx`):
```ts
import Notifd from "gi://AstalNotifd"
```

**Singleton accessor**: `Notifd.Notifd.get_default()` — returns `AstalNotifd.Notifd` which implements `Gio.ListModel`.

**Reactive properties** (all bindable via `createBinding(notifd, "propName")`):
- `notifications: AstalNotifd.Notification[]` (GLib.List of Notifications) — REQ-NT-02 state source
- `dont-disturb: boolean` — REQ-NT-05 DND flag (lock-screen-wide toggle)
- `ignore-timeout: boolean`
- `default-timeout: number` (gint, -1 = no timeout)

**Signals**:
- `notified(id: number, replaced: boolean)` — emitted when daemon receives a notification
- `resolved(id: number, reason: ClosedReason)` — emitted when notification closes

**Notification object methods** (per `notification` class in gir):
- `notif.dismiss()` — closes from daemon side (this is what panel × buttons call)
- `notif.get_id() / get_app_name() / get_app_icon() / get_summary() / get_body() / get_urgency() / get_image() / get_actions() / get_time()`
- `notif.invoke_action(actionId: string)` — for action buttons (out-of-scope for Phase 1)

**Urgency enum**: `Notifd.Urgency.LOW = 0`, `NORMAL = 1`, `CRITICAL = 2` — REQ-NT-04 urgent border uses `urgency === Notifd.Urgency.CRITICAL`.

**ClosedReason enum**: `EXPIRED=1, DISMISSED_BY_USER=2, CLOSED=3, UNDEFINED=4`.

**Concrete usage pattern**:
```ts
import Notifd from "gi://AstalNotifd"
import { createBinding } from "ags"

const notifd = Notifd.Notifd.get_default()
const notifs = createBinding(notifd, "notifications")
const dnd    = createBinding(notifd, "dontDisturb")     // GObject camelCase mapping

// In JSX:
<label label={notifs.as(list => `${list.length}`)} visible={notifs.as(l => l.length > 0)} />

// Dismiss one:
<button onClicked={() => notif.dismiss()}>×</button>

// Clear all:
<button onClicked={() => notifd.get_notifications().forEach(n => n.dismiss())}>Clear all</button>

// Toggle DND:
<button onClicked={() => notifd.set_dont_disturb(!notifd.get_dont_disturb())}>DND</button>
```

### 3. `hl.exec_cmd` vs `hl.exec_once` for swaync removal → REMOVE LINE 47

Exact line to remove from `/home/guille/dotfiles/config/hypr/hyprland.lua`:

```
Line 47:    hl.exec_cmd("swaync")
```

Diff is a single-line deletion within the existing `hl.on("hyprland.start", function() … end)` block (lines 45–51). No `exec_once` vs `exec_cmd` decision needed — the line is removed entirely. The `swaync` pacman package stays installed (REQ-NT-01 scenario "swaync package retained" allows this; only autostart goes).

### 4. IBM Plex Sans Arch package name → `ttf-ibm-plex` (community/extra)

Verification path (apply will run): `pacman -Ss '^ttf-ibm-plex$'`.

Best-known package mapping (to confirm in apply preflight):
- `ttf-ibm-plex` — official Arch `extra` repo, ships full IBM Plex family (Sans, Serif, Mono, etc.). Add to `packages/pacman.txt`.
- Fallback if not in official repos at apply time: `otf-ibm-plex` (also in extra) — both work, both ship Plex Sans.

For Material Symbols:
- `ttf-material-symbols-variable-git` — AUR. Add to `packages/aur.txt`. If unavailable, fallback: `material-symbols-git` (also AUR). Apply preflight runs `paru -Ss 'material.symbols'` to confirm.

JetBrains Mono Nerd font is already in `pacman.txt:34` (`ttf-jetbrains-mono-nerd`) — no change needed.

Action: append to `packages/pacman.txt`:
```
ttf-ibm-plex                # IBM Plex Sans (popover prose)
```
Append to `packages/aur.txt`:
```
ttf-material-symbols-variable-git   # Material Symbols icon font
```

### 5. Contrast verification method (manual, no test runner)

Documented procedure for `sdd-apply` to execute and `sdd-verify` to confirm:

1. **SCSS-time precomputation check** (build-side): after `ags run` produces compiled CSS, run `rg -n 'color-mix\(' ~/.cache/ags/` — must return zero matches (REQ-TT-02).
2. **Per-widget contrast spot check** (runtime, REQ-A11Y-04): for each interactive bar widget:
   a. Run `ags run` against a known dark wallpaper (e.g., `#1a1a2e` solid via `hyprpaper`) AND a known light wallpaper (`#f5f5f5` solid).
   b. Take a screenshot of the rendered bar: `grim -g "$(slurp)" /tmp/bar-dark.png` and `/tmp/bar-light.png`.
   c. Sample the chip text pixel color and the chip background pixel color using `magick /tmp/bar-dark.png -format "%[pixel:p{X,Y}]" info:` (replacing X,Y with click-eyeballed text and bg coordinates).
   d. Compute contrast ratio via a one-liner Python: `python -c "from wcag_contrast_ratio import rgb; print(rgb((r1,g1,b1),(r2,g2,b2)))"` (pip install `wcag-contrast-ratio` if missing) — expect ≥4.5:1 over BOTH wallpapers.
3. **Manual eyeball check** (cinematographer test): squint at the bar over a busy photo wallpaper. If any chip text becomes unreadable, increase `--bg` alpha from 0.82 toward 0.92 and re-test.

This procedure is captured in the task list (sdd-tasks phase) as a checklist item under each interactive widget.

---

## Architectural Decisions (ADR-style)

### ADR-1: dart-sass partials over a single style.scss

**Decision**: Split styles into 5 partials (`_tokens`, `_typography`, `_motion`, `_glass`, `_widgets`) forwarded by `_index.scss`, entry `style.scss` becomes a one-liner.

**Why**: 14 widgets × multi-state CSS in one file ⇒ unmaintainable. Partials let each PR slice touch a focused file. dart-sass `@forward` ordering is deterministic, so token vars are guaranteed available when consumed.

**Rejected alternative**: Tailwind-style utility CSS — GTK4 CSS does not support `@apply` or arbitrary class composition; utility classes are limited to literal style sets. Partials win.

### ADR-2: hyprctl + socket2 wrapper, NOT libastal-hyprland

**Decision**: Build `service/hyprland.ts` as a thin GObject wrapper around `hyprctl -j` (initial snapshot) + `Gio.SocketClient` reading `.socket2.sock` (live events).

**Why**: `libastal-hyprland` is NOT installed on the system (no gir file in `/usr/share/gir-1.0/`, not in `packages/aur.txt`). Pulling it in adds an AUR dep + git build for functionality we can get from a 60-line wrapper around already-installed `hyprctl`. The wrapper is also more inspectable (we own the event-handling code).

**Rejected alternative**: add `libastal-hyprland-git` to `aur.txt`. Cost: another git-build AUR package (slow upgrades), one more `_default()` to learn, and unknown API stability across Hyprland versions. Reject.

**Consequence**: spec REQ-WS-01 and REQ-AW-01 references to "libastal-hyprland service" are SATISFIED by our wrapper exposing the same reactive surface (`workspaces`, `activeWorkspace`, `activeTitle` as bindable properties). Behaviorally identical from the widget's perspective.

### ADR-3: Per-widget file ownership; no shared widget base class

**Decision**: Each widget is a self-contained function in its own `.tsx` file. No `Chip`, `Pill`, `Badge` shared abstractions in `widget/`. Shared styling lives in SCSS classes (`.w`, `.w--chip`).

**Why**: 11 leaf widgets in the bar, all visually similar (pill/chip) but with distinct state-binding logic. Extracting a `Chip` component would require parameterizing on (icon, label binding, click handler, accessible-name binding, hover state) — the abstraction has 5 parameters and saves ~5 lines per widget. Net loss.

**Rejected alternative**: Atomic-design split (atoms/molecules). Overkill for 11 widgets owned by one developer.

### ADR-4: Reduced-motion via Gtk.Settings + root CSS class

**Decision**: `lib/motion.ts` reads `Gtk.Settings.get_default()` `gtk-enable-animations` GObject property at init, attaches `.motion-on` or `.motion-off` to the AGS root via `display.add_css_class()` (GTK4 Display CSS). Also subscribes to the `notify::gtk-enable-animations` signal for runtime updates (REQ-MG-03).

```ts
// lib/motion.ts (sketch)
import Gtk from "gi://Gtk?version=4.0"
import app from "ags/gtk4/app"

export function initMotionGate() {
  const settings = Gtk.Settings.get_default()!
  const apply = () => {
    const on = settings.gtk_enable_animations
    // Apply to every AGS window's root widget
    app.get_windows().forEach(w => {
      w.remove_css_class(on ? "motion-off" : "motion-on")
      w.add_css_class(on ? "motion-on" : "motion-off")
    })
  }
  apply()
  settings.connect("notify::gtk-enable-animations", apply)
  // Re-apply when new windows are added (multi-monitor late mount)
  app.connect("window-added", apply)
}
```

`_motion.scss` rules:
```scss
.motion-off,
.motion-off * {
  transition-duration: 0.01ms !important;
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
}
```

**Why**: Gtk.Settings is the canonical GTK source (matches what GNOME's accessibility panel writes). Per-window class lets us avoid relying on a `:root` selector that may not exist in AGS's CssProvider scope. The signal-based update path satisfies REQ-MG-03 without an AGS reload.

**Rejected alternative**: read GSettings directly via `Gio.Settings.new("org.gnome.desktop.interface")`. Cost: assumes GNOME schema present, doesn't work outside GNOME. Reject — `Gtk.Settings` works everywhere GTK4 runs.

### ADR-5: Hyprland layerrule insertion point

**Decision**: Insert the two `hl.layer_rule({…})` calls in a NEW block immediately after the autostart `hl.on("hyprland.start", …)` block (line 52, between current end and the `--- ENVIRONMENT VARIABLES ---` comment header at line 54).

**Why**: layerrules are compositor-level declarations, semantically grouped with autostart (both are "things Hyprland does for surfaces"). Placing them with window/workspace rules at the bottom (line 314+) would split related config from its motivation (AGS, which lives in autostart).

**Rejected alternative**: top of file. Layerrules need the namespace to exist at evaluation time — placing them after the AGS autostart line is closer to the dependency arrow.

### ADR-6: Popover wrapper — generic `<Popover>` component

**Decision**: Introduce ONE small reusable popover wrapper at `widget/Popover.tsx` (~30 lines). Use it for Calendar AND NotificationsPanel.

```tsx
// widget/Popover.tsx (sketch)
type Props = {
  name: string                          // window name for app.get_window/set_visible
  anchor: Astal.WindowAnchor            // typically TOP | RIGHT (notif) or TOP (calendar)
  margins: [number, number, number, number]
  accessibleName: string
  children: JSX.Element
}
export default function Popover(p: Props) {
  return (
    <window
      name={p.name}
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={p.anchor}
      margin={p.margins}
      keymode={Astal.Keymode.ON_DEMAND}
      onKeyPressed={(_, key) => { if (key === Gdk.KEY_Escape) app.toggle_window(p.name) }}
      cssClasses={["popover"]}
      accessibleRole={Gtk.AccessibleRole.DIALOG}
      // accessible-name set via attribute…
      application={app}
    >
      {p.children}
    </window>
  )
}
```

**Why**: Two consumers (Calendar, NotificationsPanel) already justify the abstraction. Both share identical layer-shell setup + Esc handling + `.popover` styling. Avoids duplication and gives Phase 2/3 popovers a turnkey base.

**Rejected alternative**: ad-hoc per widget. Cost: ~25 lines duplicated, two places to fix Esc bugs. Reject.

**Caveat**: GTK4's `accessible-name` attribute is set via property, not JSX prop. The wrapper exposes `accessibleName` and sets it imperatively in `$ref` callback (helper in `lib/a11y.ts`).

### ADR-7: Multi-monitor mirroring (no per-monitor state)

**Decision**: `app.get_monitors().map(Bar)` mounts independent Bar windows per monitor; widgets read identical singleton service state. No filtering by monitor in Phase 1. Workspaces widget shows ALL workspaces (not just monitor-bound ones) because Hyprland workspaces are global by default in the current config (no `workspace_rule` with `monitor =` set).

**Why**: matches user's daily-driver pattern (single laptop screen + occasional external), avoids reactive state-splitting complexity. Per-monitor filtering is a Phase 2 candidate (proposal explicitly defers).

**Rejected alternative**: per-monitor workspace filtering via `Hyprland.get_workspaces_by_monitor(m.name)`. Cost: Workspaces widget gains a monitor prop, service wrapper gains a filter method, and dual-monitor users without monitor-pinned workspaces see flicker. Reject for Phase 1.

### ADR-8: NotificationsPanel UX shape

**Decisions** (locked):
- **Layout**: vertical stack (one notification per row), no grouping by app in Phase 1.
- **Max height**: 60vh equivalent (~ 600px on 1080p), with `<Gtk.ScrolledWindow>` wrapping the list (vscrollbar appears only when content exceeds height — REQ-NT-04 list scrolling).
- **Width**: fixed 380px (matches popover guidance, easily readable on FHD+).
- **Per-row anatomy**: `<box horizontal>` containing `[app icon 24px] [vertical: title (bold), body (2-line clamp)] [time (dim, mono, right-aligned)] [× button]`.
- **Body clamping**: GTK4 label `lines={2}` + `ellipsize={Pango.EllipsizeMode.END}` + `wrap={true}` (REQ-NT-04 body truncation).
- **Urgent indicator**: 3px left border in `var(--red)` via `cssClasses` toggle when `urgency === CRITICAL`.
- **Dismiss gesture**: × button ONLY (no swipe — GTK4's GestureSwipe works but adds complexity not justified for Phase 1).
- **Clear-all placement**: header right side, next to DND toggle. Header layout: `[count label left] [DND toggle | Clear all right]`.
- **DND toggle**: `<switch>` widget with `accessible-role: switch` and `accessible-name: "Do not disturb"`. Visual indicator on the bell icon when DND active: `cssClasses` includes `"dnd"` which applies `color: var(--dim)` and a strike-through pseudo-element via `border-bottom` hack (REQ-NT-05 visual indicator).
- **Empty state**: when `notifs.length === 0`, show centered "No notifications" label in `var(--dim)`.

### ADR-9: Workspaces dot/pill morph via min-width transition

**Decision**: Each workspace renders as a `<button>` with two state classes — `.ws-dot` (inactive, 8px wide) and `.ws-pill` (active, 22px wide). The button always has `min-width` styled, and the SCSS uses `transition: min-width var(--t-morph)` so the active-class swap animates the width change. The clickable hit target uses an outer wrapper with `min-width: 44px; min-height: 44px;` and the inner element is centered (REQ-A11Y-01 + REQ-WS-02).

```scss
.ws-target { min-width: 44px; min-height: 44px;
             display: flex; align-items: center; justify-content: center;
             background: transparent; border: 0; padding: 0; }
.ws {       min-width: 8px; min-height: 8px; border-radius: 9999px;
             background: var(--overlay0); transition: min-width var(--t-morph), background var(--t-base); }
.ws.active { min-width: 22px; background: var(--accent); }
.motion-off .ws { transition-duration: 0.01ms; }
```

**Why**: REQ-WS-02 forbids `transform: scaleX`. `min-width` transition is GTK4-supported, layout-correct (sibling widgets reflow gracefully), and animates smoothly via the GTK4 CSS engine.

### ADR-10: Slice boundaries vs file tree

**Decision**: Keep the 3-slice plan from the proposal, with one adjustment: **NotificationsBell + NotificationsPanel + service/hyprland.ts wrapper + Hyprland.lua edits are split between slices** rather than concentrated in one.

Revised slice cuts (aligned with the file-tree boundaries):

**Slice A — foundation (`feat: cachy-bar foundation`)**:
- All of `style/` (5 partials + index)
- `style.scss` (one-line entry)
- `lib/motion.ts` + `lib/a11y.ts`
- `widget/BarShell.tsx`
- `widget/Bar.tsx` (Pillbox layout, may render placeholder children initially)
- `widget/Popover.tsx` (generic wrapper)
- `service/hyprland.ts`
- `widget/Workspaces.tsx` (proves the Hyprland service path)
- `config/hypr/hyprland.lua` (layer_rule additions only — keep swaync line for now)
- `packages/pacman.txt` (ttf-ibm-plex), `packages/aur.txt` (material symbols)
- Estimated ~380 lines.

**Slice B — info widgets (`feat: cachy-bar info widgets`)**:
- `widget/Clock.tsx` (uses Popover for calendar)
- `widget/ActiveWindow.tsx`
- `widget/LauncherPill.tsx`
- `widget/Mic.tsx` (restyle)
- `widget/Launcher.tsx` (restyle)
- Estimated ~280 lines.

**Slice C — system widgets + notifications cutover (`feat: cachy-bar system + notifications`)**:
- `widget/Volume.tsx`, `widget/Battery.tsx`, `widget/Network.tsx`
- `widget/NotificationsBell.tsx`, `widget/NotificationsPanel.tsx`
- `app.ts` (mount NotificationsPanel)
- `config/hypr/hyprland.lua` (REMOVE `hl.exec_cmd("swaync")` — DONE IN THIS SLICE so it ships atomically with the AGS replacement, per REQ-NT-01 "same commit" requirement)
- Estimated ~390 lines.

Why move the swaync removal to slice C: REQ-NT-01 mandates "same commit that introduces AGS notifd binding". Slice A doesn't yet have notifd UI; removing swaync there would leave the system without a notification daemon. Slice C delivers both halves atomically.

---

## Constraint Compliance Matrix

| Constraint (from spec) | Design satisfies via |
|---|---|
| Hyprland Lua only | All Hyprland changes in `hyprland.lua` (ADR-5, Integration #1) |
| No `backdrop-filter` | `_glass.scss` uses rgba bg only; blur via `hl.layer_rule` (ADR-5) |
| No runtime `color-mix()` | `_tokens.scss` precomputes via `@use sass:color; color.mix(...)` |
| No CSS `transform` keyframe animations | Workspace morph uses `min-width` transition (ADR-9); no `@keyframes` use transform |
| Reduced-motion mandatory | `lib/motion.ts` + `_motion.scss` (ADR-4) covers every widget via root-class scope |
| ≥44px hit targets | `lib/a11y.ts` exports `focusPad()` helper; Workspaces uses `.ws-target` wrapper (ADR-9) |
| `accessible-name` + `:focus-visible` ring | `lib/a11y.ts` builders + `_widgets.scss` `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` |
| No hardcoded colors outside tokens | ADR-1 enforces; lint check in apply: `rg -n '#[0-9a-fA-F]{3,8}' config/ags/style/_widgets.scss` should match zero |

---

## Risks (architectural)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Proposal vs spec divergence on notifications** — proposal Phase 1 keeps swaync, spec REQ-NT-01–06 mandates full notifd replacement | Confirmed (already happened) | High | Design follows the SPEC (the contract per skill rules). This expands Slice C by ~150 lines vs proposal estimate. If user wants to honor the proposal instead, the design is reversible: drop `NotificationsPanel.tsx`, keep `NotificationsBell.tsx` as a `swaync-client -t` trigger, leave swaync autostart in place. Flagged for user judgment before apply. |
| `libastal-hyprland` referenced in spec but not on system | Confirmed | Medium | ADR-2 — wrap `hyprctl` instead. Behaviorally equivalent for Phase 1 needs (workspaces + active window). |
| `hl.layer_rule` API name in Hyprland Lua differs from what proposal assumed (`hl.layerrule`) | Confirmed | Low | Verified via grep against existing `hyprland.lua:344-349` example. Use `hl.layer_rule({ name=…, match={namespace=…}, blur=true })` shape. |
| GTK4 CssProvider may reject `font-variant-numeric: tabular-nums` (GTK4 CSS subset) | Medium | Low | Fallback: use PangoFontDescription with `tnum` feature via widget attribute. Spec-time verification in Slice A apply: load a tabular label, inspect computed style. |
| Multi-monitor mounting race (`app.get_monitors()` may not reflect later-attached monitors) | Low | Medium | Phase 1 accepts: user manually `ags quit && ags run` on monitor change. Phase 2 candidate: subscribe to `display.monitors` changed signal and dynamically mount Bar. |
| `Gtk.AccessibleRole` enum values may not be settable from JSX prop in current AGS version | Medium | Low | Fallback: imperative `widget.update_property(Gtk.AccessibleProperty.LABEL, [name])` in `$ref` callback. `lib/a11y.ts` encapsulates this. |
| Hyprland socket2 path resolution requires `XDG_RUNTIME_DIR` + `HYPRLAND_INSTANCE_SIGNATURE` env vars which may not be set in AGS's launch context | Medium | Medium | `service/hyprland.ts` reads both via `GLib.getenv()` with explicit error on missing. Test in Slice A. Fallback if env missing: poll `hyprctl -j activeworkspace` every 250ms (degrades elegantly). |
| `wcag-contrast-ratio` Python package unavailable for manual verification | Low | Low | Fallback: use the colorbrewer JS one-liner in node, or manual eye-check (REQ-A11Y-04 says "verified once per widget during implementation smoke-test" — eyeball is acceptable). |

---

## Next Recommended Phase

`sdd-tasks` — break this design into atomic implementation tasks aligned with the 3-slice chained-PR plan (ADR-10).
