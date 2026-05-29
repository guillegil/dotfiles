// VolumeOSD.tsx — centered bottom on-screen display for volume keys (macOS-style)
//
// Triggered ONLY by the hardware volume keys, which call `ags request volume-osd`
// from Hyprland (see config/hypr/hyprland.lua). The widget-scroll popover in
// Volume.tsx handles direct interaction; this is the global key-driven OSD.
//
// Mounted once as a singleton in app.ts. showVolumeOSD() reveals the window and
// resets an auto-hide timer. The progress bar is a Gtk.ProgressBar built
// imperatively (gnim has no <progressbar> intrinsic), bound to the speaker
// volume so it stays correct across rapid key repeats.

import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import { Astal, Gtk } from "ags/gtk4"
import { createBinding, createComputed } from "ags"
import Wp from "gi://AstalWp"

const OSD_MS = 1500
let hideTimer = 0

export default function VolumeOSD() {
  const wp = Wp.get_default()!
  const speaker = wp.audio.defaultSpeaker

  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")

  const iconName = createComputed([mute, volume], (m, v) =>
    m || v === 0
      ? "audio-volume-muted-symbolic"
      : v > 0.66
        ? "audio-volume-high-symbolic"
        : v > 0.33
          ? "audio-volume-medium-symbolic"
          : "audio-volume-low-symbolic")

  return (
    <window
      name="volume-osd"
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM}
      marginBottom={96}
      cssClasses={["volume-osd-window"]}
      application={app}
    >
      <box cssClasses={["volume-osd-card"]} spacing={14} valign={Gtk.Align.CENTER}>
        <image
          iconName={iconName}
          cssClasses={["volume-osd-icon"]}
          valign={Gtk.Align.CENTER}
        />
        <box
          cssClasses={["volume-osd-bar-wrap"]}
          valign={Gtk.Align.CENTER}
          $={(self) => {
            const bar = new Gtk.ProgressBar()
            bar.add_css_class("volume-osd-bar")
            bar.set_hexpand(true)
            bar.set_valign(Gtk.Align.CENTER)
            bar.set_fraction(speaker.get_volume())
            self.append(bar)
            // Keep the fill in sync with the speaker (covers rapid key repeats).
            volume.subscribe(() => bar.set_fraction(speaker.get_volume()))
          }}
        />
      </box>
    </window>
  )
}

// Called by the requestHandler in app.ts when the volume keys fire.
export function showVolumeOSD() {
  const win = app.get_window("volume-osd")
  if (!win) return
  win.set_visible(true)
  if (hideTimer) GLib.source_remove(hideTimer)
  hideTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, OSD_MS, () => {
    app.get_window("volume-osd")?.set_visible(false)
    hideTimer = 0
    return GLib.SOURCE_REMOVE
  })
}
