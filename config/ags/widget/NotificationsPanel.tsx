// NotificationsPanel.tsx — notification center popover (REQ-NT-02,04,05,06; ADR-8)
// Mounted once as a singleton in app.ts. Header: count + DND switch + Clear all.
// Scrollable list from notifd.notifications; each row shows app icon, summary,
// 2-line body, time, and a × dismiss. Urgent rows get a red left border.
// Property/enum names verified against AstalNotifd-0.1.gir.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { createBinding, For } from "ags"
import Notifd from "gi://AstalNotifd"
import { Astal, Gtk } from "ags/gtk4"
import Pango from "gi://Pango"
import Popover from "./Popover"

const notifd = Notifd.get_default()

export function NotificationsPanel() {
  const notifications = createBinding(notifd, "notifications")
  const dnd = createBinding(notifd, "dontDisturb")

  const count = notifications.as(n => n.length)
  const isEmpty = notifications.as(n => n.length === 0)
  const hasNotifs = notifications.as(n => n.length > 0)

  return (
    <Popover
      name="notifications-panel"
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      margins={[38, 12, 0, 0]}
      accessibleName="Notifications"
    >
      <box
        cssClasses={["notif-panel"]}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={10}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <box cssClasses={["notif-header"]} spacing={10}>
          <label
            cssClasses={["notif-count"]}
            label={count.as(c => c === 1 ? "1 notification" : `${c} notifications`)}
            halign={Gtk.Align.START}
            hexpand={true}
          />
          <label cssClasses={["notif-dnd-label"]} label="DND" valign={Gtk.Align.CENTER} />
          <switch
            active={dnd}
            valign={Gtk.Align.CENTER}
            onNotifyActive={(self) => {
              if (self.active !== notifd.get_dont_disturb()) {
                notifd.set_dont_disturb(self.active)
              }
            }}
          />
          <button
            cssClasses={["notif-clear"]}
            label="Clear all"
            visible={hasNotifs}
            onClicked={() => notifd.get_notifications().forEach(n => n.dismiss())}
          />
        </box>

        {/* ── Empty state ──────────────────────────────────────── */}
        <label
          cssClasses={["notif-empty"]}
          label="No notifications"
          visible={isEmpty}
        />

        {/* ── List ─────────────────────────────────────────────── */}
        <scrolledwindow
          visible={hasNotifs}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          propagateNaturalHeight={true}
          maxContentHeight={600}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <For each={notifications}>
              {(n: Notifd.Notification) => <NotificationRow n={n} />}
            </For>
          </box>
        </scrolledwindow>
      </box>
    </Popover>
  )
}

function NotificationRow({ n }: { n: Notifd.Notification }) {
  const urgent = n.urgency === Notifd.Urgency.CRITICAL
  const time = n.time
    ? GLib.DateTime.new_from_unix_local(n.time).format("%H:%M") ?? ""
    : ""

  return (
    <box
      cssClasses={urgent ? ["notification-row", "urgent"] : ["notification-row"]}
      spacing={10}
    >
      <image
        iconName={n.appIcon || "dialog-information-symbolic"}
        cssClasses={["notif-icon"]}
        valign={Gtk.Align.START}
      />
      <box orientation={Gtk.Orientation.VERTICAL} hexpand={true} spacing={2}>
        <box spacing={6}>
          <label
            cssClasses={["notif-summary"]}
            label={n.summary ?? ""}
            halign={Gtk.Align.START}
            hexpand={true}
            ellipsize={Pango.EllipsizeMode.END}
            singleLineMode={true}
          />
          <label cssClasses={["notif-time", "tabular"]} label={time} valign={Gtk.Align.START} />
        </box>
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
      <button
        cssClasses={["notif-dismiss"]}
        valign={Gtk.Align.START}
        onClicked={() => n.dismiss()}
        $={(self) => self.update_property(
          [Gtk.AccessibleProperty.LABEL], ["Dismiss notification"])}
      >
        <image iconName="window-close-symbolic" />
      </button>
    </box>
  )
}
