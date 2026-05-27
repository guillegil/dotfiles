// Bar.tsx — Pillbox edge-to-edge bar (REQ-BS-01..05; ADR-7)
// Single BarShell per monitor, full monitor width. GTK CenterBox provides
// the three sections (left / center / right) = space-between distribution.
// Left: [Workspaces]. Center: placeholder for Clock (Slice B).
// Right: [Mic] + placeholders for Volume, Battery, Network, NotificationsBell (Slices B/C/D).

import { Gtk, Gdk } from "ags/gtk4"
import BarShell from "./BarShell"
import Workspaces from "./Workspaces"
import Mic from "./Mic"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  return (
    <BarShell gdkmonitor={gdkmonitor}>
      <centerbox hexpand cssClasses={["bar-inner"]}>
        {/* Left section — start child */}
        <box $type="start" cssClasses={["bar-section"]} spacing={4}>
          <Workspaces />
        </box>

        {/* Center section — center child */}
        <box $type="center" cssClasses={["bar-section"]} spacing={4}>
          <label label="-" cssClasses={["w"]} />
        </box>

        {/* Right section — end child */}
        <box $type="end" cssClasses={["bar-section"]} spacing={4}>
          <Mic />
          <label label="vol" cssClasses={["w"]} />
          <label label="bat" cssClasses={["w"]} />
          <label label="net" cssClasses={["w"]} />
          <label label="bell" cssClasses={["w"]} />
        </box>
      </centerbox>
    </BarShell>
  )
}
