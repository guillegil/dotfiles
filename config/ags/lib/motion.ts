// lib/motion.ts — reduced-motion gate (REQ-MG-01..03; ADR-4)
// Reads gtk-enable-animations from Gtk.Settings and applies .motion-on/.motion-off
// to every AGS window. Subscribes to the notify signal for runtime updates.

import Gtk from "gi://Gtk?version=4.0"
import app from "ags/gtk4/app"

function applyMotionClass() {
  const settings = Gtk.Settings.get_default()
  if (!settings) return

  const on = settings.gtk_enable_animations
  app.get_windows().forEach(w => {
    w.remove_css_class(on ? "motion-off" : "motion-on")
    w.add_css_class(on ? "motion-on" : "motion-off")
  })
}

export function initMotionGate() {
  const settings = Gtk.Settings.get_default()
  if (!settings) return

  applyMotionClass()
  settings.connect("notify::gtk-enable-animations", applyMotionClass)
  app.connect("window-added", applyMotionClass)
}
