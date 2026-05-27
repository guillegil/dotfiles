// Workspaces.tsx — dot/pill morph workspace switcher (REQ-WS-01..04; ADR-9)
// Renders workspace buttons from hyprland.workspaces binding.
// Each button: .ws-target outer hit zone (44px), .ws/.ws.active inner dot/pill.
// Click → hyprland.dispatch("workspace", n). Scroll up/down cycles workspaces.

import { createBinding, createComputed, For } from "ags"
import { Gtk } from "ags/gtk4"
import hyprland from "../service/hyprland"

export default function Workspaces() {
  const workspaces = createBinding(hyprland, "workspaces")
  const active = createBinding(hyprland, "activeWorkspace")
  const items = createComputed(
    [workspaces, active],
    (ids, activeId) => ids.map(id => ({ id, active: id === activeId })),
  )

  return (
    <box
      cssClasses={["workspaces"]}
      accessibleRole={Gtk.AccessibleRole.GROUP}
      $={(self) => {
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Workspaces"],
        )
        const scroll = new Gtk.EventControllerScroll()
        scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
        scroll.connect("scroll", (_c, _dx, dy) => {
          if (dy < 0) {
            hyprland.dispatch("workspace", "e-1")
          } else {
            hyprland.dispatch("workspace", "e+1")
          }
          return true
        })
        self.add_controller(scroll)
      }}
    >
      <For each={items}>
        {({ id, active }) => (
          <button
            cssClasses={["ws-target"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            onClicked={() => hyprland.dispatch("workspace", String(id))}
            accessibleRole={Gtk.AccessibleRole.BUTTON}
            $={(self) => {
              self.update_property(
                [Gtk.AccessibleProperty.LABEL],
                [`Workspace ${id}`],
              )
            }}
          >
            <box cssClasses={active ? ["ws", "active"] : ["ws"]} />
          </button>
        )}
      </For>
    </box>
  )
}
