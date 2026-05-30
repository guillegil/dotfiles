# Specification: Launcher Widget

## Constraints (apply to ALL capabilities)

Inherit all constraints from `openspec/specs/desktop-bar.md` plus:

- GTK4 CSS: MUST NOT use `background-clip:text` or `-webkit-text-fill-color` (not supported in GTK4 4.22).
- Calc evaluator MUST NOT use `eval()` or `new Function`. A hand-rolled parser is mandatory.
- History persistence MUST use GLib atomic write (write-temp-then-rename). Direct file write is PROHIBITED.
- Gradient text degradation: the "ask cachy::ai" pill MUST render solid `var(--mauve)` text on gradient background. This is an accepted permanent deviation.
- AI "? ask AI" mode is DEFERRED. Footer hint and pill are cosmetic only.

---

## Accepted Deviations (permanent, recorded from launcher-redesign implementation)

| ID | Requirement | Deviation | Rationale | Change |
|----|-------------|-----------|-----------|--------|
| D-LR-1 | AI pill gradient text | Solid `var(--mauve)` text; gradient bg only | GTK4 4.22 has no background-clip:text | launcher-redesign |
| D-LR-2 | AI ask mode | Footer hint present; functionality non-operative | Deferred — no ollama in repo | launcher-redesign |
| D-LR-3 | Grid columns | 5 columns implemented (spec said 6) | Deliberate post-apply polish for width/density | launcher-redesign |
| D-LR-4 | History cap | 8 entries (spec said "min 10") | Design ADR-4 override; minimum surfaced limit is RECENT_LIMIT=5 | launcher-redesign |
| D-LR-5 | Terminal hint | `> terminal` mode hinted (spec said `⌘↵ terminal`) | New terminal-command mode added during implementation; Super+Enter still works | launcher-redesign |

---

## 1. Launcher Widget (MODIFIED)

### Purpose

The existing Phase-1 launcher skeleton (`config/ags/widget/Launcher.tsx`) is upgraded
to a Spotlight/Raycast-class launcher matching the "Claude design" reference
(`docs/assets/App-Launcher.png`, `DESIGN.md §6`).

---

### REQ-LR-01: Keyboard Navigation — Selection Index

The launcher MUST maintain a `selectedIdx` integer state. `↑`/`↓` key presses MUST
move `selectedIdx` by −1/+1 respectively. `selectedIdx` MUST be clamped to `[0, len−1]`
at all times. On every query change that alters result count, `selectedIdx` MUST be
re-clamped to `min(selectedIdx, len−1)` (or reset to 0 if `len` becomes 0).

#### Scenario: Down arrow moves selection

- GIVEN the launcher is open with 3 app results and `selectedIdx=0`
- WHEN the user presses `↓`
- THEN `selectedIdx` becomes 1 and the second row shows the selected affordance

#### Scenario: Up arrow clamps at zero

- GIVEN the launcher is open and `selectedIdx=0`
- WHEN the user presses `↑`
- THEN `selectedIdx` remains 0 (no wrap-around)

#### Scenario: Index clamps on query change

- GIVEN `selectedIdx=4` and the query changes, reducing results to 2
- WHEN the result list re-renders
- THEN `selectedIdx` is clamped to 1 (len−1)

#### Scenario: Index resets when results empty

- GIVEN the query produces 0 results
- WHEN `selectedIdx` would be re-clamped
- THEN `selectedIdx` is 0 and no row appears selected

---

### REQ-LR-02: Launch Actions

Pressing `↵` MUST activate (launch) the app at `selectedIdx`. Pressing `⌘↵`
(SUPER+Enter) MUST launch the selected app in a terminal using `$TERMINAL` env var,
falling back to `kitty` if `$TERMINAL` is unset or empty.

#### Scenario: Enter launches selected app

- GIVEN an app row is selected (`selectedIdx=1`)
- WHEN the user presses `↵`
- THEN the app at index 1 is activated and the launcher closes

#### Scenario: Cmd+Enter opens in terminal

- GIVEN an app row is selected and `$TERMINAL=alacritty`
- WHEN the user presses `⌘↵` (SUPER+Enter)
- THEN the app is launched via `alacritty -e <app-exec>` and the launcher closes

#### Scenario: Cmd+Enter falls back to kitty

- GIVEN `$TERMINAL` is unset
- WHEN the user presses `⌘↵`
- THEN the app is launched via `kitty -e <app-exec>`

---

### REQ-LR-03: Results Count Pill

The search row MUST display an "N RESULTS" pill reflecting the live count of matched
app entries. The pill MUST be hidden when the query string is empty. The count MUST
update on every keystroke.

#### Scenario: Pill shows count

- GIVEN the query is "fire" matching 2 apps
- WHEN the result list renders
- THEN the pill displays "2 RESULTS"

#### Scenario: Pill hidden on empty query

- GIVEN the query is ""
- WHEN the search row renders
- THEN the results pill is not visible

---

### REQ-LR-04: Selected Row Affordances

The selected result row MUST display a `⏎` glyph at its trailing edge, visible ONLY
when that row is selected. The query-matched prefix of the app name MUST be rendered
as a visually distinct span (highlight) with the remainder in normal style.

#### Scenario: Enter glyph on selected row only

- GIVEN results list has 3 rows and `selectedIdx=1`
- WHEN the list renders
- THEN only row at index 1 shows the `⏎` glyph; rows 0 and 2 do not

#### Scenario: Prefix highlight

- GIVEN query is "fire" and app name is "Firefox"
- WHEN the row renders
- THEN "Fire" is styled as highlighted and "fox" is rendered in default style

---

### REQ-LR-05: Calculator Banner

The launcher MUST auto-evaluate every query as arithmetic using `lib/calc.ts`. When
the evaluator returns a non-null result:

- A banner MUST appear above the app result list.
- The banner MUST display `<query> → <result> · <label>` where `<label>` is a
  human-readable constant name when the result matches a known constant (e.g.,
  "golden ratio"), or omitted otherwise.
- A `↵ copy` affordance MUST copy the numeric result to the clipboard when activated.
  (NOTE: Implementation also closes the launcher after copy as reasonable UX.)
- The banner MUST be hidden when `calc.ts` returns `null` (non-arithmetic input).
- The evaluator MUST support `+ − * / ^ ( )` and the constants table (π, e, φ, √2,
  and at minimum the values in `lib/calc.ts`).

#### Scenario: Valid arithmetic shows banner

- GIVEN query is "2+2"
- WHEN the calc evaluator runs
- THEN the banner displays "2+2 → 4" and the copy affordance is available

#### Scenario: Constant resolved with label

- GIVEN query is "(1+sqrt(5))/2"
- WHEN evaluator returns ≈1.618033…
- THEN the banner shows the result with label "golden ratio"

#### Scenario: Non-math hides banner

- GIVEN query is "firefox"
- WHEN the calc evaluator runs
- THEN evaluator returns null and the banner is not rendered

#### Scenario: Copy affordance

- GIVEN the banner is visible with result "3.14159…"
- WHEN the user activates `↵ copy`
- THEN the result string is written to the system clipboard

#### Scenario: Malformed input does not crash

- GIVEN query is "1/0" or "(((" or "drop table"
- WHEN the evaluator processes the input
- THEN it returns null (or Infinity for div-by-zero per implementation), no exception is thrown, and no code is executed

---

### REQ-LR-06: Recent Commands Chips

The launcher MUST display a RECENT chip row populated from `lib/launcher-history.ts`.
Chips MUST list the last N apps launched (minimum 5 visible), ordered most-recent-first.
Clicking a chip MUST launch the corresponding app and record the launch. The history
MUST be persisted across sessions. The chip row MUST update on open to reflect the
latest history.

#### Scenario: Chip row populated from history

- GIVEN the user has launched "kitty" then "zen" in previous sessions
- WHEN the launcher opens
- THEN the RECENT chip row shows "zen" before "kitty" (most-recent-first)

#### Scenario: Launch records history

- GIVEN the launcher is open and the user launches "Firefox"
- WHEN the launch executes
- THEN "Firefox" is prepended to the history and persisted to disk

#### Scenario: Chip click launches app

- GIVEN the RECENT chip "kitty" is visible
- WHEN the user clicks it
- THEN kitty launches and the click is recorded in history

---

### REQ-LR-07: Footer Hints and AI Pill

The footer MUST display the hint segments for navigation, launch, terminal, calculator, and AI.
The "ask cachy::ai" pill MUST be rendered with a gradient background and solid
`var(--mauve)` text (see D-LR-1). The pill MUST be present but non-functional (D-LR-2).
The terminal-command hint reflects the active terminal mode (see D-LR-5).

#### Scenario: Footer content

- GIVEN the launcher is open
- WHEN the footer renders
- THEN all hint segments are visible and functional

#### Scenario: AI pill rendered

- GIVEN the launcher is open
- WHEN the footer renders
- THEN the "ask cachy::ai" pill is present with gradient background and visible text

---

### REQ-LR-08: Preserved Close/Open Behavior

Existing open/close behavior MUST be preserved: the launcher opens via LauncherPill
(`app.toggle_window("launcher")`), closes on `Esc` key, closes on scrim click-outside,
and focuses the search entry on open. The query MUST be cleared after a successful
launch.

#### Scenario: Esc closes

- GIVEN the launcher is open
- WHEN the user presses `Esc`
- THEN the launcher closes

#### Scenario: Query cleared after launch

- GIVEN the user typed "fire" and launched Firefox
- WHEN the launcher closes
- THEN the query entry is empty on next open

---

## 2. App Grid (NEW capability)

### Purpose

A scrollable grid of all installed `.desktop` apps shown in an "ALL APPS"
section below the recent chips and result rows, using real system icons and app names.

---

### REQ-AG-01: ALL APPS Section Header

The launcher MUST display an "ALL APPS" label with a live app count reflecting the
total number of apps exposed by AstalApps.

#### Scenario: Header shows count

- GIVEN AstalApps lists 120 installed apps
- WHEN the ALL APPS section renders
- THEN the header reads "ALL APPS" with the count visible

---

### REQ-AG-02: Grid Layout (DEVIATION D-LR-3)

The ALL APPS section MUST render all apps in a `Gtk.FlowBox` grid. Each app MUST be wrapped in a `Gtk.FlowBoxChild`. The grid
MUST display the real `.desktop` icon (via AstalApps `iconName`) and the app name.
Gradient tile colors are deferred.

DEVIATION NOTE: Implemented with 5-column layout (spec specified 6) as deliberate
post-apply polish for width/density optimization. Layout is functionally correct
and keyboard navigation is consistent.

#### Scenario: Grid layout

- GIVEN 12 installed apps
- WHEN the ALL APPS grid renders
- THEN apps appear in rows within the specified column layout

#### Scenario: Real icons used

- GIVEN Firefox is installed with icon "firefox"
- WHEN its grid tile renders
- THEN the icon shown is the system "firefox" icon from the icon theme

#### Scenario: FlowBoxChild wrapper

- GIVEN the grid is built imperatively
- WHEN each tile is added to the FlowBox
- THEN every tile is wrapped in a `Gtk.FlowBoxChild` (absence causes silent no-op)

---

### REQ-AG-03: Scrollable Grid Viewport

The app grid MUST be wrapped in a `<scrolledwindow>` so that overflow apps are
reachable by scrolling. The grid MUST NOT force the launcher window to grow
indefinitely with app count.

#### Scenario: Overflow scrolls

- GIVEN more apps than fit in the viewport
- WHEN the user scrolls the grid area
- THEN additional app tiles become visible without resizing the launcher window

---

### REQ-AG-04: Grid Tile Launch

Clicking a grid tile MUST launch the corresponding app and record it in history.
The tile MUST be keyboard-activatable when focused (Enter key on focused tile).

#### Scenario: Click launches

- GIVEN the Firefox tile is visible in the grid
- WHEN the user clicks it
- THEN Firefox is launched and the entry is written to launcher history

#### Scenario: Enter on focused tile

- GIVEN a grid tile has focus
- WHEN the user presses `↵`
- THEN the tile's app is launched

---

## 3. Calc Library (NEW)

### Purpose

`config/ags/lib/calc.ts` — a self-contained, safe arithmetic evaluator used by the
launcher calculator banner. No external dependencies. Never uses `eval`/`new Function`.

---

### REQ-CL-01: Safe Arithmetic Evaluation

`calc.ts` MUST export a function `evaluate(expr: string): CalcResult | null`. It MUST
support `+ − * / ^ ( )` over integer and decimal literals. It MUST return `null` for
any input that is not a valid arithmetic expression. It MUST NOT execute arbitrary
code.

#### Scenario: Basic arithmetic

- GIVEN `evaluate("3 * (4 + 2)")`
- WHEN the function runs
- THEN it returns `18`

#### Scenario: Non-arithmetic returns null

- GIVEN `evaluate("hello world")`
- WHEN the function runs
- THEN it returns `null`

#### Scenario: No code execution path

- GIVEN `evaluate("process.exit(1)")` or `evaluate("require('fs')")`
- WHEN the function runs
- THEN it returns `null` without side effects

---

### REQ-CL-02: Constants Table

`calc.ts` MUST include a constants table resolving at minimum: `pi` / `π` (≈3.14159),
`e` (≈2.71828), `phi` / `φ` (≈1.61803), `sqrt2` (≈1.41421). Constants MUST
be usable by name inside expressions.

#### Scenario: Constant in expression

- GIVEN `evaluate("2 * pi")`
- WHEN the function runs
- THEN it returns approximately `6.28318`

#### Scenario: Phi constant

- GIVEN `evaluate("phi")`
- WHEN the function runs
- THEN it returns approximately `1.61803`

---

### REQ-CL-03: Constant Label Lookup

`calc.ts` MUST export a function `getLabel(result: number): string | null` that
returns a human-readable label when the result matches a known constant within a
small epsilon (e.g. `|result − π| < 1e-9`), or `null` otherwise.

#### Scenario: Label for pi

- GIVEN `getLabel(Math.PI)`
- WHEN called
- THEN it returns a label like `"pi"` or equivalent

#### Scenario: No label for arbitrary value

- GIVEN `getLabel(42)`
- WHEN called
- THEN it returns `null`

---

## 4. Launcher History Library (NEW)

### Purpose

`config/ags/lib/launcher-history.ts` — JSON-backed recency store for recently
launched apps. Persisted under the AGS state dir. Uses GLib atomic write.

---

### REQ-LH-01: Record Launch (DEVIATION D-LR-4)

`launcher-history.ts` MUST export `recordLaunch(appId: string): void`. Calling it
MUST prepend `appId` to the history list (deduplicating: if `appId` already exists,
move it to front). The list MUST be capped at a maximum of N entries.

DEVIATION NOTE: Implemented with cap of 8 entries (spec specified "min 10") per
design ADR-4 override. Minimum visible limit is RECENT_LIMIT=5 chips displayed.

#### Scenario: New entry prepended

- GIVEN history is `["kitty", "zen"]`
- WHEN `recordLaunch("firefox")` is called
- THEN history becomes `["firefox", "kitty", "zen"]`

#### Scenario: Existing entry moved to front

- GIVEN history is `["kitty", "zen", "firefox"]`
- WHEN `recordLaunch("zen")` is called
- THEN history becomes `["zen", "kitty", "firefox"]`

---

### REQ-LH-02: Read Recent

`launcher-history.ts` MUST export `getRecent(limit: number): string[]`. It MUST
return up to `limit` entries from the history, most-recent-first.

#### Scenario: Returns up to limit

- GIVEN history has 8 entries and `limit=5`
- WHEN `getRecent(5)` is called
- THEN an array of exactly 5 entries is returned, most-recent-first

---

### REQ-LH-03: Atomic Persistence

All writes MUST use GLib atomic write (write to a temp path, then rename/move to the
target path). The history file MUST survive rapid launcher open/close cycles without
corruption.

#### Scenario: Atomic write on record

- GIVEN the launcher is toggled rapidly 10 times
- WHEN each toggle triggers a `recordLaunch`
- THEN the history file is readable and valid JSON after all toggles complete

---

### REQ-LH-04: Graceful Cold Start

If the history file does not exist or contains invalid JSON, `getRecent` MUST return
an empty array. It MUST NOT throw or crash the launcher.

#### Scenario: Missing file

- GIVEN the history file does not exist
- WHEN `getRecent(5)` is called
- THEN it returns `[]` without throwing

---

## 5. Accessibility (ADDITIVE)

### Purpose

Accessibility requirements for all NEW interactive elements introduced in this change,
consistent with REQ-A11Y-01..04 from `desktop-bar.md`.

---

### REQ-A11Y-LR-01: Launcher Interactive Elements

Every interactive element in the launcher MUST have `accessible-name` and an
appropriate `accessible-role`. This includes: result rows, RECENT chips, the copy
affordance in the calculator banner, grid tiles, and the footer AI pill.

#### Scenario: Result row a11y

- GIVEN a result row renders for "Firefox"
- WHEN accessibility tree is inspected
- THEN the row has `accessible-name="Firefox"` and role BUTTON or LIST_ITEM

#### Scenario: Calculator copy affordance

- GIVEN the calc banner is visible
- WHEN the copy element is inspected
- THEN it has `accessible-name` (e.g. "Copy result") and role BUTTON

#### Scenario: Grid tile a11y

- GIVEN a grid tile renders for "kitty"
- WHEN accessibility tree is inspected
- THEN the tile has `accessible-name="kitty"` and role BUTTON

---

### REQ-A11Y-LR-02: Focus Visible

All interactive elements MUST show a `:focus-visible` ring consistent with the
existing `outline: 2px solid var(--accent); outline-offset: 2px` rule from
`_widgets.scss`.

#### Scenario: Focus ring on result row

- GIVEN the launcher is open and keyboard focus moves to a result row
- WHEN the row receives focus
- THEN a 2px accent-colored outline is visible around the row

---

### REQ-A11Y-LR-03: Reduced Motion

Any CSS transition or animation introduced for the calculator banner appearance,
chip row, or grid tiles MUST be gated by the existing `.motion-off` suppression
in `_motion.scss` (i.e., respect `REQ-MG-02`). No new animation MUST bypass the
motion gate.

#### Scenario: Banner respects motion gate

- GIVEN `.motion-off` is applied to the launcher window
- WHEN the calc banner appears
- THEN no transition animation plays (duration collapses to 0.01ms)
