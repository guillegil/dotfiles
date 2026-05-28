// Launcher.tsx — app launcher overlay (Claude design — Phase 1)
//
// Layout: search row · result rows · footer kbd hints.
// Search results come from AstalApps.fuzzy_query — each row shows the real
// app icon (from .desktop iconName), name and a one-line description.
// Selected style highlights the first row so Enter is unambiguous.
//
// Phase 2 (deferred): app grid, recent commands chips, calculator banner,
// AI gradient button. See design/HANDOFF.md §7 for the full reference.

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
      marginTop={88}
      application={app}
      $={self => {
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) app.toggle_window("launcher")
          return false
        })
        self.add_controller(controller)
        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Application launcher"],
        )
      }}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["launcher-card"]}
      >
        {/* ── Search row ─────────────────────────────────────────── */}
        <box
          cssClasses={["launcher-search"]}
          spacing={12}
        >
          <image
            iconName="system-search-symbolic"
            cssClasses={["search-icon"]}
            valign={Gtk.Align.CENTER}
          />
          <entry
            cssClasses={["launcher-entry"]}
            placeholderText="Search apps…"
            hexpand={true}
            onNotifyText={self => setQuery(self.text)}
            onActivate={() => {
              const r = results.get()
              if (r[0]) launch(r[0])
            }}
            $={self => self.grab_focus()}
          />
          <label
            cssClasses={["kbd"]}
            label="esc"
            valign={Gtk.Align.CENTER}
          />
        </box>

        {/* ── Result rows ────────────────────────────────────────── */}
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["launcher-results"]}
          spacing={2}
        >
          {results(list =>
            list.map((a, i) => (
              <button
                cssClasses={i === 0 ? ["app-item", "selected"] : ["app-item"]}
                onClicked={() => launch(a)}
              >
                <box spacing={12}>
                  <image
                    iconName={a.iconName}
                    cssClasses={["app-tile"]}
                    valign={Gtk.Align.CENTER}
                  />
                  <box
                    orientation={Gtk.Orientation.VERTICAL}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                  >
                    <label
                      cssClasses={["app-name"]}
                      label={a.name}
                      halign={Gtk.Align.START}
                    />
                    <label
                      cssClasses={["app-sub"]}
                      label={a.description ?? a.executable ?? ""}
                      halign={Gtk.Align.START}
                    />
                  </box>
                </box>
              </button>
            ))
          )}
        </box>

        {/* ── Footer hints ───────────────────────────────────────── */}
        <box cssClasses={["launcher-footer"]} spacing={14}>
          <KbdHint k="↑↓" hint="nav" />
          <KbdHint k="↵" hint="launch" />
          <KbdHint k="esc" hint="close" />
        </box>
      </box>
    </window>
  )
}

function KbdHint({ k, hint }: { k: string; hint: string }) {
  return (
    <box spacing={5} valign={Gtk.Align.CENTER}>
      <label cssClasses={["kbd"]} label={k} />
      <label cssClasses={["kbd-hint"]} label={hint} />
    </box>
  )
}
