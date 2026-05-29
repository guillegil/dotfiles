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
}

export default function Popover({ name, halign, valign, margins, accessibleName, children }: Props) {
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
      {/* Full-screen scrim — clicks outside the card close the popover. */}
      <box
        cssClasses={["popover-scrim"]}
        hexpand={true}
        vexpand={true}
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
        $={(self) => {
          const close = new Gtk.GestureClick()
          close.connect("released", () => app.toggle_window(name))
          self.add_controller(close)
        }}
      >
        <box
          cssClasses={["popover"]}
          halign={halign}
          valign={valign}
          marginTop={top}
          marginEnd={right}
          marginBottom={bottom}
          marginStart={left}
          accessibleRole={Gtk.AccessibleRole.DIALOG}
          $={(self) => {
            self.update_property([Gtk.AccessibleProperty.LABEL], [accessibleName])
            // Consume clicks on the card so the scrim's close handler does not
            // fire when the user clicks inert areas inside the popover.
            const claim = new Gtk.GestureClick()
            claim.connect("pressed", (g) => g.set_state(Gtk.EventSequenceState.CLAIMED))
            self.add_controller(claim)
          }}
        >
          {children}
        </box>
      </box>
    </window>
  )
}
