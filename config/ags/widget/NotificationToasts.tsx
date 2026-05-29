// NotificationToasts.tsx — transient arrival popups (swaync parity)
//
// notifd alone does NOT show toasts — it only collects notifications. This
// widget listens to the `notified` signal and shows a transient popup in the
// top-right for each new notification, auto-dismissing after a timeout. DND is
// respected (no toast while dont-disturb is on). Critical notifications stay
// until clicked. Clicking a toast dismisses the popup (the notification remains
// in the panel history).
//
// Mounted once as a singleton in app.ts. The window is only mapped while at
// least one toast is showing, so it never blocks clicks in the corner.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { Astal, Gtk } from "ags/gtk4"
import { createState, For } from "ags"
import Pango from "gi://Pango"
import Notifd from "gi://AstalNotifd"

const notifd = Notifd.get_default()
const TOAST_MS = 5000

export default function NotificationToasts() {
  const [toasts, setToasts] = createState<Notifd.Notification[]>([])

  const remove = (id: number) =>
    setToasts(prev => prev.filter(n => n.id !== id))

  notifd.connect("notified", (_src, id: number) => {
    // REQ-NT (DND): no toast while do-not-disturb is on.
    if (notifd.get_dont_disturb()) return
    const n = notifd.get_notification(id)
    if (!n) return

    setToasts(prev => [n, ...prev.filter(p => p.id !== id)])

    // Critical notifications persist until clicked; others auto-dismiss.
    if (n.urgency !== Notifd.Urgency.CRITICAL) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, TOAST_MS, () => {
        remove(id)
        return GLib.SOURCE_REMOVE
      })
    }
  })

  // If a notification is closed/dismissed elsewhere, drop its toast too.
  notifd.connect("resolved", (_src, id: number) => remove(id))

  return (
    <window
      name="notification-toasts"
      visible={toasts(t => t.length > 0)}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={38}
      marginRight={12}
      cssClasses={["toast-window"]}
      application={app}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["toast-stack"]}
        spacing={8}
      >
        <For each={toasts}>
          {(n: Notifd.Notification) => (
            <button
              cssClasses={n.urgency === Notifd.Urgency.CRITICAL
                ? ["toast", "urgent"]
                : ["toast"]}
              onClicked={() => remove(n.id)}
            >
              <box spacing={10}>
                <image
                  iconName={n.appIcon || "dialog-information-symbolic"}
                  cssClasses={["notif-icon"]}
                  valign={Gtk.Align.START}
                />
                <box orientation={Gtk.Orientation.VERTICAL} hexpand={true} spacing={2}>
                  <label
                    cssClasses={["notif-summary"]}
                    label={n.summary ?? ""}
                    halign={Gtk.Align.START}
                    ellipsize={Pango.EllipsizeMode.END}
                    singleLineMode={true}
                  />
                  <label
                    cssClasses={["notif-body"]}
                    label={n.body ?? ""}
                    halign={Gtk.Align.START}
                    wrap={true}
                    lines={2}
                    ellipsize={Pango.EllipsizeMode.END}
                    visible={!!n.body}
                  />
                </box>
              </box>
            </button>
          )}
        </For>
      </box>
    </window>
  )
}
