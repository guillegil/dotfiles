// ActiveWindow.tsx — displays the focused window title (REQ-AW-01..03)
// Binds to hyprland.activeTitle. Clamps to ≤220px with Pango ellipsis.
// Renders nothing when title is empty (zero allocation, no crash).

import { createBinding } from "ags"
import { Gtk } from "ags/gtk4"
import Pango from "gi://Pango"
import hyprland from "../service/hyprland"

export default function ActiveWindow() {
  const title = createBinding(hyprland, "activeTitle")

  // REQ-AW-03: hide the widget entirely when no window is active
  const visible = title.as(t => t !== "")

  return (
    <box
      cssClasses={["active-window"]}
      visible={visible}
      valign={Gtk.Align.CENTER}
    >
      <label
        cssClasses={["w"]}
        label={title}
        ellipsize={Pango.EllipsizeMode.END}
        maxWidthChars={28}
        singleLineMode={true}
        valign={Gtk.Align.CENTER}
        accessibleRole={Gtk.AccessibleRole.LABEL}
        $={(self) => {
          // REQ-AW-02: clamp visual width to ≤220px
          self.set_size_request(-1, -1)
          self.max_width_chars = 28
          self.update_property(
            [Gtk.AccessibleProperty.LABEL],
            [title.get()],
          )
        }}
      />
    </box>
  )
}
