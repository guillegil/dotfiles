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
import { createState, For } from "ags"
import Apps from "gi://AstalApps"

export default function Launcher() {
  const apps = new Apps.Apps()
  const [query, setQuery] = createState("")
  // Pair each Application with its index so we can mark the first row
  // selected without doing per-render lookups inside <For>.
  const results = query(q => {
    const list = q ? apps.fuzzy_query(q).slice(0, 8) : []
    return list.map((a, i) => ({ a, first: i === 0 }))
  })

  function launch(a: Apps.Application) {
    a.launch()
    app.toggle_window("launcher")
    setQuery("")
  }

  const anchorAll =
    Astal.WindowAnchor.TOP |
    Astal.WindowAnchor.BOTTOM |
    Astal.WindowAnchor.LEFT |
    Astal.WindowAnchor.RIGHT

  return (
    <window
      name="launcher"
      cssClasses={["Launcher"]}
      visible={false}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={anchorAll}
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
      {/* Full-screen scrim — clicks outside the card close the launcher. */}
      <box
        cssClasses={["launcher-scrim"]}
        hexpand={true}
        vexpand={true}
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
        $={(self) => {
          const close = new Gtk.GestureClick()
          close.connect("released", () => app.toggle_window("launcher"))
          self.add_controller(close)
        }}
      >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["launcher-card"]}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.START}
        marginTop={88}
        $={(self) => {
          // Card consumes clicks so the scrim's release handler does not
          // fire when the user clicks padding / non-interactive areas of
          // the card itself.
          const claim = new Gtk.GestureClick()
          claim.connect("pressed", (g) => {
            g.set_state(Gtk.EventSequenceState.CLAIMED)
          })
          self.add_controller(claim)
        }}
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
              if (r[0]) launch(r[0].a)
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
          <For each={results}>
            {({ a, first }) => (
              <button
                cssClasses={first ? ["app-item", "selected"] : ["app-item"]}
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
            )}
          </For>
        </box>

        {/* ── Footer hints ───────────────────────────────────────── */}
        <box cssClasses={["launcher-footer"]} spacing={14}>
          <KbdHint k="↑↓" hint="nav" />
          <KbdHint k="↵" hint="launch" />
          <KbdHint k="esc" hint="close" />
        </box>
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
