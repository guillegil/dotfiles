// Battery.tsx — battery indicator (REQ-BA-01..04)
// AstalBattery display device: percentage (0..1) + charging. Color thresholds
// >50% green, >20% yellow, else red. Hidden entirely on desktops (isBattery
// false). Property names verified against AstalBattery-0.1.gir
// (percentage, charging, is-battery, battery-icon-name).

import { createBinding, createComputed } from "ags"
import AstalBattery from "gi://AstalBattery"
import { Gtk } from "ags/gtk4"

export default function Battery() {
  const bat = AstalBattery.get_default()

  const isBattery = createBinding(bat, "isBattery")
  const percentage = createBinding(bat, "percentage")
  const charging = createBinding(bat, "charging")
  const iconName = createBinding(bat, "batteryIconName")

  const pct = percentage.as(p => `${Math.round(p * 100)}%`)
  // REQ-BA-02: color by threshold
  const level = percentage.as(p => p > 0.5 ? "high" : p > 0.2 ? "mid" : "low")
  const cssClasses = createComputed([level, charging], (l, c) =>
    c ? ["battery", "w", l, "charging"] : ["battery", "w", l])

  return (
    <box
      // REQ-BA-03: hide on desktop (no battery device)
      visible={isBattery}
      cssClasses={cssClasses}
      accessibleRole={Gtk.AccessibleRole.GROUP}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-BA-04: accessible-name reflects level + charge state
        const update = () => self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          [`Battery ${Math.round(bat.get_percentage() * 100)}%, ${bat.get_charging() ? "charging" : "discharging"}`],
        )
        update()
        percentage.subscribe(update)
        charging.subscribe(update)
      }}
    >
      <box spacing={4} valign={Gtk.Align.CENTER}>
        <image iconName={iconName} valign={Gtk.Align.CENTER} />
        <label cssClasses={["tabular"]} label={pct} valign={Gtk.Align.CENTER} />
      </box>
    </box>
  )
}
