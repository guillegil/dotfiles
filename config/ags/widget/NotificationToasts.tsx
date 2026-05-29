// NotificationToasts.tsx — transient arrival popups (swaync parity + DESIGN.md)
//
// notifd alone does NOT show toasts — it only collects notifications. This
// widget listens to the `notified` signal and shows a transient popup per new
// notification in the top-right. Behaviours:
//   1. Normal notifications stay 5s; urgent stay 10s — both auto-dismiss.
//   2. Hovering a toast PAUSES its countdown; leaving RESUMES it (remaining
//      time, not a restart — tracked via GLib monotonic clock).
//   3. Long bodies are clamped to 2 lines with a "Show more" toggle; expanding
//      pauses the countdown until the pointer leaves (same as hover).
//   4. DND suppresses toasts entirely.
//   5. Clicking × dismisses the popup (the notification stays in panel history).
//
// Mounted once as a singleton in app.ts. The window is only mapped while ≥1
// toast shows, so it never blocks clicks in the corner.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { Astal, Gtk } from "ags/gtk4"
import { createState, For } from "ags"
import Pango from "gi://Pango"
import Notifd from "gi://AstalNotifd"

const notifd = Notifd.get_default()
const NORMAL_MS = 5000
const URGENT_MS = 10000
const LONG_BODY = 90 // chars beyond which a body is considered "long"

export default function NotificationToasts() {
  const [toasts, setToasts] = createState<Notifd.Notification[]>([])

  const remove = (id: number) =>
    setToasts(prev => prev.filter(n => n.id !== id))

  notifd.connect("notified", (_src, id: number) => {
    if (notifd.get_dont_disturb()) return // (4) DND suppresses toasts
    const n = notifd.get_notification(id)
    if (!n) return
    setToasts(prev => [n, ...prev.filter(p => p.id !== id)])
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
          {(n: Notifd.Notification) => <Toast n={n} onClose={() => remove(n.id)} />}
        </For>
      </box>
    </window>
  )
}

function Toast({ n, onClose }: { n: Notifd.Notification; onClose: () => void }) {
  const urgent = n.urgency === Notifd.Urgency.CRITICAL
  const duration = urgent ? URGENT_MS : NORMAL_MS // (1)(4: urgent 10s)
  const bodyText = n.body ?? ""
  const isLong = bodyText.length > LONG_BODY || bodyText.includes("\n")

  const [expanded, setExpanded] = createState(false)

  // Pausable countdown tracked against the monotonic clock (µs).
  let remaining = duration
  let timerId = 0
  let startedAt = 0
  let hovered = false

  const clearTimer = () => {
    if (timerId) { GLib.source_remove(timerId); timerId = 0 }
  }
  const startTimer = () => {
    clearTimer()
    if (remaining <= 0) { onClose(); return }
    startedAt = GLib.get_monotonic_time()
    timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.round(remaining), () => {
      timerId = 0
      onClose()
      return GLib.SOURCE_REMOVE
    })
  }
  const pauseTimer = () => {
    if (!timerId) return
    clearTimer()
    const elapsedMs = (GLib.get_monotonic_time() - startedAt) / 1000
    remaining = Math.max(0, remaining - elapsedMs)
  }
  // (2)/(3): resume only when neither hovered nor expanded.
  const maybeResume = () => { if (!hovered && !expanded.get()) startTimer() }

  const close = () => { clearTimer(); onClose() }

  return (
    <box
      cssClasses={urgent ? ["toast", "urgent"] : ["toast"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
      $={(self) => {
        startTimer()
        const motion = new Gtk.EventControllerMotion()
        motion.connect("enter", () => { hovered = true; pauseTimer() })   // (2)
        motion.connect("leave", () => { hovered = false; maybeResume() }) // (2)
        self.add_controller(motion)

        // Click on the card dismisses the popup (the notification stays in the
        // panel as read). A parent gesture still fires even when a child button
        // claims, so skip dismissal when the click landed on a control (×,
        // Show more) — walk ancestors from the picked widget up to the card.
        const click = new Gtk.GestureClick()
        click.connect("released", (_g, _n, x, y) => {
          let node: Gtk.Widget | null = self.pick(x, y, Gtk.PickFlags.DEFAULT)
          while (node && node !== self) {
            if (node instanceof Gtk.Button) return
            node = node.get_parent()
          }
          close()
        })
        self.add_controller(click)
      }}
    >
      <box spacing={10}>
        <box cssClasses={["toast-icon-tile"]} valign={Gtk.Align.CENTER}>
          <image iconName={n.appIcon || "dialog-information-symbolic"} />
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand={true} spacing={2}>
          <box spacing={6}>
            <label
              cssClasses={["notif-summary"]}
              label={n.summary ?? ""}
              halign={Gtk.Align.START}
              hexpand={true}
              maxWidthChars={30}
              ellipsize={Pango.EllipsizeMode.END}
              singleLineMode={true}
            />
            <button
              cssClasses={["toast-close"]}
              valign={Gtk.Align.START}
              // × fully dismisses (removes from the panel too), unlike a click
              // on the card body which only clears the popup.
              onClicked={() => { clearTimer(); n.dismiss() }}
              $={(self) => self.update_property(
                [Gtk.AccessibleProperty.LABEL], ["Dismiss"])}
            >
              <image iconName="window-close-symbolic" />
            </button>
          </box>
          <label
            cssClasses={["notif-body"]}
            label={bodyText}
            halign={Gtk.Align.START}
            xalign={0}            // text left-aligned in its allocation (no re-justify)
            wrap={true}
            // Pin the text column to exactly 34 chars (width = max = min) so the
            // toast width is identical for short/long and collapsed/expanded —
            // GTK4 has no max-width, so widthChars is how we stop the jitter.
            widthChars={34}
            maxWidthChars={34}
            // Keep ellipsize END constant — only `lines` changes between states,
            // so Show more changes HEIGHT only (toggling ellipsize recomputed the
            // width and caused the jitter).
            lines={expanded(e => e ? -1 : 2)}
            ellipsize={Pango.EllipsizeMode.END}
            visible={!!bodyText}
          />
          {isLong && (
            <button
              cssClasses={["toast-expand"]}
              halign={Gtk.Align.START}
              label={expanded(e => e ? "Show less" : "Show more")}
              onClicked={() => {
                const next = !expanded.get()
                setExpanded(next)
                if (next) {
                  pauseTimer() // (3) keep it up while expanded
                } else {
                  maybeResume()
                }
              }}
            />
          )}
        </box>
      </box>
    </box>
  )
}
