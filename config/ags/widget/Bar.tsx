// Bar.tsx — Pillbox edge-to-edge bar (REQ-BS-01..05; ADR-7)
// Single BarShell per monitor, full monitor width. GTK CenterBox provides
// the three sections (left / center / right) = space-between distribution.
// Left:   [Workspaces | LauncherPill | ActiveWindow]  (Slice A + B)
// Center: [Clock]                                     (Slice B)
// Right:  [Mic] + placeholders for Volume, Battery, Network, Bell (Slice C/D)

import { Gtk, Gdk } from "ags/gtk4"
import BarShell from "./BarShell"
import Workspaces from "./Workspaces"
import Mic from "./Mic"
import ActiveWindow from "./ActiveWindow"
import LauncherPill from "./LauncherPill"
import Clock from "./Clock"
import Volume from "./Volume"
import Battery from "./Battery"
import Network from "./Network"
import NotificationsBell from "./NotificationsBell"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  return (
    <BarShell gdkmonitor={gdkmonitor}>
      <centerbox hexpand cssClasses={["bar-inner"]}>
        {/* Left section — start child */}
        <box $type="start" cssClasses={["bar-section"]} spacing={4}>
          <LauncherPill />
          <Workspaces />
          <ActiveWindow />
        </box>

        {/* Center section — center child (REQ-CL-01..04) */}
        <box $type="center" cssClasses={["bar-section"]} spacing={4}>
          <Clock />
        </box>

        {/* Right section — end child */}
        <box $type="end" cssClasses={["bar-section"]} spacing={4}>
          <Mic />
          <Volume />
          <Network />
          <Battery />
          <NotificationsBell />
        </box>
      </centerbox>
    </BarShell>
  )
}
