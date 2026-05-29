// Launcher.tsx — Spotlight-class app launcher overlay (Slice 1 + Slice 2)
//
// State model:
//   query       — entry text
//   selectedIdx — single unified selection cursor (clamped to [0, len-1])
//   results     — fuzzy query results (max 8), derived from query
//   calc        — CalcResult | null, derived from query (always-on auto)
//   recent      — string[] of recent entry IDs, read fresh on each open
//   allApps     — static list of all installed apps for the grid (Slice 2)
//
// Key controller lives on the WINDOW (not the entry) so Up/Down/Enter/Esc are
// intercepted before the entry receives them. Printable keys return false so
// typing flows into the entry normally.
//
// Slice 2 (ADR-2, ADR-6): when query is EMPTY the ALL APPS FlowBox grid is
// the navigable surface; when query is non-empty result rows take over.
// The FlowBox owns its own SINGLE selection (native arrow nav) — selectedIdx
// governs result rows only.

import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createState, createComputed, For } from "ags"
import Apps from "gi://AstalApps"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
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

// buildGridTile — builds the inner widget for a FlowBox grid tile.
// MUST be wrapped in a Gtk.FlowBoxChild before appending to the FlowBox
// (appending a bare widget is a silent runtime no-op — ADR-6 Risk 2).
function buildGridTile(a: Apps.Application): Gtk.Widget {
  const box = new Gtk.Box()
  box.set_orientation(Gtk.Orientation.VERTICAL)
  box.set_spacing(4)
  box.set_css_classes(["grid-tile"])
  box.set_halign(Gtk.Align.CENTER)
  box.set_valign(Gtk.Align.CENTER)
  box.update_property([Gtk.AccessibleProperty.LABEL], [a.name])

  const icon = new Gtk.Image()
  icon.set_from_icon_name(a.iconName || "application-x-executable")
  icon.set_css_classes(["grid-tile-icon"])
  icon.set_halign(Gtk.Align.CENTER)

  const name = new Gtk.Label()
  name.set_label(a.name)
  name.set_css_classes(["grid-tile-name"])
  name.set_ellipsize(Pango.EllipsizeMode.END)
  name.set_max_width_chars(10)
  name.set_halign(Gtk.Align.CENTER)
  name.set_justify(Gtk.Justification.CENTER)
  name.set_wrap(false)

  box.append(icon)
  box.append(name)
  return box
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function Launcher() {
  // ── State ──────────────────────────────────────────────────────────────────

  const apps = new Apps.Apps()
  // allApps: static snapshot of installed apps — evaluated once at init.
  // Not reactive: the installed app list does not change at runtime within a
  // session; the FlowBox is built imperatively in the $ setter (ADR-6).
  const allApps = apps.list as Apps.Application[]
  // gridApps: ALL apps, most-used first (by AstalApps frequency; stable order
  // when all are 0). The grid is navigable/scrollable through the full list;
  // only ~2 rows of 5 (10 tiles) are visible at once via the viewport height.
  const gridApps = allApps
    .slice()
    .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))

  const [query, setQuery] = createState("")
  const [selectedIdx, setSelectedIdx] = createState(0)

  // results: Apps.Application[] — derived via createComputed (NOT .as(arr => arr.map()))
  // because .as() inside JSX returns "Accessor{}" as text; createComputed returns
  // a proper Accessor<T> that <For> can consume.
  // termMode: query starting with ">" is a terminal command, NOT an app search.
  const termMode = createComputed(() => query().startsWith(">"))
  const termCmd  = createComputed(() => query().replace(/^>\s*/, ""))

  const results = createComputed(() => {
    const q = query()
    if (q.startsWith(">")) return [] as Apps.Application[]  // terminal mode: no search
    return q ? apps.fuzzy_query(q).slice(0, 8) : ([] as Apps.Application[])
  })

  // Single clamping site — subscribed to results so it fires on EVERY query change.
  // ADR-2: one place only; arrow handlers also clamp on move (see key controller).
  results.subscribe(() => {
    const len = results.peek().length
    setSelectedIdx(i => (len === 0 ? 0 : Math.min(i, len - 1)))
  })

  // calc: CalcResult | null — always-on, evaluated per keystroke. Suppressed in
  // terminal mode (a ">" command is not a math expression).
  const calc = createComputed(() => query().startsWith(">") ? null : evaluate(query()))

  // recent: string[] — state, refreshed from disk on init and after each launch.
  // createComputed would only run once (getRecent has no reactive deps); we use
  // createState + explicit refresh so chips update on the same session's launches.
  const [recent, setRecent] = createState<string[]>(getRecent(8))

  // ── Actions ────────────────────────────────────────────────────────────────

  function closeAndClear() {
    app.toggle_window("launcher")
    setQuery("")
    setSelectedIdx(0)
    gridIdx = -1
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

  // runTerminal: run a raw ">"-prefixed command in a terminal (kept open via a
  // login shell so output stays visible). Triggered by Enter in terminal mode.
  function runTerminal(cmd: string) {
    const c = cmd.trim()
    if (!c) return
    const term = GLib.getenv("TERMINAL") || "kitty"
    execAsync([term, "-e", "sh", "-c", `${c}; exec $SHELL`]).catch(() => {})
    closeAndClear()
  }

  // Reference to the search entry + a tracked focus flag so the key controller
  // can refocus it when the user starts typing while focus is elsewhere (e.g.
  // navigating the app grid). We track focus via an EventControllerFocus rather
  // than has_focus() (not a method in this binding) — it also correctly follows
  // the entry's inner GtkText delegate.
  let searchEntry: Gtk.Entry | null = null
  let entryFocused = false
  // Ref to the imperatively-built grid FlowBox + a controller-driven cursor.
  // We manage grid nav ourselves (CAPTURE phase fights native FlowBox keynav,
  // and native selection-vs-focus diverged → looked stuck). gridIdx = -1 means
  // not in the grid.
  let gridFlowBox: Gtk.FlowBox | null = null
  const GRID_COLS = 5
  let gridIdx = -1
  function focusGridTile(i: number) {
    if (!gridFlowBox) return
    const clamped = Math.max(0, Math.min(i, gridApps.length - 1))
    gridIdx = clamped
    const child = gridFlowBox.get_child_at_index(clamped)
    if (child) {
      gridFlowBox.select_child(child)
      child.grab_focus()   // also scrolls the viewport to reveal it
    }
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
        // CAPTURE phase: the controller must see Up/Down/Enter/Esc BEFORE the
        // focused entry consumes them (a focused GtkText eats arrows + Enter in
        // the default BUBBLE phase, which is why nav + terminal-Enter did
        // nothing). Printable keys return false below → still reach the entry.
        controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        controller.connect("key-pressed", (_c, keyval, _code, state) => {
          const sup = (state & Gdk.ModifierType.SUPER_MASK) !== 0

          switch (keyval) {
            case Gdk.KEY_Escape:
              app.toggle_window("launcher")
              return true

            case Gdk.KEY_Left:
            case Gdk.KEY_Right:
            case Gdk.KEY_Up:
            case Gdk.KEY_Down: {
              // ── Empty-query: navigate the app grid (controller-driven) ──────
              if (!query.peek()) {
                const n = gridApps.length
                if (gridIdx < 0) {
                  // Enter the grid with Down (one press). Up/Left/Right from the
                  // entry do nothing. (To return to search, just type.)
                  if (keyval === Gdk.KEY_Down && n > 0) { focusGridTile(0); return true }
                  return false
                }
                const col = gridIdx % GRID_COLS
                let next = gridIdx
                if (keyval === Gdk.KEY_Up)         next = gridIdx - GRID_COLS
                else if (keyval === Gdk.KEY_Down)  next = gridIdx + GRID_COLS
                else if (keyval === Gdk.KEY_Left)  next = col === 0 ? gridIdx : gridIdx - 1
                else                               next = col === GRID_COLS - 1 ? gridIdx : gridIdx + 1
                // Edges stay put — no wrap, no re-grab (avoids the stall/jump).
                if (next !== gridIdx && next >= 0 && next < n) focusGridTile(next)
                return true
              }
              // ── Result-rows: Up/Down drive the cursor; Left/Right edit text ─
              if (keyval === Gdk.KEY_Up) {
                setSelectedIdx(i => Math.max(i - 1, 0))
                return true
              }
              if (keyval === Gdk.KEY_Down) {
                setSelectedIdx(i => Math.min(i + 1, results.peek().length - 1))
                return true
              }
              return false  // Left/Right → entry cursor movement
            }

            case Gdk.KEY_Return:
            case Gdk.KEY_KP_Enter: {
              // Terminal mode: run the ">"-stripped command instead of an app.
              if (termMode.peek()) {
                runTerminal(termCmd.peek())
                return true
              }
              // Calculator: Enter copies the result (matches the "↵ copy" hint).
              const c = calc.peek()
              if (c) {
                execAsync(["wl-copy", String(c.value)]).catch(() => {})
                closeAndClear()
                return true
              }
              // Grid mode: launch the focused tile.
              if (!query.peek()) {
                const g = gridApps[gridIdx]
                if (g) (sup ? launchInTerminal(g) : launch(g))
                return true
              }
              const r = results.peek()[selectedIdx.peek()]
              if (r) {
                if (sup) launchInTerminal(r)
                else launch(r)
              }
              return true
            }
          }

          // Printable key while focus is elsewhere (e.g. the app grid) →
          // refocus the search entry and append the character ourselves, so the
          // user drops straight into search mode without losing it. (We insert
          // manually rather than via controller.forward(), which proved to be a
          // no-op for the already-targeted grid focus.)
          if (searchEntry && !entryFocused) {
            const cp = Gdk.keyval_to_unicode(keyval)
            if (cp >= 0x20 && cp !== 0x7f) {
              searchEntry.grab_focus()
              searchEntry.set_text(searchEntry.text + String.fromCodePoint(cp))
              searchEntry.set_position(-1)
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
        >
          {/* No card-claim gesture: the scrim already uses pick() to close only
              on clicks that land on the scrim itself, so clicks inside the card
              are safe. A claim here stole the FlowBox tiles' click-activate. */}

          {/* ── Search row ─────────────────────────────────────────── */}
          <box cssClasses={["launcher-search"]} spacing={12}>
            {/* Nerd Font magnifier glyph (nf-fa-search) — theme-independent.
                Colloid's symbolic search icons use a horizontal handle that
                reads as a flat bar; this gives the classic diagonal lupa. */}
            <label
              label={"\uf002"}
              cssClasses={["search-icon"]}
              valign={Gtk.Align.CENTER}
            />
            <entry
              cssClasses={["launcher-entry"]}
              placeholderText="Search apps…"
              hexpand={true}
              onNotifyText={self => {
                const t = self.text
                if (t === ">") {
                  // Distinguish typing ">" (expand to "> ") from deleting back
                  // down to ">" (exit terminal mode → empty search).
                  if (query.peek().startsWith("> ")) {
                    self.set_text("")        // was "> …", user deleted → search mode
                  } else {
                    self.set_text("> ")      // just typed ">" → enter terminal mode
                    self.set_position(-1)
                  }
                  return
                }
                setQuery(t)
              }}
              $={self => {
                searchEntry = self
                const fc = new Gtk.EventControllerFocus()
                fc.connect("enter", () => { entryFocused = true; gridIdx = -1 })
                fc.connect("leave", () => { entryFocused = false })
                self.add_controller(fc)
                self.grab_focus()
              }}
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

          {/* ── Terminal-mode banner (">") ─────────────────────────── */}
          {/* Shown when the query starts with ">". No app search runs; Enter
              executes the command in $TERMINAL. */}
          <box
            cssClasses={["term-banner"]}
            visible={termMode}
            spacing={8}
          >
            <label label=">" cssClasses={["term-prompt"]} valign={Gtk.Align.CENTER} />
            <label
              cssClasses={["term-cmd"]}
              label={termCmd.as(c => c || "type a command…")}
              halign={Gtk.Align.START}
            />
            <box hexpand={true} />
            <label cssClasses={["kbd"]} label="↵ run" valign={Gtk.Align.CENTER} />
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
          {/* Hidden when query is empty — grid takes over in that state (ADR-2) */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["launcher-results"]}
            spacing={2}
            visible={query.as(q => q.length > 0)}
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

          {/* ── ALL APPS section (Slice 2 — REQ-AG-01..04, ADR-2, ADR-6) ─── */}
          {/* Visible only when query is EMPTY — grid is the browse surface.
              When the user types, result rows take over and the grid hides. */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            visible={query.as(q => q.length === 0)}
          >
            {/* ALL APPS header with live count (REQ-AG-01) */}
            <box cssClasses={["launcher-section-header"]} spacing={8}>
              <label
                label="ALL APPS"
                cssClasses={["section-label"]}
                valign={Gtk.Align.CENTER}
              />
              <label
                label={String(allApps.length)}
                cssClasses={["section-label"]}
                valign={Gtk.Align.CENTER}
              />
            </box>

            {/* Scrollable FlowBox grid — 6 columns, real .desktop icons (REQ-AG-02..04) */}
            <scrolledwindow
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              propagateNaturalHeight={true}
              maxContentHeight={170}   /* ~2 rows of tiles; scroll for the rest */
              cssClasses={["app-grid-scroll"]}
              $={(self) => {
                // FlowBox is built imperatively — no <flowbox> intrinsic exists in
                // this AGS build (ADR-6). Every tile MUST be wrapped in a
                // Gtk.FlowBoxChild; appending a bare widget is a SILENT runtime
                // no-op that renders nothing and throws no error (ADR-6 Risk 2).
                const fb = new Gtk.FlowBox()
                gridFlowBox = fb
                fb.set_css_classes(["app-grid"])
                fb.set_max_children_per_line(5)
                fb.set_min_children_per_line(5)
                fb.set_homogeneous(true)
                fb.set_selection_mode(Gtk.SelectionMode.SINGLE)
                fb.set_activate_on_single_click(true)  // single click → child-activated → launch
                fb.set_row_spacing(8)
                fb.set_column_spacing(8)
                // CENTER + no hexpand: tiles pack tightly (just column_spacing)
                // and center, instead of spreading across the card width.
                fb.set_halign(Gtk.Align.CENTER)
                fb.set_hexpand(false)

                for (const a of gridApps) {
                  // REQUIRED: wrap every tile in FlowBoxChild before append.
                  // Raw fb.append(widget) is a silent no-op (ADR-6 Risk 2).
                  const child = new Gtk.FlowBoxChild()
                  child.set_child(buildGridTile(a))
                  fb.append(child)
                }

                // child-activated fires on click AND keyboard Enter when a child
                // is focused — FlowBox native SINGLE selection handles both.
                fb.connect("child-activated", (_box, child) => {
                  const a = gridApps[(child as Gtk.FlowBoxChild).get_index()]
                  if (a) launch(a)
                })

                ;(self as Gtk.ScrolledWindow).set_child(fb)
              }}
            />
          </box>

          {/* ── Footer hints + AI pill (REQ-LR-07) ───────────────── */}
          <box cssClasses={["launcher-footer"]} spacing={14}>
            <KbdHint k="↑↓" hint="nav" />
            <KbdHint k="↵" hint="launch" />
            <KbdHint k=">" hint="terminal" />
            <KbdHint k="=" hint="calc" />
            <KbdHint k="?" hint="ask AI" />
            <box hexpand={true} />
            {/* AI pill — cosmetic only; gradient bg + solid var(--mauve) text.
                GTK4 4.22 cannot clip gradient into text glyphs (D-LR-1).
                Functionality deferred (D-LR-2). */}
            <box cssClasses={["ai-pill"]} valign={Gtk.Align.CENTER} spacing={5}>
              {/* AI glyph composed of 3 GTK widgets so each animates on its own
                  (GTK can't animate SVG sub-elements): star "breathes",
                  the two dots "twinkle" with staggered delays — on hover. */}
              <overlay cssClasses={["ai-glyph"]} valign={Gtk.Align.CENTER}>
                <image iconName="ai-star-symbolic" cssClasses={["ai-star"]} />
                <image
                  $type="overlay"
                  iconName="ai-dot-symbolic"
                  cssClasses={["ai-dot", "ai-dot1"]}
                  halign={Gtk.Align.END}
                  valign={Gtk.Align.START}
                />
                <image
                  $type="overlay"
                  iconName="ai-dot-symbolic"
                  cssClasses={["ai-dot", "ai-dot2"]}
                  halign={Gtk.Align.START}
                  valign={Gtk.Align.END}
                />
              </overlay>
              <label label="Ask Cachy:ai" valign={Gtk.Align.CENTER} />
            </box>
          </box>

        </box>
      </box>
    </window>
  )
}
