// Volume.tsx — speaker volume indicator (REQ-VO-01..04)
// AstalWp defaultSpeaker: volume (0..1) + mute. Scroll adjusts ±5% clamped;
// click toggles mute. The bar chip shows ONLY a level-based icon (constant
// width, no number). On scroll a transient Gtk.Popover OSD pops up just below
// the chip showing the % and auto-hides after a short delay.
// Property names verified against AstalWp-0.1.gir (volume, mute).

import { createBinding, createComputed } from "ags"
import GLib from "gi://GLib"
import Wp from "gi://AstalWp"
import { Gtk } from "ags/gtk4"

const STEP = 0.05
const OSD_MS = 1200

export default function Volume() {
  const wp = Wp.get_default()!
  const speaker = wp.audio.defaultSpeaker

  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")

  // REQ-VO-03: icon alone conveys level — no number in the bar.
  const iconName = createComputed([mute, volume], (m, v) =>
    m || v === 0
      ? "audio-volume-muted-symbolic"
      : v > 0.66
        ? "audio-volume-high-symbolic"
        : v > 0.33
          ? "audio-volume-medium-symbolic"
          : "audio-volume-low-symbolic")

  let osd: Gtk.Popover
  let osdLabel: Gtk.Label
  let hideTimer = 0

  return (
    <button
      cssClasses={mute.as(m => m ? ["volume", "w", "muted"] : ["volume", "w"])}
      onClicked={() => speaker.set_mute(!speaker.get_mute())}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // Transient OSD — a native popover GTK positions just below the chip.
        // autohide=false so it acts as a passive indicator (no focus grab);
        // we control its lifetime with a timeout instead.
        osd = new Gtk.Popover()
        osd.set_parent(self)
        osd.set_position(Gtk.PositionType.BOTTOM)
        osd.set_autohide(false)
        osd.set_has_arrow(true)
        osd.add_css_class("volume-osd")
        osdLabel = new Gtk.Label({ label: "" })
        osdLabel.add_css_class("tabular")
        osd.set_child(osdLabel)

        // REQ-VO-02: scroll adjusts volume ±5% clamped to [0, 1].
        const scroll = new Gtk.EventControllerScroll()
        scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
        scroll.connect("scroll", (_c, _dx, dy) => {
          const cur = speaker.get_volume()
          const next = Math.max(0, Math.min(1, cur + (dy < 0 ? STEP : -STEP)))
          speaker.set_volume(next)

          // Show the transient % OSD and reset its auto-hide timer.
          osdLabel.set_label(`${Math.round(next * 100)}%`)
          osd.popup()
          if (hideTimer) GLib.source_remove(hideTimer)
          hideTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, OSD_MS, () => {
            osd.popdown()
            hideTimer = 0
            return GLib.SOURCE_REMOVE
          })
          return true
        })
        self.add_controller(scroll)

        // REQ-VO-04: accessible-name reflects level + mute.
        const update = () => self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          [speaker.get_mute()
            ? "Volume muted, click to unmute"
            : `Volume ${Math.round(speaker.get_volume() * 100)}%, click to mute`],
        )
        update()
        mute.subscribe(update)
        volume.subscribe(update)
      }}
    >
      <image iconName={iconName} valign={Gtk.Align.CENTER} />
    </button>
  )
}
