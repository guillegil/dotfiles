import { createBinding, createComputed } from "ags"
import { createPoll } from "ags/time"
import Wp from "gi://AstalWp"
import { Gtk } from "ags/gtk4"

export default function Mic() {
  const wp = Wp.get_default()!
  const mic = wp.audio.defaultMicrophone

  const muted = createBinding(mic, "mute")
  const streams = createPoll(0, 1500, "pw-dump", out =>
    (out.match(/Stream\/Input\/Audio/g) || []).length)

  const state = createComputed([muted, streams], (m, s) =>
    m ? "muted" : s > 0 ? "in-use" : "idle")

  return (
    <button
      cssClasses={state.as(s => ["mic", s])}
      onClicked={() => mic.set_mute(!mic.get_mute())}
    >
      <overlay>
        <image
          iconName={state.as(s =>
            s === "muted"
              ? "microphone-disabled-symbolic"
              : "audio-input-microphone-symbolic")} />
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
