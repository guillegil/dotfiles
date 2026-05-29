# Cachy Bar — Complete Design Specification

A retro-tinged **AGS status bar for Hyprland on Arch / CachyOS**. Monospaced, glassmorphic, theme-able. This document is written so an AI agent (or engineer) can **replicate the entire design canvas from scratch** without seeing the original source. Every value, recipe, component anatomy, and composition rule is here.

The live artifact is `index.html` — a React + Babel **design canvas** (pan/zoom board) rendering 39 artboards across 6 sections. This spec describes how to rebuild it. `tokens.css` and `brand.json` are machine-readable companions; `HANDOFF.md` covers the real AGS/GTK implementation. If a value here disagrees with a source file, the **source file wins** — but they're kept in sync.

---

## 0. How the canvas is built (architecture)

```
index.html                 ← React root, loads all scripts, defines <App/>, Tweaks, TWEAK_DEFAULTS
design-canvas.jsx          ← <DesignCanvas>/<DCSection>/<DCArtboard> pan-zoom board (starter component)
tweaks-panel.jsx           ← <TweaksPanel> + useTweaks() + Tweak* controls (starter component)
src/theme.jsx              ← 12 PALETTE objects, <Wallpaper>, <PixelLandscape>, hexToRgba()
src/icons.jsx              ← ~70 inline-SVG Phosphor-style glyphs + <Icon/>
src/widgets.jsx            ← the widget catalog (~35 components) + shared .w styles injected once
src/bars.jsx               ← <Desktop> frame, <FakeApp>, <BarShell>, the 6 bar layouts
src/popovers.jsx           ← <PopoverShell> + 16 popovers/overlays
src/login.jsx              ← <LoginFrame> + 3 login screens
```

**Load order matters** (each file does `Object.assign(window, {...})` to share globals across Babel scopes): React/ReactDOM/Babel → design-canvas → tweaks-panel → theme → icons → widgets → bars → popovers → login → the inline `<App/>` script (`data-presets="env,react"`).

**Script tags** must use the pinned React 18.3.1 + Babel 7.29.0 with integrity hashes. All component files are `<script type="text/babel" src=...>`.

**Critical convention:** components never hardcode palette hex. They read **CSS custom properties** (`--bg`, `--text`, `--accent`, `--mauve`, …) set by `<Desktop>` (bars) or a wrapping `vars` object (popovers/login). Theme switching = swapping those variables. The only place hex literals live is `src/theme.jsx` and gradient/wallpaper definitions.

### The canvas shell
- `<DesignCanvas defaultZoom={0.7}>` wraps everything. Warm-gray grid background (`#f0eee9` body).
- `<DCSection id title subtitle>` = a titled row of artboards.
- `<DCArtboard id label width height>` = one fixed-size frame. Artboards are static design frames — size them to content, never `height:100% + overflow:auto`.
- Six sections in order: **dark** (Mocha), **light** (Latte), **themes-dark**, **themes-light**, **pixel**, **popovers**, **login**.

---

## 1. Design system — tokens

### 1.1 Shape
| Token | Value | Notes |
|---|---|---|
| `--radius` | **14px** | bar shell; tweakable 0–28 (canvas default ships 18) |
| `--radius-inner` | `calc(radius − 4px)` | every `.w` widget |
| `--radius-popover` | 14px | popover shell |
| `--radius-hero` | 18px | AI/launcher overlays, login card |
| `--pad` | **8px** | bar inner padding; tweakable 2–20 |
| bar height | ≤ **30px** | outside hero positions |
| min hit target | **44px** | invisible padding even when pill is 16px tall |
| dock radius | `radius + 6px` | Mantle bottom dock, Cathedral hero |

Widget gap is **8px** (icon↔text inside a `.w`) and **2px** (pill↔pill inside a shell).

### 1.2 Typography
- **Family:** `"JetBrains Mono", "SF Mono", ui-monospace, monospace`. Pixel theme overrides to `"VT323", "Press Start 2P", monospace`.
- **Weights:** body 400, label 500, value 600, title 700.
- **`font-variant-numeric: tabular-nums`** on every status/number string (clock, %, temps, speeds, dates).
- **Scale (px):** section label 9 · badge 10 · body 12.5 · popover heading 13 · hero title 14. Floor is **9px**.
- Section labels: `9px / 700 / uppercase / letter-spacing 0.10em / color var(--dim)`.

### 1.3 Motion
| Token | Value |
|---|---|
| `--t-fast` | 0.12s |
| `--t-base` | 0.15s ease |
| `--t-morph` | 0.18s cubic-bezier(.2,.7,.3,1) |

Keyframes (defined once in widget styles / tokens.css):
- `pulse` / `w-pulse` — `0%,100%{opacity:1;scale:1} 50%{opacity:.5;scale:1.4}`, 2.2s infinite. Recording/privacy dots.
- `viz` — `0%,100%{scaleY:.35} 50%{scaleY:1}`, 1.1s, staggered nth-child delays. Audio bars (`transform-origin:bottom`).
- `ai-talk` — `0%,100%{scaleY:.4} 50%{scaleY:1}`, 0.8s. Mic listening bars.
- `marquee` — translateX(0→-50%), 14s linear. Long track titles.
- `blink` — `50%{opacity:0}`, 1s steps(2). Text cursors.
- **All gated** by `@media (prefers-reduced-motion: reduce)` → animations none, transitions 0.01ms.

### 1.4 Elevation — exactly three shell recipes
**Bar glass** (`.bar-shell`, default for floating bars):
```css
background: var(--bg);
backdrop-filter: blur(28px) saturate(160%);
border: 1px solid color-mix(in oklab, var(--text) 7%, transparent);
border-radius: var(--radius);
padding: 4px var(--pad);
box-shadow: 0 8px 28px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
```
**Bar dock** (Mantle / Cathedral hero) — same glass, deeper shadow + corner bump:
```css
box-shadow: 0 16px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
border-radius: calc(var(--radius) + 6px);
```
**Popover** (`.popover` / `PopoverShell`):
```css
background: var(--mantle);              /* rgba(30,30,46,0.92) on mocha */
backdrop-filter: blur(36px) saturate(160%);
border: 1px solid color-mix(in oklab, var(--text) 8%, transparent);
border-radius: 14px; padding: 14px;
box-shadow: 0 20px 60px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
```
**Overlays** (AI, App Launcher) break the popover shell: full-screen scrim `rgba(17,17,27,0.55–0.6)` + `blur(8–12px)`, an 18px-radius card, a **2px gradient halo** strip `linear-gradient(90deg, var(--mauve), var(--blue), var(--teal))`, and an AI glow shadow `0 24px 80px -20px rgba(0,0,0,.7), 0 0 60px -20px color-mix(in oklab, var(--accent) 40%, transparent)`.

### 1.5 Tinted surface recipe (the one true way to tint)
Always `color-mix(in oklab, <semantic-color> <pct>%, transparent)`:
| Use | % |
|---|---|
| subtle wash (chip bg) | 12% |
| active fill bg | 22% |
| active border | 35% |
| solid-ish fill | 45% |

Widgets that show "on/active" state (CameraIndicator, IdleInhibitor, AITalk, ConnCard, PerfTab…) use 14–18% bg + 28–38% border of their semantic color.

---

## 2. Color — 12 palettes

Every palette is an object with the **same keys** so widgets render identically across all of them. Catppuccin's vocabulary is the contract: `rosewater flamingo pink mauve red maroon peach yellow green teal sky sapphire blue lavender` (accents) + `text subtext1 subtext0 overlay2 overlay1 overlay0 surface2 surface1 surface0 base mantle crust` (neutrals) + `name label isLight`.

### 2.1 Mocha (default dark) & Latte (light) — full hex
**MOCHA** `isLight:false` — base `#1e1e2e` mantle `#181825` crust `#11111b`; surface0/1/2 `#313244/#45475a/#585b70`; text `#cdd6f4` subtext1 `#bac2de` subtext0 `#a6adc8`; overlay0/1/2 `#6c7086/#7f849c/#9399b2`. Accents: mauve `#cba6f7` blue `#89b4fa` peach `#fab387` teal `#94e2d5` pink `#f5c2e7` lavender `#b4befe` green `#a6e3a1` red `#f38ba8` yellow `#f9e2af` sky `#89dceb` sapphire `#74c7ec` maroon `#eba0ac` rosewater `#f5e0dc` flamingo `#f2cdcd`.

**LATTE** `isLight:true` — base `#eff1f5` mantle `#e6e9ef` crust `#dce0e8`; surface0/1/2 `#ccd0da/#bcc0cc/#acb0be`; text `#4c4f69` subtext0 `#6c6f85`. Accents: mauve `#8839ef` blue `#1e66f5` peach `#fe640b` teal `#179299` pink `#ea76cb` green `#40a02b` red `#d20f39` yellow `#df8e1d` sky `#04a5e5` sapphire `#209fb5` lavender `#7287fd` maroon `#e64553`.

### 2.2 The other ten (key colors)
| Palette | isLight | base | text | signature accents |
|---|---|---|---|---|
| **GRUVBOX** | no | `#282828` | `#ebdbb2` | peach `#fe8019`, yellow `#fabd2f`, green `#b8bb26`, red `#fb4934` |
| **TOKYONIGHT** | no | `#1a1b26` | `#c0caf5` | blue `#7aa2f7`, sky `#7dcfff`, mauve `#bb9af7`, teal `#73daca` |
| **NORD** | no | `#2e3440` | `#eceff4` | sky `#88c0d0`, blue `#81a1c1`, green `#a3be8c`, mauve `#b48ead` |
| **DRACULA** | no | `#282a36` | `#f8f8f2` | pink `#ff79c6`, mauve `#bd93f9`, teal/sky `#8be9fd`, green `#50fa7b` |
| **ROSEPINE** | no | `#191724` | `#e0def4` | mauve `#c4a7e7`, pink `#ebbcba`, peach `#f6c177`, red `#eb6f92` |
| **EVERFOREST** | no | `#2d353b` | `#d3c6aa` | green `#a7c080`, teal `#83c092`, blue `#7fbbb3`, yellow `#dbbc7f` |
| **KANAGAWA** | no | `#1f1f28` | `#dcd7ba` | blue `#7e9cd8`, mauve `#957fb8`, yellow `#e6c384`, red `#e46876` |
| **GRUVBOX_LIGHT** | yes | `#fbf1c7` | `#3c3836` | blue `#076678`, green `#79740e`, peach `#af3a03` |
| **SOLARIZED_LIGHT** | yes | `#fdf6e3` | `#586e75` | blue `#268bd2`, teal `#2aa198`, green `#859900`, yellow `#b58900` |
| **PIXEL** | no | `#1d2b53` | `#fff1e8` | PICO-8: yellow `#ffec27`, green `#00e436`, teal/blue `#29adff`, red `#ff004d`, peach `#ffa300`, pink `#ff77a8`, mauve `#c77dff`. Sets `font: "VT323"…` |

(Full hex for all keys is in `src/theme.jsx` / `brand.json`. Light palettes reuse some neutrals as accents — that's intentional.)

### 2.3 Semantic color map — color *is* meaning
| Signal | Color | Signal | Color |
|---|---|---|---|
| CPU | blue | RAM | mauve |
| temp | peach (→ red >70°) | battery | green→yellow(<50)→red(<20) |
| wifi | sky | bluetooth | blue |
| VPN / calendar / camera-live | green | mic / recording / pomodoro | red |
| AI (primary / secondary) | mauve / blue | now-playing | peach (alt lavender) |
| updates | sky | weather | sapphire |
| net-speed down / up | teal / peach | keyboard | lavender |
| caffeine-on | peach | perf eco/auto/perf | green/blue/peach |
| github | text (mention → peach) | | |

If a color isn't communicating state, it isn't used. No decorative color.

### 2.4 Glass background math (in `<Desktop>`)
Derived per-palette from neutrals via `hexToRgba`:
- `--bg` = base @ **0.82** (dark) / **0.92** (light)
- `--bg2` = surface1 @ 0.55 · `--bg3` = surface2 @ 0.70
- `--mantle` (popover) = mantle @ 0.92 (dark) / 0.94 (light)
- `--text` = text · `--dim` = subtext0 · `--accent` = accent override or palette.mauve

---

## 3. The `<Desktop>` frame & wallpaper

`<Desktop palette wallpaper position accent radius pad showApp>` is the per-artboard root. It:
1. Sets all CSS vars (§2.4) + `--radius`/`--pad` + every accent var + `fontFamily` (Pixel adds `fontSize:15`, `imageRendering:pixelated`).
2. Renders `<Wallpaper variant=...>` absolutely behind.
3. Renders a faded `<FakeApp>` "code window" for context (toggle via `showApp`).
4. Slots `children` (the bar) into `position`: top/bottom/left, `zIndex:10`, `pointerEvents` re-enabled on the inner div only.
5. Outer `borderRadius:6`, `overflow:hidden`.

**`<FakeApp>`** — a translucent kitty/terminal window (`blur(8px)`, crust@0.6 bg) showing traffic-light dots + a fake `hyprctl monitors` / `paru -Syu` transcript in 10px mono. Offsets itself so it never collides with the bar.

**`<Wallpaper variant>`** — vibe-name → CSS gradient (e.g. `mocha-a` = `radial-gradient(ellipse at 20% 0%, #45475a 0%, #1e1e2e 45%, #11111b 100%)`). Each palette has an `-a` (radial, accent-tinted) and `-b` (linear) variant. On top it paints:
- Two soft SVG **mountain silhouettes** (mtnA/mtnB colors picked per palette family, opacity ~0.35).
- A **starfield** (60 procedural circles) on dark wallpapers only.
- **Pixel variants** instead render `<PixelLandscape>`: chunky stepped-rectangle mountains, blocky square stars, a half-disc pixel sun with scan-stripes, a ground baseline, **CRT scanlines** (`repeating-linear-gradient` 1px/3px, `mix-blend:multiply`) and a vignette.

---

## 4. Widget catalog

All widgets share the `.w` base (injected once as `#widget-styles`):
```css
.w   { display:inline-flex; align-items:center; gap:8px; padding:6px 10px;
       border-radius:calc(var(--radius,12px) - 4px); color:var(--text);
       font:500 12.5px/1 'JetBrains Mono',…; letter-spacing:.01em;
       white-space:nowrap; transition:background/transform/color .15s ease;
       cursor:default; user-select:none; }
.w:hover{ background:var(--bg2); }
.w-flat{ padding:4px 8px; }   .w-chip{ background:var(--bg2); }   .w-chip:hover{background:var(--bg3);}
.w .dim{color:var(--dim);}    .w .accent{color:var(--accent);}
.w-sep{ width:1px; height:16px; background:var(--text); opacity:.08; margin:0 4px; }
```
Visual variety comes **only** from semantic color + icon choice, never one-off shapes. `<Sep/>` renders `.w-sep`.

### 4.1 Core widgets (props → render)
- **Workspaces** `{active,count,hasWindows[],style:'dots'|'pills',labels}` — dots: 8px circles, inactive opacity .18, has-window .55, active = accent pill 22px wide. Pills: min 22px square, active = accent bg / `--bg` text, 30px wide.
- **ActiveWindow** `{icon,title,maxWidth=240}` — window glyph (dim) + ellipsized title.
- **Clock** `{time,date,dateFirst,accent}` — clock glyph (accent) + bold time + dim date, tabular.
- **Battery** `{pct,charging}` — 22×12 SVG battery, fill color green/yellow/red by pct, `⚡`+`%` text.
- **CpuChip** `{pct,data}` — cpu glyph (blue) + `<Sparkline blue>` + `%`. **RamChip** `{pct}` — ram glyph (mauve) + %. **TempChip** `{c}` — thermo glyph peach (red >70) + `°`.
- **Sparkline** `{data,color,width,height}` — polyline, 1.5 stroke, round joins. Default 38×14.
- **Volume** `{v,muted}` — volume/mute glyph + 46×4 track w/ accent fill. **Brightness** `{v}` — yellow glyph + %.
- **Net** `{ssid}` / **NetIcon** — sky wifi glyph (+ ssid). **BTIcon** `{count}` — blue bluetooth glyph, count in a blue 22%-tint badge.
- **Notifications** `{count}` — bell + absolute `.badge` (accent bg, `--bg` text, 2px border, top-right).
- **Tray** `{items[]}` — 8px rounded color squares (mauve/blue/green/sky/peach cycle).
- **PowerMenu** — red power glyph on red-soft chip. **KeyLayout** `{layout}` — keyboard glyph + uppercase 10px layout.
- **Launcher** `{label,hint}` — chip: tray glyph (accent) + bold label + dim kbd hint (`⌘ Space`).

### 4.2 Plugin widgets
- **NowPlaying** `{title,artist,compact,accent,showViz,sources[],app}` — single track or, if `sources.length≥2`, a `<NowPlayingTrack>` + a stateful **source-cycle chevron button** showing `idx/total`. Track = `<AlbumArt>` (gradient swatch + vinyl dot, optional app-color dot e.g. Spotify `#1db954`) + optional `<Viz>` + title·artist.
- **Viz** `{n,h,w=2.5,gap=2,accent}` — n animated `.viz-bar`s, bottom-anchored.
- **Pomodoro** `{minutes,total=25,label,size=18}` — SVG progress ring (red, rotated -90°) + `Nm` + optional label.
- **HyprMap** `{workspaces,active,compact}` — row of mini workspace cells (accent if active) with positioned mini-window rects from a fixed layout table.
- **GitHub** `{prs,mentions}` — github glyph + 3-avatar overlap stack + `N PRs` + `@mentions` (peach).
- **Updates** `{count}` — arch glyph (sky) + count + `upd`.
- **CalendarChip** `{when,what}` — green calendar glyph + green time + dim ellipsized title.
- **AILauncher** `{label,pulse}` — gradient mauve→blue chip, ai glyph w/ pulsing halo, **gradient-clipped text**, `⌘K` kbd.
- **AITalk** `{listening}` — mic glyph; listening = red-tint chip + 5 animated `ai-talk-bar`s, else "tap to talk".
- **NetSpeed** `{down,up}` — teal sparkline + `↓down M` (teal) + `↑up M` (peach).
- **RecIndicator** — pulsing red dot + `REC mm:ss`. **CameraIndicator** `{time,label}` — green-tint bordered chip, camera glyph w/ pulse dot + `CAM 00:42`.
- **Performance** `{mode,compact}` — eco/auto/perf (leaf/scale/bolt; green/blue/peach). Compact = icon+label; full = segmented control, active tab tinted.
- **Weather** `{temp,cond}` — sapphire cloud + `temp°` + cond.
- **ScreenshotWidget** — 3-segment chip (region mauve / window / full) with hairline dividers.
- **ColorPickerWidget** `{recent}` — dropper glyph + color swatch + uppercase hex.
- **AudioSourceWidget** `{device,icon}` — blue device glyph (airpods/headphones/…) + name + down-chevron.
- **IdleInhibitor** `{on,remaining}` — coffee glyph; on = peach-tint chip + `AWAKE` + remaining, else "idle ok".

### 4.3 Icons
`<Icon name size=16 stroke=1.75 color style>` → 24×24 viewBox, `fill:none`, `currentColor` stroke, round caps/joins. Filled glyphs (play/pause/skip/prev/bolt/ai/rec/thermo-dot) use `fill:currentColor stroke:none` inline. ~70 names grouped: time/net/power/audio/display/system/media/capture/AI. Sizes: bar 12–16, popover 14–22, hero 32–48. Color always semantic. Phosphor-style geometry — in real AGS use Phosphor Icons or Material Symbols Rounded.

---

## 5. The six bar layouts

All bars live inside `<Desktop position=...>`. `<BarShell>` is the floating-glass pill (§1.4). Composition rules per layout:

| # | Name | position | Structure |
|---|---|---|---|
| 01 | **Aurora** | top | `space-between`, **3 separate `<BarShell>` modules** with 10px gaps. L: Workspaces·Launcher·ActiveWindow. C: NowPlaying(2 sources)·Clock·Pomodoro. R: Updates·GitHub·Cpu·Ram·Perf·Volume·Battery·Notifications·AILauncher. Outer padding 12/14px. |
| 02 | **Pillbox** | top | **edge-to-edge**, single `blur(20px)` bar w/ bottom hairline, `space-between`. Crams arch tile, 9 ws pills, ActiveWindow, NowPlaying, NetSpeed, Camera, Pomodoro, GitHub, Updates, Tray, Cpu, Temp, Perf, Idle, Screenshot, KeyLayout, Net/BT/Vol/Battery, Clock, AI, Power. Maximum density. |
| 03 | **Mantle** | bottom | **dock** (radius+6, deeper shadow), centered. Launcher·Workspaces(pills)·HyprMap·**hero now-playing** (gradient peach/mauve tile w/ AlbumArt 32 + transport + Viz)·Pomodoro·AITalk·Tray·Volume·Battery·Clock. |
| 04 | **Spine** | left | **vertical rail** (~64px). Top: arch logo. Vertical ws pills (active grows tall). Plugin `IconBtn`s w/ badges (AI/github/package/calendar/tomato). Spacer. Vertical Cpu/Ram/Temp stack. BT/wifi/vol icons. Vertical battery SVG. Vertical stacked clock (`14`/`32`/`MON`/`25`). |
| 05 | **Atlas** | top | `grid auto/1fr/auto`, **3 independent `<BarShell>`s** (start/center/end). L: arch·Workspaces·HyprMap. C: CalendarChip·NowPlaying·AITalk. R: ColorPicker·Updates·GitHub·Cpu/Ram/Temp·AudioSource·Battery·Clock. |
| 06 | **Cathedral** | top | L & R modules `marginTop:8`; **center hero bulge** extends *down* — column shell (minWidth 340, lavender-tinted gradient, deeper shadow) with AlbumArt 42 + title/album/year + round transport + **46-bar visualizer** (per-bar `color-mix lavender` + staggered delay) + scrub bar w/ 1:42 / 4:03. |

Latte's **Linen** (07) = `<BarAurora>` and **Marble** (08) = `<BarPillbox>` rendered under the LATTE palette — same components, recolored. The "More themes" sections rotate each palette through a *different* layout so reviewers see variety (Gruvbox→Aurora, Tokyo Night→Pillbox, Nord→Mantle, Dracula→Atlas, Rosé Pine→Cathedral, Everforest→Aurora, Kanagawa→Spine, etc.).

---

## 6. Popovers & overlays (16)

`<PopoverShell width>` is the shared frame: `rgba(30,30,46,0.92)` bg, `blur(36px) saturate(160%)`, hairline border, radius 14, padding 14, mono font — **plus a 45°-rotated connector tab** (`top:-6 left:30`, 12×12) pointing back to the bar widget. In the canvas, popovers sit in a `PopoverArtboard` (radial-gradient backdrop + a mini context bar widget above the panel).

| Popover | width | Anatomy highlights |
|---|---|---|
| **ControlCenter** | 360 | 3 ConnCards (wifi/BT/VPN, tinted-on) · VPN detail strip (green, IP, ●ONLINE) · 3 PrivacyPills (camera on/mic/location) · POWER PROFILE segmented (eco/auto/perf) · 3 SliderRows (vol/bright/mic w/ knob) · 4 MiniToggles (caffeine/night/dnd/snip) · stats card (CPU/RAM/NET sparklines) · 3 PowerBtns. |
| **NowPlayingPanel** | 320 | AlbumArt 88 + title/artist/album · transport (peach play, glow) · **72-bar waveform** progress (played=peach, rest=bg3) · UP NEXT list (numbered, mini art, durations). |
| **CalendarPanel** | 300 | month header + chevrons · 7-col S–S grid (today=accent fill, event=accent dot) · TODAY agenda list (time range + colored spine + title). |
| **HyprMapPanel** | 340 | 5 × 16:9 workspace thumbnails (active tinted+bordered, positioned app rects, "empty" state, ws number) · active-ws window list (colored spine + app + title). |
| **AIOverlay** | overlay | scrim+blur, 18px card, **gradient halo**, header (gradient ai badge + `cachy::ai` + `llama3.2·local`), `<Msg role>` bubbles (user=mauve-tint right, ai=bg2 w/ avatar + code `<pre>` + ActionChips), mic input row (pulsing red mic + waveform + esc). |
| **AppLauncher** | 560 overlay | search input (accent caret blink + "2 RESULTS") · **calc banner** (teal gradient, `fi→1.618…`) · ResultRows (AppTile + matched-prefix highlight) · RECENT chips · ALL APPS 6-col grid of gradient `AppTile`s (selected = accent tint) · footer hint bar w/ kbd keys + "ask cachy::ai". |
| **CameraPopover** | 340 | LIVE badge · 16:9 preview (gradient + SVG silhouette + scanlines + corner brackets + REC/res/device overlays) · STOP/Pause/snip/cam_off controls · 4 SettingChips · USING CAMERA app list. |
| **BatteryDevicesPopover** | 360 | hero laptop card (`<BatteryRing>` 60 + name + time + 38W AC/health/cycles) · power profile · BLUETOOTH DEVICES list (BatteryRing 28 + icon + LOW badge + %). |
| **ScreenshotPopover** | 340 | 4 ModeBtns (region/window/full/delay) · 16:10 desktop thumbnail with **dashed teal selection rect** (corner handles + `1248×720` dim chip + crosshair) · delay options · recents. |
| **ColorPickerPopover** | ~340 | loupe/zoom + hex + Catppuccin swatch palette + recents. (Same shell.) |
| **AudioSourcePopover** | 360 | output device list · input · per-app volume mixer sliders. |
| **KeyboardLayoutPopover** | 340 | keyboard preview + layout list (us/de/…). |
| **IdleInhibitorPopover** | 340 | caffeine big toggle + duration presets + reason. |
| **NotificationsPopover** | 360 | toast stack w/ app icon, title/body, snooze/dismiss, group headers. |
| **ConfirmBanner** | 540 | AI asking permission — gradient-haloed banner, command preview, Allow/Deny. |

Shared sub-parts: `ConnCard PrivacyPill PerfTab MiniToggle Stat SliderRow PowerBtn` (ControlCenter); `BatteryRing` (ring + centered %, `thin` variant); `SettingChip ModeBtn`; `Msg ActionChip` (AI); `AppTile ResultRow kbd` (launcher).

---

## 7. Login screens (3)

`<LoginFrame wallpaper accent>` = full-bleed wallpaper + radial darken overlay + Mocha CSS vars, 16:9.

- **LoginAurora** (`mocha-d`, mauve) — big 88px gradient-clipped clock top-left; tiny status `FloatChip`s top-right (wifi/battery); **centered glass card** (420px, radius 18): 72px gradient avatar "S", name/host, password field (accent-glow border, dotted value, blink caret), gradient **Unlock** button w/ `↵`, switch-user / forgot links, **Hyprland·Wayland session pill** below; bottom-center FloatChip row (US/vol/bright/power/spark/user); hostname watermark.
- **LoginAtlas** (`mocha-f`, teal) — **split `FloatPanel`s**: top-left SYSTEM info (`Row` host/kernel/uptime/updates/last-login); top-right 56px clock + weather/calendar panel; center compact login (44px avatar + `❯` prompt field); bottom-left power icons (off/reboot/sleep/switch); bottom-right keyboard + session panels.
- **LoginTerminal** (`mocha-e`, green) — **brutalist TTY**: no glass, 6px-radius dark window (`rgba(17,17,27,0.92)`, green-tinted border + glow), title bar (`tty1 · /dev/tty1 · 80×24`, `● LOCKED`), **Arch ASCII logo** (sky), `cachy-ws login: sam`, green `Password:` w/ block cursor, dashed status line (`F1 session` / `F2 kb` / `F12 power` / clock·battery), CRT scanline overlay. The "I run Arch" badge of the set.

`FloatChip` / `FloatPanel` = blurred mantle-tinted glass (radius 8 / 14). `Row` = dim label + tabular value. Password caret = `blink 1s steps(2)`.

---

## 8. Tweaks (live, in-canvas)

`<TweaksPanel>` + `useTweaks(TWEAK_DEFAULTS)`. Defaults ship: every palette's `*_accent`, `radius:18`, `pad:8`, plugin toggles all true. Controls:
- **Per-palette `<TweakColor>`** — curated swatch arrays (no free picker). E.g. Mocha offers mauve/blue/peach/teal/pink/lavender/green.
- **`<TweakSlider>`** `radius` 0–28px and `pad` 2–20px (drive `--radius`/`--pad` on every Desktop at once).
- **`<TweakToggle>`** plugin visibility: AI / Pomodoro / GitHub / NowPlaying / Stats.

Wiring: `<App>` builds `dArgs/lArgs/themeArgs` helpers that inject `{palette, wallpaper, accent, radius, pad}` into each `<Desktop>`. Accent override is per-palette-family (mocha bars read `mocha_accent`, latte bars `latte_accent`, etc.). Implementation-only tweaks (not surfaced): bar position, icon set, wallpaper.

---

## 9. Replication checklist

1. Scaffold `index.html` with pinned React/Babel + the script load order in §0; copy `design_canvas.jsx` + `tweaks_panel.jsx` starters.
2. `src/theme.jsx`: the 12 palette objects (§2) + `<Wallpaper>`/`<PixelLandscape>` + `hexToRgba`; `Object.assign(window,…)`.
3. `src/icons.jsx`: ~70 glyphs + `<Icon>`.
4. `src/widgets.jsx`: inject `#widget-styles` once; build the catalog (§4) reading CSS vars only.
5. `src/bars.jsx`: `<Desktop>` + `<FakeApp>` + `<BarShell>` + 6 layouts (§5).
6. `src/popovers.jsx`: `<PopoverShell>` + 16 popovers (§6) + sub-parts.
7. `src/login.jsx`: `<LoginFrame>` + 3 screens (§7).
8. `<App>`: 7 `<DCSection>`s, 39 `<DCArtboard>`s in canonical order; `<TweaksPanel>` (§8).
9. Verify: every status number is tabular; no hardcoded hex outside theme.jsx; one blur recipe per shell kind; all motion behind `prefers-reduced-motion`; min 44px hit targets; text ≥ 9px.

### Anti-goals (do not do)
Gradient-fill maximalism · emoji as UI (except Pixel charm + battery `⚡`/`🔋` glyphs) · stacked translucencies ("frosted on frosted") · decorative color with no meaning · drop-shadow stacks · generic Material Design · cluttered tray · "AI app launcher" tropes · inventing new hues outside the palettes.

---

## Appendix A — Exact component blueprints

Prose loses precision on small numbers (bar heights, tints, delays). These are **verbatim** from source so a widget can be rebuilt byte-for-byte without reading the `.jsx`. Same applies to the rest of the catalog — when exactness matters, treat the source file as canonical; these are the patterns the others follow.

### A.1 Animation keyframes (verbatim)
```css
@keyframes w-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} } /* 2.2s ease-in-out infinite */
@keyframes viz     { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }                     /* 1.1s; transform-origin:bottom */
@keyframes ai-talk { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }                      /* 0.8s ease-in-out infinite; transform-origin:center */
@keyframes blink   { 50%{opacity:0} }                                                              /* 1s steps(2) */
@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }                /* 14s linear */
/* viz-bar stagger:    nth(2).1 nth(3).25 nth(4).05 nth(5).3 nth(6).15 nth(7).4 nth(8).2 nth(9).35 nth(10).08 */
/* ai-talk-bar stagger: nth(2).1 nth(3).2  nth(4).05 nth(5).15 */
```

### A.2 AITalk — the microphone widget (verbatim)
```jsx
function AITalk({ listening = true }) {
  return (
    <div className="w w-chip" style={{
      gap: 6, padding: '5px 10px',
      background: listening ? 'color-mix(in oklab, var(--red) 16%, transparent)' : 'var(--bg2)',
    }}>
      <Icon name="mic" size={13} style={{ color: listening ? 'var(--red)' : 'var(--dim)' }} />
      {listening ? (
        <div style={{ display:'inline-flex', alignItems:'center', gap:1.5, height:12 }}>
          {[6,10,8,12,7].map((h,i) => (
            <div key={i} className="ai-talk-bar"
              style={{ width:2, height:h, background:'var(--red)', borderRadius:1 }} />
          ))}
        </div>
      ) : <span className="dim">tap to talk</span>}
    </div>
  );
}
```
Exact values that prose omits: tint **16%**, chip pad **5px 10px**, icon **13**, bars **`[6,10,8,12,7]`** px tall × **2px** wide, gap **1.5px**, container height **12px**, bar radius **1px**, color `var(--red)`, idle copy **"tap to talk"**. The `mic` glyph (`src/icons.jsx`): `<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>` on a 24×24 viewBox, stroke 1.75.

### A.3 Other exact-value spots worth copying verbatim
- **Viz** defaults: `n=6, h=14, w=2.5, gap=2`, bar `borderRadius:1`, `align-items:flex-end`.
- **Cathedral visualizer**: 46 bars, each `height:18`, `background:color-mix(in oklab, var(--lavender) ${30 + (i%10)*7}%, transparent)`, `animationDelay:${(i*0.06)%1.2}s`.
- **NowPlayingPanel waveform**: 72 bars, `h = 4 + abs(sin(i*0.5))*18 + (i%5)*1.5` clamped to 22; played (`i/72 < .42`) = peach, rest = `--bg3`.
- **AILauncher**: chip bg `linear-gradient(135deg, color-mix(mauve 18%), color-mix(blue 18%))`, inset ring `color-mix(mauve 30%)`, label text gradient-clipped mauve→blue, `⌘K` kbd.
- **badge** (Notifications): `min-width:14 height:14 padding:0 4px`, accent bg, `--bg` text, `font:700 9px/14px`, `border:2px solid var(--bg)`, `top:-3 right:-4`.
- **Battery** SVG: `viewBox 0 0 22 12`, body `x.5 y.5 18×11 rx2`, nub `x20 y3.5 2×5`, fill `x2 y2 width=15*(pct/100) height8 rx1`; fill color `>50 green / >20 yellow / else red`.
- **BatteryRing**: stroke 4 (or 2.5 if `thin`), `r=(size-stroke)/2`, `dashoffset=c*(1-pct/100)`, rotated -90°.
- **PopoverShell connector tab**: 12×12 square, `rotate(45deg)`, `top:-6 left:30`, left+top hairline borders only.

---

## 10. File map

| File | Role |
|---|---|
| `index.html` | Canvas root + `<App>` + Tweaks. **Source of truth.** |
| `design.md` | This spec. |
| `HANDOFF.md` | AGS/GTK implementation (services, SCSS, widget wiring). |
| `tokens.css` | Drop-in tokens + `.bar-shell`/`.popover`/`.w` patterns. |
| `brand.json` | Machine-readable system (palettes, shape, type, semantics, shells, widgets). |
| `src/theme.jsx` | Palettes + wallpapers. |
| `src/icons.jsx` | Icon set. |
| `src/widgets.jsx` | Widget catalog. |
| `src/bars.jsx` | Desktop frame + 6 bars. |
| `src/popovers.jsx` | 16 popovers/overlays. |
| `src/login.jsx` | 3 login screens. |
| `canvas-renders/` | 39 reference PNGs (one per artboard, focused). |

