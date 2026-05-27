// Popover.tsx — generic layer-shell popover window (ADR-6)
// Used by Clock's Calendar popover (Slice B) and NotificationsPanel (Slice D).
// Esc-to-close via onKeyPressed. Accessible role: dialog.

import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"

type Props = {
  name: string
  anchor: number
  margins: [number, number, number, number]
  accessibleName: string
  children: JSX.Element
}

export default function Popover({ name, anchor, margins, accessibleName, children }: Props) {
  const [top, right, bottom, left] = margins

  return (
    <window
      name={name}
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={anchor}
      marginTop={top}
      marginRight={right}
      marginBottom={bottom}
      marginLeft={left}
      keymode={Astal.Keymode.ON_DEMAND}
      cssClasses={["popover"]}
      accessibleRole={Gtk.AccessibleRole.DIALOG}
      application={app}
      $={(self) => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) app.toggle_window(name)
          return false
        })
        self.add_controller(controller)
        self.update_property([Gtk.AccessibleProperty.LABEL], [accessibleName])
      }}
    >
      {children}
    </window>
  )
}
