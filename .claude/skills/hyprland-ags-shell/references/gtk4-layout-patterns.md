# GTK4 Layout Patterns for AGS/Astal Shells

> All patterns in this file are **empirically verified on GTK 4.22** in production AGS shell code
> unless otherwise noted. No web CSS layout concepts apply here — GTK layout is widget-tree-driven.

---

## Core Mental Model

**Style with CSS. Lay out with widgets.**

GTK CSS handles paint: color, border, radius, shadow, font, transitions, animations.
GTK widgets + layout managers handle structure: size, position, alignment, spacing.

Never expect `display:flex`, `position:absolute`, or `max-width` to work. They don't exist.

---

## Rule 1: hexpand / vexpand propagate UP the widget tree

A widget with `hexpand={true}` causes every ancestor box along the horizontal axis to also expand to fill available space. This means:

- Setting `hexpand` on a deeply nested child can unexpectedly widen a parent container.
- To stop expansion from propagating past a point, set `hexpand={false}` on the container at that boundary.

```tsx
// The hexpand on the label propagates up through all parent boxes
// until a box with a fixed natural width stops it.
<box>
  <box>
    <Label hexpand={true} label="This expands the whole chain" />
  </box>
</box>

// Cap expansion: set hexpand={false} on the intermediate box
<box hexpand={false}>
  <Label hexpand={true} label="Expands inside this box only" />
</box>
```

---

## Rule 2: A horizontal Box sizes to the MAX natural width of its children

When children have different natural widths, a `Gtk.Box` with `homogeneous={true}` gives every child the width of the widest one. With `homogeneous={false}` (default), children get their own natural width, and the box is the sum of all widths + spacing.

This is NOT flexbox. There is no `flex-shrink`, no overflow, no wrapping (use `Gtk.FlowBox` for wrapping).

---

## Rule 3: halign=CENTER cannot shrink a widget below its content's natural width

`halign={Gtk.Align.CENTER}` centers a widget horizontally inside its parent, but the widget still occupies its full natural width. If the content inside is wide, the widget will be wide — centering just positions it, it does not constrain size.

```tsx
// WRONG mental model: "center" ≠ "make it smaller"
<Label halign={Gtk.Align.CENTER} label="A very long label that won't shrink" />

// The label is centered but still as wide as the text.
// To make it narrower, constrain the TEXT, not the alignment.
```

---

## Rule 4: GTK4 has no max-width — cap width by capping content's natural width

Since `max-width` doesn't exist, the only way to prevent a widget from growing too wide is to ensure its content doesn't demand more than the desired width.

**Pattern A: Pango ellipsize + max_width_chars on labels**

```tsx
<Label
  label={appTitle}
  ellipsize={Pango.EllipsizeMode.END}
  maxWidthChars={35}           // Pango caps the natural width at ~35 chars
  halign={Gtk.Align.START}
/>
```

The label will never grow beyond ~35 characters wide, and excess text gets `…`. The containing card will not stretch past that width.

**Pattern B: Limit item count in a horizontal strip**

If a row of chips/buttons drives the card width, cap the number of items rendered:

```tsx
// Render at most N items in the horizontal chip row
const chips = recentItems.slice(0, MAX_CHIPS);
```

**Pattern C: min-width as a floor, content as the ceiling**

```css
/* Set a minimum so the card isn't tiny when empty,
   but don't try to set max-width — it doesn't exist. */
.card { min-width: 460px; }
```

The card grows beyond `min-width` only if children demand more space.

---

## Rule 5: A child's background does NOT clip to the parent's border-radius

GTK4 does not clip child widget paint to the parent's `border-radius`. If the last child of a rounded card has its own background fill, its corners will poke out as squares past the card's rounded bottom corners.

**Fix: manually round the last child's bottom corners to match (minus border width).**

```css
.card {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
}

/* The footer is the card's last child with its own background.
   Its square corners would show past the card's rounded bottom.
   Match the card radius minus the 1px border. */
.card-footer {
  background: rgba(0,0,0,0.3);
  border-bottom-left-radius:  calc(18px - 1px);
  border-bottom-right-radius: calc(18px - 1px);
}
```

This pattern is **confirmed in `_widgets.scss` `.launcher-footer`** — the comment reads:
> "GTK4 doesn't clip a child's background to the parent's border-radius, so its square corners poked out under the card's rounded bottom."

---

## Rule 6: set_size_request() pins a MINIMUM, not a maximum

`widget.set_size_request(w, h)` — or equivalently `min-width`/`min-height` in CSS — sets a minimum allocation. The widget will still grow larger if its children or layout demand it. Use it as a floor, not a cage.

---

## Rule 7: No margin:auto — use a spacer box to push siblings apart

GTK does not support `margin: auto`. The idiomatic spacer is an empty `Gtk.Box` (or `box` in AGS JSX) with `hexpand={true}`:

```tsx
// Push left and right groups to opposite ends of a horizontal bar
<box>
  <LeftModules />
  <box hexpand={true} />   {/* absorbs all remaining horizontal space */}
  <RightModules />
</box>

// Three-zone bar: left | center | right
// Use Gtk.CenterBox instead of the spacer trick for exact centering
<centerbox>
  <LeftModules />
  <CenterModules />
  <RightModules />
</centerbox>
```

`Gtk.CenterBox` guarantees the center child is truly centered regardless of the widths of left and right children — the spacer trick only approximates this.

---

## Rule 8: Symbolic icon recoloring via the `color` property

Symbolic icons (single-color SVGs with `-symbolic` suffix) are recolored by GTK using the widget's CSS `color` property. To change a symbolic icon's color, just set `color` on the `image` widget or a parent:

```css
/* The image widget inherits color from its parent */
.battery.low { color: #f38ba8; }  /* whole row including the icon glyph */

/* Or target the image node directly */
.battery.low image { color: #f38ba8; }
```

This only works for **symbolic** icons (designed as single-path fill-friendly SVGs with `currentColor`). Full-color application icons ignore the `color` property.

---

## Common Before/After Patterns

### Centering a card horizontally

```tsx
// WRONG — no margin:auto, no flex centering
// WRONG — halign=CENTER alone does not shrink the card

// RIGHT — use halign=CENTER on the card widget itself
// (it centers the card's allocation within the parent)
// AND ensure the card's children control its natural width
<overlay>
  <box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
    <Card />
  </box>
</overlay>
```

### Pushing a glyph to the right edge of a row

```tsx
// WRONG — no margin-left:auto
// RIGHT — hexpand on the preceding element pushes this one to the right
<box>
  <Label hexpand={true} label={appName} />
  <Label label="⏎" cssClasses={["enter-hint"]} />
</box>
```

```css
/* No CSS needed — layout is purely from hexpand in the widget tree */
.enter-hint { color: var(--accent); font-size: 10px; }
```

### Animating a pill width (the GTK way)

GTK can't animate `width` (it doesn't exist). Animate `min-width` instead:

```css
.pill {
  min-width: 8px;
  min-height: 8px;
  border-radius: 9999px;
  transition: min-width 180ms ease;
}
.pill.active {
  min-width: 22px;
}
```

---

## References

- `config/ags/style/_widgets.scss` — `.launcher-footer` border-radius fix, `.ws` pill animation, hexpand spacer patterns
- `config/ags/style/_tokens.scss` — `*` selector for custom properties
- `docs/gtk_css_reference_overview.md` — §3 Box model, §12 Unsupported
