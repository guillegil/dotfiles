// lib/task-parse.ts — Natural-language quick-add parser for the calendar popover.
//
// Exports:
//   ParsedTask  { title, project, dueLabel, dueISO }
//   parseQuickAdd(input: string): ParsedTask
//
// Design mirrors lib/calc.ts: hand-rolled regex + GLib.DateTime only.
// NEVER uses eval() / new Function() / external libs.
// TOTAL — the body is wrapped in try/catch; any error falls back to
//   { title: input.trim(), project: "Inbox", dueLabel: "", dueISO: null }.
//
// Supported token subset (extract-and-strip from input; remainder = title):
//   Project:  #(\w+)  → Capitalized; default "Inbox"
//   Time:     "H:MM am/pm", "H am/pm", "noon" (12:00), "midnight" (00:00)
//   Date:     today / tomorrow|tom / yesterday
//             weekday names (full + 3-letter) → next occurrence strictly after today
//             "next week" → +7d
//             "in N day(s)/week(s)" → +N days/weeks

import GLib from "gi://GLib"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedTask {
  title:    string
  project:  string
  dueLabel: string
  dueISO:   string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capitalize first letter, lowercase rest. */
function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Format a GLib.DateTime as "H:MMa" / "H:MMp" (Todoist compact style).
 * e.g. 15:30 → "3:30p", 09:00 → "9:00a".
 */
function formatTimeLabel(h: number, m: number): string {
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? "a" : "p"
  const mm = m.toString().padStart(2, "0")
  return `${hour12}:${mm}${suffix}`
}

/**
 * Build a dueLabel date string from y/m/d relative to today.
 * today → "today", tomorrow → "tomorrow", otherwise "Mon" (weekday) within 6 days
 * or "May 26" (month + day) beyond that.
 */
function buildDateLabel(y: number, m: number, d: number, today: GLib.DateTime): string {
  const todayY = today.get_year()
  const todayM = today.get_month()
  const todayD = today.get_day_of_month()

  if (y === todayY && m === todayM && d === todayD) return "today"

  // tomorrow check
  const tomorrowDt = today.add_days(1)
  if (
    y === tomorrowDt.get_year() &&
    m === tomorrowDt.get_month() &&
    d === tomorrowDt.get_day_of_month()
  ) return "tomorrow"

  // within 6 days ahead → short weekday
  const target = GLib.DateTime.new_local(y, m, d, 12, 0, 0)
  const diff = target.difference(today)   // microseconds
  const diffDays = diff / 86_400_000_000  // convert to days

  if (diffDays > 0 && diffDays < 7) {
    // day_of_week: 1=Mon … 7=Sun (ISO)
    const dow = target.get_day_of_week()
    const SHORT_DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return SHORT_DAYS[dow] ?? target.format("%b %-d") ?? `${m}/${d}`
  }

  // fallback: "May 26"
  return target.format("%b %-d") ?? `${m}/${d}`
}

// ── Weekday name map (3-letter and full, lowercase) ───────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  // 3-letter
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
  // full
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 7,
}

/**
 * Find the next occurrence of `targetDow` (ISO 1=Mon…7=Sun) strictly after today.
 * If today is that weekday, +7d.
 */
function nextWeekday(today: GLib.DateTime, targetDow: number): GLib.DateTime {
  const todayDow = today.get_day_of_week()  // 1=Mon…7=Sun
  let delta = targetDow - todayDow
  if (delta <= 0) delta += 7
  return today.add_days(delta)
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse a natural-language quick-add string into a structured ParsedTask.
 * NEVER throws — any error returns a safe fallback.
 */
export function parseQuickAdd(input: string): ParsedTask {
  // Fallback returned on any error
  const fallback: ParsedTask = {
    title:    input.trim(),
    project:  "Inbox",
    dueLabel: "",
    dueISO:   null,
  }

  try {
    const raw = input.trim()
    if (!raw) return fallback

    // Work on a lowercase copy for matching; maintain the original for title extraction
    let working = raw

    // ── 1. Extract project (#tag) ─────────────────────────────────────────────
    let project = "Inbox"
    working = working.replace(/#(\w+)/i, (_match, tag: string) => {
      project = capitalize(tag)
      return ""  // strip token
    })

    // ── 2. Extract time ───────────────────────────────────────────────────────
    let parsedHour: number | null = null
    let parsedMin = 0

    // "noon" / "midnight"
    const noonRe = /\bnoon\b/i
    const midRe  = /\bmidnight\b/i

    if (noonRe.test(working)) {
      parsedHour = 12
      parsedMin  = 0
      working = working.replace(noonRe, "")
    } else if (midRe.test(working)) {
      parsedHour = 0
      parsedMin  = 0
      working = working.replace(midRe, "")
    } else {
      // "H:MM am/pm" or "H:MM" (24h)
      const hmAmPmRe = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i
      const hmMatch = hmAmPmRe.exec(working)
      if (hmMatch) {
        let h = parseInt(hmMatch[1], 10)
        const m = parseInt(hmMatch[2], 10)
        const ampm = (hmMatch[3] ?? "").toLowerCase()
        if (ampm === "pm" && h < 12) h += 12
        if (ampm === "am" && h === 12) h = 0
        parsedHour = h
        parsedMin  = m
        working = working.replace(hmMatch[0], "")
      } else {
        // "H am/pm" (no minutes)
        const hAmPmRe = /\b(\d{1,2})\s*(am|pm)\b/i
        const hMatch = hAmPmRe.exec(working)
        if (hMatch) {
          let h = parseInt(hMatch[1], 10)
          const ampm = hMatch[2].toLowerCase()
          if (ampm === "pm" && h < 12) h += 12
          if (ampm === "am" && h === 12) h = 0
          parsedHour = h
          parsedMin  = 0
          working = working.replace(hMatch[0], "")
        }
      }
    }

    // ── 3. Extract date ───────────────────────────────────────────────────────
    const today = GLib.DateTime.new_now_local()
    let dateDt: GLib.DateTime | null = null

    // "in N day(s)/week(s)"
    const inNRe = /\bin\s+(\d+)\s+(days?|weeks?)\b/i
    const inNMatch = inNRe.exec(working)
    if (inNMatch) {
      const n = parseInt(inNMatch[1], 10)
      const unit = inNMatch[2].toLowerCase()
      const days = unit.startsWith("week") ? n * 7 : n
      dateDt = today.add_days(days)
      working = working.replace(inNMatch[0], "")
    }

    if (!dateDt) {
      // "next week"
      const nextWeekRe = /\bnext\s+week\b/i
      if (nextWeekRe.test(working)) {
        dateDt = today.add_days(7)
        working = working.replace(nextWeekRe, "")
      }
    }

    if (!dateDt) {
      // "tomorrow" / "tom"
      const tomorrowRe = /\b(tomorrow|tom)\b/i
      if (tomorrowRe.test(working)) {
        dateDt = today.add_days(1)
        working = working.replace(tomorrowRe, "")
      }
    }

    if (!dateDt) {
      // "yesterday"
      const yesterdayRe = /\byesterday\b/i
      if (yesterdayRe.test(working)) {
        dateDt = today.add_days(-1)
        working = working.replace(yesterdayRe, "")
      }
    }

    if (!dateDt) {
      // "today"
      const todayRe = /\btoday\b/i
      if (todayRe.test(working)) {
        dateDt = today
        working = working.replace(todayRe, "")
      }
    }

    if (!dateDt) {
      // Weekday names (full + 3-letter) — longest match first to avoid "mon" matching "monday"
      const wdayRe = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i
      const wdMatch = wdayRe.exec(working)
      if (wdMatch) {
        const key = wdMatch[1].toLowerCase()
        const targetDow = WEEKDAY_MAP[key]
        if (targetDow !== undefined) {
          dateDt = nextWeekday(today, targetDow)
          working = working.replace(wdMatch[0], "")
        }
      }
    }

    // ── 4. Build dueISO ───────────────────────────────────────────────────────
    let dueISO: string | null = null

    if (dateDt !== null) {
      const y = dateDt.get_year()
      const m = dateDt.get_month()
      const d = dateDt.get_day_of_month()
      const h = parsedHour !== null ? parsedHour : 0
      const mn = parsedHour !== null ? parsedMin : 0

      const combined = GLib.DateTime.new_local(y, m, d, h, mn, 0)
      // Build ISO string manually — GLib.DateTime.format_iso8601() may not exist
      // in all versions. format() with strftime is safe cross-version.
      dueISO = combined.format("%Y-%m-%dT%H:%M:%S") ?? null
    }

    // ── 5. Build dueLabel ─────────────────────────────────────────────────────
    let dueLabel = ""

    const hasDate = dateDt !== null
    const hasTime = parsedHour !== null

    if (hasDate && hasTime) {
      const dLab = buildDateLabel(
        dateDt!.get_year(), dateDt!.get_month(), dateDt!.get_day_of_month(), today
      )
      dueLabel = `${dLab} · ${formatTimeLabel(parsedHour!, parsedMin)}`
    } else if (hasDate) {
      dueLabel = buildDateLabel(
        dateDt!.get_year(), dateDt!.get_month(), dateDt!.get_day_of_month(), today
      )
    } else if (hasTime) {
      dueLabel = formatTimeLabel(parsedHour!, parsedMin)
    }

    // ── 6. Extract title (leftover after stripping tokens) ────────────────────
    // Collapse whitespace, trim, and fall back to the original input if empty.
    let title = working.replace(/\s+/g, " ").trim()
    if (!title) title = raw

    return { title, project, dueLabel, dueISO }
  } catch {
    return fallback
  }
}
