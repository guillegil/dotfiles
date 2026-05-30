# GTK4 CSS — Unsupported Properties (Silent Failures)

> These all **silently fail** — GTK ignores unknown or inapplicable CSS without error output
> by default. The bug shows up visually, not in logs.
>
> Authority: GTK 4 docs (context7-verified) + in-repo reference `docs/gtk_css_reference_overview.md`
> (GTK 4.23.x) + empirical observation on GTK 4.22 (marked **[empirical GTK 4.22]**).

---

## Layout Properties

### width / height / max-width / max-height

❌ **Not supported.** GTK CSS has no `width`, `height`, `max-width`, or `max-height`.

A widget's real size comes from its GTK layout manager and content natural size. CSS can only set a **minimum** via `min-width` / `min-height`.

**Alternative:** To cap a widget's apparent width, constrain the content that drives its natural size:
- Use Pango `ellipsize` + `max_width_chars` on `Gtk.Label` to prevent text from stretching a container
- Limit item count in a horizontal list
- Use `min-width` only as a floor, not a ceiling

```css
/* WRONG — silently ignored */
.card { max-width: 480px; }

/* RIGHT — constrain via Pango in the TSX/JS layer */
/* <Label ellipsize={Pango.EllipsizeMode.END} maxWidthChars={40} /> */
/* Then the label's natural width caps the card. */
```

### display / flexbox / grid

❌ **Not supported.** No `display`, no `flex`, no `grid`, no `flex-direction`, `justify-content`, `align-items`, etc.

**Alternative:** Layout is done by GTK widgets and layout managers:
- `Gtk.Box` (horizontal/vertical) — replaces flexbox row/column
- `Gtk.Grid` / `Gtk.FlowBox` — replaces CSS grid
- `Gtk.CenterBox` — three-slot centered layout
- `Gtk.Overlay` — layered children (replaces `position: absolute` overlays)
- `halign`, `valign`, `hexpand`, `vexpand` — alignment and fill (set on the widget, not via CSS)

### position / top / right / bottom / left

❌ **Not supported.** No `position: absolute/relative/fixed/sticky`, no coordinate offsets.

**Alternative:** Use `Gtk.Overlay` for layered/floating children. Use `Gtk.Fixed` for pixel-exact positioning (rare; avoid in production UIs).

### float / z-index

❌ **Not supported.** Stacking follows widget/child insertion order in the tree.

**Alternative:** Reorder child widgets in code to control draw order. Use `Gtk.Overlay` for stacked layers.

### margin: auto

❌ **Not supported.** GTK does not support `auto` values on margin.

**Alternative:** Use a `<box hexpand={true} />` spacer widget to push siblings to opposite edges:

```tsx
// Push right-side children to the right edge
<box>
  <Label label="left content" />
  <box hexpand={true} />   {/* flex-grow:1 equivalent */}
  <Label label="right content" />
</box>
```

### Percentages on sizing/spacing

❌ **Not supported** on `min-width`, `min-height`, `margin`, or `padding`. GTK only accepts absolute lengths there.

```css
/* WRONG */
.card { min-width: 80%; margin: 5% 0; }

/* RIGHT — use px/em */
.card { min-width: 400px; margin: 8px 0; }
```

---

## Selectors

### Attribute selectors [attr=value]

❌ **Not supported.** `[data-theme="dark"]`, `[disabled]`, `[type="text"]` — all silently ignored.

**Alternative:** Use GTK style classes (`.dark-theme`, `.disabled`) set programmatically in code. Runtime theme switching requires a CSS reload or `GtkStyleProvider` swap, not attribute selectors.

```css
/* WRONG */
window[data-theme="dark"] { background: #1e1e2e; }

/* RIGHT — set a class in code and target it */
window.dark { background: #1e1e2e; }
```

### ::before / ::after / content

❌ **Not supported.** GTK has no generated-content pseudo-elements.

**Alternative:** Add real GTK widgets (e.g. `Gtk.Label`, `Gtk.Image`) as children. GTK already exposes internal widget sub-nodes (e.g. `button > label`, `entry > text`) that you can style directly — no generated content needed.

```css
/* WRONG */
.badge::before { content: "•"; color: red; }

/* RIGHT — add a real label widget with the dot character,
   or use a styled Gtk.Box child as the dot */
```

---

## Background / Visual Effects

### backdrop-filter

❌ **Not supported in GTK CSS.** `backdrop-filter: blur(...)` is silently ignored.

**Alternative:** Delegate blur to the Wayland compositor (Hyprland):

```ini
# hyprland.conf — blur the AGS layer by its namespace
layerrule = blur, your-namespace
layerrule = ignorezero, your-namespace
layerrule = ignorealpha 0.3, your-namespace
```

The GTK window background must be `transparent` or semi-transparent for compositor blur to show through. **[empirical GTK 4.22]**

```css
/* AGS side: make the window transparent */
window.bar { background: transparent; }
/* The card/box carries the semi-transparent fill */
window.bar > box { background: rgba(30,30,46,0.55); }
```

### background-clip: text / -webkit-text-fill-color

❌ **Not supported.** Gradient-filled text (the common "gradient text" web trick) is impossible in GTK4. **[empirical GTK 4.22]** — confirmed with explicit comment in `_widgets.scss` (`.ai-pill` rule).

**Alternative:** Use a solid `color` value. If a gradient background on the element itself is desired (behind the text), apply it to `background-image` on the widget — the text will render over it in solid color.

---

## Outline Gaps

- `outline: auto` — NOT supported **[ref-doc]**
- `outline-color: invert` — NOT supported **[ref-doc]**

---

## Text / Font Gaps

- `text-decoration-style: dashed` and `dotted` — NOT supported **[ref-doc]**
- `font-variant` shorthand: only CSS2 values (no CSS3 `font-variant-*` values in shorthand) **[ref-doc]**
- `caret-color: auto` — NOT supported **[ref-doc]**
- `text-transform: full-width` and `full-size-kana` — NOT supported **[ref-doc]**

---

## Transform Gaps

- `transform-origin` z-component — NOT supported (2D transforms only) **[ref-doc]**

---

## :root Selector Quirk

`:root` is technically listed as a supported selector in GTK docs **[ref-doc]**, but in practice it behaves inconsistently for custom property declarations. The in-repo token file `_tokens.scss` uses `*` (universal selector) instead for reliable cascade. **[empirical GTK 4.22]**

The GTK 5 migration guide recommends `:root` for custom properties (`@define-color` replacement). Until GTK 5 / consistent GTK 4 behaviour, use `*` in production.

---

## Summary Cheat-Sheet

| Web idiom | GTK alternative |
|---|---|
| `width: Xpx` | Not possible — content drives size |
| `max-width: Xpx` | Pango `max_width_chars` + `ellipsize` |
| `margin: auto` (centering) | `halign=CENTER` on the widget |
| `display: flex` | `Gtk.Box` + `hexpand`/`vexpand` |
| `display: grid` | `Gtk.Grid` or `Gtk.FlowBox` |
| `position: absolute` | `Gtk.Overlay` |
| `z-index` | Reorder children in code |
| `[attr=val]` selector | Style class set in code |
| `::before`/`::after` | Real child widget |
| `backdrop-filter: blur` | Hyprland `layerrule = blur` |
| Gradient text | Not possible — use solid `color` |
| `%` on spacing | Use `px` / `em` |

---

## References

- `docs/gtk_css_reference_overview.md` — in-repo reference (§12 What GTK4 CSS does NOT support)
- `config/ags/style/_tokens.scss` — `*` selector pattern for custom props
- `config/ags/style/_glass.scss` — `NO backdrop-filter` constraint comment
- `config/ags/style/_widgets.scss` — gradient text impossibility comment (`.ai-pill`)
- https://docs.gtk.org/gtk4/css-properties.html
