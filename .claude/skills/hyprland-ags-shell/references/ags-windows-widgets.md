# AGS v3 — Windows & Widgets Reference

> Target: **AGS v3** (Astal + gnim, GTK4). AGS v1 was GTK3 with a completely different API.
> Verified against context7 `/aylur/ags` (306 snippets).

---

## JSX Intrinsic Widgets

Lowercase JSX tags map to built-in GTK4 widgets. **No imports needed** for intrinsics — `Gtk` and `Astal` enums must still be imported for prop values.

**VERIFIED intrinsics** (context7 `/aylur/ags`, "Use GTK4 Intrinsic Widgets with JSX"):

| Tag | GTK4 type | Notes |
|-----|-----------|-------|
| `<window>` | `Astal.Window` | Shell window with Wayland layer-shell props |
| `<box>` | `Gtk.Box` | Flex-like container |
| `<centerbox>` | `Gtk.CenterBox` | 3-slot center layout; children use `$type="start"/"center"/"end"` |
| `<label>` | `Gtk.Label` | |
| `<button>` | `Gtk.Button` | |
| `<togglebutton>` | `Gtk.ToggleButton` | |
| `<switch>` | `Gtk.Switch` | |
| `<entry>` | `Gtk.Entry` | |
| `<image>` | `Gtk.Image` | |
| `<revealer>` | `Gtk.Revealer` | |
| `<scrolledwindow>` | `Gtk.ScrolledWindow` | |
| `<overlay>` | `Gtk.Overlay` | Overlaid children use `$type="overlay"` |
| `<stack>` | `Gtk.Stack` | |
| `<menubutton>` | `Gtk.MenuButton` | |
| `<levelbar>` | `Gtk.LevelBar` | |
| `<slider>` | `Gtk.Scale` | |

**No JSX intrinsic for `<flowbox>` or `<calendar>`** — build these imperatively inside a `$` setter (see below).

---

## `Astal.Window` Props

```tsx
import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"

<window
  name="my-window"          // used by app.toggle_window(name)
  application={app}
  visible={false}
  namespace="my-window"     // wlr-layer-shell namespace

  anchor={
    Astal.WindowAnchor.TOP |
    Astal.WindowAnchor.LEFT |
    Astal.WindowAnchor.RIGHT
  }
  layer={Astal.Layer.TOP}           // BACKGROUND | BOTTOM | TOP | OVERLAY
  keymode={Astal.Keymode.ON_DEMAND} // NONE | ON_DEMAND | EXCLUSIVE
  exclusivity={Astal.Exclusivity.EXCLUSIVE} // NORMAL | EXCLUSIVE | IGNORE
  exclusiveZone={-1}                // -1 = auto from exclusivity
  marginTop={0}
  marginBottom={0}
  marginLeft={0}
  marginRight={0}
/>
```

**VERIFIED** — context7 `/aylur/ags`, `app.start()` APIDOC example showing `anchor`, `exclusivity`, `keymode`.

---

## App Helpers

```ts
import app from "ags/gtk4/app"

app.toggle_window("window-name")  // show if hidden, hide if shown
app.get_monitors()                // returns Monitor[] — map over to create per-monitor widgets
```

**VERIFIED** — `app.toggle_window` and `app.get_monitors` appear in context7 `/aylur/ags` examples and are used in Launcher.tsx / app.ts.

---

## `overlay` Children

The `<overlay>` intrinsic maps to `Gtk.Overlay`. Overlay children (positioned on top) must set `$type="overlay"`:

```tsx
<overlay cssClasses={["glyph"]}>
  <image iconName="base-icon" />          {/* main child */}
  <image
    $type="overlay"
    iconName="badge-icon"
    halign={Gtk.Align.END}
    valign={Gtk.Align.START}
  />
</overlay>
```

**Verified empirically** — Launcher.tsx AI glyph overlay.

---

## FlowBox — Imperative Build (MANDATORY Pattern)

**There is no `<flowbox>` JSX intrinsic.** Build `Gtk.FlowBox` imperatively inside a `$` setter on a container.

**Critical rule: every child MUST be wrapped in `Gtk.FlowBoxChild` before appending.** Appending a bare widget with `fb.append(widget)` is a **silent runtime no-op** — it renders nothing and throws no error.

```tsx
<scrolledwindow
  $={(self) => {
    const fb = new Gtk.FlowBox()
    fb.set_max_children_per_line(5)
    fb.set_min_children_per_line(5)
    fb.set_homogeneous(true)
    fb.set_selection_mode(Gtk.SelectionMode.SINGLE)
    fb.set_activate_on_single_click(true)
    fb.set_halign(Gtk.Align.FILL)
    fb.set_hexpand(true)

    for (const item of items) {
      const child = new Gtk.FlowBoxChild()   // REQUIRED wrapper
      child.set_child(buildTileWidget(item))
      fb.append(child)
    }

    fb.connect("child-activated", (_box, child) => {
      const item = items[(child as Gtk.FlowBoxChild).get_index()]
      // handle activation
    })

    ;(self as Gtk.ScrolledWindow).set_child(fb)
  }}
/>
```

**Verified empirically** — Launcher.tsx all-apps grid.

---

## Click-Outside to Close (GestureClick + pick())

Use `Gtk.GestureClick` on the scrim container. Use `pick()` to detect whether the click landed on the scrim itself (not a child card):

```tsx
<box
  cssClasses={["scrim"]}
  hexpand vexpand
  halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}
  $={self => {
    const close = new Gtk.GestureClick()
    close.connect("pressed", (_g, _n, x, y) => {
      if (self.pick(x, y, Gtk.PickFlags.DEFAULT) === self) {
        app.toggle_window("my-window")
      }
    })
    self.add_controller(close)
  }}
>
  <box cssClasses={["card"]}>
    {/* content — clicks here won't match self */}
  </box>
</box>
```

**Verified empirically** — Launcher.tsx scrim pattern.

---

## Intercepting Arrows/Enter Before a Focused Entry

A focused `Gtk.Entry` (and its inner `GtkText` delegate) consumes arrow keys and Enter in the default BUBBLE phase. To intercept them at the **window level**, add an `EventControllerKey` in **CAPTURE phase**:

```tsx
<window
  $={self => {
    const controller = new Gtk.EventControllerKey()
    controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
    controller.connect("key-pressed", (_c, keyval, _code, state) => {
      switch (keyval) {
        case Gdk.KEY_Up:
          // handle before entry sees it
          return true  // stop propagation
        case Gdk.KEY_Down:
          return true
        case Gdk.KEY_Return:
          return true
        case Gdk.KEY_Escape:
          app.toggle_window("my-window")
          return true
      }
      // printable keys — return false so they reach the entry
      return false
    })
    self.add_controller(controller)
  }}
>
```

Return `true` to consume the event; `false` to let it propagate. The CAPTURE phase fires before the entry sees the event.

**Verified empirically** — Launcher.tsx key controller. GTK4 propagation phases are standard GTK4 behavior.

---

## `centerbox` Section Children

`<centerbox>` splits its children into start / center / end slots. Use `$type` to designate:

```tsx
<centerbox>
  <box $type="start">left content</box>
  <box $type="center">center content</box>
  <box $type="end">right content</box>
</centerbox>
```

**VERIFIED** — context7 `/aylur/ags`, intrinsics example.

---

## EventControllerFocus — Tracking Entry Focus

`has_focus()` is not available in this binding. Track focus with `EventControllerFocus`, which correctly follows the inner `GtkText` delegate:

```tsx
$={self => {
  const fc = new Gtk.EventControllerFocus()
  fc.connect("enter", () => { isFocused = true })
  fc.connect("leave", () => { isFocused = false })
  self.add_controller(fc)
}}
```

**Verified empirically** — Launcher.tsx entry focus tracking.
