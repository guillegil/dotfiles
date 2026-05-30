// lib/calendar-events.ts — Calendar event provider (mock implementation)
//
// Provider boundary: plain TS types + plain numbers (year/month/day, 1-based month).
// A real source (khal, gcalcli, ICS) can implement CalendarProvider and swap in
// by replacing `createMockProvider()` — the UI (CalendarGrid) never changes.
//
// The mock data is anchored to GLib.DateTime.new_now_local() so the popover
// always shows populated days regardless of the current date.

import GLib from "gi://GLib"

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventCategory = "work" | "personal" | "health" | "social"

export interface CalEvent {
  id:       string
  title:    string
  start:    string // ISO "YYYY-MM-DDTHH:MM:SS"
  end:      string // ISO "YYYY-MM-DDTHH:MM:SS"
  category: EventCategory
}

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  work:     "var(--blue)",
  personal: "var(--green)",
  health:   "var(--mauve)",
  social:   "var(--peach)",
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface CalendarProvider {
  /** Return all events in a given month. month is 1-based (1=Jan, 12=Dec). */
  getEvents(year: number, month: number): CalEvent[]
  /** Return events for a specific day. month is 1-based. */
  getEventsForDay(year: number, month: number, day: number): CalEvent[]
  /** Return the next upcoming event (start >= now), or null if none. */
  getNextEvent(): CalEvent | null
}

// ── ISO helpers ───────────────────────────────────────────────────────────────

function isoDate(dt: GLib.DateTime): string {
  return dt.format("%Y-%m-%dT%H:%M:%S") ?? ""
}

function parseEventDate(iso: string): { year: number; month: number; day: number } {
  // ISO format: "YYYY-MM-DDTHH:MM:SS"
  const year  = parseInt(iso.substring(0, 4), 10)
  const month = parseInt(iso.substring(5, 7), 10)
  const day   = parseInt(iso.substring(8, 10), 10)
  return { year, month, day }
}

// ── Mock provider factory ─────────────────────────────────────────────────────

export function createMockProvider(): CalendarProvider {
  // Anchor to "right now" so sample events are always in the current month.
  const now     = GLib.DateTime.new_now_local()
  const curYear  = now.get_year()
  const curMonth = now.get_month() // 1-based
  const curDay   = now.get_day_of_month()

  // Helper: build an ISO event anchored to today + offset days, at hh:mm.
  function makeEvent(
    id:       string,
    title:    string,
    category: EventCategory,
    dayOffset: number,
    startHour: number,
    startMin:  number,
    durationMins: number,
  ): CalEvent {
    // Clamp target day to valid range within the month.
    const targetDay = Math.max(1, Math.min(28, curDay + dayOffset))

    const startDt = GLib.DateTime.new_local(curYear, curMonth, targetDay, startHour, startMin, 0)
    // Compute end time via add_seconds to avoid minute-overflow arithmetic.
    const endDt   = startDt.add_seconds(durationMins * 60)

    return {
      id,
      title,
      category,
      start: isoDate(startDt),
      end:   isoDate(endDt),
    }
  }

  // Seed ~8 events spread across the month (today, ±3, ±10, etc.)
  const events: CalEvent[] = [
    // Today
    makeEvent("e1", "Daily Standup",   "work",     0,   9,  0,  30),
    makeEvent("e2", "Team 1:1",        "work",     0,  14,  0,  60),
    // +1
    makeEvent("e3", "Design Review",   "work",     1,  11,  0,  90),
    // +3
    makeEvent("e4", "Climbing Session","health",   3,  18,  0,  90),
    // +5
    makeEvent("e5", "Coffee w/ Alex",  "social",   5,  10, 30,  60),
    // -2 (two days ago)
    makeEvent("e6", "Sprint Planning", "work",    -2,  10,  0, 120),
    // +10
    makeEvent("e7", "Doctor Appt",     "health",  10,   9, 30,  30),
    // +12
    makeEvent("e8", "Birthday Dinner", "social",  12,  19,  0, 120),
    // -5
    makeEvent("e9", "Retrospective",   "work",    -5,  15,  0,  60),
  ]

  // ── Comparison helper ───────────────────────────────────────────────────────

  function isoNow(): string {
    return isoDate(GLib.DateTime.new_now_local())
  }

  // ── Provider implementation ─────────────────────────────────────────────────

  return {
    getEvents(year: number, month: number): CalEvent[] {
      return events.filter(ev => {
        const d = parseEventDate(ev.start)
        return d.year === year && d.month === month
      })
    },

    getEventsForDay(year: number, month: number, day: number): CalEvent[] {
      return events.filter(ev => {
        const d = parseEventDate(ev.start)
        return d.year === year && d.month === month && d.day === day
      })
    },

    getNextEvent(): CalEvent | null {
      const nowIso = isoNow()
      // Collect events from this month + next month, find the earliest that
      // starts at or after now.
      const nextMonth = curMonth === 12 ? 1 : curMonth + 1
      const nextYear  = curMonth === 12 ? curYear + 1 : curYear

      const candidates = [
        ...this.getEvents(curYear, curMonth),
        ...this.getEvents(nextYear, nextMonth),
      ].filter(ev => ev.start >= nowIso)

      if (candidates.length === 0) return null

      candidates.sort((a, b) => (a.start < b.start ? -1 : 1))
      return candidates[0]
    },
  }
}

// ── Singleton the UI imports ──────────────────────────────────────────────────
export const provider: CalendarProvider = createMockProvider()
