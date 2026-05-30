// widget/CalendarGrid.tsx — Custom month grid for the calendar popover
//
// Renders a Sunday-first month grid using Gtk.Grid (imperative, inside a $
// setter — same pattern as the launcher FlowBox). Navigation buttons shift the
// displayed month. Event dots come from the mock provider in lib/calendar-events.ts.
//
// Slice 3: interactive day selection. Clicking a day calls onSelectDay; the
// green highlight follows the selected day (not just today). Navigation (‹ ›)
// changes the VIEW month only — it does not change the selection.

import { Gtk } from "ags/gtk4"
import { createState, createComputed } from "ags"
import type { Accessor } from "ags"
import GLib from "gi://GLib"
import { provider, type EventCategory } from "../lib/calendar-events"

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

// Days in a month — handles leap years.
function daysInMonth(year: number, month: number): number {
  // GLib.DateTime last-day trick: first of next month minus 1 day
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  const firstNext = GLib.DateTime.new_local(nextYear, nextMonth, 1, 0, 0, 0)
  const lastDay   = firstNext.add_days(-1)
  return lastDay.get_day_of_month()
}

// Compute the Sunday-first column (0=Sun..6=Sat) for the 1st of the month.
// GLib ISO: Mon=1, Tue=2, ..., Sat=6, Sun=7
function firstWeekdayColumn(year: number, month: number): number {
  const firstOfMonth = GLib.DateTime.new_local(year, month, 1, 0, 0, 0)
  const isoDow = firstOfMonth.get_day_of_week() // 1=Mon..7=Sun
  // Convert ISO → Sunday-first: Sun(7)→0, Mon(1)→1, …, Sat(6)→6
  return isoDow % 7
}

// Format "MMMM YYYY" — e.g. "May 2026"
function formatMonthTitle(year: number, month: number): string {
  const dt = GLib.DateTime.new_local(year, month, 1, 0, 0, 0)
  return dt.format("%B %Y") ?? `${month}/${year}`
}

// Compute the relative-day label for the badge:
//   selected == today   → "TODAY"
//   selected N days after today → "in Nd"
//   selected N days before today → "Nd ago"
// GLib.DateTime.difference() returns a GTimeSpan, which GLib defines as an
// interval in MICROSECONDS. The divisor below (86_400_000_000) is exactly the
// documented G_TIME_SPAN_DAY constant, so diff / G_TIME_SPAN_DAY = whole days.
// (Canonical GLib — runtime-confirm by selecting tomorrow → badge reads "in 1d".)
function relLabel([sy, sm, sd]: [number, number, number]): string {
  const todayDt = GLib.DateTime.new_now_local()
  const todayY  = todayDt.get_year()
  const todayM  = todayDt.get_month()
  const todayD  = todayDt.get_day_of_month()

  if (sy === todayY && sm === todayM && sd === todayD) {
    return "TODAY"
  }

  // Build midnight anchors so time-of-day doesn't affect the delta.
  const todayMidnight = GLib.DateTime.new_local(todayY, todayM, todayD, 0, 0, 0)
  const selMidnight   = GLib.DateTime.new_local(sy, sm, sd, 0, 0, 0)
  // difference() returns microseconds: selMidnight - todayMidnight
  const diffUs = selMidnight.difference(todayMidnight)
  const days   = Math.round(diffUs / 86_400_000_000)

  if (days > 0) return `in ${days}d`
  return `${Math.abs(days)}d ago`
}

// ── Day cell builder ─────────────────────────────────────────────────────────
//
// CSS classes are mutually exclusive to avoid conflicts:
//   selected day  → ["cal-day", "cal-selected"]   (green fill)
//   today (not selected) → ["cal-day", "cal-today"] (accent-colored number)
//   other days    → ["cal-day"]

function buildDayCell(
  year:        number,
  month:       number,
  day:         number,
  isToday:     boolean,
  isSelected:  boolean,
  isWeekend:   boolean,
  onSelectDay: (y: number, m: number, d: number) => void,
): Gtk.Widget {
  const events = provider.getEventsForDay(year, month, day)

  // Determine CSS classes — mutually exclusive states
  let cssClasses: string[]
  if (isSelected) {
    cssClasses = ["cal-day", "cal-selected"]
  } else if (isToday) {
    cssClasses = ["cal-day", "cal-today"]
  } else {
    cssClasses = ["cal-day"]
  }
  // Weekend marker (Sun/Sat columns) — additive, so selected/today still win.
  if (isWeekend) cssClasses.push("cal-day-weekend")

  // Outer button
  const btn = new Gtk.Button()
  btn.set_css_classes(cssClasses)
  btn.set_has_frame(false)

  // Click handler — select this day
  btn.connect("clicked", () => onSelectDay(year, month, day))

  // Inner vertical box: number + dots row
  const inner = new Gtk.Box()
  inner.set_orientation(Gtk.Orientation.VERTICAL)
  inner.set_spacing(2)
  inner.set_halign(Gtk.Align.CENTER)
  inner.set_valign(Gtk.Align.CENTER)

  // Day number label
  const numLabel = new Gtk.Label()
  numLabel.set_label(String(day))
  numLabel.set_css_classes(["cal-day-num"])
  numLabel.set_halign(Gtk.Align.CENTER)
  inner.append(numLabel)

  // Dots row (max 3 colored dots + optional "more" muted dot)
  if (events.length > 0) {
    const dotsRow = new Gtk.Box()
    dotsRow.set_orientation(Gtk.Orientation.HORIZONTAL)
    dotsRow.set_spacing(3)
    dotsRow.set_halign(Gtk.Align.CENTER)
    dotsRow.set_css_classes(["cal-dots"])

    const maxDots = Math.min(events.length, 3)
    for (let i = 0; i < maxDots; i++) {
      const dot = new Gtk.Box()
      const cat = events[i].category as EventCategory
      // Color comes from the per-category class (.cal-dot-<cat>) in _widgets.scss,
      // which maps to CATEGORY_COLOR. (css-name is construct-only in GTK4 — never
      // set it post-construction; it emits a GObject CRITICAL.)
      dot.set_css_classes(["cal-dot", `cal-dot-${cat}`])
      dotsRow.append(dot)
    }

    if (events.length > 3) {
      const moreDot = new Gtk.Box()
      moreDot.set_css_classes(["cal-dot", "cal-dot-more"])
      dotsRow.append(moreDot)
    }

    inner.append(dotsRow)
  }

  btn.set_child(inner)
  return btn
}

// ── Empty cell (leading/trailing padding) ─────────────────────────────────────

function buildEmptyCell(): Gtk.Widget {
  const box = new Gtk.Box()
  box.set_css_classes(["cal-day", "cal-day-empty"])
  return box
}

// ── Grid rebuild ──────────────────────────────────────────────────────────────

function rebuildGrid(
  grid:        Gtk.Grid,
  year:        number,
  month:       number,
  sel:         [number, number, number],
  nowYear:     number,
  nowMonth:    number,
  nowDay:      number,
  onSelectDay: (y: number, m: number, d: number) => void,
): void {
  // Remove all existing children.
  let child = grid.get_first_child()
  while (child !== null) {
    const next = child.get_next_sibling()
    grid.remove(child)
    child = next
  }

  // Row 0: weekday headers (cols 0=Sun and 6=Sat get the weekend marker).
  for (let col = 0; col < 7; col++) {
    const hdr = new Gtk.Label()
    hdr.set_label(WEEKDAY_LABELS[col])
    const isWeekendCol = col === 0 || col === 6
    hdr.set_css_classes(isWeekendCol ? ["cal-weekday", "cal-weekday-weekend"] : ["cal-weekday"])
    hdr.set_halign(Gtk.Align.CENTER)
    grid.attach(hdr, col, 0, 1, 1)
  }

  const totalDays      = daysInMonth(year, month)
  const startCol       = firstWeekdayColumn(year, month)
  const isCurrentMonth = year === nowYear && month === nowMonth
  const [sy, sm, sd]   = sel

  let col = startCol
  let row = 1

  // Leading empty cells.
  for (let c = 0; c < startCol; c++) {
    grid.attach(buildEmptyCell(), c, 1, 1, 1)
  }

  // Day cells.
  for (let day = 1; day <= totalDays; day++) {
    const isToday    = isCurrentMonth && day === nowDay
    const isSelected = year === sy && month === sm && day === sd
    const isWeekend  = col === 0 || col === 6   // Sunday (0) / Saturday (6)
    const cell       = buildDayCell(year, month, day, isToday, isSelected, isWeekend, onSelectDay)
    grid.attach(cell, col, row, 1, 1)

    col++
    if (col === 7) {
      col = 0
      row++
    }
  }

  // Trailing empty cells to fill the last row.
  if (col > 0) {
    for (let c = col; c < 7; c++) {
      grid.attach(buildEmptyCell(), c, row, 1, 1)
    }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalendarGridProps {
  selected:    Accessor<[number, number, number]>
  onSelectDay: (y: number, m: number, d: number) => void
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CalendarGrid({ selected, onSelectDay }: CalendarGridProps) {
  const now      = GLib.DateTime.new_now_local()
  const nowYear  = now.get_year()
  const nowMonth = now.get_month()  // 1-based
  const nowDay   = now.get_day_of_month()

  const [ym, setYm] = createState<[number, number]>([nowYear, nowMonth])

  function navigateMonth(delta: 1 | -1): void {
    const [y, m] = ym.peek()
    // Use GLib to compute next/prev month safely (handles year rollover).
    // NEVER chain add_months — always start from a clean first-of-month anchor.
    const anchor   = GLib.DateTime.new_local(y, m, 1, 0, 0, 0)
    const shifted  = anchor.add_months(delta)
    const newYear  = shifted.get_year()
    const newMonth = shifted.get_month()
    setYm([newYear, newMonth])
  }

  // Reactive badge label — re-derives whenever the selected day changes.
  const badge = createComputed(() => relLabel(selected()))

  return (
    <box
      cssClasses={["cal-container"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
    >
      {/* Header: month title + badge + nav buttons */}
      <centerbox cssClasses={["cal-month-header"]}>
        <label
          $type="start"
          cssClasses={["cal-month-title"]}
          label={ym.as(([y, m]) => formatMonthTitle(y, m))}
          halign={Gtk.Align.START}
        />
        <box $type="end" spacing={4} valign={Gtk.Align.CENTER}>
          {/* Relative-day badge — clicking jumps view AND selection back to today */}
          <button
            cssClasses={["cal-today-badge"]}
            label={badge}
            hasFrame={false}
            valign={Gtk.Align.CENTER}
            onClicked={() => {
              setYm([nowYear, nowMonth])
              onSelectDay(nowYear, nowMonth, nowDay)
            }}
          />
          <button
            cssClasses={["cal-nav-btn"]}
            label="‹"
            hasFrame={false}
            onClicked={() => navigateMonth(-1)}
          />
          <button
            cssClasses={["cal-nav-btn"]}
            label="›"
            hasFrame={false}
            onClicked={() => navigateMonth(1)}
          />
        </box>
      </centerbox>

      {/* Grid — built imperatively; rebuilt on month OR selection change */}
      <box
        cssClasses={["cal-grid-wrapper"]}
        $={(self) => {
          const grid = new Gtk.Grid()
          grid.set_css_classes(["cal-grid"])
          grid.set_column_spacing(4)
          grid.set_row_spacing(4)
          grid.set_column_homogeneous(true)

          ;(self as Gtk.Box).append(grid)

          // Shared rebuild function — reads both ym and selected non-reactively
          // via .peek() so there's no double-subscription.
          const render = () => {
            const [y, m] = ym.peek()
            const sel    = selected.peek()
            rebuildGrid(grid, y, m, sel, nowYear, nowMonth, nowDay, onSelectDay)
          }

          // Initial render.
          render()

          // Re-render whenever the view month changes.
          ym.subscribe(render)

          // Re-render whenever the selected day changes (moves the highlight).
          selected.subscribe(render)
        }}
      />
    </box>
  )
}
