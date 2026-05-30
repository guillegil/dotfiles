# gtk4-layer-shell via Astal.Window (AGS v3)

> Verification status: `Astal.Window` prop names and `Astal.Exclusivity` enum
> **context7-verified** via `/aylur/astal`. Layer/anchor enum names verified from the
> same source. The **first-resize-after-map artifact** section is **empirically
> documented** in this project's `docs/toast-expand-flicker.md`; the two-phase-commit
> hypothesis is inference, explicitly labeled as such. Do NOT treat the Rust
> `gtk4-layer-shell` binding signatures as the AGS/TypeScript API — they are different.

---

## The model: Astal.Window IS a layer-shell surface

In AGS v3 (Astal + gnim), every top-level widget window is an `Astal.Window`, which
wraps `gtk4-layer-shell` internally. You never call `gtk4-layer-shell` C functions
directly — you set props on the window.

```tsx
<window
  name="my-bar"
  layer={Astal.Layer.TOP}
  anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
  exclusivity={Astal.Exclusivity.EXCLUSIVE}
  keymode={Astal.Keymode.NONE}
>
  ...
</window>
```

---

## Key props

### `layer` — `Astal.Layer`

Controls z-order relative to other surfaces:

| Value | Z position | Typical use |
|-------|-----------|-------------|
| `BACKGROUND` | Below windows | Wallpaper widgets |
| `BOTTOM` | Above background, below normal windows | Passive overlays |
| `TOP` | Above normal windows | Bars, docks |
| `OVERLAY` | Above everything including `TOP` | Toasts, launchers, lock screens |

### `anchor` — `Astal.WindowAnchor` (bitmask)

Values: `TOP`, `BOTTOM`, `LEFT`, `RIGHT`. Combine with `|`.

- Anchoring **opposite edges** (e.g. `LEFT | RIGHT`) stretches the surface to fill
  that axis.
- Anchoring **one edge** fixes that edge; the surface is content-sized on that axis
  (or sized by `width`/`height` props).
- A surface anchored to all four edges fills the monitor — useful for scrim overlays.

### `exclusivity` — `Astal.Exclusivity`

| Value | Effect |
|-------|--------|
| `NORMAL` | No exclusive zone reserved |
| `EXCLUSIVE` | Compositor reserves space equal to the surface size; other maximized windows avoid it |
| `IGNORE` | Surface ignores the exclusive zone of others |

> Bars typically use `EXCLUSIVE`; toasts and launchers use `NORMAL` or `IGNORE`.

### `keymode` — `Astal.Keymode`

| Value | Keyboard behavior |
|-------|------------------|
| `NONE` | Surface never receives keyboard input |
| `ON_DEMAND` | Receives keyboard when focused (user clicks or `grab_focus()`) |
| `EXCLUSIVE` | Grabs all keyboard input while mapped; nothing else gets keys |

Launcher: `ON_DEMAND` or `EXCLUSIVE`. Bar: `NONE`. Passive toasts: `NONE`.

### `name` / `namespace`

The `name` prop becomes the **Wayland surface namespace** — this is the string Hyprland
uses in `layerrule` directives:

```ini
# hyprland.conf
layerrule = blur, my-bar
layerrule = ignorezero, notification-toasts
```

Keep `name` values stable; changing them breaks any `layerrule` referencing them.

### `exclusive_zone`

Integer, pixels. Overrides the automatically computed exclusive zone. Set to `-1` to
opt out of the zone system entirely (the surface ignores other surfaces' zones and
reserves none). Rarely needed — `exclusivity` handles most cases.

---

## Content-sized vs fixed-size surfaces

- **Content-sized**: no explicit `width`/`height` — the surface grows to fit its child
  widget tree. Typical for toasts and launchers.
- **Fixed-size**: explicit `width`/`height` props pin the surface. Typical for bars
  anchored across the full monitor edge.

GTK4 has **no `max-width` CSS property** — only `min-width` / `min-height`. Width
control on content-sized surfaces requires combining:
- `min-width` (CSS floor)
- `max-width-chars` or `set_size_request()` on labels (natural-size cap)

---

## First-resize-after-map artifact

### What it is

On a **content-sized** layer surface, the **very first time** the surface needs to grow
(e.g. a notification toast expanding its body), the top edge briefly contracts and then
expands — a one-frame "jump". All subsequent resizes on the same mapped surface are
clean.

### Likely cause (inference — not proven)

The hypothesis is a **two-phase size commit on first resize after map**: on the initial
grow, `gtk4-layer-shell` must negotiate the new geometry with the compositor, and GTK
hasn't yet cached the expanded measurement — so the compositor sees the old (minimum)
size for one frame before the natural size is committed. Once the size is cached,
subsequent commits are single-phase and clean.

This hypothesis is inference from observed behavior; it has not been confirmed by
inspecting the gtk4-layer-shell configure handshake at the protocol level.

> Source: `docs/toast-expand-flicker.md` — empirical research log from this project.

### Empirically tested (and reverted) non-solutions

- **Always-mapped persistent window**: keeping `visible` always true to avoid the
  unmap/remap cycle only partially reduced the flicker and broke toast lifecycle
  (dismiss, timers, Show less). Not viable as-is.
- **Label property juggling** (`lines`, `ellipsize`, `width-chars`, `set_size_request`):
  fixes horizontal behavior but does not eliminate the vertical first-resize flicker.

### Workaround: Gtk.Revealer to mask the artifact

Wrapping the expanding content in a `Gtk.Revealer` with `SLIDE_DOWN` (or similar
transition) runs an animation over the resize, masking the two-phase jump from the
user:

```tsx
<revealer
  revealChild={expanded}
  transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
  transitionDuration={220}
>
  <label lines={100} ... />
</revealer>
```

The animation covers the one-frame contract. This is a **masking workaround**, not a
root-cause fix. It is the least-bad approach when the surface must remain
content-sized and mapped/unmapped per logical lifetime.

> **Alternative (unverified):** CSS `transition` on `min-height` may animate the box
> height change and similarly mask the artifact — GTK 4.22+ supports CSS transitions.
> Not tested on a layer surface in this project.

### Using fixed dimensions

Giving the surface a fixed width (and letting only height vary) reduces the axes on
which first-resize instability can appear. If the design allows a fixed width, prefer it
over fully content-sized for surfaces that expand dynamically.

---

## Common patterns

```tsx
// Bar — full-width, top, reserves space
<window
  name="bar"
  layer={Astal.Layer.TOP}
  anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
  exclusivity={Astal.Exclusivity.EXCLUSIVE}
  keymode={Astal.Keymode.NONE}
/>

// Toast / popup — content-sized, overlay, no keyboard, top-right
<window
  name="notification-toasts"
  layer={Astal.Layer.OVERLAY}
  anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
  exclusivity={Astal.Exclusivity.NORMAL}
  keymode={Astal.Keymode.NONE}
  marginTop={38}
  marginRight={12}
/>

// Launcher — full-screen scrim, grabs keyboard
<window
  name="launcher"
  layer={Astal.Layer.OVERLAY}
  anchor={
    Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM |
    Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT
  }
  exclusivity={Astal.Exclusivity.IGNORE}
  keymode={Astal.Keymode.EXCLUSIVE}
/>
```
