// lib/calendar-tasks.ts — Calendar tasks provider (mock implementation)
//
// Provider boundary: plain TS types. A real Todoist (or other) source can
// replace MOCK_TASKS and toggleTask without touching any UI code.
//
// Pattern mirrors lib/calendar-events.ts — same import style, same singleton
// export, swappable via the provider boundary comment below.

import { createState } from "ags"
import type { ParsedTask } from "./task-parse"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalTask {
  id:       string
  title:    string
  project:  string
  dueLabel: string
  dueISO:   string | null   // null = no due datetime; populated by quick-add / edit
  done:     boolean
}

// ── Mock data ─────────────────────────────────────────────────────────────────
//
// Replace MOCK_TASKS with a real Todoist REST v2 fetch (or any async source)
// to wire a live provider. toggleTask can be replaced with an API PATCH call
// that then calls setTasks() with the updated array on success.

const MOCK_TASKS: CalTask[] = [
  {
    id:       "t1",
    title:    "Ship calendar widget rework",
    project:  "Cachy bar",
    dueLabel: "3:00p",
    dueISO:   null,
    done:     false,
  },
  {
    id:       "t2",
    title:    "Review PR #482 · AGS services",
    project:  "Work",
    dueLabel: "today",
    dueISO:   null,
    done:     false,
  },
  {
    id:       "t3",
    title:    "Reply to Riley about 1:1",
    project:  "Inbox",
    dueLabel: "today",
    dueISO:   null,
    done:     false,
  },
  {
    id:       "t4",
    title:    "Water the plants",
    project:  "Home",
    dueLabel: "today",
    dueISO:   null,
    done:     true,
  },
]

// ── Reactive store ────────────────────────────────────────────────────────────

const [tasks, setTasks] = createState<CalTask[]>(MOCK_TASKS)

/**
 * Reactive accessor — pass directly to <For each={tasks}> in JSX.
 * Never call .map() on this; use <For> instead.
 */
export { tasks }

/**
 * Toggle a task's done state by id.
 * Uses .peek() to avoid registering a reactive dependency inside the updater.
 * Replace this function with a real provider call (e.g. Todoist PATCH) that
 * then calls setTasks() with the server-confirmed updated list.
 */
export function toggleTask(id: string): void {
  setTasks(tasks.peek().map(t => t.id === id ? { ...t, done: !t.done } : t))
}

// ── Quick-add UI state ────────────────────────────────────────────────────────
//
// Shared between CalendarTasks (renders the inline entry) and Clock (the
// "+ New task" button). Lifted here instead of into either widget so both can
// import without a circular dependency.

export const [adding, setAdding] = createState<boolean>(false)

// ── Edit-in-place UI state ────────────────────────────────────────────────────
//
// Tracks which task row is currently in inline edit mode (null = none).
// Shared here (not in the widget) so any future host (e.g. a detail panel)
// can also toggle edit mode without a circular import.

export const [editingId, setEditingId] = createState<string | null>(null)

// ── Pending-delete UI state ───────────────────────────────────────────────────
//
// Tracks which task row is waiting for a secondary confirm-delete action.
// When set, a red trash icon button appears inside that row.
// Mutually exclusive with editingId — setting one clears the other at call sites.

export const [pendingDeleteId, setPendingDeleteId] = createState<string | null>(null)

// ── addTask ───────────────────────────────────────────────────────────────────
//
// Prepend a new task to the reactive store from a ParsedTask returned by
// parseQuickAdd(). Uses a module counter so IDs are stable and deterministic
// (avoids Date.now()/Math.random() which vary across runs and tests).

let _id = 1000

/**
 * Update an existing task by id. Merges only the supplied fields.
 * Uses .peek() to avoid a reactive dependency inside the updater.
 */
export function updateTask(id: string, fields: Partial<CalTask>): void {
  setTasks(tasks.peek().map(t => t.id === id ? { ...t, ...fields } : t))
}

/**
 * Delete a task by id (immediate — no undo).
 * TODO: confirm/undo for destructive delete (deferred per "por ahora").
 */
export function deleteTask(id: string): void {
  setTasks(tasks.peek().filter(t => t.id !== id))
}

export function addTask(p: ParsedTask): void {
  const newTask: CalTask = {
    id:       `t${++_id}`,
    title:    p.title,
    project:  p.project,
    dueLabel: p.dueLabel,
    dueISO:   p.dueISO,
    done:     false,
  }
  setTasks([newTask, ...tasks.peek()])
}
