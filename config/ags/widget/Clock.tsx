// Clock.tsx — time + date chip + CalendarPopover (REQ-CL-01..04)
// Time polls every 60s via createPoll. Sub-label shows weekday + date.
// Clicking the button toggles the "calendar" Popover window.
// CalendarPopover: exported separately, mounted as singleton in app.ts.
//
// Two-column layout (calendar-redesign horizontal restructure):
//   Left column:  CalendarGrid + CalendarLegend + CalendarSync
//   Right column: DayHeader+NewTask row / TasksDue / AgendaSection
// The NextEventPill stays floating above (unchanged).
// CalendarFooter removed — its pieces moved to left/right columns.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { Gtk } from "ags/gtk4"
import Pango from "gi://Pango"
import { createPoll } from "ags/time"
import { createState, createComputed, For } from "ags"
import type { Accessor } from "ags"
import Popover from "./Popover"
import CalendarGrid from "./CalendarGrid"
import TasksDue, { handleCalendarOutsideClick } from "./CalendarTasks"
import { provider, type CalEvent } from "../lib/calendar-events"
import { setAdding } from "../lib/calendar-tasks"

// Pre-seed createPoll so the bar shows the correct time on first paint
// instead of an empty string for up to 60s while the first poll fires.
const now = GLib.DateTime.new_now_local()

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format an ISO datetime string as short 12h time: "3:30p" */
function formatShortTime(iso: string): string {
  const hour24 = parseInt(iso.substring(11, 13), 10)
  const min    = iso.substring(14, 16)
  const isAm   = hour24 < 12
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  const suffix = isAm ? "a" : "p"
  return `${hour12}:${min}${suffix}`
}

/** Format ISO datetime as "H:MM" (no AM/PM) for agenda columns */
function formatTimeShort(iso: string): string {
  const hour24 = parseInt(iso.substring(11, 13), 10)
  const min    = iso.substring(14, 16)
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${min}`
}

/** Format selected day as "Weekday, Month D" e.g. "Monday, May 25" for DayHeader */
function formatDayHeader([y, m, d]: [number, number, number]): string {
  const dt = GLib.DateTime.new_local(y, m, d, 0, 0, 0)
  return dt.format("%A, %B %-d") ?? ""
}

// ── NextEventPill ─────────────────────────────────────────────────────────────
// Shows the next upcoming event from the provider.
// Uses a JetBrainsMono Nerd Font calendar glyph (U+F073) for the icon;
// NOT an emoji — CSS-recolorable via the `color` property on a label.

function NextEventPill() {
  const next: CalEvent | null = provider.getNextEvent()

  if (next === null) {
    return (
      <box cssClasses={["cal-next-pill"]} halign={Gtk.Align.CENTER}>
        <label
          cssClasses={["cal-pill-icon"]}
          label=""
          valign={Gtk.Align.CENTER}
        />
        <label
          cssClasses={["cal-pill-text"]}
          label="No upcoming events"
          valign={Gtk.Align.CENTER}
        />
      </box>
    )
  }

  const timeStr = formatShortTime(next.start)

  return (
    <box cssClasses={["cal-next-pill"]} halign={Gtk.Align.CENTER} spacing={6}>
      {/* Calendar glyph — JetBrainsMono Nerd Font, CSS color-recolorable */}
      <label
        cssClasses={["cal-pill-icon"]}
        label=""
        valign={Gtk.Align.CENTER}
      />
      <label
        cssClasses={["cal-pill-time"]}
        label={timeStr}
        valign={Gtk.Align.CENTER}
      />
      <label
        cssClasses={["cal-pill-title"]}
        label={next.title}
        ellipsize={Pango.EllipsizeMode.END}
        maxWidthChars={22}
        valign={Gtk.Align.CENTER}
      />
    </box>
  )
}

// ── AgendaRow ─────────────────────────────────────────────────────────────────

function AgendaRow({ event }: { event: CalEvent }) {
  const startStr = formatTimeShort(event.start)
  const endStr   = formatTimeShort(event.end)

  return (
    <box cssClasses={["cal-agenda-row"]} spacing={8}>
      {/* Time column: start over end */}
      <box
        cssClasses={["cal-agenda-time"]}
        orientation={Gtk.Orientation.VERTICAL}
        valign={Gtk.Align.CENTER}
        spacing={2}
      >
        <label
          cssClasses={["cal-agenda-time-start", "tabular"]}
          label={startStr}
          halign={Gtk.Align.END}
        />
        <label
          cssClasses={["cal-agenda-time-end", "tabular"]}
          label={endStr}
          halign={Gtk.Align.END}
        />
      </box>

      {/* Colored category bar — ~3px wide, full row height */}
      <box
        cssClasses={["cal-agenda-bar", `cal-bar-${event.category}`]}
        valign={Gtk.Align.FILL}
      />

      {/* Title */}
      <label
        cssClasses={["cal-agenda-title"]}
        label={event.title}
        ellipsize={Pango.EllipsizeMode.END}
        hexpand={true}
        halign={Gtk.Align.START}
        valign={Gtk.Align.CENTER}
      />
    </box>
  )
}

// ── AgendaSection ─────────────────────────────────────────────────────────────
// Simplified header: "SCHEDULE" left + "Google · N" right.
// The per-day legend moved to CalendarLegend in the left column.
// The selected date label moved to DayHeader above this section.

interface AgendaSectionProps {
  selected: Accessor<[number, number, number]>
}

function AgendaSection({ selected }: AgendaSectionProps) {
  // Reactive event list — re-derives whenever selected day changes.
  const events = createComputed(() => {
    const [y, m, d] = selected()
    return provider
      .getEventsForDay(y, m, d)
      .slice()
      .sort((a, b) => (a.start < b.start ? -1 : 1))
  })

  // Reactive count for the source label — "Google · N"
  const eventCount = createComputed(() => events().length)

  // Visibility derived accessors for the two content states
  const isEmpty    = createComputed(() => events().length === 0)
  const isNotEmpty = createComputed(() => events().length > 0)

  return (
    <box cssClasses={["cal-agenda"]} orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      {/* Section header row — "SCHEDULE" left, "Google · N" right */}
      <centerbox cssClasses={["cal-agenda-header-row"]}>
        <label
          $type="start"
          cssClasses={["cal-agenda-header"]}
          label="SCHEDULE"
          halign={Gtk.Align.START}
        />
        <label
          $type="end"
          cssClasses={["cal-agenda-source"]}
          label={eventCount.as(n => `Google · ${n}`)}
          halign={Gtk.Align.END}
        />
      </centerbox>

      {/* Event list in a scrolled window (max ~180px tall) */}
      <scrolledwindow
        cssClasses={["cal-agenda-scroll"]}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        propagateNaturalHeight={true}
        maxContentHeight={180}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          {/* Empty state — visible only when events list is empty */}
          <label
            cssClasses={["cal-agenda-empty"]}
            label="Nothing scheduled"
            halign={Gtk.Align.CENTER}
            visible={isEmpty}
          />
          {/* Event rows — visible only when there are events */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={2}
            visible={isNotEmpty}
          >
            <For each={events}>
              {(ev: CalEvent) => <AgendaRow event={ev} />}
            </For>
          </box>
        </box>
      </scrolledwindow>
    </box>
  )
}

// ── CalendarLegend ────────────────────────────────────────────────────────────
// Static legend strip in the left column: Work (blue) · Personal (green) · Todoist (red).
// Uses the existing cal-dot-* color classes; no new SCSS color rules needed.

function CalendarLegend() {
  const items: Array<{ label: string; dotClass: string }> = [
    { label: "Work",     dotClass: "cal-dot-work" },
    { label: "Personal", dotClass: "cal-dot-personal" },
    { label: "Todoist",  dotClass: "cal-dot-todoist" },
  ]

  return (
    <box
      cssClasses={["cal-legend"]}
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={10}
      valign={Gtk.Align.CENTER}
    >
      {items.map(item => (
        <box cssClasses={["cal-legend-item"]} spacing={4} valign={Gtk.Align.CENTER}>
          <box cssClasses={["cal-legend-dot", item.dotClass]} />
          <label
            cssClasses={["cal-legend-label"]}
            label={item.label}
            valign={Gtk.Align.CENTER}
          />
        </box>
      ))}
    </box>
  )
}

// ── CalendarSync ──────────────────────────────────────────────────────────────
// Static sync status row at the bottom of the left column.
// Nerd Font sync/check glyph (U+F00C) + dim "Synced 2m ago · 2 accounts".
// Replace the static text with a reactive accessor when a real sync source exists.

function CalendarSync() {
  return (
    <box cssClasses={["cal-sync"]} spacing={0} valign={Gtk.Align.CENTER}>
      <label
        cssClasses={["cal-sync-glyph"]}
        label=""
        valign={Gtk.Align.CENTER}
      />
      <label
        cssClasses={["cal-sync-status"]}
        label="Synced 2m ago · 2 accounts"
        valign={Gtk.Align.CENTER}
      />
    </box>
  )
}

// ── DayHeader + NewTask row ───────────────────────────────────────────────────
// Top of the right column. DayHeader shows the selected day as "Weekday, Month D".
// The "+ New task" button is a placeholder — wire onClicked to a real Todoist
// add-task call when the integration is ready.

interface DayHeaderRowProps {
  selected: Accessor<[number, number, number]>
}

function DayHeaderRow({ selected }: DayHeaderRowProps) {
  const dayLabel = createComputed(() => formatDayHeader(selected()))

  return (
    <centerbox>
      <label
        $type="start"
        cssClasses={["cal-day-header"]}
        label={dayLabel}
        halign={Gtk.Align.START}
        hexpand={true}
      />
      <button
        $type="end"
        cssClasses={["cal-new-task"]}
        label="+ New task"
        hasFrame={false}
        valign={Gtk.Align.CENTER}
        onClicked={() => setAdding(true)}
        $={(self) => {
          self.update_property(
            [Gtk.AccessibleProperty.LABEL],
            ["Add task"],
          )
        }}
      />
    </centerbox>
  )
}

// ── Clock widget (renders in the bar) ─────────────────────────────────────

export default function Clock() {
  // REQ-CL-01: HH:MM updated every 60s
  const time = createPoll(now.format("%H:%M") ?? "", 60_000, "date '+%H:%M'")
  // REQ-CL-02: weekday + abbreviated month + date
  const date = createPoll(now.format("%a · %b %-d") ?? "", 60_000, "date '+%a · %b %-d'")

  return (
    <button
      cssClasses={["clock", "w"]}
      hasFrame={false}
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
      {/* macOS-style single horizontal line: date then time, baseline-aligned. */}
      <box orientation={Gtk.Orientation.HORIZONTAL} valign={Gtk.Align.CENTER} spacing={8}>
        {/* REQ-CL-02: date */}
        <label
          cssClasses={["clock-date"]}
          label={date}
          valign={Gtk.Align.BASELINE}
        />
        {/* REQ-CL-01: tabular-nums time */}
        <label
          cssClasses={["clock-time", "tabular"]}
          label={time}
          valign={Gtk.Align.BASELINE}
        />
      </box>
    </button>
  )
}

// ── CalendarPopover — mount as singleton in app.ts (REQ-CL-03) ────────────
// Two-column layout: left (grid+legend+sync) | right (day-header+tasks+agenda).
// Selected-day state lifted here; shared between left (grid highlight) and right
// (DayHeader display + agenda event list).

export function CalendarPopover() {
  // Seed the selection from today so the initial state shows today highlighted.
  const todayDt = GLib.DateTime.new_now_local()
  const [selected, setSelected] = createState<[number, number, number]>([
    todayDt.get_year(),
    todayDt.get_month(),        // 1-based
    todayDt.get_day_of_month(),
  ])

  function onSelectDay(y: number, m: number, d: number): void {
    setSelected([y, m, d])
  }

  return (
    <Popover
      name="calendar"
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.START}
      margins={[48, 0, 0, 0]}
      accessibleName="Calendar"
      // The pill + cal-card each carry their own background; keep the container
      // transparent so only the wallpaper shows behind/around the pill.
      cssClass="popover-bare"
    >
      {/* cal-root: vertical stack — pill (visual float via margin-bottom) + card */}
      <box cssClasses={["cal-root"]} orientation={Gtk.Orientation.VERTICAL}>
        <NextEventPill />

        {/* cal-card: HORIZONTAL two-column layout */}
        <box
          cssClasses={["cal-card"]}
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={0}
          $={(self) => {
            // Single source of truth for "clicked outside" behavior inside the
            // calendar: on any primary click, hand the picked widget to
            // CalendarTasks, which commits an open edit (if the click was outside
            // the entry) and cancels a pending-delete (if outside its trash).
            // This is why focus-leave (which doesn't fire for clicks on
            // non-focusable areas) was removed.
            const g = new Gtk.GestureClick()
            g.set_button(1)
            g.connect("pressed", (_g: Gtk.GestureClick, _n: number, x: number, y: number) => {
              const picked = (self as Gtk.Widget).pick(x, y, Gtk.PickFlags.DEFAULT)
              handleCalendarOutsideClick(picked)
            })
            ;(self as Gtk.Widget).add_controller(g)
          }}
        >

          {/* Left column: grid + legend + sync */}
          <box
            cssClasses={["cal-col-left"]}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
          >
            <CalendarGrid selected={selected} onSelectDay={onSelectDay} />
            <CalendarLegend />
            <CalendarSync />
          </box>

          {/* Right column: day-header+new-task / tasks / schedule */}
          <box
            cssClasses={["cal-col-right"]}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            hexpand={true}
          >
            <DayHeaderRow selected={selected} />
            <TasksDue />
            <AgendaSection selected={selected} />
          </box>

        </box>
      </box>
    </Popover>
  )
}
