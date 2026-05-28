// LauncherPill.tsx — pill chip that opens the launcher window (REQ-LP-01..02)
// Clicking calls app.toggle_window("launcher"). A11y: accessible-name + role=button.
// Hit target ≥44px via .w--chip padding + button default sizing.

import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"

export default function LauncherPill() {
  return (
    <button
      cssClasses={["launcher-pill", "w", "w--chip"]}
      onClicked={() => app.toggle_window("launcher")}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Open launcher"],
        )
      }}
    >
      <image
        iconName="view-app-grid-symbolic"
        cssClasses={["launcher-pill-icon"]}
        valign={Gtk.Align.CENTER}
      />
    </button>
  )
}
