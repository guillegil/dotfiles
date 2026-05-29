// Launcher.tsx — Spotlight-class app launcher overlay (Slice 1 — Core UX)
//
// State model:
//   query       — entry text
//   selectedIdx — single unified selection cursor (clamped to [0, len-1])
//   results     — fuzzy query results (max 8), derived from query
//   calc        — CalcResult | null, derived from query (always-on auto)
//   recent      — string[] of recent entry IDs, read fresh on each open
//
// Key controller lives on the WINDOW (not the entry) so Up/Down/Enter/Esc are
// intercepted before the entry receives them. Printable keys return false so
// typing flows into the entry normally.
//
// Slice 2 (app grid) will extend this file; Slice 1 ships and smoke-tests first.

import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createState, createComputed, For } from "ags"
import Apps from "gi://AstalApps"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { evaluate } from "../lib/calc"
import { recordLaunch, getRecent } from "../lib/launcher-history"

// ── Helpers ──────────────────────────────────────────────────────────────────

function KbdHint({ k, hint }: { k: string; hint: string }) {
  return (
    <box spacing={5} valign={Gtk.Align.CENTER}>
      <label cssClasses={["kbd"]} label={k} />
      <label cssClasses={["kbd-hint"]} label={hint} />
    </box>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function Launcher() {
  // ── State ──────────────────────────────────────────────────────────────────

  const apps = new Apps.Apps()
  const [query, setQuery] = createState("")
  const [selectedIdx, setSelectedIdx] = createState(0)

  // results: Apps.Application[] — derived via createComputed (NOT .as(arr => arr.map()))
  // because .as() inside JSX returns "Accessor{}" as text; createComputed returns
  // a proper Accessor<T> that <For> can consume.
  const results = createComputed(() => {
    const q = query()
    return q ? apps.fuzzy_query(q).slice(0, 8) : ([] as Apps.Application[])
  })

  // Single clamping site — subscribed to results so it fires on EVERY query change.
  // ADR-2: one place only; arrow handlers also clamp on move (see key controller).
  results.subscribe(() => {
    const len = results.peek().length
    setSelectedIdx(i => (len === 0 ? 0 : Math.min(i, len - 1)))
  })

  // calc: CalcResult | null — always-on, evaluated per keystroke
  const calc = createComputed(() => evaluate(query()))

  // recent: string[] — state, refreshed from disk on init and after each launch.
  // createComputed would only run once (getRecent has no reactive deps); we use
  // createState + explicit refresh so chips update on the same session's launches.
  const [recent, setRecent] = createState<string[]>(getRecent(8))

  // ── Actions ────────────────────────────────────────────────────────────────

  function closeAndClear() {
    app.toggle_window("launcher")
    setQuery("")
    setSelectedIdx(0)
  }

  function launch(a: Apps.Application) {
    a.launch()
    recordLaunch(a)
    setRecent(getRecent(8))
    closeAndClear()
  }

  function launchInTerminal(a: Apps.Application) {
    const term = GLib.getenv("TERMINAL") || "kitty"
    execAsync([term, "-e", a.executable]).catch(() => {})
    recordLaunch(a)
    setRecent(getRecent(8))
    closeAndClear()
  }

  // ── Anchors ────────────────────────────────────────────────────────────────

  const anchorAll =
    Astal.WindowAnchor.TOP |
    Astal.WindowAnchor.BOTTOM |
    Astal.WindowAnchor.LEFT |
    Astal.WindowAnchor.RIGHT

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <window
      name="launcher"
      cssClasses={["Launcher"]}
      visible={false}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={anchorAll}
      application={app}
      $={self => {
        // Key controller on the WINDOW — intercepts Up/Down/Enter/Esc before
        // the entry sees them; all other keyvals return false (printable keys
        // still reach the entry). ADR-1.
        const controller = new Gtk.EventControllerKey()
        controller.connect("key-pressed", (_c, keyval, _code, state) => {
          const sup = (state & Gdk.ModifierType.SUPER_MASK) !== 0

          switch (keyval) {
            case Gdk.KEY_Escape:
              app.toggle_window("launcher")
              return true

            case Gdk.KEY_Up:
              setSelectedIdx(i => Math.max(i - 1, 0))
              return true

            case Gdk.KEY_Down:
              setSelectedIdx(i => Math.min(i + 1, results.peek().length - 1))
              return true

            case Gdk.KEY_Return:
            case Gdk.KEY_KP_Enter: {
              const r = results.peek()[selectedIdx.peek()]
              if (r) {
                if (sup) launchInTerminal(r)
                else launch(r)
              }
              return true
            }
          }

          // All other keys — let the entry receive them.
          return false
        })
        self.add_controller(controller)

        self.update_property(
          [Gtk.AccessibleProperty.LABEL],
          ["Application launcher"],
        )
      }}
    >
      {/* Full-screen scrim — clicks on empty space close the launcher.
          The pick() test ensures clicks on the card itself are not caught. */}
      <box
        cssClasses={["launcher-scrim"]}
        hexpand={true}
        vexpand={true}
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
        $={self => {
          const close = new Gtk.GestureClick()
          close.connect("pressed", (_g, _n, x, y) => {
            if (self.pick(x, y, Gtk.PickFlags.DEFAULT) === self) {
              app.toggle_window("launcher")
            }
          })
          self.add_controller(close)
        }}
      >
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["launcher-card"]}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.START}
          marginTop={88}
          $={self => {
            // Claim clicks on the card so the scrim handler does not fire
            // when the user clicks non-interactive areas of the card.
            const claim = new Gtk.GestureClick()
            claim.connect("pressed", g => {
              g.set_state(Gtk.EventSequenceState.CLAIMED)
            })
            self.add_controller(claim)
          }}
        >

          {/* ── Search row ─────────────────────────────────────────── */}
          <box cssClasses={["launcher-search"]} spacing={12}>
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
              $={self => self.grab_focus()}
            />
            {/* "N RESULTS" pill — hidden when query is empty (REQ-LR-03) */}
            <label
              cssClasses={["results-pill"]}
              visible={createComputed(() => query().length > 0 && results().length > 0)}
              label={results.as(r => `${r.length} RESULTS`)}
              valign={Gtk.Align.CENTER}
            />
            <label
              cssClasses={["kbd"]}
              label="esc"
              valign={Gtk.Align.CENTER}
            />
          </box>

          {/* ── Calculator banner (REQ-LR-05) ─────────────────────── */}
          {/* Visible only when calc returns non-null. Positioned ABOVE results. */}
          <box
            cssClasses={["calc-banner"]}
            visible={calc.as(c => c !== null)}
            spacing={8}
          >
            <label
              cssClasses={["calc-expr"]}
              label={calc.as(c => c?.expr ?? "")}
              halign={Gtk.Align.START}
            />
            <label label="→" cssClasses={["calc-arrow"]} />
            <label
              cssClasses={["calc-value"]}
              label={calc.as(c => c ? String(c.value) : "")}
            />
            <label
              cssClasses={["calc-label"]}
              label={calc.as(c => c?.label ? `· ${c.label}` : "")}
              visible={calc.as(c => !!c?.label)}
            />
            <box hexpand={true} />
            <button
              cssClasses={["calc-copy"]}
              label="↵ copy"
              accessibleRole={Gtk.AccessibleRole.BUTTON}
              $={self => self.update_property([Gtk.AccessibleProperty.LABEL], ["Copy result"])}
              onClicked={() => {
                const c = calc.peek()
                if (c) execAsync(["wl-copy", String(c.value)]).catch(() => {})
              }}
            />
          </box>

          {/* ── RECENT chips (REQ-LR-06) ──────────────────────────── */}
          <box
            cssClasses={["recent-row"]}
            visible={recent.as(r => r.length > 0)}
            spacing={6}
          >
            <label
              label="RECENT"
              cssClasses={["section-label"]}
              valign={Gtk.Align.CENTER}
            />
            <For each={recent}>
              {(id: string) => {
                const appEntry = apps.list.find((a: Apps.Application) => a.entry === id)
                if (!appEntry) return <box />
                return (
                  <button
                    cssClasses={["recent-chip"]}
                    label={appEntry.name}
                    accessibleRole={Gtk.AccessibleRole.BUTTON}
                    $={self => self.update_property([Gtk.AccessibleProperty.LABEL], [appEntry.name])}
                    onClicked={() => launch(appEntry)}
                  />
                )
              }}
            </For>
          </box>

          {/* ── Result rows (REQ-LR-01, REQ-LR-04) ───────────────── */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["launcher-results"]}
            spacing={2}
          >
            <For each={results}>
              {(a: Apps.Application, idx) => {
                // idx is Accessor<number> — use idx() for reactive reads.
                // Name split: prefix highlight + rest (REQ-LR-04).
                const prefix = createComputed(() => a.name.slice(0, query().length))
                const rest   = createComputed(() => a.name.slice(query().length))

                return (
                  <button
                    cssClasses={createComputed(() =>
                      selectedIdx() === idx()
                        ? ["app-item", "selected"]
                        : ["app-item"]
                    )}
                    onClicked={() => launch(a)}
                    accessibleRole={Gtk.AccessibleRole.LIST_ITEM}
                    $={self => self.update_property([Gtk.AccessibleProperty.LABEL], [a.name])}
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
                        {/* Prefix highlight — .match-prefix (accent bold) + .match-rest */}
                        <box orientation={Gtk.Orientation.HORIZONTAL}>
                          <label
                            cssClasses={["match-prefix"]}
                            label={prefix}
                            halign={Gtk.Align.START}
                          />
                          <label
                            cssClasses={["match-rest"]}
                            label={rest}
                            halign={Gtk.Align.START}
                          />
                        </box>
                        <label
                          cssClasses={["app-sub"]}
                          label={a.description ?? a.executable ?? ""}
                          halign={Gtk.Align.START}
                        />
                      </box>
                      {/* Trailing ⏎ glyph — visible only on the selected row */}
                      <label
                        cssClasses={["row-enter"]}
                        label="⏎"
                        visible={createComputed(() => selectedIdx() === idx())}
                        valign={Gtk.Align.CENTER}
                      />
                    </box>
                  </button>
                )
              }}
            </For>
          </box>

          {/* ── Footer hints + AI pill (REQ-LR-07) ───────────────── */}
          <box cssClasses={["launcher-footer"]} spacing={14}>
            <KbdHint k="↑↓" hint="nav" />
            <KbdHint k="↵" hint="launch" />
            <KbdHint k="⌘↵" hint="terminal" />
            <KbdHint k="=" hint="calc" />
            <KbdHint k="?" hint="ask AI" />
            <box hexpand={true} />
            {/* AI pill — cosmetic only; gradient bg + solid var(--mauve) text.
                GTK4 4.22 cannot clip gradient into text glyphs (D-LR-1).
                Functionality deferred (D-LR-2). */}
            <box cssClasses={["ai-pill"]} valign={Gtk.Align.CENTER}>
              <label label="ask cachy::ai" />
            </box>
          </box>

        </box>
      </box>
    </window>
  )
}
