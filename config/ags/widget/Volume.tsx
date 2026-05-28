// Volume.tsx — speaker volume indicator (REQ-VO-01..04)
// AstalWp defaultSpeaker: volume (0..1) + mute. Scroll adjusts ±5% clamped;
// click toggles mute. Icon + color reflect mute/level state.
// Property names verified against AstalWp-0.1.gir (volume, mute, volume-icon).

import { createBinding, createComputed } from "ags"
import Wp from "gi://AstalWp"
import { Gtk } from "ags/gtk4"

const STEP = 0.05

export default function Volume() {
  const wp = Wp.get_default()!
  const speaker = wp.audio.defaultSpeaker

  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")

  const pct = volume.as(v => `${Math.round(v * 100)}%`)
  const state = createComputed([mute, volume], (m, v) =>
    m ? "muted" : v > 0.5 ? "high" : v > 0 ? "low" : "zero")

  const iconName = createComputed([mute, volume], (m, v) =>
    m || v === 0
      ? "audio-volume-muted-symbolic"
      : v > 0.5
        ? "audio-volume-high-symbolic"
        : "audio-volume-low-symbolic")

  return (
    <button
      cssClasses={state.as(s => ["volume", "w", s])}
      onClicked={() => speaker.set_mute(!speaker.get_mute())}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-VO-02: scroll adjusts volume ±5% clamped to [0, 1]
        const scroll = new Gtk.EventControllerScroll()
        scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
        scroll.connect("scroll", (_c, _dx, dy) => {
          const cur = speaker.get_volume()
          const next = Math.max(0, Math.min(1, cur + (dy < 0 ? STEP : -STEP)))
          speaker.set_volume(next)
          return true
        })
        self.add_controller(scroll)

        // REQ-VO-04: accessible-name reflects level + mute
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
      <box spacing={4} valign={Gtk.Align.CENTER}>
        <image iconName={iconName} valign={Gtk.Align.CENTER} />
        {/* Hide the percentage when muted — icon alone signals the state. */}
        <label
          cssClasses={["tabular"]}
          label={pct}
          visible={mute.as(m => !m)}
          valign={Gtk.Align.CENTER}
        />
      </box>
    </button>
  )
}
