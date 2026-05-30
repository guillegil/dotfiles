// widget/CalendarTasks.tsx — "TASKS DUE" section for the CalendarPopover
//
// Self-contained, not yet wired into CalendarPopover assembly (next delegation).
// Reads from lib/calendar-tasks.ts reactive store; toggling a checkbox updates
// the store immediately (mock; replace toggleTask for a real Todoist source).
//
// Strikethrough for done titles: Pango markup <s>…</s> via label.set_use_markup(true)
// set in the $ setter. GTK4 CSS text-decoration:line-through is listed as supported
// but is unreliable across GTK 4.x — Pango markup is the authoritative path.
// Source: gtk4-css-unsupported.md + design prompt instruction.

import GLib from "gi://GLib"
import Gdk from "gi://Gdk"
import Pango from "gi://Pango"
import { Gtk } from "ags/gtk4"
import { createComputed, createState, For } from "ags"
import {
  tasks, toggleTask, adding, setAdding, addTask,
  editingId, setEditingId, updateTask, deleteTask,
  pendingDeleteId, setPendingDeleteId,
  type CalTask,
} from "../lib/calendar-tasks"
import { parseQuickAdd } from "../lib/task-parse"

// Re-entrancy guard for commitEdit (module-level so it spans all rows): a
// focus-leave commit runs updateTask → setTasks → <For> re-render, which can
// destroy/re-focus entries and fire MORE "leave" events synchronously. Without
// this guard those nested commits re-enter and cascade, pegging the CPU.
let committingEdit = false

// The currently-open inline editor (one at a time) + a commit thunk for it.
// Registered on the entry's "map" and cleared on "unmap" (see TaskRow).
let activeEditEntry:  Gtk.Entry | null = null
let activeEditCommit: (() => void) | null = null

function isWithin(w: Gtk.Widget | null, ancestor: Gtk.Widget): boolean {
  let cur: Gtk.Widget | null = w
  while (cur) { if (cur === ancestor) return true; cur = cur.get_parent() }
  return false
}
function hasAncestorClass(w: Gtk.Widget | null, cls: string): boolean {
  let cur: Gtk.Widget | null = w
  while (cur) { if (cur.has_css_class(cls)) return true; cur = cur.get_parent() }
  return false
}

// Called by the calendar-root click handler (Clock.tsx) with the picked widget
// at the click point. Single source of truth for "clicked outside" behavior:
//   • editing + click outside the entry  → commit the edit (exit edit mode)
//   • pending-delete + click outside its trash → cancel the pending delete
// pick()-based so it never races the entry's typing or the trash's own click.
export function handleCalendarOutsideClick(picked: Gtk.Widget | null): void {
  if (editingId.peek() !== null && activeEditEntry && !isWithin(picked, activeEditEntry)) {
    activeEditCommit?.()
  }
  if (pendingDeleteId.peek() !== null && !hasAncestorClass(picked, "cal-task-trash")) {
    setPendingDeleteId(null)
  }
}

// ── QuickAddRow ───────────────────────────────────────────────────────────────
//
// Inline quick-add entry that appears at the top of the tasks list when
// adding() is true. Pressing Enter commits the task; Esc cancels.
// A live preview label below the entry shows the parsed project + dueLabel
// as the user types (updated on notify::text).

function QuickAddRow() {
  // Local reactive state for the live preview text
  const [preview, setPreview] = createState("→ Inbox")

  // Entry ref so we can call grab_focus() when the row becomes visible
  let entry: Gtk.Entry | null = null

  // Update preview from current entry text
  function updatePreview(text: string) {
    if (!text.trim()) {
      setPreview("→ Inbox")
      return
    }
    const parsed = parseQuickAdd(text)
    const parts: string[] = [`→ #${parsed.project}`]
    if (parsed.dueLabel) parts.push(parsed.dueLabel)
    setPreview(parts.join(" · "))
  }

  function cancel() {
    if (entry) entry.set_text("")
    setPreview("→ Inbox")
    setAdding(false)
  }

  return (
    <box
      cssClasses={["cal-add-row"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={2}
      visible={adding}
    >
      {/* Text entry — autofocused when revealed */}
      <entry
        cssClasses={["cal-add-entry"]}
        placeholderText={`Task — e.g. "Review PR tomorrow 3pm #work"`}
        hexpand={true}
        $={(self) => {
          entry = self as Gtk.Entry

          // Accessible label for screen readers
          self.update_property(
            [Gtk.AccessibleProperty.LABEL],
            ["New task quick add"],
          )

          // Live preview: update on every keystroke via notify::text
          self.connect("notify::text", () => {
            updatePreview((self as Gtk.Entry).get_text())
          })

          // Autofocus when the entry is SHOWN (visible={adding} flips true → the
          // widget maps). Using the "map" signal — not adding.subscribe — because
          // a subscribe can fire before the widget is actually mapped, making
          // grab_focus() a silent no-op.
          self.connect("map", () => {
            ;(self as Gtk.Entry).grab_focus()
          })

          // Key controller: Enter commits, Esc cancels.
          // Both handled here so the entry's native "activate" signal is bypassed —
          // this is the same pattern as Launcher.tsx (verified working).
          const keyCtrl = new Gtk.EventControllerKey()
          keyCtrl.connect("key-pressed", (_c: Gtk.EventControllerKey, keyval: number) => {
            if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
              const text = (self as Gtk.Entry).get_text()
              if (text.trim()) {
                addTask(parseQuickAdd(text))
              }
              ;(self as Gtk.Entry).set_text("")
              setPreview("→ Inbox")
              setAdding(false)
              return true
            }
            if (keyval === Gdk.KEY_Escape) {
              cancel()
              return true
            }
            return false
          })
          self.add_controller(keyCtrl)

          // "activate" = Enter on a Gtk.Entry (the reliable, idiomatic signal;
          // a bubble-phase key controller can miss Enter because the entry
          // consumes it natively first).
          self.connect("activate", () => {
            const text = (self as Gtk.Entry).get_text()
            if (text.trim()) addTask(parseQuickAdd(text))
            ;(self as Gtk.Entry).set_text("")
            setPreview("→ Inbox")
            setAdding(false)
          })
        }}
      />

      {/* Live preview label — dim, shows parsed project + dueLabel */}
      <label
        cssClasses={["cal-add-preview"]}
        label={preview}
        halign={Gtk.Align.START}
        ellipsize={Pango.EllipsizeMode.END}
      />
    </box>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
//
// Renders ONE of two states depending on whether this task is being edited:
//   • Normal state  — checkbox + title + meta + gesture controllers
//   • Edit state    — inline <entry> pre-filled with re-parseable text
//
// Gesture strategy:
//   • Double-click (primary button, n_press === 2) on the row box → enter edit mode.
//   • Right-click (secondary button) on the row box → popup a Gtk.Popover context menu.
//   • Both controllers are attached to the ROW BOX, NOT the checkbox button, so
//     the checkbox's own click (toggleTask) is unaffected.
//
// Context menu (right-click):
//   Built imperatively once per row (Gtk.Popover has no JSX intrinsic in gnim).
//   "Edit" → setEditingId(t.id).
//   "Delete" → deleteTask(t.id) immediately.
//   TODO: confirm/undo for destructive delete (deferred per "por ahora").
//
// Edit state (editingId() === t.id):
//   Inline <entry> pre-filled with title + #project (due is preserved via merge).
//   Enter: parse → merge due fields → updateTask → exit edit.
//   Esc: setEditingId(null) — cancel with no change.

function TaskRow({ task: t }: { task: CalTask }) {
  // Title with Pango markup: when done, wrap in <s>…</s> for strikethrough.
  const titleMarkup = createComputed(() => {
    const escaped = GLib.markup_escape_text(t.title, -1)
    return t.done ? `<s>${escaped}</s>` : escaped
  })

  // Whether THIS row is currently being edited.
  const isEditing = createComputed(() => editingId() === t.id)

  // Whether THIS row is showing the pending-delete trash confirm button.
  const isPendingDelete = createComputed(() => pendingDeleteId() === t.id)

  // ── Context menu (built once per row) ─────────────────────────────────────
  // The popover must be created imperatively and parented to the row widget.
  // We store a ref in a closure variable populated by the $ setter below.
  let popover: Gtk.Popover | null = null

  // ── Shared commit logic (Enter handler AND focus-leave handler) ───────────
  // Extracted so both paths use identical merge logic.
  function commitEdit(entry: Gtk.Entry): void {
    if (committingEdit) return   // re-entrancy guard — stops the focus cascade
    committingEdit = true
    try {
      const text = entry.get_text().trim()
      if (text) {
        const p = parseQuickAdd(text)
        // MERGE: if the parse found no due info, keep the task's existing due.
        const hasParsedDue = p.dueISO !== null || p.dueLabel !== ""
        updateTask(t.id, {
          title:    p.title,
          project:  p.project,
          dueLabel: hasParsedDue ? p.dueLabel : t.dueLabel,
          dueISO:   hasParsedDue ? p.dueISO   : t.dueISO,
        })
      }
      setEditingId(null)
    } finally {
      committingEdit = false
    }
  }

  // ── Normal-state row ──────────────────────────────────────────────────────
  const normalRow = (
    <box
      cssClasses={["cal-task-row"]}
      spacing={8}
      visible={isEditing.as(e => !e)}
      $={(self) => {
        // ── Build the right-click popover (once, parented to this box) ──────
        const menuBox = new Gtk.Box()
        menuBox.set_orientation(Gtk.Orientation.VERTICAL)
        menuBox.set_css_classes(["cal-task-menu"])

        const editBtn = new Gtk.Button({ label: "Edit" })
        editBtn.set_css_classes(["cal-task-menu-item"])
        editBtn.set_halign(Gtk.Align.FILL)
        editBtn.connect("clicked", () => {
          popover?.popdown()
          // Mutual exclusion: entering edit mode clears pending-delete.
          setPendingDeleteId(null)
          setEditingId(t.id)
        })

        const deleteBtn = new Gtk.Button({ label: "Delete" })
        // Two-step confirm: sets pendingDeleteId instead of calling deleteTask.
        deleteBtn.set_css_classes(["cal-task-menu-item", "danger"])
        deleteBtn.set_halign(Gtk.Align.FILL)
        deleteBtn.connect("clicked", () => {
          popover?.popdown()
          // Mutual exclusion: showing pending-delete clears any active edit.
          setEditingId(null)
          setPendingDeleteId(t.id)
        })

        menuBox.append(editBtn)
        menuBox.append(deleteBtn)

        const pop = new Gtk.Popover()
        pop.set_child(menuBox)
        pop.set_parent(self as Gtk.Widget)
        pop.set_has_arrow(true)
        pop.set_css_classes(["cal-task-menu-popover"])
        popover = pop

        // ── Double-click gesture (primary button, left click) ────────────
        const dblClick = new Gtk.GestureClick()
        dblClick.set_button(1)  // Gdk.BUTTON_PRIMARY = 1
        dblClick.connect("pressed", (_g: Gtk.GestureClick, n_press: number) => {
          if (n_press === 2) {
            // Mutual exclusion: entering edit mode clears pending-delete.
            setPendingDeleteId(null)
            setEditingId(t.id)
          }
          // Single clicks fall through — the checkbox child handles its own click.
        })
        ;(self as Gtk.Widget).add_controller(dblClick)

        // NOTE: pending-delete is cancelled by the calendar-root outside-click
        // handler (handleCalendarOutsideClick) — NOT by a row-level gesture. A
        // per-row click handler raced the trash button's own click (it cleared
        // pendingDelete on press, hiding the trash before its click completed),
        // so the delete never fired. The root handler skips the trash via pick().

        // ── Right-click gesture (secondary button) ────────────────────────
        // NOTE: Gdk.Rectangle (a C struct) is not a GObject — construction via
        // `new Gdk.Rectangle()` may be unreliable in GJS. We skip set_pointing_to
        // and let GTK position the popover relative to the parent widget instead
        // (same approach as Volume.tsx). The popover already has set_has_arrow(true)
        // so it renders close to the row.
        const rightClick = new Gtk.GestureClick()
        rightClick.set_button(3)  // Gdk.BUTTON_SECONDARY = 3
        rightClick.connect("pressed", (_g: Gtk.GestureClick, _n: number, _x: number, _y: number) => {
          popover?.popup()
        })
        ;(self as Gtk.Widget).add_controller(rightClick)
      }}
    >
      {/* Checkbox button — filled green square with glyph when done */}
      <button
        cssClasses={createComputed(() =>
          t.done ? ["cal-task-check", "checked"] : ["cal-task-check"]
        )}
        hasFrame={false}
        onClicked={() => toggleTask(t.id)}
        valign={Gtk.Align.CENTER}
      >
        {/* Nerd Font check glyph (U+F00C).
            Visible only when done — hidden when unchecked to show the empty border. */}
        <label
          cssClasses={["cal-task-check-glyph"]}
          label=""
          visible={createComputed(() => t.done)}
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
        />
      </button>

      {/* Title — Pango markup for strikethrough on done items. */}
      <label
        cssClasses={createComputed(() =>
          t.done ? ["cal-task-title", "done"] : ["cal-task-title"]
        )}
        label={titleMarkup}
        hexpand={true}
        halign={Gtk.Align.START}
        valign={Gtk.Align.CENTER}
        ellipsize={Pango.EllipsizeMode.END}
        $={(self) => { self.set_use_markup(true) }}
      />

      {/* Meta — "Project · dueLabel" (hidden when trash confirm is showing) */}
      <label
        cssClasses={["cal-task-meta"]}
        label={`${t.project} · ${t.dueLabel}`}
        halign={Gtk.Align.END}
        valign={Gtk.Align.CENTER}
        visible={isPendingDelete.as(p => !p)}
      />

      {/* Pending-delete confirm: red trash icon button on the RIGHT of the row.
          Appears only when pendingDeleteId() === t.id.
          Clicking it performs the actual delete (confirmed).
          Clicking the row body (rowClick above) cancels. */}
      <button
        cssClasses={["cal-task-trash"]}
        hasFrame={false}
        visible={isPendingDelete}
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.END}
        onClicked={() => {
          deleteTask(t.id)
          setPendingDeleteId(null)
        }}
      >
        {/* Nerd Font trash glyph (nf-fa-trash, U+F1F8). Written as a \u escape:
            the raw PUA character gets stripped when the file is edited. */}
        <label label={""} />
      </button>
    </box>
  )

  // ── Edit-state row ────────────────────────────────────────────────────────
  // Pre-fill: title + optional " #project" (title-only; due is NOT reconstructed
  // into text — preserved via the merge logic in commitEdit() below).
  const prefillText = t.title + (t.project && t.project !== "Inbox" ? ` #${t.project}` : "")

  const editRow = (
    <entry
      cssClasses={["cal-add-entry", "cal-edit-entry"]}
      text={prefillText}
      hexpand={true}
      visible={isEditing}
      $={(self) => {
        const entry = self as Gtk.Entry

        // Accessible label for screen readers
        entry.update_property([Gtk.AccessibleProperty.LABEL], ["Edit task"])

        // Autofocus + register this entry as the ACTIVE editor when shown. The
        // "map" signal (fires when visible flips true) is bound to the widget
        // lifecycle — no leaking manual `.subscribe`. The module-level refs let
        // the calendar-root outside-click handler commit THIS edit when the user
        // clicks anywhere outside the entry (focus-leave does NOT fire for clicks
        // on non-focusable areas like the grid or another task — hence this).
        entry.connect("map", () => {
          entry.set_text(prefillText)
          entry.grab_focus()
          activeEditEntry  = entry
          activeEditCommit = () => commitEdit(entry)
        })
        entry.connect("unmap", () => {
          if (activeEditEntry === entry) { activeEditEntry = null; activeEditCommit = null }
        })

        // Key controller for Enter (commit) and Esc (cancel).
        // CAPTURE phase so Enter is intercepted before Gtk.Entry's native "activate".
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        keyCtrl.connect("key-pressed", (_c: Gtk.EventControllerKey, keyval: number) => {
          if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
            commitEdit(entry)   // save
            return true
          }
          if (keyval === Gdk.KEY_Escape) {
            setEditingId(null)  // cancel, no save
            return true
          }
          return false
        })
        entry.add_controller(keyCtrl)

        // "activate" is the idiomatic Enter signal for a Gtk.Entry — reliable
        // fallback in case the CAPTURE key controller above doesn't intercept it.
        entry.connect("activate", () => commitEdit(entry))
      }}
    />
  )

  // Wrap both states in a container box so <For> sees a single root widget.
  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      {normalRow}
      {editRow}
    </box>
  )
}

// ── TasksDue (section root) ───────────────────────────────────────────────────

export default function TasksDue() {
  // Visibility accessors for empty state
  const isEmpty    = createComputed(() => tasks().length === 0)
  const isNotEmpty = createComputed(() => tasks().length > 0)

  // Reactive count of NOT-done tasks for the header label
  const pendingCount = createComputed(() => tasks().filter(t => !t.done).length)

  return (
    <box cssClasses={["cal-tasks"]} orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      {/* Section header row: "TASKS DUE" left, "• Todoist · N" right */}
      <centerbox cssClasses={["cal-tasks-header-row"]}>
        <label
          $type="start"
          cssClasses={["cal-tasks-header"]}
          label="TASKS DUE"
          halign={Gtk.Align.START}
        />
        <label
          $type="end"
          cssClasses={["cal-todoist-label"]}
          label={pendingCount.as(n => `• Todoist · ${n}`)}
          halign={Gtk.Align.END}
        />
      </centerbox>

      {/* Inline quick-add row — visible only when adding() is true */}
      <QuickAddRow />

      {/* Empty state */}
      <label
        cssClasses={["cal-tasks-empty"]}
        label="No tasks due"
        halign={Gtk.Align.CENTER}
        visible={isEmpty}
      />

      {/* Task list — <For> is mandatory here; .map() on an Accessor renders "Accessor{}" */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={2}
        visible={isNotEmpty}
      >
        <For each={tasks}>
          {(t: CalTask) => <TaskRow task={t} />}
        </For>
      </box>
    </box>
  )
}
