# Design Principles for Hyprland/AGS GTK4 Shells
# (sourced from ui-ux-pro-max skill)

> **Source authority:** All design rules in this doc were pulled from the `ui-ux-pro-max` skill
> database via its `search.py` CLI (see searches logged at the bottom). GTK4 capability claims
> are cross-referenced against `gtk4-css-supported.md` and `gtk4-css-unsupported.md` in this
> same references directory.
>
> The `ui-ux-pro-max` skill is web/mobile-centric (Tailwind, flexbox, px units). Every rule
> below has been translated to what GTK4 CSS and the widget tree can actually do.

---

## Mental model: GTK4 is not the web

| Web/Tailwind concept | GTK4 reality |
|---|---|
| `display: flex` / `display: grid` | Does not exist. Use `Box`, `Grid`, `CenterBox` widgets |
| `width`, `max-width`, `height` | Not CSS properties — set via widget tree (hexpand, natural size) |
| `margin: auto` (centering) | Use `halign="center"` / `valign="center"` on the widget |
| `::before` / `::after` | Not supported. Use child widgets |
| `backdrop-filter: blur()` | Not supported. Use Hyprland `layerrule blur` |
| `background-clip: text` | Not supported |
| Attribute selectors `[attr]` | Not supported |
| px touch targets via Tailwind | `min-width` / `min-height` in CSS (no `%`, no `auto`) |

What GTK4 CSS **does** support and is safe to rely on:
`background-color`, `background-image`, `border`, `border-radius`, `box-shadow` (including inset),
`outline`, `opacity`, `transform`, `transition`, `animation`, `color`, `font-*`, `padding`, `margin`
(no `auto`, no `%`), `min-width`, `min-height`.

---

## Principle → GTK4 translation table

| ui-ux-pro-max rule | Severity | GTK4 translation |
|---|---|---|
| Min 44×44 px click targets | HIGH | `min-width: 44px; min-height: 44px;` on the button CSS node |
| 8 px minimum gap between clickable elements | MEDIUM | `spacing` prop on `Box`, or `margin` on siblings |
| Visible focus rings; never `outline:none` without replacement | HIGH | `:focus-visible { outline: 2px solid @accent; outline-offset: 2px; }` |
| `prefers-reduced-motion` must be respected | HIGH | GTK exposes the setting — see Reduced Motion section |
| Transitions 150–300 ms; use `ease-out` for enter, `ease-in` for exit | MEDIUM | `transition: all 150ms ease-out;` in CSS (GTK honors `transition`) |
| Animate with `transform`/`opacity`, never `width`/`height` | HIGH | Same in GTK4: `transform` and `opacity` are GPU-friendly; `width`/`height` do not exist as CSS props |
| Continuous/decorative animations are distracting | MEDIUM | Avoid `animation` on non-loading elements; loading spinners only |
| Color contrast min 4.5:1 for normal text | HIGH | Verify with a contrast checker; dark shells typically need `rgba(255,255,255,0.85)` on dark bg |
| Do not convey state by color alone | HIGH | Pair color change with icon or label change |
| Type scale: 12 14 16 18 24 32 px (no random sizes) | MEDIUM | `font-size: 14px;` etc. in CSS; use CSS custom properties for the scale |
| Line-height 1.5–1.75 for body text | MEDIUM | `line-height: 1.5;` — supported in GTK4 CSS |
| No emoji as icons; use SVG | HIGH | Use symbolic SVG icons via `gtk-symbolic` theme or bundled assets — see `icons-and-theming.md` |
| Elevation / depth via shadow | MEDIUM | `box-shadow: 0 4px 16px rgba(0,0,0,0.4);` — fully supported including inset and multiple shadows |
| Blur for depth/glass effect | MEDIUM | NOT via `backdrop-filter`. Use Hyprland `layerrule blur, <namespace>` — see `hyprland-layer-rules.md` |

---

## Reduced motion

The `ui-ux-pro-max` skill flags `prefers-reduced-motion` as **HIGH severity** on all platforms.

GTK4 exposes this via two mechanisms. Respect **both**:

**1. GtkSettings gate (GTK-level)**

```typescript
// In AGS/GLib, read the setting at init time
const settings = new Gtk.Settings();
const motionOk = settings.gtkEnableAnimations; // boolean

// Toggle a class on all top-level windows
for (const win of App.windows) {
  win.toggleClassName("motion-off", !motionOk);
}
```

**2. CSS `@media` query (GTK4 supports this)**

```css
/* Baseline: transitions enabled */
button {
  transition: background-color 200ms ease-out,
              opacity 200ms ease-out;
}

/* Honor OS reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}

/* Programmatic gate set by the GtkSettings check above */
.motion-off * {
  transition-duration: 0ms !important;
  animation-duration: 0ms !important;
}
```

---

## Layout and centering (no flexbox)

The `ui-ux-pro-max` skill assumes flexbox/grid for alignment. In GTK4, layout is **widget-tree-driven**.

```typescript
// Center a child in its container
<box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
  <Label label="Centered" />
</box>

// Spacer pattern (replaces margin:auto or flex:1 filler)
<box>
  <Label label="Left" />
  <box hexpand={true} />   {/* spacer eats remaining horizontal space */}
  <Label label="Right" />
</box>

// Fixed-width content area (replaces max-width in web)
// Set a natural width via sizerequest on the widget, not via CSS
<box widthRequest={640}>
  {/* content */}
</box>
```

See `gtk4-layout-patterns.md` for full hexpand propagation rules.

---

## Click targets (minimum 44 px)

`ui-ux-pro-max` source: **Touch Target Size** (HIGH severity).
The Tailwind equivalent is `min-h-[44px] min-w-[44px]`.

In GTK4 CSS:

```css
/* Apply to any interactive element that might be smaller by default */
button,
.clickable {
  min-width: 44px;
  min-height: 44px;
}

/* Icon-only buttons in a bar often render smaller — be explicit */
.bar-button {
  min-width: 44px;
  min-height: 44px;
  padding: 10px;
}
```

GTK `min-width`/`min-height` set a floor; the widget can still grow larger.
There is no `width` or `max-width` CSS property in GTK4.

---

## Focus rings

`ui-ux-pro-max` source: **Focus States** (HIGH severity) — "Keyboard users need visible focus
indicators. Never remove outline without a replacement."

```css
/* GTK4 provides :focus-visible matching the same semantics as web */
button:focus-visible,
entry:focus-visible,
.focusable:focus-visible {
  outline: 2px solid alpha(@accent_color, 0.9);
  outline-offset: 2px;
}

/* Do NOT do this without a replacement: */
/* * { outline: none; } */
```

Note: GTK4 supports `outline` fully (`outline: auto` is NOT supported — use explicit width/style/color).

---

## Animations

`ui-ux-pro-max` sources: **Duration/Timing** (MEDIUM), **Transform Performance** (HIGH),
**Continuous Animation** (MEDIUM), **Easing Functions** (LOW).

### Safe animation properties in GTK4

GTK4 supports `transform` and `opacity` as GPU-accelerated properties.
Do NOT animate `min-width`, `min-height`, `padding`, or `margin` for performance-sensitive transitions —
these trigger layout recalculation.

```css
/* Launcher reveal — opacity + transform only */
.launcher {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
  transition: opacity 200ms ease-out,
              transform 200ms ease-out;
}

.launcher.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Loading spinner — OK for continuous animation */
.spinner {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Decorative bounce on an icon — DO NOT do this */
/* .icon { animation: bounce 1s infinite; } */
```

### Duration guidelines (from ui-ux-pro-max)

| Interaction | Duration | Easing |
|---|---|---|
| Micro-interactions (button press, hover) | 150 ms | `ease-out` |
| Component reveal (launcher, popover) | 200 ms | `ease-out` |
| Component dismiss | 150 ms | `ease-in` |
| Page-level transitions | 250–300 ms | `ease-out` |
| Never exceed | 300 ms | — |

---

## Color and contrast

`ui-ux-pro-max` sources: **Color Contrast** (HIGH), **Color Only** (HIGH),
**Contrast Readability** (HIGH).

Dark desktop shells are permanently in "dark mode". Typical pitfalls:

```css
/* Good: sufficient contrast on dark background */
.label {
  color: rgba(255, 255, 255, 0.87);  /* ~7:1 on #1a1a1a */
}

.label.secondary {
  color: rgba(255, 255, 255, 0.55);  /* muted but still legible — check 4.5:1 */
}

/* Bad: too transparent, fails contrast at 4.5:1 */
/* .label { color: rgba(255,255,255,0.3); } */

/* State communicated by color alone — BAD */
/* .error { color: red; } */

/* State with icon + color — GOOD */
/* Use a symbolic error icon alongside color change */
```

Elevation via shadow (NOT unsupported backdrop-filter):

```css
.card {
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}
```

For blur behind a layer: use Hyprland compositor rules, not CSS:
```ini
# hyprland.conf
layerrule = blur, my-shell-namespace
layerrule = blurpopups, my-shell-namespace
```
See `hyprland-layer-rules.md`.

---

## Typography

`ui-ux-pro-max` sources: **Font Size Scale** (MEDIUM), **Line Height** (MEDIUM),
**Contrast Readability** (HIGH).

```css
/* Define the scale once — GTK4 CSS custom properties work */
window {
  --fs-xs:   11px;
  --fs-sm:   12px;
  --fs-base: 14px;
  --fs-md:   16px;
  --fs-lg:   18px;
  --fs-xl:   24px;
  --fs-2xl:  32px;
}

/* Body / label text */
label {
  font-size: var(--fs-base);
  line-height: 1.5;
}

/* Section heading */
.heading {
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.3;
}

/* Muted / secondary */
.muted {
  font-size: var(--fs-sm);
  opacity: 0.55;
}
```

GTK4 CSS **does** support `font-weight`, `font-style`, `font-variant`, `letter-spacing`,
`line-height`, and `text-decoration`. It does NOT support web font loading (`@font-face` with
remote URLs) — fonts must be installed system-wide or bundled as files.

---

## 8 px spacing rhythm

`ui-ux-pro-max` source: **Touch Spacing** (MEDIUM) — "minimum 8 px gap between touch targets."

A consistent spacing scale prevents arbitrary padding values accumulating across components.
Suggested base multiples for a shell:

```css
/* 4-point base, 8-point rhythm */
/* 4  8  12  16  20  24  32  48 */

.bar {
  padding: 0 16px;    /* 2× base on sides */
}

.bar-item {
  margin: 0 4px;      /* 1× base between items */
  padding: 8px 12px;  /* comfortable click area */
  min-height: 44px;
}

.section-gap {
  margin-top: 16px;
}
```

---

## Icons

`ui-ux-pro-max` source: **No Emoji Icons** (Style checklist, HIGH) — "Use SVG icons (Heroicons,
Lucide, Simple Icons), not emojis."

GTK4 translation: use symbolic SVG icons from the active icon theme or ship them as bundled assets.
See `icons-and-theming.md` for the full symbolic icon loading pattern.

Never use emoji characters as UI icons — they render inconsistently across system fonts,
are not scalable via CSS, and break symbolic theming (light/dark icon color adaptation).

---

## GTK4 design checklist

Run through this before shipping any component.

### Accessibility
- [ ] All interactive elements have `min-width: 44px; min-height: 44px`
- [ ] Focus rings visible on `:focus-visible` (never removed without replacement)
- [ ] Color is not the only state indicator — pair with icon or label
- [ ] Text contrast ≥ 4.5:1 (verify with a contrast tool, especially muted/secondary text)
- [ ] `prefers-reduced-motion` handled via both `@media` query and `.motion-off` class

### Animation
- [ ] Transitions use `transform` and/or `opacity` only (never `min-width`, `padding`, `margin`)
- [ ] Duration is 150–300 ms; enter uses `ease-out`, exit uses `ease-in`
- [ ] Continuous animations exist only on loading indicators
- [ ] `@media (prefers-reduced-motion: reduce)` collapses all durations to 0 ms

### Layout
- [ ] No CSS `display:flex`, `display:grid`, `width`, `max-width`, `margin:auto`, `::before`
- [ ] Centering done via `halign`/`valign` widget props
- [ ] Spacer boxes used instead of `flex:1` or `margin:auto`
- [ ] Fixed content width via `widthRequest` on the widget, not CSS

### Visual quality
- [ ] No emoji icons — symbolic SVG icons only
- [ ] Elevation via `box-shadow`, not `backdrop-filter`
- [ ] Blur via Hyprland `layerrule blur`, not CSS
- [ ] Consistent spacing (multiples of 4/8 px)
- [ ] Type scale uses defined custom properties, not arbitrary sizes

### Interaction
- [ ] Hover states provide feedback (color, opacity, or shadow change)
- [ ] Active/pressed state gives immediate visual response
- [ ] No layout shift on hover (avoid animating dimensions)

---

## Search log (ui-ux-pro-max queries used to build this doc)

```
search.py "dark desktop shell launcher bar minimal" --design-system
search.py "animation accessibility" --domain ux
search.py "spacing typography hierarchy" --domain ux
search.py "spacing typography hierarchy" --domain typography
search.py "spacing typography hierarchy" --domain color
search.py "focus keyboard navigation" --domain ux
search.py "color contrast dark mode" --domain ux
search.py "touch target size click interaction" --domain ux
```
