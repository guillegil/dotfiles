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
      class="Launcher"
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
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssName="launcher-box">
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
              <button cssName="app-item" onClicked={() => launch(a)}>
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
