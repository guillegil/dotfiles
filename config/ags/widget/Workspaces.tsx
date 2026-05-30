// Workspaces.tsx — number-pill workspace switcher (workspaces-redesign)
//
// Declarative <For> row of number buttons + a sliding bar underneath:
//   .workspaces (vertical pill)
//     .ws-row    — horizontal row of .ws-num buttons (state via class)
//     .ws-bar    — thin green bar; .ws-bar-{idx} translateX slides it under
//                  the focused number (CSS transition, no JS animation).
//
// State classes (mutually exclusive, focused wins):
//   .ws-focused  active ws → accent number + the bar underneath
//   .ws-occupied has windows → --text
//   .ws-empty    no windows → --dim
//   .ws-urgent   urgent window → a pink dot above the number
//
// <For> re-renders an item button (with fresh cssClasses) whenever its state
// changes — this is the proven reactive pattern (the prior imperative rebuild
// did not reflect state changes). Scroll cycles; click focuses.

import { createBinding, createComputed, For } from "ags"
import { Gtk } from "ags/gtk4"
import hyprland from "../service/hyprland"

type WorkspaceItem = {
  id:       number
  focused:  boolean
  occupied: boolean
  urgent:   boolean
}

export default function Workspaces() {
  const workspaces = createBinding(hyprland, "workspaces")
  const active     = createBinding(hyprland, "activeWorkspace")
  const occupied   = createBinding(hyprland, "occupied")
  const urgentIds  = createBinding(hyprland, "urgent")

  // Fixed range 1..5 ∪ reported workspaces ∪ active, sorted, with per-id state.
  const items = createComputed(
    [workspaces, active, occupied, urgentIds],
    (ids, activeId, occ, urg): WorkspaceItem[] => {
      const safeIds = Array.isArray(ids) ? ids : []
      const safeOcc = Array.isArray(occ) ? occ : []
      const safeUrg = Array.isArray(urg) ? urg : []
      const set = new Set<number>([1, 2, 3, 4, 5, ...safeIds])
      if (typeof activeId === "number" && activeId > 0) set.add(activeId)
      return Array.from(set)
        .sort((a, b) => a - b)
        .map(id => ({
          id,
          focused:  id === activeId,
          occupied: safeOcc.includes(id),
          urgent:   safeUrg.includes(id),
        }))
    },
  )

  // Slot index of the focused workspace → drives the sliding-bar class.
  const focusedIdx = createComputed([items], (list): number => {
    const idx = Array.isArray(list) ? list.findIndex(i => i.focused) : -1
    return idx >= 0 ? idx : 0
  })

  return (
    <box
      cssClasses={["workspaces"]}
      orientation={Gtk.Orientation.VERTICAL}
      valign={Gtk.Align.CENTER}
      accessibleRole={Gtk.AccessibleRole.GROUP}
      $={(self) => {
        self.update_property([Gtk.AccessibleProperty.LABEL], ["Workspaces"])
        const scroll = new Gtk.EventControllerScroll()
        scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
        scroll.connect("scroll", (_c, _dx, dy) => {
          hyprland.focusWorkspace(dy < 0 ? "e-1" : "e+1")
          return true
        })
        self.add_controller(scroll)
      }}
    >
      {/* Row of number buttons */}
      <box cssClasses={["ws-row"]} orientation={Gtk.Orientation.HORIZONTAL} halign={Gtk.Align.START}>
        <For each={items}>
          {(item: WorkspaceItem) => (
            <button
              cssClasses={
                item.focused
                  ? ["ws-num", "ws-focused"]
                  : item.occupied
                    ? ["ws-num", "ws-occupied"]
                    : ["ws-num", "ws-empty"]
              }
              hasFrame={false}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              onClicked={() => hyprland.focusWorkspace(item.id)}
              accessibleRole={Gtk.AccessibleRole.BUTTON}
              $={(self) =>
                self.update_property([Gtk.AccessibleProperty.LABEL], [`Workspace ${item.id}`])}
            >
              {/* Number centered; urgent dot pinned to its top-right corner via
                  an overlay (a badge) — doesn't shift the number. */}
              <overlay>
                <label label={String(item.id)} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
                {item.urgent
                  ? <box cssClasses={["ws-urgent-dot"]} $type="overlay" halign={Gtk.Align.END} valign={Gtk.Align.START} />
                  : null}
              </overlay>
            </button>
          )}
        </For>
      </box>

      {/* Sliding bar — its .ws-bar-{idx} class translateX-slides it (CSS transition). */}
      <box cssClasses={focusedIdx.as(idx => ["ws-bar", `ws-bar-${idx}`])} halign={Gtk.Align.START} />
    </box>
  )
}
