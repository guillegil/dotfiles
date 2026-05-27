# Cachy Bar — Design System Handoff

A status bar for **Hyprland on Arch Linux / CachyOS**, built with **AGS (Aylur's GTK Shell)**. Aesthetic: Catppuccin Mocha/Latte, soft pastel on warm dark, monospaced, glassmorphic floating modules.

This doc is everything another AI needs to implement the real thing.

---

## 1. Identity

| | |
|---|---|
| **Name** | Cachy Bar (working title) |
| **Target** | AGS v2 (Aylur's GTK Shell), GTK4 / GTK Layer Shell |
| **Compositor** | Hyprland |
| **Language** | TypeScript (preferred) with JSX widgets |
| **Distro** | Arch / CachyOS |
| **Vibe** | Terminal-native, monospaced, soft pastel-on-dark, glassmorphic |

---

## 2. Color Palettes — Catppuccin

### 2.1 Mocha (dark — default)

| Token        | Hex        | Used for                                  |
|--------------|------------|-------------------------------------------|
| `base`       | `#1e1e2e`  | bar background (with 82% alpha + blur)    |
| `mantle`     | `#181825`  | popover/overlay background                |
| `crust`      | `#11111b`  | scrim, deepest shadow                     |
| `surface0`   | `#313244`  | nested widget bg (`--bg2`)                |
| `surface1`   | `#45475a`  | hover bg (`--bg3`)                        |
| `surface2`   | `#585b70`  | separator at 8% opacity                   |
| `text`       | `#cdd6f4`  | primary text                              |
| `subtext1`   | `#bac2de`  | secondary text                            |
| `subtext0`   | `#a6adc8`  | dim text (`--dim`)                        |
| `overlay0–2` | `#6c7086 / #7f849c / #9399b2` | tertiary text          |
| **Accents**  |            | (any of these can be the active accent)   |
| `mauve`      | `#cba6f7`  | default accent — workspaces, AI gradient  |
| `blue`       | `#89b4fa`  | CPU, info                                 |
| `sky`        | `#89dceb`  | wifi, updates                             |
| `sapphire`   | `#74c7ec`  | weather, secondary blue                   |
| `teal`       | `#94e2d5`  | network speed                             |
| `green`      | `#a6e3a1`  | battery healthy, VPN online, camera live  |
| `yellow`     | `#f9e2af`  | brightness, warnings                      |
| `peach`      | `#fab387`  | now-playing, performance perf mode        |
| `maroon`     | `#eba0ac`  | rarely used; soft red alt                 |
| `red`        | `#f38ba8`  | power, mic, recording, critical           |
| `pink`       | `#f5c2e7`  | rarely used; accent variant               |
| `flamingo`   | `#f2cdcd`  | rarely used                               |
| `rosewater`  | `#f5e0dc`  | rarely used                               |
| `lavender`   | `#b4befe`  | hero player, secondary accent             |

### 2.2 Latte (light)

Same token roles, light values. Bar bg uses 92% alpha.

| Token | Hex |
|---|---|
| `base` | `#eff1f5` |
| `mantle` | `#e6e9ef` |
| `crust` | `#dce0e8` |
| `surface0/1/2` | `#ccd0da / #bcc0cc / #acb0be` |
| `text / subtext1 / subtext0` | `#4c4f69 / #5c5f77 / #6c6f85` |
| `overlay0/1/2` | `#9ca0b0 / #8c8fa1 / #7c7f93` |
| `mauve` | `#8839ef` |
| `blue` | `#1e66f5` |
| `sky` | `#04a5e5` |
| `sapphire` | `#209fb5` |
| `teal` | `#179299` |
| `green` | `#40a02b` |
| `yellow` | `#df8e1d` |
| `peach` | `#fe640b` |
| `maroon` | `#e64553` |
| `red` | `#d20f39` |
| `pink` | `#ea76cb` |
| `flamingo` | `#dd7878` |
| `rosewater` | `#dc8a78` |
| `lavender` | `#7287fd` |

### 2.3 CSS custom-property contract

Every bar root exposes these vars; every widget reads them. Theme swap = swap these.

```css
--bg          /* bar background (rgba w/ alpha — 82% mocha, 92% latte) */
--bg2         /* nested widget bg (~55% surface0) */
--bg3         /* hover bg (~70% surface1) */
--text        /* primary text */
--dim         /* subtext0 — secondary text */
--accent      /* user-selectable accent — defaults to mauve */
--radius      /* bar corner radius — default 14px, tweakable 0–28 */
--pad         /* bar horizontal padding — default 8px, tweakable 2–20 */

/* full palette is also exposed for per-widget colors: */
--green --red --yellow --blue --mauve --peach --pink --sky --sapphire --teal --lavender --maroon
```

Widgets like the CPU chip use `var(--blue)`, battery uses `var(--green)`/`yellow`/`red` by threshold, AI uses gradient mauve→blue, etc. — never hardcode color outside a palette token.

---

## 3. Typography

| | |
|---|---|
| **Family** | `"JetBrains Mono"`, `"SF Mono"`, `ui-monospace`, `monospace` |
| **Weights** | 400 (body), 500 (labels), 600 (numeric/values), 700 (titles, badges) |
| **Letter-spacing** | `0.01em` baseline; `0.04–0.10em` for ALL-CAPS labels |
| **Tabular numerals** | always on for clock, %, dates, sizes (`font-variant-numeric: tabular-nums`) |

### Type scale (bar density: comfortable)

| Use | Size |
|---|---|
| Section labels (`UP NEXT`, `RECENT`) | 9px / 700 / `letter-spacing: 0.10em` / uppercase |
| Small numeric / badge counts | 9–10px / 700 |
| Body chips (clock, app names) | 11–12.5px / 500–600 |
| Popover headings | 13px / 700 |
| Hero player track title | 13–14px / 700 |
| Big values (battery %, etc.) | 14–16px / 700 |

**Important:** no font smaller than 9px. Bar sits at ~28–30px tall.

---

## 4. Shape, spacing, elevation

| Token | Value | Notes |
|---|---|---|
| Bar corner radius | `14px` (tweakable 0–28) | floating modules. Edge-to-edge bars use 0 |
| Inner widget radius | `radius − 4px` (10px default) | pills inside the bar |
| Popover radius | `12–14px` | overlay cards |
| Hero/large card radius | `18px` | AI overlay, app launcher |
| Bar inner padding | `4px var(--pad)` | `pad` defaults 8 |
| Widget padding | `6px 10px` (comfort), `4px 8px` (flat) |
| Widget gap | `8px` (between text+icon), `2px` (between widget pills) |
| Module gap (Aurora/Atlas) | `10–12px` between floating shells |

### Glassmorphic bar shell (the BarShell pattern)

```css
.bar-shell {
  background: var(--bg);                      /* rgba w/ alpha */
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid color-mix(in oklab, var(--text) 7%, transparent);
  border-radius: var(--radius);
  padding: 4px var(--pad);
  box-shadow:
    0 8px 28px -8px rgba(0,0,0,0.45),
    inset 0 1px 0 rgba(255,255,255,0.05);
}
```

For bottom dock (Mantle): bump shadow to `0 16px 50px -12px rgba(0,0,0,0.6)`.
For hero center widget (Cathedral): `0 20px 50px -16px rgba(0,0,0,0.65)`.

### Popover shell

```css
.popover {
  background: rgba(30,30,46,0.92);              /* mantle + alpha */
  backdrop-filter: blur(36px) saturate(160%);
  border: 1px solid color-mix(in oklab, var(--text) 8%, transparent);
  border-radius: 14px;
  box-shadow:
    0 20px 60px -16px rgba(0,0,0,0.7),
    inset 0 1px 0 rgba(255,255,255,0.05);
  padding: 14px;
}
```

Add an `::before` triangular connector (`12×12 rotate(45deg)`) on top-left for tab-to-bar continuity.

### Soft-glow accent halo (used on AI overlay, hero buttons)

```css
box-shadow:
  0 24px 80px -20px rgba(0,0,0,0.7),
  0 0 60px -20px color-mix(in oklab, var(--accent) 40%, transparent);
```

### Tinted backgrounds for accent surfaces

Always use `color-mix(in oklab, <color> <pct>%, transparent)`. Common percentages:
- Subtle wash: `8–14%`
- Active toggle bg: `18–24%`
- Active border: `28–38%`
- Strong fill: `40%+` (rare)

---

## 5. Iconography

**Style:** Phosphor-inspired, geometric, **stroke 1.75**, line-cap/join round, 24×24 viewBox.
Render at **12–16px** in the bar; 14–22px in popovers; 32–48px hero.

### Icon catalog (implemented)

Group | Names
---|---
Time/cal | `clock` `calendar`
Network | `wifi` `bluetooth` `vpn` `shield`
Power | `battery` `power` `bolt` `leaf` `scale` (perf modes)
Audio | `volume` `mute` `mic` `speaker` `airpods` `headphones`
Display | `brightness` `display` `monitor` `moon` (night light)
System | `cpu` `ram` `thermo` `keyboard` `mouse` `laptop`
Status | `bell` `tray` `window`
Media | `play` `pause` `prev` `skip`
Plugins | `tomato` (pomodoro) `github` `package` (updates) `arch` `hypr` `coffee` (caffeine)
Capture | `camera` `cam_off` `rec` `snip` (screenshot) `region` `dropper` (color)
AI | `ai` `spark`
Misc | `cloud` `clipboard` `search` `chevron` `user` `dnd` `arrow_up` `arrow_down` `swap`

**Color rule:** icons use semantic color from the palette (`cpu`→blue, `battery`→green by threshold, `mic/rec`→red, `ai`→mauve gradient, etc.). Never default to neutral when a semantic color exists.

For real implementation: use **Phosphor Icons** (`phosphor-react` / SVG sprite) or **Material Symbols Rounded** at weight 400, optical size 20.

---

## 6. Widget catalog

All widgets follow the `.w` base: `inline-flex; align-items:center; gap:8; padding:6px 10px; border-radius:calc(var(--radius)-4px);` and use the CSS-var palette.

### Core (always-on)

| Widget | What it shows | Click behavior |
|---|---|---|
| `Workspaces` | Hyprland workspaces (dots or numbered pills); active expanded | scroll = switch; click N = goto N |
| `ActiveWindow` | App icon + truncated title (max ~220px) | click = focus |
| `Clock` | `HH:MM` + `Day · Mon DD` | click = open Calendar popover |
| `Battery` | Battery glyph + %, color by threshold (>50 green, >20 yellow, else red) | click = Battery & Devices popover |
| `CpuChip` | CPU icon + 12-pt sparkline + % | click = btop / system monitor |
| `RamChip` | RAM icon + % | |
| `TempChip` | Thermometer + °C (red when >70) | |
| `Volume` | Speaker + thin slider track + % | scroll = ±5; click = Audio popover |
| `Brightness` | Sun + % | scroll = ±5 |
| `Net` / `NetIcon` | Wi-Fi icon + SSID (or icon-only) | click = Control Center |
| `BTIcon` | Bluetooth icon + small pill count of connected devices | click = Battery & Devices popover |
| `Notifications` | Bell + red count badge | click = Notifications panel |
| `Tray` | 8×8 colored dots, one per system tray app | hover = name |
| `PowerMenu` | Red power glyph | click = power menu |
| `KeyLayout` | Tiny `US` / `ES` label | click = Keyboard popover; scroll = cycle |
| `Launcher` | "▦ Apps `⌘ Space`" pill | click = App Launcher overlay |

### Plugin (curated)

| Widget | What it shows | Click |
|---|---|---|
| `NowPlaying` | Album-art gradient + animated bar visualizer + title · artist + app dot (Spotify green, Firefox orange, etc.). **Multi-source:** if 2+ players active, shows `⌄ 1/2` cycle chevron to switch source. | click = Now Playing popover |
| `Pomodoro` | Red SVG ring progress + minutes left | click = start/pause/skip |
| `HyprMap` | Mini cells, one per workspace, with tiny window thumbnails inside | click ws = goto; click big = HyprMap popover |
| `GitHub` | Avatar stack + PR count + `@N` mentions in peach | click = open Github queue |
| `Updates` | Arch logo + count + `upd` | click = open update overlay |
| `CalendarChip` | Calendar + next-event time + truncated title | click = Calendar popover |
| `AILauncher` | Sparkle + gradient "Ask AI" + `⌘K` | click = AI overlay |
| `AITalk` | Mic + live waveform when listening | click = toggle mic |
| `NetSpeed` | Teal sparkline + `↓1.2M ↑0.3M` | |
| `RecIndicator` | Pulsing red dot + `REC 02:14` | |
| `CameraIndicator` | Green dot + `CAM 00:42` (in a green-tinted pill) | click = Camera popover |
| `Performance` | Eco / Auto / Perf segmented (or compact: icon + label of active mode) | click = cycle mode |
| `IdleInhibitor` | ☕ + `AWAKE 42m` peach pill (or `idle ok` when off) | click = Caffeine popover |
| `ScreenshotWidget` | 3-button segmented: Region / Window / Full | click = launch grim+slurp; long-press = Screenshot popover |
| `ColorPickerWidget` | Eyedropper + last-picked swatch + hex code | click = launch picker; long-press = palette popover |
| `AudioSourceWidget` | Device-type icon + active output name + ⌄ | click = Audio popover |
| `Weather` | Cloud icon + temp + condition | |
| `Sep` | 1px×16 separator at 8% text opacity, 4px margin | structural |

---

## 7. Popovers & overlays

All popovers are ~300–460px wide, mantle bg + 36px blur + drop shadow, padded 14px, with the popover-tab connector at top-left.

| Popover | What's in it |
|---|---|
| **Control Center** | 3 connection cards (Wi-Fi / Bluetooth+count / VPN), VPN detail strip (tailscale IP + ONLINE pill), Privacy row (Camera/Mic/Location pills with live pulse dot), Power Profile segmented (Eco/Auto/Perf), 3 sliders (Volume/Brightness/Mic), 4 mini-toggles (Caffeine / Night light / DND / Snip), CPU/RAM/NET stats card, Power row |
| **Now Playing** | Big album art + track meta + transport + custom waveform-shaped progress, "Up Next" queue |
| **Calendar** | Month grid (today = accent fill, events = dot under), Today's agenda list with colored event bars |
| **HyprMap (Workspaces)** | 5 workspace mini-cards with live window rectangles, active workspace highlight, current workspace window list |
| **AI assistant overlay** | Full-screen scrim (`rgba(17,17,27,0.55)` + blur), centered card with gradient halo top, model badge (`llama3.2 · local`), bubble chat, code blocks (green text on dark), action chips (Copy/Apply/Explain), mic input with live waveform |
| **App Launcher overlay** | Search input + blinking cursor, **calculator banner** (math/constant lookup inline), result rows, recent commands chips, 6-col app grid with gradient tiles, footer hint row (`↑↓ nav · ↵ launch · ⌘↵ terminal · = calc · ? AI`) |
| **Camera** | LIVE green pill + timer, faux video preview (gradient + silhouette + scanlines + REC corner brackets + `1080p · 30fps`), STOP/Pause/Snip/Off controls, Res/FPS/Mic/Codec chips, Apps-using-camera list |
| **Battery & Devices** | Hero laptop ring (% + time left + watts + health + cycles), inline Power Profile segmented, Bluetooth devices list with per-device battery rings (AirPods L/R/case break-out, keyboard/mouse/headphones, `LOW` badge under 25%) |
| **Screenshot** | Mode tabs (Region active / Window / Full / Delay), desktop thumbnail with **dashed teal selection box** + dimensions badge + corner handles + crosshair, delay options (Now/3s/5s/10s), Copy/Save/Annotate action row, 3 recent thumbnails |
| **Color picker** | Circular pixel-loupe with 9×9 grid + center crosshair, current color swatch, formats (HEX/RGB/HSL/OKLCH each with copy icon), recent colors row, full Catppuccin palette grid |
| **Audio** | Outputs list (active w/ accent border + `● ACTIVE` pill), inputs grid (active mic w/ live waveform), per-app PipeWire mixer (icon tile + name + sub + slider + mute) |
| **Keyboard** | Mini QWERTY 3-row preview + modifier row with highlighted Super key, Caps/Num/Scroll state pills, layouts list with active highlight, switch-hotkey footer |
| **Caffeine (Idle inhibitor)** | Big gradient state card with peach mug avatar + `Awake` + countdown + toggle, 6 duration buttons (15m/30m/1h/2h/Until reboot/Indefinitely), Reason chips, Other inhibitors list (mpv playing, steam downloading) |
| **Notifications** | Header (`N notifications` + DND + Clear all), stack of toasts (app icon tile + title + body + actions row), each toast has a **split-button snooze** (`Snooze | 5m | 30m | 1h`) + `×` dismiss; urgent toasts get a colored 3px left border |
| **Confirm banner** | AI gradient halo top, AI avatar + `CACHY::AI · needs permission`, title + body, green code preview, "kernel update" warning chip, `Cancel ⎋` + gradient `Accept ↵`, "allow for this session" checkbox |

---

## 8. Motion & micro-interactions

| Animation | CSS | When |
|---|---|---|
| `w-pulse` | `opacity 1↔0.5; scale 1↔1.4` over 2.2s ease-in-out | recording/camera dot, AI listening halo, urgent privacy pulse |
| `viz` (audio bars) | 6–10 bars scaleY 0.35↔1 staggered 0.05–0.4s | NowPlaying, hero player |
| `ai-talk` (mic waveform) | 5 thin bars 0.8s | AI overlay, AITalk widget |
| `blink` (cursor) | 1s step 2 | launcher search input |
| Generic hover | `background .15s, transform .15s, color .15s` | widgets, toggles |
| Workspace dot/pill morph | `all .18s ease` (width animates from 8→22) | active workspace |

All motion is **subtle**. No bounces, no large translations. Backdrop-filter blur stays constant.

Sound: every interaction may play a soft click (~30ms, −20dB). Optional, user-toggleable.

---

## 9. Bar layouts (8 implemented)

Pick one or let the user choose at install. All share the same widget vocabulary.

| # | Name | Position | Vibe |
|---|---|---|---|
| 01 | **Aurora** | Top, floating | 3 segmented modules with gaps; soft, default |
| 02 | **Pillbox** | Top, edge-to-edge | Dense pills, everything visible at once |
| 03 | **Mantle** | Bottom, dock | macOS-style floating dock with hero now-playing |
| 04 | **Spine** | Vertical, left | Icon-rail; workspace numbers; vertical clock |
| 05 | **Atlas** | Top, floating | 3 separated floating modules (left/center/right) |
| 06 | **Cathedral** | Top, floating | Tall hero center bulge for now-playing w/ 46-bar visualizer |
| 07 | **Linen** | Top, floating (Latte) | Aurora in light mode |
| 08 | **Marble / Quartz** | Edge / Dock (Latte) | Pillbox / Mantle in light mode |

---

## 10. Tweakables

Things the user should be able to change at runtime (these are the live tweaks already wired):

- `accent` per mode (Mocha + Latte) — chooses from palette accents
- `radius` — bar corner radius slider 0–28px
- `pad` — bar inner padding slider 2–20px
- Plugin visibility toggles (AI / Pomodoro / GitHub / NowPlaying / Stats)
- Bar position (top / bottom / left)
- Icon set
- Wallpaper / desktop preview behind bar

---

## 11. Implementation hints (AGS)

```
~/.config/ags/
├── config.ts                # entry — App.config({ windows: [Bar(...)] })
├── widget/
│   ├── bar/
│   │   ├── Bar.tsx          # top-level bar window per monitor
│   │   ├── shells.tsx       # BarShell variants (Aurora/Pillbox/Mantle/...)
│   ├── core/
│   │   ├── Clock.tsx
│   │   ├── Workspaces.tsx
│   │   ├── Battery.tsx
│   │   ├── Volume.tsx
│   │   └── ...
│   ├── plugins/
│   │   ├── NowPlaying.tsx   # uses Mpris service, multi-source via Mpris.players
│   │   ├── Pomodoro.tsx     # local state + GLib timer
│   │   ├── HyprMap.tsx      # Hyprland.workspaces + Hyprland.clients
│   │   ├── GitHub.tsx       # gh CLI poll every 60s
│   │   ├── Updates.tsx      # `checkupdates` + `paru -Qua`
│   │   ├── AILauncher.tsx   # ollama HTTP (http://localhost:11434)
│   │   ├── AITalk.tsx       # whisper.cpp pipe
│   │   ├── Camera.tsx       # v4l2 / pipewire + recording state
│   │   ├── Screenshot.tsx   # grim + slurp + swappy
│   │   ├── ColorPicker.tsx  # hyprpicker
│   │   ├── AudioSource.tsx  # WirePlumber via Audio service
│   │   ├── Keyboard.tsx     # Hyprland.kb_layout
│   │   ├── IdleInhibitor.tsx# systemd-inhibit / hypridle
│   ├── popovers/
│   │   ├── ControlCenter.tsx
│   │   ├── Notifications.tsx
│   │   ├── ConfirmBanner.tsx
│   │   └── ...
├── style/
│   ├── theme.scss           # palette → CSS custom properties
│   ├── shell.scss           # BarShell + Popover patterns
│   ├── widgets.scss
│   └── motion.scss
└── lib/
    ├── theme.ts             # palette objects + setPalette()
    ├── tweaks.ts            # persisted via JSON in ~/.config/ags/tweaks.json
    └── icons.ts             # icon name → glyph mapping
```

### Services to depend on (AGS built-ins)

- `Hyprland` (workspaces, active window, monitors, keyboard layout)
- `Mpris` (now-playing, multi-source)
- `Audio` (WirePlumber wrapper — output/input devices, per-app sinks)
- `Battery` (UPower)
- `Notifications` (dbus)
- `Network` (NetworkManager)
- `Bluetooth` (bluez)
- `SystemTray`
- `App` (launcher, .desktop file discovery)

### External CLI / daemons

- `paru` / `checkupdates` — updates
- `grim` + `slurp` + `swappy` — screenshot
- `hyprpicker` — color picker
- `wl-clipboard` (`wl-copy`/`wl-paste`) — clipboard
- `tailscale status --json` — VPN status
- `gh` — GitHub PR counts
- `systemd-inhibit` / `hypridle` — idle inhibitor
- `ollama` HTTP API at `:11434` — local AI
- `whisper.cpp` or `nerd-dictation` — voice → text

### Fonts to install

```
yay -S ttf-jetbrains-mono-nerd ttf-material-symbols-variable-git
```

Or any Nerd Font + Material Symbols Rounded.

---

## 12. Quality bar

- Bar height **never exceeds 30px** in non-hero positions
- Clickable widgets have **44×44px hit targets** even when visually smaller (use invisible padding)
- All animations honour `prefers-reduced-motion`
- Color choices honour **Catppuccin contrast guidance** — never hardcode colors outside the palette
- Privacy widgets (camera/mic) **pulse green when active** — this is a visual safety signal, not decoration
- All popovers dismiss on `Esc` and on click-outside
- All bar widgets have a tooltip (GTK `tooltip-text`)

---

## 13. Reference

This handoff is paired with the visual prototype at `index.html`. The prototype is the **source of truth for layout and proportions** — implementation should match it pixel-for-pixel within the limits of GTK4 rendering. Use the canvas's design_canvas focus mode (double-click any artboard) to see each variant at 1:1.
