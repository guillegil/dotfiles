// Mic.tsx — microphone state indicator (REQ-MC-01..03)
// Restyle: all colors via SCSS token vars (var(--red), var(--dim), var(--text)).
// Logic: unchanged from original. A11y: accessible-name + role added (Slice B).

import { createBinding, createComputed } from "ags"
import { createPoll } from "ags/time"
import Wp from "gi://AstalWp"
import { Gtk } from "ags/gtk4"

export default function Mic() {
  const wp = Wp.get_default()!
  const mic = wp.audio.defaultMicrophone

  // State bindings — logic unchanged (REQ-MC-02)
  const muted = createBinding(mic, "mute")
  const streams = createPoll(0, 1500, "pw-dump", out =>
    (out.match(/Stream\/Input\/Audio/g) || []).length)

  const state = createComputed([muted, streams], (m, s) =>
    m ? "muted" : s > 0 ? "in-use" : "idle")

  return (
    <button
      cssClasses={state.as(s => ["mic", s])}
      onClicked={() => mic.set_mute(!mic.get_mute())}
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-MC-01: accessible-name reflects state
        state.subscribe(s => {
          self.update_property(
            [Gtk.AccessibleProperty.LABEL],
            [s === "muted" ? "Microphone muted" : s === "in-use" ? "Microphone active" : "Microphone idle"],
          )
        })
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Microphone"],
        )
      }}
    >
      {/* REQ-MC-03: icon shape differs per state (not color alone) */}
      <overlay>
        <image
          iconName={state.as(s =>
            s === "muted"
              ? "microphone-disabled-symbolic"
              : "audio-input-microphone-symbolic")}
          valign={Gtk.Align.CENTER}
        />
        <box
          $type="overlay"
          cssClasses={state.as(s => s === "in-use" ? ["dot", "show"] : ["dot"])}
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        />
      </overlay>
    </button>
  )
}
