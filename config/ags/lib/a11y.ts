// lib/a11y.ts — accessibility helpers (REQ-A11Y-01..03; ADR-6 caveat)
// setAccessibleName: sets accessible-name imperatively (GTK4 requires property, not attr)
// focusPad: ensures a widget has ≥44px hit area via CSS min-width/height

import { Gtk } from "ags/gtk4"

export function setAccessibleName(widget: Gtk.Widget, name: string) {
  widget.update_property(
    [Gtk.AccessibleProperty.LABEL],
    [name],
  )
}

export function focusPad(widget: Gtk.Widget) {
  const style = widget.get_style_context()
  style.add_class("focus-pad")
  // Inline min-size enforcement — widget must still render within bar height
  widget.set_size_request(44, 44)
}
