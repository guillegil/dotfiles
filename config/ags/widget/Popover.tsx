// Popover.tsx — generic popover with click-outside-to-close (ADR-6)
// Used by Clock's Calendar (Slice B) and the NotificationsPanel (Slice D).
//
// The window spans the full screen (anchored on all four edges) so a
// transparent scrim child can capture click-outside events and dismiss the
// popover — same Spotlight-style pattern as the Launcher. The visible card is
// positioned inside via halign/valign + margins. Esc also closes.
//
// A full-screen window (vs an anchored, content-sized one) additionally avoids
// the layer-shell "resize-while-mapped" clipping: when content grows while the
// popover is open (e.g. a new notification arrives), the card re-lays-out to its
// natural height immediately instead of keeping a stale, too-short surface.

import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"

type Props = {
  name: string
  halign: Gtk.Align
  valign: Gtk.Align
  margins: [number, number, number, number] // [top, right, bottom, left]
  accessibleName: string
  children: JSX.Element
  // Optional extra class on the positioned container. Pass "popover-bare" when
  // the content supplies its OWN card surface (e.g. the calendar, whose pill +
  // card each have their own background) so the container itself stays
  // transparent and only the wallpaper shows behind the gaps.
  cssClass?: string
}

export default function Popover({ name, halign, valign, margins, accessibleName, children, cssClass }: Props) {
  const [top, right, bottom, left] = margins

  const anchorAll =
    Astal.WindowAnchor.TOP |
    Astal.WindowAnchor.BOTTOM |
    Astal.WindowAnchor.LEFT |
    Astal.WindowAnchor.RIGHT

  return (
    <window
      name={name}
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={anchorAll}
      keymode={Astal.Keymode.ON_DEMAND}
      cssClasses={["popover-window"]}
      application={app}
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) app.toggle_window(name)
          return false
        })
        self.add_controller(controller)
      }}
    >
      {/* Full-screen scrim — clicks that land on the scrim itself (i.e. OUTSIDE
          the card) close the popover. Clicks on the card or any of its children
          are left untouched so interactive controls (dismiss, Clear all, the DND
          switch) work normally. We must NOT put a claiming gesture on the card —
          that would swallow the children's own click gestures. */}
      <box
        cssClasses={["popover-scrim"]}
        hexpand={true}
        vexpand={true}
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
        $={(self) => {
          const close = new Gtk.GestureClick()
          close.connect("pressed", (_g, _n, x, y) => {
            // pick() returns the deepest widget at the point; if it is the scrim
            // itself the click was on empty space outside the card → close.
            if (self.pick(x, y, Gtk.PickFlags.DEFAULT) === self) {
              app.toggle_window(name)
            }
          })
          self.add_controller(close)
        }}
      >
        <box
          cssClasses={cssClass ? ["popover", cssClass] : ["popover"]}
          halign={halign}
          valign={valign}
          // The scrim is a horizontal box; a child needs explicit hexpand for
          // halign to actually position it (without it the box packs the child
          // to the start, and any hexpand propagated up from the content makes
          // placement inconsistent). hexpand+vexpand=true gives the box full
          // allocation so halign/valign are authoritative. Same fix as the
          // launcher card. (CENTER → centered, END → right edge, etc.)
          hexpand={true}
          vexpand={true}
          marginTop={top}
          marginEnd={right}
          marginBottom={bottom}
          marginStart={left}
          accessibleRole={Gtk.AccessibleRole.DIALOG}
          $={(self) =>
            self.update_property([Gtk.AccessibleProperty.LABEL], [accessibleName])}
        >
          {children}
        </box>
      </box>
    </window>
  )
}
