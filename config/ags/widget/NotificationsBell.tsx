// NotificationsBell.tsx — bell + unread badge (REQ-NT-03, NT-05, NT-06)
// AstalNotifd: notifications (array) + dontDisturb. Badge shows the count when
// > 0; DND adds the .dnd class and swaps the icon. Click toggles the panel.
// Property names verified against AstalNotifd-0.1.gir.

import app from "ags/gtk4/app"
import { createBinding } from "ags"
import Notifd from "gi://AstalNotifd"
import { Gtk } from "ags/gtk4"

export default function NotificationsBell() {
  const notifd = Notifd.get_default()

  const notifications = createBinding(notifd, "notifications")
  const dnd = createBinding(notifd, "dontDisturb")

  const hasNotifs = notifications.as(n => n.length > 0)
  // REQ-NT-05 (extended): dot is red if ANY notification is urgent, else blue.
  const dotClasses = notifications.as(list =>
    list.some(n => n.urgency === Notifd.Urgency.CRITICAL)
      ? ["notif-dot", "urgent"]
      : ["notif-dot", "normal"])

  return (
    <button
      cssClasses={dnd.as(d => d ? ["notif-bell", "w", "dnd"] : ["notif-bell", "w"])}
      onClicked={() => app.toggle_window("notifications-panel")}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-NT-06: accessible-name reflects unread count
        const update = () => self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          [`Notifications, ${notifd.get_notifications().length} unread`],
        )
        update()
        notifications.subscribe(update)
      }}
    >
      <overlay>
        <image
          iconName={dnd.as(d =>
            d
              ? "notifications-disabled-symbolic"
              : "preferences-system-notifications-symbolic")}
          valign={Gtk.Align.CENTER}
        />
        {/* REQ-NT-05: presence dot, top-right, only when unread > 0.
            Color encodes urgency: red if any urgent, blue otherwise. */}
        <box
          $type="overlay"
          cssClasses={dotClasses}
          visible={hasNotifs}
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        />
      </overlay>
    </button>
  )
}
