// Clock.tsx — time + date chip + CalendarPopover (REQ-CL-01..04)
// Time polls every 60s via createPoll. Sub-label shows weekday + date.
// Clicking the button toggles the "calendar" Popover window.
// CalendarPopover: exported separately, mounted as singleton in app.ts.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { Astal, Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import Popover from "./Popover"

// Pre-seed createPoll so the bar shows the correct time on first paint
// instead of an empty string for up to 60s while the first poll fires.
const now = GLib.DateTime.new_now_local()

// ── Clock widget (renders in the bar) ─────────────────────────────────────

export default function Clock() {
  // REQ-CL-01: HH:MM updated every 60s
  const time = createPoll(now.format("%H:%M") ?? "", 60_000, "date '+%H:%M'")
  // REQ-CL-02: weekday + abbreviated month + date
  const date = createPoll(now.format("%a · %b %-d") ?? "", 60_000, "date '+%a · %b %-d'")

  return (
    <button
      cssClasses={["clock", "w"]}
      onClicked={() => app.toggle_window("calendar")}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-CL-04: accessible-name
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Clock, open calendar"],
        )
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
        {/* REQ-CL-01: tabular-nums time label */}
        <label
          cssClasses={["clock-time", "tabular"]}
          label={time}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
        {/* REQ-CL-02: dim date sub-label */}
        <label
          cssClasses={["clock-date"]}
          label={date}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
      </box>
    </button>
  )
}

// ── CalendarPopover — mount as singleton in app.ts (REQ-CL-03) ────────────

export function CalendarPopover() {
  return (
    <Popover
      name="calendar"
      anchor={Astal.WindowAnchor.TOP}
      margins={[38, 0, 0, 0]}
      accessibleName="Calendar"
    >
      <box
        cssClasses={["calendar-popover"]}
        orientation={Gtk.Orientation.VERTICAL}
        $={(self) => {
          // REQ-CL-03: Gtk.Calendar is not a JSX intrinsic in gnim — construct
          // it imperatively and append. GTK4 highlights today by default.
          const cal = new Gtk.Calendar()
          cal.add_css_class("calendar-widget")
          cal.add_css_class("tabular")
          cal.show_day_names = true
          cal.show_heading = true
          cal.update_property(
            [Gtk.AccessibleProperty.LABEL],
            ["Calendar, current month"],
          )
          self.append(cal)
        }}
      />
    </Popover>
  )
}
