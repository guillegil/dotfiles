# GTK4 CSS — Complete Support Reference (with AGS + Hyprland examples)

> Scope & sources: This document describes the CSS engine in **GTK 4** as documented for
> library version **4.23.x** (the development series leading to 4.24). It focuses on *what
> GTK's CSS actually supports*, the differences from Web CSS, and **what it does NOT support**.
> Every section links to the official spec/doc that proves it (see [References](#references)).
>
> **About "AGS"**: the examples target **AGS (Aylur's GTK Shell)** — specifically **AGS v3 / Astal**,
> which builds widgets on **GTK4** + `gtk4-layer-shell`. Because Astal/AGS render real GTK widgets,
> *all* the GTK4 CSS below works in your AGS stylesheet. AGS v1 was GTK3; the v2/v3 rewrite is GTK4.
> AGS also compiles **SCSS/SASS** out of the box, so you can mix SCSS niceties with GTK CSS.

---

## 0. How CSS reaches your widgets (GTK4 + AGS)

GTK styles widgets by matching selectors against a **tree of CSS nodes**. Every widget exposes one
or more nodes that have a **name** (the element name, e.g. `button`, `window`, `label`), a **state**
(`:hover`, `:active`, …), and optional **style classes**. The per-widget docs list each widget's node tree.

In AGS you apply a stylesheet through the app entry point and tag widgets with style classes:

```ts
// app.ts (AGS v3 / Gnim JSX)
import app from "ags/gtk4/app"

app.start({
  css: "./style.scss",            // SCSS is compiled automatically
  main() { /* build windows */ },
})

// You can also hot-reload at runtime:
// app.apply_css("/* css string */", true)
```

```tsx
// A bar widget — the `class` prop becomes a GTK style class
return <window namespace="bar" class="bar" cssName="window">
  <box class="modules left">
    <button class="clock">…</button>
  </box>
</window>
```

```css
/* style.scss — targets the nodes/classes above */
window.bar { background: transparent; }
.bar .clock { padding: 0 12px; }
```

- `cssName` sets the **node element name**; `class` sets **style class(es)** (space-separated).
- Element selectors use the node name (`window`, `label`, `button`); class selectors use `.name`.

---

## 1. Selectors — fully supported set

Selectors behave very much like the web. Style classes are prefixed with `.`, widget names act like
IDs and are prefixed with `#`.

| Selector | Meaning | Web spec level |
|---|---|---|
| `*` | universal | 3 |
| `E` | element / node name | 3 |
| `E.class` | style class | 3 |
| `E#id` | widget name (id) | 3 |
| `E F` | descendant | 3 |
| `E > F` | direct child | 3 |
| `E + F` | adjacent sibling | 3 |
| `E ~ F` | general sibling | 3 |
| `E:nth-child(n)` / `:nth-last-child(n)` | positional | 3 |
| `E:first-child` / `:last-child` / `:only-child` | positional | 3 |
| `E:not(sel)` | negation | 3 |
| `E:dir(ltr)` / `:dir(rtl)` | text direction | 4 |
| `E:drop(active)` | drag-and-drop target | 4 |
| `E:root` | root node | 3 |

**AGS examples**

```scss
/* Every odd workspace button gets a subtle tint */
.workspaces button:nth-child(odd) { background: rgba(255,255,255,0.04); }

/* Direct children only: spacing between top-level bar modules */
window.bar > box > * + * { margin-left: 8px; }

/* Right-to-left aware padding for a clock label */
.clock:dir(rtl) { padding-right: 0; padding-left: 12px; }

/* :root is the place for global variables (see §6) */
:root { --accent: #89b4fa; }
```

---

## 2. Pseudo-classes (states) — supported set

These map onto GTK widget **state flags**, so they react to real interaction/state.

| Pseudo-class | Notes |
|---|---|
| `:hover` | pointer over (GTK PRELIGHT) |
| `:active` | pressed (GTK ACTIVE) |
| `:focus` | focused |
| `:focus-within` | set on **all ancestors** of the focused widget (broader than web) |
| `:focus-visible` | set on focus widget **and** ancestors (broader than web) |
| `:disabled` | insensitive widget |
| `:checked` | toggles/checkboxes/radios |
| `:indeterminate` | inconsistent/indeterminate state |
| `:selected` | selected row/item |
| `:backdrop` | window is not focused/active |
| `:link`, `:visited` | link states |

**AGS examples**

```scss
.button { transition: background 150ms ease; }
.button:hover { background: rgba(255,255,255,0.10); }
.button:active { background: rgba(255,255,255,0.18); }

/* Dim the whole bar when its window loses focus */
window.bar:backdrop { opacity: 0.85; }

/* A toggled "do not disturb" pill */
.dnd:checked { background: var(--accent); color: #11111b; }
```

---

## 3. Box model, sizing & layout properties

| Property | Supported | GTK caveat vs Web |
|---|---|---|
| `min-width`, `min-height` | ✅ | **No percentages** (web allows them) |
| `margin`, `margin-*` | ✅ (`four sides`) | **No `%` and no `auto`** |
| `padding`, `padding-*` | ✅ (`four sides`) | **No `%`** |
| `border-spacing` | ✅ | only honored by `GtkBoxLayout`, `GtkGridLayout`, `GtkCenterLayout` |
| `opacity` | ✅ | |
| `transform`, `transform-origin` | ✅ | `transform-origin` **ignores a z component** |

> **Important:** there is **no `width` / `height`** in GTK CSS — only `min-width` / `min-height`.
> A widget's real size comes from its layout + content; CSS can only set a *minimum*. There is also
> **no `display`, no flexbox, no grid, no `position`/`top`/`left`, no `float`, no `z-index`** — layout is
> done by GTK widgets/layout managers, not by CSS. See [§12](#12-what-gtk4-css-does-not-support).

**AGS examples**

```scss
/* Give a bar a fixed-ish height via min-height + padding */
window.bar { min-height: 34px; }
.bar .module { padding: 2px 10px; }

/* Rotate a "recording" icon 90°, scale a hovered tray icon */
.rec-icon { transform: rotate(90deg); transform-origin: center; }
.tray button:hover { transform: scale(1.15); transition: transform 120ms ease; }
```

---

## 4. Borders & backgrounds

| Property group | Supported | Notes |
|---|---|---|
| `border`, `border-*-width/style/color`, shorthands | ✅ | `border-width` accepts lengths (CSS extra values unsupported) |
| `border-radius`, `border-*-radius` | ✅ | |
| `border-image`, `border-image-*` | ✅ | `slice`/`width` are `four sides` |
| `outline`, `outline-*` | ✅ | `outline-style` initial is `none`; **`auto` unsupported**; `outline-color` **no `invert`** |
| `background`, `background-color` | ✅ | |
| `background-image` | ✅ | **URLs must be quoted** (`url("…")`) |
| `background-position/size/repeat/clip/origin` | ✅ | |
| `background-blend-mode` | ✅ | only affects **multiple** backgrounds |
| `box-shadow` | ✅ | inset + multiple shadows supported |

**AGS examples**

```scss
window.bar {
  background-color: rgba(30,30,46,0.55);   /* semi-transparent for compositor blur */
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 6px 20px rgba(0,0,0,0.45);
}

/* Layered background: image over a tint, blended */
.cover {
  background-image: url("/home/me/.config/ags/assets/cover.png"), linear-gradient(#1e1e2e, #181825);
  background-size: cover;
  background-blend-mode: overlay;
}
```

---

## 5. Fonts, text & icons

**Fonts/text (all standard CSS properties):** `font`, `font-family`, `font-size`, `font-style`,
`font-weight`, `font-stretch`, `font-kerning`, `font-feature-settings`, `font-variation-settings`,
the full `font-variant-*` family (CSS2 values only for the `font-variant` shorthand),
`letter-spacing`, `line-height` (since 4.6), `text-transform` (since 4.6; no `full-width`/`full-size-kana`),
`text-shadow`, `text-decoration` + `-line` / `-color` / `-style` (no `dashed`/`dotted` styles),
`caret-color` (no `auto`), `-gtk-secondary-caret-color`.

**Icon properties (`-gtk` extensions):** `-gtk-icon-source`, `-gtk-icon-size`, `-gtk-icon-style`,
`-gtk-icon-transform`, `-gtk-icon-palette`, `-gtk-icon-shadow`, `-gtk-icon-filter`, `-gtk-icon-weight`.

**AGS examples**

```scss
.clock {
  font-family: "JetBrainsMono Nerd Font", monospace;
  font-size: 13px;
  font-feature-settings: "tnum" 1;        /* tabular numerals so the clock doesn't jiggle */
  letter-spacing: 0.3px;
}

/* Recolor symbolic icons: error→red, warning→amber, success→green */
.tray image { -gtk-icon-palette: error #f38ba8, warning #f9e2af, success #a6e3a1; }
.battery.low image { -gtk-icon-filter: opacity(0.9) drop-shadow(0 0 2px #f38ba8); }
```

---

## 6. Colors

### 6.1 Standard CSS colors (use these)
Supported: `rgb()`, `rgba()`, `hsl()` (legacy **and** modern syntax), `hwb()`, `oklab()`, `oklch()`,
`color()`, **`color-mix()`**, and **relative colors**. `calc()` works inside color expressions.

### 6.2 Custom properties / variables (since 4.16)
Standard CSS custom properties with `var()` and fallbacks — the **recommended** modern approach.

```scss
:root {
  --bg:     #1e1e2e;
  --accent: #89b4fa;
}
window.bar { background-color: var(--bg); }
.button:hover { background-color: color-mix(in oklab, var(--accent) 20%, transparent); }
.button.error { color: var(--err, #f38ba8); }   /* fallback if --err is unset */
```

> **SCSS vs CSS variables (AGS nuance):** `$x` SASS variables are resolved at *compile time* and
> vanish from the output; `var(--x)` GTK custom properties are *runtime* and can be swapped live
> (great for theming via matugen). Prefer `var()` for anything you want to re-theme on the fly.

### 6.3 Color expressions & `@define-color` (legacy, deprecated)
GTK's pre-4.16 extensions — still work, but standard custom properties are preferred now:
`@define-color name color;` then reference as `@name`; plus `lighter(c)`, `darker(c)`,
`shade(c, n)`, `alpha(c, n)`, `mix(c1, c2, n)`.

```scss
@define-color accent #89b4fa;       /* legacy */
.old-pill { background: alpha(@accent, 0.2); border: 1px solid shade(@accent, 1.2); }
```

---

## 7. Images, icons & gradients

GTK extends CSS image syntax:
- `-gtk-icontheme(name)` — load a themed icon (mainly for `-gtk-icon-source`).
- `-gtk-recolor(url, palette)` — recolor a non-theme image using a named palette.
- `-gtk-scaled(image1, image2)` — provide normal + hi-DPI variants.
- **Gradients**: linear & radial, including **repeating** variants, are supported as background images.
- `cross-fade()` and `image()` fallback lists are supported.

**AGS examples**

```scss
window.bar {
  background-image: linear-gradient(90deg, #1e1e2e 0%, #181825 100%);
}
.progress > trough > progress {
  background-image: radial-gradient(circle, #89b4fa, #cba6f7);
}
.hidpi-logo {
  background-image: -gtk-scaled(url("logo.png"), url("logo@2.png"));
}
```

---

## 8. Transitions (CSS Transitions)

Supported: `transition`, `transition-property`, `transition-duration`,
`transition-timing-function`, `transition-delay`. Only **animatable** properties transition.
Timing functions include `ease`, `linear`, `ease-in/out/in-out`, `step-start/end`, `steps()`, `cubic-bezier()`.

**AGS example — smooth hover & state changes**

```scss
.button {
  transition: background-color 160ms ease, transform 120ms cubic-bezier(.2,.8,.2,1);
}
.button:hover  { background-color: rgba(255,255,255,0.10); transform: translateY(-1px); }
.volume-slider trough highlight { transition: min-width 200ms ease; }
```

---

## 9. Animations (`@keyframes`)

Supported: `@keyframes` blocks plus `animation`, `animation-name`, `animation-duration`,
`animation-timing-function`, `animation-iteration-count`, `animation-direction`,
`animation-play-state`, `animation-delay`, `animation-fill-mode`. Non-animatable properties in a
keyframe are ignored (except animation properties themselves).

**AGS examples — pulsing recording dot & a shimmer**

```scss
@keyframes pulse {
  0%   { opacity: 1;   transform: scale(1); }
  50%  { opacity: 0.4; transform: scale(0.85); }
  100% { opacity: 1;   transform: scale(1); }
}
.rec-indicator {            /* e.g. shown while a Hyprland screen-recording is active */
  background: #f38ba8;
  border-radius: 9999px;
  min-width: 10px; min-height: 10px;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes blink { 50% { opacity: 0; } }
.urgent { animation: blink 0.6s steps(2, start) infinite; }
```

---

## 10. Media queries (since GTK 4.20)

Supported with `not` / `and` / `or`. Features:

| Feature | Values |
|---|---|
| `prefers-color-scheme` | `light`, `dark` |
| `prefers-contrast` | `no-preference`, `more`, `less` |
| `prefers-reduced-motion` | `no-preference`, `reduced` |

**AGS examples — dark/light + accessibility**

```scss
:root { --bg: #1e1e2e; --fg: #cdd6f4; }
@media (prefers-color-scheme: light) {
  :root { --bg: #eff1f5; --fg: #4c4f69; }
}
@media (prefers-contrast: more) {
  window.bar { border: 2px solid var(--fg); }
}
@media (prefers-reduced-motion: reduced) {
  .rec-indicator, .urgent { animation: none; }   /* respect the user's motion setting */
}
```

> Requires GTK ≥ 4.20. On older GTK, drive light/dark from your tooling (e.g. matugen regenerating
> the stylesheet) instead of media queries.

---

## 11. Units, `calc()` and value details

- **Length:** `px`, `pt`, `em`, `ex`, `rem`, `pc`, `in`, `cm`, `mm`.
- **Percentage:** `%` (only where noted as supported — *not* on margins/padding/min-size).
- **Angle:** `deg`, `rad`, `grad`, `turn`. **Time:** `s`, `ms`.
- `calc()` works across these (you can't mix incompatible types, e.g. number + time).
- GTK quirks: `rem` is resolved against the **initial** font size (not exactly the CSS definition);
  physical units (`pt`, `pc`, `in`, `cm`, `mm`) are converted to px via the **`-gtk-dpi`** property,
  not the fixed 96 dpi the web assumes.
- Global keywords on every property: `inherit`, `initial`, `unset`.

```scss
.module { padding: calc(0.5em + 2px) 12px; }
.bar { min-height: calc(28px + 0.4rem); }
```

---

## 12. What GTK4 CSS does **NOT** support

This is the part that trips people up coming from the web:

**Layout / positioning**
- ❌ No `width` / `height` — only `min-width` / `min-height` (size is decided by widgets/layout).
- ❌ No `display`, no **flexbox**, no **grid**, no `position` / `top` / `right` / `bottom` / `left`.
- ❌ No `float`, no `z-index` (stacking follows widget/child order).
- ❌ Percentages **not** allowed on `min-width/height`, `margin`, `padding`.
- ❌ `margin: auto` is not supported (no auto-centering via margins).

**Selectors**
- ❌ No **attribute selectors** (`[name="value"]`).
- ❌ No **generated-content pseudo-elements** (`::before` / `::after` / `content`) — GTK uses real
  CSS child nodes instead, so you style existing sub-nodes rather than inventing new boxes.

**Property-level gaps / differences**
- ❌ `background-image: url(...)` **without quotes** (URLs must be quoted).
- ❌ `outline: auto` and `outline-color: invert`.
- ❌ `text-decoration-style` `dashed` / `dotted`.
- ❌ `font-variant` shorthand: **only CSS2 values**.
- ❌ `caret-color: auto`.
- ❌ `transform-origin` **z component** (2D only).
- ❌ `transform-origin`/transforms don't give you a general 3D/web layout system.
- ⚠️ `text-transform`: no `full-width` / `full-size-kana`.

**Engine differences (not "missing" but behave unlike the web)**
- `rem` and physical-unit (dpi) resolution differ from the web (see §11).
- `:focus-within` / `:focus-visible` are set on a broader set of ancestors than on the web.
- Color *expressions* (`lighter()`, `shade()`, …) and `@define-color` are GTK-only and **deprecated**
  in favor of standard custom properties.

> Rule of thumb for AGS rices: **style with CSS, lay out with widgets.** Use `box`, `centerbox`,
> `overlay`, `stack`, halign/valign, hexpand/vexpand for structure; use CSS only for paint
> (color, border, radius, shadow, font, transitions, animations).

---

## 13. Hyprland-specific integration

GTK4 CSS can't blur or round the *window* itself the way a compositor does — that's Hyprland's job.
The pattern is: **make the GTK background transparent/semi-transparent in CSS, then let Hyprland blur
and round the layer.**

**AGS side (CSS):**
```scss
/* The toplevel layer must be transparent so the compositor blur shows through */
window.bar { background: transparent; }
/* The visible "card" carries the alpha so blur has something to sit behind */
window.bar > box {
  background-color: rgba(30, 30, 46, 0.55);
  border-radius: 16px;
}
```

**AGS side (window namespace — this is what Hyprland matches on):**
```tsx
<window namespace="bar" class="bar" anchor={TOP | LEFT | RIGHT}>…</window>
```

**Hyprland side (`hyprland.conf`):**
```ini
# Match the layer by the AGS window namespace ("bar")
layerrule = blur, bar
layerrule = ignorezero, bar      # don't blur fully transparent regions
layerrule = ignorealpha 0.3, bar
# Optional: rounding/animations for the layer
layerrule = animation slide, bar
```

Notes:
- The layer name Hyprland sees is the AGS window **`namespace`**, so keep CSS classes and the
  namespace consistent and predictable.
- Run `hyprctl layers` to confirm the namespace your AGS window registers under.
- Corner rounding that you *see* should be the CSS `border-radius` on the visible card; Hyprland's
  blur will follow the alpha mask, so pair `border-radius` with `ignorezero`/`ignorealpha`.

---

## References

Official GTK 4 documentation (library 4.23.x):

- **CSS in GTK — overview, nodes & selectors:** https://docs.gtk.org/gtk4/css-overview.html
- **GTK CSS Properties — full property list, colors, images, media queries:** https://docs.gtk.org/gtk4/css-properties.html
- **GTK drawing model (how CSS triggers animations/repaints, GSK render nodes):** https://docs.gtk.org/gtk4/drawing-model.html
- **GTK Scene Graph Kit (GSK):** https://docs.gtk.org/gsk4/

Cited W3C specs (linked from the GTK property tables, for definitions of each feature):

- CSS Selectors L3 / L4 — https://www.w3.org/TR/selectors-3/ , https://drafts.csswg.org/selectors/
- CSS Transitions — https://www.w3.org/TR/css3-transitions/
- CSS Animations L1 — https://www.w3.org/TR/css3-animations/
- CSS Custom Properties (variables) — https://www.w3.org/TR/css-variables-1/
- CSS Color Module L5 (color-mix, oklab/oklch, relative colors) — https://www.w3.org/TR/css-color-5/
- CSS Backgrounds & Borders L3 — https://www.w3.org/TR/css3-background/
- CSS Values & Units L4 (calc) — https://www.w3.org/TR/css-values-4/
- Media Queries L5 — https://www.w3.org/TR/mediaqueries-5/

AGS / Astal / Hyprland:

- AGS v2/v3 docs — https://aylur.github.io/ags/
- AGS source — https://github.com/Aylur/ags
- gtk4-layer-shell — https://github.com/wmww/gtk4-layer-shell
- Hyprland `layerrule` (window rules / layer rules) — https://wiki.hypr.land/Configuring/Window-Rules/

*Tip: confirm the exact GTK version on your system with `pkg-config --modversion gtk4`. Features noted
"since 4.x" (custom properties 4.16, media queries 4.20) require that version or newer.*
