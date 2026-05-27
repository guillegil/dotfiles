// BarShell.tsx — Pillbox edge-to-edge glass container (REQ-BS-01, REQ-BS-02; ADR-3)
// Single full-width window per monitor, anchored TOP|LEFT|RIGHT, exclusive.
// NO border-radius, NO box-shadow, NO backdrop-filter — Pillbox is edge-to-edge.

import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"

type Props = {
  gdkmonitor: Gdk.Monitor
  children: JSX.Element
}

export default function BarShell({ gdkmonitor, children }: Props) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name="bar"
      cssClasses={["bar-shell"]}
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      {children}
    </window>
  )
}
