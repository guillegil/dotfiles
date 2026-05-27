# Cachy Bar — Design

A retro-tinged AGS status bar for **Hyprland on Arch / CachyOS**. Monospaced, glassmorphic, theme-able. Twelve palettes wired into the same widget vocabulary, six core bar layouts, sixteen popovers, three login screens.

The canvas at `index.html` is the source of truth — this file is the **why** behind it. For the **how** (implementation, AGS wiring, services), see `HANDOFF.md`. For literal tokens, see `tokens.css` and `brand.json`.

---

## 1. Vision

> *A status bar that feels like it grew out of the terminal it sits above.*

Three things drive every decision:

1. **Monospaced and tabular.** JetBrains Mono everywhere. Numbers don't jitter when the clock ticks. The bar reads like a `tmux` status line that learned glassmorphism.
2. **Soft pastel on warm dark.** Catppuccin Mocha is the spiritual home — pastel accents on `#1e1e2e`, never neon, never flat black. Latte handles daylight without losing the family resemblance. Eight further palettes (Gruvbox, Tokyo Night, Nord, Dracula, Rosé Pine, Everforest, Kanagawa, Solarized, Pixel) ride the same scaffolding.
3. **Floating modules, not chrome.** The bar is jewelry, not architecture. It hovers, blurs the wallpaper behind it, and casts a soft shadow. Edge-to-edge dense variants exist for users who want everything at a glance — but the default is to breathe.

Anti-goals: cluttered tray icons, gradient-fill maximalism, "AI app launcher" tropes, drop-shadow stacks, generic Material Design.

---

## 2. Design principles

| Principle | What it means in the bar |
|---|---|
| **Semantic color, never decorative** | CPU is always blue, battery is green→yellow→red, mic is red, AI is mauve→blue. Color carries meaning; if it isn't communicating, it isn't there. |
| **Density is a slider, not a stance** | Aurora floats with breathing room; Pillbox crams everything in. Same widgets, different posture. Don't pick a side — ship both. |
| **Tweak the obvious, hide the rest** | Accent, radius, padding, plugin visibility are one click away. Everything else is curated. |
| **Privacy is a visual signal** | Camera/mic active = pulsing green dot. This is not decoration — it's the only honest way to tell a user their hardware is hot. |
| **Glass without nausea** | One blur recipe (`blur(28px) saturate(160%)`), one shadow recipe per shell kind. No stacked translucencies, no "frosted on frosted." |
| **Hit targets ≥ 44px** | Even when the visible pill is 16px tall, the invisible padding makes it tappable on touchscreens and forgivable to drunk-Friday clicks. |

---

## 3. The system

### Type
- **Family**: JetBrains Mono → SF Mono → ui-monospace.
- **Scale** (px): 9 (section labels, ALLCAPS), 10 (badges), 12.5 (body), 13 (popover headings), 14 (hero titles).
- **Tabular numerals** on everywhere status text appears.
- Floor is **9px**. Below that, readability collapses.

### Color
- 12 palettes defined; each exposes the same CSS contract: `--bg`, `--bg2`, `--bg3`, `--text`, `--dim`, `--accent`, plus the full accent set (`--mauve`, `--blue`, `--peach`, …).
- Widgets read tokens — never hex literals. Theme swap is a CSS-variable swap, no JS.
- Tinted accent surfaces use `color-mix(in oklab, <color> <pct>%, transparent)` at 12% (wash), 22% (active), 35% (active border), 45% (fill).

### Shape
- Bar radius **14px** default, tweakable 0–28. Inner widget radius is `radius − 4`. Hero/overlay radius bumps to **18px**.
- Bar inner padding **8px** default, tweakable 2–20.
- Widget gap **8px** (text↔icon), **2px** (pill↔pill).
- Bar height ≤ 30px outside hero positions.

### Elevation
Three shell recipes, no more:
- **Bar glass** — `blur(28px) saturate(160%)`, soft drop shadow, 1px hairline.
- **Bar dock** (bottom Mantle / hero Cathedral) — deeper shadow, +6px corner radius bump.
- **Popover** — `blur(36px) saturate(160%)`, deeper shadow, 14px padding.

### Motion
- Base transition **150ms ease**; morph **180ms cubic-bezier(.2,.7,.3,1)**.
- One ambient loop per widget kind: pulse (recording dot), viz (audio bars), waveform (AI talk), blink (cursor).
- All animation gated on `prefers-reduced-motion`.

### Icons
Phosphor-style geometry, **1.75px stroke**, round caps/joins, 24×24 viewBox. Rendered 12–16px in the bar, 14–22px in popovers, 32–48px hero. ~70 named glyphs covering time/network/power/audio/display/system/media/capture/AI. Color is always semantic.

---

## 4. The artifacts

### 4.1 Bar layouts (six core × twelve palettes)

| # | Name | Position | Personality |
|---|---|---|---|
| 01 | **Aurora** | top, floating | Three segmented modules with gaps. The default — soft and balanced. |
| 02 | **Pillbox** | top, edge-to-edge | Maximum density. Everything visible at once. |
| 03 | **Mantle** | bottom, dock | macOS-style dock with hero now-playing widget centered. |
| 04 | **Spine** | left, vertical | Icon rail. Workspace numbers, vertical clock, ultra-narrow. |
| 05 | **Atlas** | top, floating | Three fully separate floating shells (left / center / right). |
| 06 | **Cathedral** | top, floating | Tall hero center bulge for now-playing w/ 46-bar visualizer. |

The canvas renders each layout under multiple palettes — Mocha + Latte are first-class, the other ten are themed rotations (Aurora-in-Gruvbox, Pillbox-in-Tokyo-Night, etc.) so reviewers see each palette in a different shape. **Pixel** is the retro outlier — PICO-8 palette, VT323 type, CRT scanlines.

### 4.2 Widget vocabulary

**Core (always-on):** Workspaces · ActiveWindow · Clock · Battery · CpuChip · RamChip · TempChip · Volume · Brightness · Net · BTIcon · Notifications · Tray · PowerMenu · KeyLayout · Launcher.

**Plugins (curated):** NowPlaying (multi-source) · Pomodoro · HyprMap · GitHub · Updates · CalendarChip · AILauncher · AITalk · NetSpeed · RecIndicator · CameraIndicator · Performance · IdleInhibitor · ScreenshotWidget · ColorPickerWidget · AudioSourceWidget · Weather.

All widgets inherit a `.w` base — same padding, same radius math, same hover state. Visual variety comes from semantic color and icon choice, never from one-off shapes.

### 4.3 Popovers & overlays (sixteen)

Every popover is the same shell — mantle bg, 36px blur, 14px padding, hairline border — with a tab connector pointing back to its bar widget. Content varies wildly:

Control Center · Now Playing · Calendar · HyprMap · AI Assistant (full overlay) · App Launcher (full overlay) · Camera · Battery & Devices · Screenshot · Color Picker · Audio Mixer · Keyboard Layout · Caffeine · Notifications · Confirm Banner.

The two **overlays** (AI, App Launcher) break the popover shell — they're full-screen with a scrim and a gradient halo. Everything else is a popover anchored to its widget.

### 4.4 Login screens (three)

Same widget vocabulary, scaled up to SDDM dimensions:

- **Aurora Login** — centered glass card on the wallpaper.
- **Atlas Login** — split floating modules (clock left, user/auth center, system info right).
- **Terminal Login** — brutalist TTY. No glass, no rounded corners, monospaced prompt. The "I run Arch" badge.

---

## 5. Tweakables

Live, in-canvas. The Tweaks panel exposes:

- **Accent** per palette (curated swatches per theme — no free color picker).
- **Radius** 0–28px slider.
- **Padding** 2–20px slider.
- **Plugin visibility** — toggles for AI / Pomodoro / GitHub / NowPlaying / Stats.

Implementation tweakables (not surfaced in the canvas but documented for AGS): bar position, icon set, wallpaper.

---

## 6. How to review the canvas

Open `index.html` and use the design canvas controls:

1. **Sections** at the top jump between *Dark*, *Light*, *More themes*, *Retro 8-bit*, *Popovers*, *Login*.
2. **Double-click an artboard** to focus it 1:1; arrow keys to walk through; Esc to back out.
3. **Tweaks toggle** (toolbar) opens the panel — change accent/radius/padding and watch every bar update at once.

Things to scrutinize:
- Aurora vs Pillbox at the same accent — is the density right for each?
- The Cathedral hero widget — is the center bulge too operatic, or just right?
- Latte readability — does the 92% bg alpha hold up over a busy wallpaper?
- Pixel — is the CRT treatment charming or gimmicky? (Tweak the accent to find out.)
- Login Terminal — does the brutalism feel intentional, or like an unfinished theme?

---

## 7. Open questions

- **Default layout** — Aurora is shipped as the canvas default. Should the installer ask, or pick for the user?
- **Multi-monitor** — every bar is single-monitor today. Per-monitor accent overrides? Mirror vs. independent bars?
- **AI provider** — wired against local `ollama`. Do we expose remote model toggles, or stay strictly local?
- **Pixel palette** — keep it as a curio, or commit to a fuller retro variant (CRT vignette on the wallpaper, bitmap font in popovers)?
- **Icon library** — Phosphor or Material Symbols? Canvas uses inline SVG; AGS implementation needs to commit.

---

## 8. Files in this project

| File | Role |
|---|---|
| `index.html` | The canvas — every bar, popover, and login screen rendered live. **Source of truth.** |
| `design.md` | This file — design rationale. |
| `HANDOFF.md` | Implementation handoff for the AGS engineer. |
| `tokens.css` | Drop-in design tokens. Paste into AGS `style/theme.scss`. |
| `brand.json` | Machine-readable system definition (palettes, shape, type, widgets). |
| `src/theme.jsx` | Palette objects (Mocha, Latte, Gruvbox, …) consumed by the canvas. |
| `src/icons.jsx` | Phosphor-style SVG icon set. |
| `src/widgets.jsx` | The widget catalog. |
| `src/bars.jsx` | The six bar layouts. |
| `src/popovers.jsx` | The sixteen popovers/overlays. |
| `src/login.jsx` | The three login screens. |
