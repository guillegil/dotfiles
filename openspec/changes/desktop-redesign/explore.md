---
source: engram
topic_key: sdd/desktop-redesign/explore
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

## Exploration: desktop-redesign — AGS/Astal implementation of the Cachy Bar design package

### 1. Design Package Summary

**What it is:** A complete design system export for a Hyprland status bar named "Cachy Bar," targeting AGS (Aylur's GTK Shell) v2 on Arch/CachyOS. The design was produced in Claude Design (claude.ai/design) and exported as HTML/CSS/JSX prototypes with full token coverage.

**Visual language:**
- **Palette:** Catppuccin Mocha (dark default) + Latte (light). Exposes `--bg`, `--bg2`, `--bg3`, `--text`, `--dim`, `--accent`, plus 14 named accent colors via CSS custom properties.
- **Typography:** JetBrains Mono exclusively. Scale: 9px labels → 10px badges → 12.5px body → 13px popover headings → 14px hero. Tabular numerals everywhere numeric. All ALLCAPS section labels at 0.10em letter-spacing.
- **Spacing:** bar radius 14px (tweakable 0–28), inner widget radius = radius-4px, bar height ≤ 30px, widget pad 6px 10px, widget gap 8px.
- **Surface treatment:** Glassmorphic. `backdrop-filter: blur(28px) saturate(160%)` on bar shells; `blur(36px)` on popovers. Hairline border via `color-mix(in oklab, var(--text) 7%, transparent)`. Soft box-shadows.
- **Motion:** 150ms base transitions; 180ms morphs for workspace pill width; pulsing keyframe for recording dots/AI halos; `viz` keyframes for audio bars; `blink` cursor. All gated on `prefers-reduced-motion`.
- **Icons:** Phosphor-style, stroke 1.75, 24×24 viewBox, semantic color per icon type.

**Bar layouts available:** Aurora (floating 3-module, top), Pillbox (edge-to-edge dense), Mantle (bottom dock), Spine (vertical left), Atlas (3 split floating modules), Cathedral (hero now-playing center bulge), Linen (Aurora/Latte), Marble/Quartz (Pillbox/Mantle Latte).

---

### 2. Surfaces In Scope

**Explicitly designed:**
- `Bar.tsx` — any of the 8 layouts; Aurora and Atlas are the most viable starting points for floating modules approach
- `Launcher.tsx` — the App Launcher overlay: full-screen scrim + glass card, search input with blinking cursor, calculator inline banner, app grid (6 cols), recent commands chips, AI footer hint
- `Mic.tsx` — maps to `AITalk` + `RecIndicator` + `CameraIndicator` widgets; mic state machine already exists, design adds visual polish (animated bars, red tint pill)

**New surfaces the design implies (currently absent from project):**
- Workspaces widget (currently a placeholder button)
- Clock widget with Calendar popover
- Battery, CpuChip, RamChip, TempChip, Volume, Brightness widgets
- NowPlaying widget (multi-source MPRIS)
- Notifications panel (replaces existing `swaync` — conflict to resolve)
- ControlCenter popover (Wi-Fi/BT/VPN/sliders/toggles)
- SystemTray widget
- PowerMenu widget
- All plugin widgets (AILauncher, Pomodoro, HyprMap, GitHub, Updates, etc.)
- 15+ popovers (currently zero)
- SDDM login screens (out of AGS scope, separate implementation)

**Key conflict:** Hyprland autostart currently runs `swaync` (a separate notification daemon/UI). The design's Notifications panel would conflict unless swaync is replaced or kept as-is and Notifications widget just opens swaync.

---

### 3. Token Mapping

`tokens.css` is already structured as CSS custom properties — nearly drop-in for AGS's SCSS pipeline via dart-sass. Key observations:

**Direct port (works as-is):**
```scss
// tokens.css → style/theme.scss
:root { 
  --radius: 14px;
  --radius-inner: calc(var(--radius) - 4px);
  --pad: 8px;
  --font-mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;
  --t-fast: 0.12s; --t-base: 0.15s;
  // palette colors (hex) — fully supported
  --text: #cdd6f4; --mauve: #cba6f7; ... 
}
```

**Needs GTK4 adaptation:**
- `--blur: blur(28px) saturate(160%)` — `backdrop-filter` is NOT standard GTK4 CSS. GTK4 does support `filter` property in CSS but NOT `backdrop-filter`. Blur requires either: (a) GTK4 layer blur via `gtk_widget_set_has_depth_effect()` (experimental/unreliable), or (b) Hyprland's own `layerrule blur` + `layerrule ignorezero` rules applied to the AGS window layers. This is the most critical feasibility issue.
- `color-mix(in oklab, ...)` — GTK4's GtkCssProvider uses a CSS subset. `color-mix()` is likely NOT supported in GTK4's CSS engine (it's relatively new in web CSS; GTK4 CSS parser may not implement it). Need fallback to precomputed SCSS `mix()` at compile time.
- `--blur` and `--blur-popover` CSS variables referencing filter strings — even if GTK4 supported backdrop-filter, referencing it via a CSS variable would be unsupported.
- `font-variant-numeric: tabular-nums` — supported in GTK4/Pango via `font-feature-settings: "tnum"` in CSS or GLib Pango attributes. Needs verification.
- `@keyframes` / CSS animations — GTK4 CssProvider DOES support basic `@keyframes` and CSS transitions. The `pulse`, `viz`, `blink` animations should work with limitations (no `transform: scale()` — GTK4 CSS does NOT support CSS transforms in CssProvider; use `min-width`/`min-height` animation instead for morph effects, or use GLib `tick_callback`).
- `letter-spacing` — supported in GTK4 CSS via `letter-spacing: Xpx` (in pixels, not em). Need to convert em values to px.
- `position: absolute/relative` — NOT supported in GTK4 CSS. Layout is GTK widget layout (box, overlay, grid). All positioning must use GTK4 layout containers.
- `linear-gradient(...)` — supported in GTK4 CSS for backgrounds.
- `box-shadow` — partially supported: GTK4 supports box-shadow but the syntax may differ slightly (no `inset` on some versions, limited spread).
- `border` with `color-mix()` — border color will need precomputed SCSS values.
- `user-select: none` — not applicable in GTK4.
- `white-space: nowrap` / text overflow — GTK4 Labels have `ellipsize` property, not CSS.
- `overflow: hidden` — not a GTK CSS property; use `clip` on widgets.

---

### 4. GTK4 Feasibility Matrix

| Visual Treatment | Status | Notes / Adaptation |
|---|---|---|
| CSS custom properties (colors, radii, padding) | FEASIBLE | GTK4 CssProvider supports `var()`. Define in `:root` / `window` selector. |
| Catppuccin palette hex tokens | FEASIBLE | Direct SCSS variables or CSS props. |
| JetBrains Mono font | FEASIBLE | Install `ttf-jetbrains-mono-nerd` via paru. GTK4 font-family works. |
| `font-variant-numeric: tabular-nums` | PARTIAL | GTK4 CSS supports `font-feature-settings: "tnum"`. Not `tabular-nums` keyword. |
| `letter-spacing` in px | FEASIBLE | Supported. Must convert em → px (0.01em @ 12.5px = 0.125px). |
| `letter-spacing` in em | NOT FEASIBLE | GTK4 CSS only accepts px for letter-spacing. Pre-compute in SCSS. |
| `border-radius` | FEASIBLE | Full support. |
| `box-shadow` (drop) | PARTIAL | Supported but `inset` shadows may have rendering quirks. Test on target. |
| `linear-gradient` backgrounds | FEASIBLE | Supported in GTK4 CSS. |
| `backdrop-filter: blur()` | NOT FEASIBLE (native) | GTK4 CssProvider has no `backdrop-filter`. Use Hyprland `layerrule` instead: `layerrule blur, namespace:ags` sets compositor-level blur on the layer. This is the canonical GTK/Wayland approach. |
| `backdrop-filter: saturate()` | NOT FEASIBLE | Compositor-level blur only; saturation overlay is not possible via layerrule. Use slightly adjusted background alpha to approximate. |
| `filter: blur()` | NOT FEASIBLE (on widget) | GTK4 CSS `filter` property exists but is limited and applies to widget rendering, not backdrop. |
| `color-mix(in oklab, ...)` | NOT FEASIBLE at runtime | GTK4 CSS parser does not support `color-mix()`. MUST precompute all tinted values in SCSS using `mix()` or `rgba()`. |
| `@keyframes` + CSS animation | PARTIAL | GTK4 CssProvider supports `@keyframes` and `animation` property. `opacity` animation works. `transform: scale()` does NOT work (no CSS transforms in GTK4 layout engine). `transform: scaleY()` for viz bars NOT feasible via CSS. |
| `animation: pulse` (opacity only) | FEASIBLE | Drop the `scale(1.4)` part; opacity pulse alone works. |
| `animation: viz` (scaleY audio bars) | NOT FEASIBLE (CSS) | No CSS transforms in GTK4. Must implement viz bars using GLib `tick_callback` or periodic height updates via reactive state. The visual effect CAN be achieved with height-animated boxes. |
| `animation: blink` (cursor) | FEASIBLE | opacity animation. Works. |
| Workspace pill width morph (width transition) | FEASIBLE | GTK4 CSS transitions on `min-width` work. This is the canonical approach for the dot→pill morph. |
| `transition: background, color` (hover) | FEASIBLE | Supported. |
| `position: absolute/relative` | NOT FEASIBLE (CSS) | Use `Gtk.Overlay` widget for overlapping elements (badges, pulse dots, album art indicators). |
| `overflow: hidden` + `text-overflow: ellipsis` | PARTIAL | Use `Gtk.Label` with `ellipsize: end` and width constraints. Not CSS-based. |
| `display: inline-flex` / `gap` | NOT FEASIBLE (CSS) | Use `Gtk.Box` with `spacing` prop and `halign`/`valign`. GTK4 CSS does not control layout type. |
| `width: 100%` / flexible sizing | PARTIAL | Use `hexpand`/`vexpand` props. Not CSS. |
| `user-select: none` | NOT APPLICABLE | GTK4 labels are not selectable by default. |
| `white-space: nowrap` | NOT APPLICABLE | `Gtk.Label` has `wrap` prop. Set `wrap={false}`. |
| `font-weight: 700` | FEASIBLE | GTK4 CSS `font-weight` is supported. |
| `text-transform: uppercase` | FEASIBLE | GTK4 CSS supports `text-transform`. |
| SVG inline icons (Phosphor style) | PARTIAL | GTK4 can render SVG via `Gtk.Image` with `from_file` or icon theme. Custom inline SVGs require writing to temp files or using `Gdk.Pixbuf`. Best approach: bundle as icon theme or use Material Symbols Rounded font (simpler). |
| Badge (absolute positioned pill) | FEASIBLE | Use `Gtk.Overlay`. |
| Marquee text animation | NOT FEASIBLE (CSS) | Use `Gtk.Label` with `marquee`-style tick callback or just ellipsize. |
| `color-mix` tinted active states | NOT FEASIBLE (CSS) | Precompute with SCSS `mix()` or use hardcoded semi-transparent rgba. |
| Popover with `backdrop-filter` | NOT FEASIBLE (backdrop) | Use Hyprland layerrule for compositor blur. Popover shape/border/bg: fully feasible via GTK4 CSS on `popover` selector. |
| Popover triangular tab connector | PARTIAL | Can use `::before` equivalent: a rotated box absolutely positioned. In GTK4, use Overlay or custom draw. Feasible but non-trivial. |
| `color-mix` hairline borders | NOT FEASIBLE (CSS) | Precompute: `color-mix(in oklab, #cdd6f4 7%, transparent)` ≈ `rgba(205,214,244,0.07)`. SCSS can compute this. |
| Sparkline SVG | FEASIBLE | Can be rendered as a custom `DrawingArea` widget or as a dynamically built SVG string loaded into `Gtk.Image`. |
| 46-bar Cathedral visualizer | NOT FEASIBLE (CSS scaleY) | Same as viz bars — use GLib tick + height updates. Feasible computationally, just not CSS-driven. |
| `min-height: 44px` hit targets | FEASIBLE | GTK4 CSS `min-height`/`min-width` supported. |
| `box-shadow` glow (AI halo) | PARTIAL | Box-shadow works; `color-mix` in shadow color must be precomputed. |

**Summary:** The hardest gate is `backdrop-filter` (solved via Hyprland layerrule, not GTK CSS) and `color-mix` (solved via SCSS precomputation). CSS transforms (`scaleY`) for animations are not possible — animated bars must use state-driven height changes. Everything else is feasible with adaptation.

---

### 5. Current State vs. Target

**Bar.tsx — current state:**
- A single `<window>` with `<centerbox>` (3 slots: start/center/end)
- Start: a button that echoes "hello" with a label "Welcome to AGS!"
- Center: the `Mic` widget (functional: idle/in-use/muted states, pulse animation)
- End: a `<menubutton>` with a clock label (polling `date` every 1s) and a `Gtk.Calendar` popover
- Styling: minimal — `transparent` window bg, `$bg-color` centerbox bg with 10px radius, 8px margin
- No real widget library, no theme, no reactive services beyond Mic and the date poll

**Bar.tsx — target (Aurora layout as starting point):**
- Three floating `BarShell` modules (left/center/right) with glassmorphic bg (via Hyprland layerrule blur + CSS rgba)
- Left: Workspaces dots/pills (reactive Hyprland service) + Launcher pill + ActiveWindow (reactive)
- Center: NowPlaying (MPRIS) + Clock + Pomodoro (optional)
- Right: Updates + GitHub + CpuChip + RamChip + Performance + Volume + Battery + Notifications + AILauncher
- Full Catppuccin token system via theme.scss
- Gap/layout redesign from centerbox to flex box arrangement

**Launcher.tsx — current state:**
- Functional: fuzzy app search via `AstalApps`, 8 results max, Esc to close
- Layout: vertical box with `<entry>` + `<box>` of result buttons
- Styling: `#1a1a1aee` background, 12px radius — no theme integration
- Missing: calculator mode, recent commands, 6-col app grid, AI footer hint

**Launcher.tsx — target:**
- Full-screen scrim window + centered glass card
- Search input with blinking cursor (CSS animation)
- Inline calculator banner (math eval) 
- Two result modes: list (fuzzy search) + 6-col icon grid (browse)
- Recent app chips
- Footer hint row
- Theming via Catppuccin tokens

**Mic.tsx — current state:**
- Functional: idle/in-use/muted states, WirePlumber binding, animated pulse on muted
- Click toggles mute
- Styling: orange/red/grey semantic colors (not Catppuccin)

**Mic.tsx — target:**
- Preserve logic; replace styling with design tokens (`--red`, `--dim`)
- The `AITalk` pattern from design (animated bars, tinted pill background) could replace or augment the dot indicator
- `CameraIndicator` is a separate new widget if camera tracking is desired

---

### 6. Open Questions for Proposal Phase

1. **Which bar layout is the default?** The design offers 8. Aurora is the design default. This is a user choice that should be decided before implementation starts — it determines module structure.

2. **Replace swaync or integrate?** The hyprland.lua autostart already runs `swaync`. The design includes a full Notifications panel. Options: (a) keep swaync as the notification daemon but hide its UI and use AGS Notifications panel on top, (b) drop swaync and use only AGS Notifications service + custom panel, (c) keep swaync entirely and only add a bell widget that opens swaync's panel. This is a SCOPE DECISION.

3. **Icon library choice:** Design uses custom inline SVG (Phosphor-style). AGS options: (a) Material Symbols Rounded font via Nerd Fonts — simplest, no SVG management, (b) Phosphor Icons SVG sprite loaded as GResource or file-based, (c) inline SVG string rendered via DrawingArea. This affects implementation complexity significantly.

4. **Blur strategy:** Hyprland layerrule requires the user to add specific rules to hyprland.lua (e.g., `hl.layerrule("blur", "ags")`) — these are Lua API calls, not `.conf` edits. The proposal needs to document this as a required config addition.

5. **Which widgets to implement in phase 1?** The full widget catalog is 34 widgets + 15 popovers. A phased approach is essential. Proposal should define a "core slice" (e.g., Bar shell + 6-8 core widgets + Launcher) vs. "plugins phase" vs. "popovers phase."

6. **SDDM login screens:** Three login screen designs exist. These are a completely separate implementation target (SDDM theme, not AGS). Should they be in scope for this change or a separate one?

7. **Multi-monitor:** Current Bar.tsx already handles `gdkmonitor` per-monitor. The design is single-monitor. Multi-monitor behavior (mirrored vs. independent bars) needs to be defined.

8. **Tweaks panel runtime:** The design includes a live tweaks panel (accent/radius/padding sliders). AGS implementation requires `tweaks.json` persistence + reactive CSS variable injection. Is this in scope for the first implementation or a post-launch enhancement?

9. **`color-mix()` in GTK4:** Every tinted surface in the design uses `color-mix()`. The SCSS compiler (`dart-sass`) DOES support `color-mix()` as of Sass 1.65+ (pass-through to browser). But GTK4's CSS parser does NOT support it. This means all `color-mix()` calls must be compiled to static rgba values by dart-sass at build time (using `@use sass:color` and `color.mix()` / `color.adjust()` instead). This is a systematic translation, not a one-off — every tinted bg in every widget needs this treatment.

---

### 7. Approach Comparison

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A: Big bang — full redesign all at once** | Single coherent codebase restructure; no partial states | Very large PR; high risk; hard to test | High |
| **B: Phased — shell + core widgets first, plugins later** | Each PR reviewable; can ship usable bar early; lower risk | Design partially incomplete during phases | Medium |
| **C: Parallel file — new widget dir alongside existing, swap at end** | Zero regression risk on working widgets | Temporary code duplication; confusing structure | Medium |

Recommendation: **Approach B** — phased delivery. Phase 1: theme system + shell + core widgets (Clock, Workspaces, Battery, Volume, Mic). Phase 2: Launcher redesign + plugins. Phase 3: Popovers.

---

### 8. Recommended Next Step

YES — proceed to `sdd-propose`. Prerequisites:
- User must decide: (1) default bar layout (Aurora recommended), (2) swaync strategy, (3) icon library choice, (4) SDDM in scope or not, (5) phased scope for phase 1.
- Proposal should define the SCSS compilation strategy for `color-mix()` substitution, the Hyprland layerrule additions (Lua), and the phased widget delivery plan.
- The GTK4 feasibility matrix is the core constraint the proposal must respect — especially: no CSS transforms for animations, no CSS `backdrop-filter`, no runtime `color-mix()`.
