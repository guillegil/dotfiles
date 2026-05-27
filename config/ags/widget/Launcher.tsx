// Launcher.tsx — app launcher overlay (REQ-LR-01..03)
// Restyle: all colors via SCSS token vars (--bg2, --bg3, --text, --dim, --accent).
// Radius: --radius-hero on .launcher-box card, --radius-inner on .app-item rows.
// Logic: UNCHANGED from original (REQ-LR-02).

import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createState } from "ags"
import Apps from "gi://AstalApps"

export default function Launcher() {
  const apps = new Apps.Apps()
  const [query, setQuery] = createState("")
  const results = query(q => q ? apps.fuzzy_query(q).slice(0, 8) : [])

  function launch(a: Apps.Application) {
    a.launch()
    app.toggle_window("launcher")
    setQuery("")
  }

  return (
    <window
      name="launcher"
      cssClasses={["Launcher"]}
      visible={false}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={Astal.WindowAnchor.TOP}
      application={app}
      $={self => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) app.toggle_window("launcher")
          return false
        })
        self.add_controller(controller)
        // REQ-LR-01: a11y — dialog role for the launcher window
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Application launcher"],
        )
      }}
    >
      {/* REQ-LR-01: token-driven styling via .launcher-box in _widgets.scss */}
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["launcher-box"]}>
        <entry
          placeholderText="Search apps…"
          onNotifyText={self => setQuery(self.text)}
          onActivate={() => {
            const r = results.get()
            if (r[0]) launch(r[0])
          }}
        />
        <box orientation={Gtk.Orientation.VERTICAL}>
          {results(list =>
            list.map(a => (
              // REQ-LR-03: --radius-inner on result rows via .app-item in _widgets.scss
              <button cssClasses={["app-item"]} onClicked={() => launch(a)}>
                <box>
                  <image iconName={a.iconName} />
                  <label label={a.name} />
                </box>
              </button>
            ))
          )}
        </box>
      </box>
    </window>
  )
}
