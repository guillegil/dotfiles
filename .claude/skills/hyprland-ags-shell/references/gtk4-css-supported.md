# GTK4 CSS — Supported Properties Reference

> Source authority: GTK 4 official docs (docs.gtk.org/gtk4, context7-verified).
> Where a version number is cited from GTK docs directly, it is marked **[docs-verified]**.
> Where it comes from the in-repo reference doc (`docs/gtk_css_reference_overview.md`, covering 4.23.x), it is marked **[ref-doc]**.
> Where it is observed working in this project under GTK 4.22, it is marked **[empirical GTK 4.22]**.

---

## Sizing

| Property | Notes |
|---|---|
| `min-width`, `min-height` | Sets a MINIMUM, not a fixed size. No percentages. |
| `margin`, `padding` (all variants) | No `%`, no `auto`. |
| `opacity` | Fully supported. |

GTK has no `width`, `height`, or `max-width`/`max-height` CSS properties — see unsupported doc.

---

## Box Model Extras

- `border-spacing` — honored by `GtkBoxLayout`, `GtkGridLayout`, `GtkCenterLayout` **[ref-doc]**
- `transform`, `transform-origin` — supported; z-component of `transform-origin` is ignored (2D only) **[ref-doc]**

---

## Borders & Backgrounds

All standard border properties work: `border`, `border-width`, `border-style`, `border-color`, `border-radius`, per-side variants, shorthands.

- `border-image`, `border-image-*` — supported **[ref-doc]**
- `outline`, `outline-*` — supported; `outline: auto` and `outline-color: invert` are NOT **[ref-doc]**
- `background-color` — supported
- `background-image` — supported; URLs MUST be quoted: `url("...")` **[ref-doc]**
- `background-position`, `background-size`, `background-repeat`, `background-clip`, `background-origin` — supported
- `background-blend-mode` — supported (only has visible effect with multiple backgrounds) **[ref-doc]**
- `box-shadow` — fully supported including `inset` and multiple shadows **[empirical GTK 4.22]**

---

## Gradients

`linear-gradient()`, `radial-gradient()`, `repeating-linear-gradient()`, `repeating-radial-gradient()` all work as `background-image` values. **[ref-doc]**

```css
.card {
  background-image: linear-gradient(135deg, #1e1e2e 0%, #181825 100%);
}
.progress-fill {
  background-image: radial-gradient(circle, #89b4fa, #cba6f7);
}
```

---

## Fonts & Text

| Property | Notes |
|---|---|
| `font`, `font-family`, `font-size`, `font-style`, `font-weight`, `font-stretch` | Standard |
| `font-kerning`, `font-feature-settings`, `font-variation-settings` | Standard |
| `font-variant-*` family | `font-variant` shorthand: CSS2 values only |
| `line-height` | Since GTK 4.6 **[ref-doc]** |
| `text-transform` | Since GTK 4.6; no `full-width`/`full-size-kana` **[ref-doc]** |
| `letter-spacing` | Standard |
| `text-shadow` | Standard |
| `text-decoration`, `-line`, `-color`, `-style` | `dashed`/`dotted` styles NOT supported **[ref-doc]** |
| `caret-color` | No `auto` value **[ref-doc]** |

---

## GTK Icon Extensions

These are GTK-specific CSS extensions, not in the web CSS spec:

| Property | Effect |
|---|---|
| `-gtk-icon-size` | Sets the rendered size of a symbolic icon widget |
| `-gtk-icon-style` | `regular` or `symbolic` |
| `-gtk-icon-palette` | Recolor symbolic icon named colors: `error #rgb, warning #rgb, success #rgb` |
| `-gtk-icon-transform` | CSS transform applied to the icon |
| `-gtk-icon-shadow` | Drop shadow on the icon |
| `-gtk-icon-filter` | CSS filter on the icon (e.g. `opacity()`, `drop-shadow()`) |
| `-gtk-icon-weight` | Weight for variable-font icons |

```css
/* Icon size + palette recoloring */
.system-tray image {
  -gtk-icon-size: 16px;
}
.status-icon image {
  -gtk-icon-palette: error #f38ba8, warning #f9e2af, success #a6e3a1;
}
```

---

## Colors

### Standard color functions (all supported)

`rgb()`, `rgba()`, `hsl()` (legacy and modern syntax), `hwb()`, `oklab()`, `oklch()`, `color()`, `color-mix()`, relative colors. `calc()` works inside color expressions. **[ref-doc]**

### color-mix()

`color-mix(in oklab, <color> <pct>, <color>)` — runtime CSS Color L5 function. **[empirical GTK 4.22]** — confirmed working at runtime on GTK 4.22 in this project. The GTK docs list it as supported in the 4.23.x series; exact minimum version is not pinned in the official docs page; empirically confirmed on 4.22.

```css
.button:hover {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
}
```

### CSS Custom Properties / var() — since GTK 4.16 **[docs-verified]**

Standard `--prop: value` declarations and `var(--prop, fallback)` references.

```css
/* Declare on the universal selector (NOT :root — see theming doc) */
* {
  --accent: #89b4fa;
  --radius: 14px;
}

.card {
  border-radius: var(--radius);
  background: color-mix(in oklab, var(--accent) 15%, transparent);
}
```

### @define-color (legacy, deprecated) **[ref-doc]**

`@define-color name value;` then reference as `@name`. GTK-specific extension, still works but will be removed in GTK 5. Prefer `var()`.

---

## Transitions

`transition`, `transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay`. Only properties that GTK marks as animatable will actually interpolate. **[ref-doc]**

Timing functions: `ease`, `linear`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`, `steps()`, `cubic-bezier()`.

```css
.button {
  transition: background 150ms ease, transform 120ms cubic-bezier(.2,.8,.2,1);
}

/* Animating min-width — the GTK way to animate a pill width */
.pill {
  transition: min-width 200ms ease;
}
.pill.active { min-width: 22px; }
```

---

## @keyframes Animations

`@keyframes` blocks plus the full `animation-*` shorthand and longhand set: `animation-name`, `animation-duration`, `animation-timing-function`, `animation-iteration-count`, `animation-direction`, `animation-play-state`, `animation-delay`, `animation-fill-mode`. **[ref-doc]**

Non-animatable properties in a keyframe are silently ignored.

```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.88); }
}

.indicator {
  animation: pulse 1.5s ease-in-out infinite;
}
```

---

## Media Queries — since GTK 4.22 **[docs-verified]**

Supported with `not` / `and` / `or`. Confirmed available features:

| Feature | Values |
|---|---|
| `prefers-color-scheme` | `light`, `dark` |
| `prefers-contrast` | `no-preference`, `more`, `less` |
| `prefers-reduced-motion` | `no-preference`, `reduce` |

> The GTK docs explicitly state `prefers-reduced-motion` is "Available since 4.22". By extension, the full media query support block landed at 4.22. **[docs-verified]**
> The in-repo reference doc says "since GTK 4.20" for media queries — this may refer to an earlier, narrower implementation. Trust the 4.22 anchor for full support.

```css
@media (prefers-color-scheme: dark) {
  * { --bg: #1e1e2e; --fg: #cdd6f4; }
}
@media (prefers-reduced-motion: reduce) {
  .animated { animation: none; transition: none; }
}
```

---

## Selectors

| Selector | Notes |
|---|---|
| `*` | Universal — also the correct place for custom property declarations |
| `E`, `.class`, `#id` | Element, class, widget name (id) |
| `E F`, `E > F`, `E + F`, `E ~ F` | Descendant, child, adjacent sibling, general sibling |
| `:nth-child(n)`, `:nth-last-child(n)` | Positional |
| `:first-child`, `:last-child`, `:only-child` | Positional |
| `:not(sel)` | Negation |
| `:dir(ltr)`, `:dir(rtl)` | Text direction |
| `:root` | Root node — functionally equivalent to `*` in GTK, but has issues; prefer `*` |

---

## Pseudo-classes (State Flags)

| Pseudo-class | GTK state |
|---|---|
| `:hover` | PRELIGHT |
| `:active` | ACTIVE (pressed) |
| `:focus` | FOCUSED |
| `:focus-within` | Set on ALL ancestors of focused widget (broader than web) |
| `:focus-visible` | Set on focused widget AND ancestors (broader than web) |
| `:disabled` | INSENSITIVE |
| `:checked` | Toggle/checkbox/radio selected |
| `:indeterminate` | Inconsistent state |
| `:selected` | Selected item/row |
| `:backdrop` | Window is not the active window |

---

## Units & calc()

- Length: `px`, `pt`, `em`, `ex`, `rem`, `pc`, `in`, `cm`, `mm`
- Angle: `deg`, `rad`, `grad`, `turn`
- Time: `s`, `ms`
- `calc()` across compatible units **[ref-doc]**
- `%` — only where explicitly noted as supported (NOT on margin, padding, min-size)
- `rem` resolves against the **initial** font size, not the CSS-spec definition **[ref-doc]**
- Physical units (`pt`, `in`, etc.) use `-gtk-dpi`, not the fixed 96 dpi the web assumes **[ref-doc]**

---

## References

- `docs/gtk_css_reference_overview.md` — comprehensive in-repo reference (primary source, GTK 4.23.x)
- https://docs.gtk.org/gtk4/css-properties.html
- https://docs.gtk.org/gtk4/css-overview.html
