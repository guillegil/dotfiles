# CLAUDE.md — dotfiles (Hyprland + AGS desktop shell)

Project-specific rulebook for this repo. Auto-loaded every session. This is a
**living document**: it grows as we learn and gets corrected when something
proves wrong. Keep it curated and short — depth lives in the skill, not here.

Stack: Arch/CachyOS · Hyprland (Wayland, Lua config) · AGS v3 (Astal + gnim,
GTK4) · SCSS · uwsm session. Target hardware: Lenovo Yoga Pro 9 (Intel + NVIDIA).

---

## Living document protocol (the core rule)

Maintain this file as we work. Do it WITHOUT being asked.

**Add** an entry when you:
- establish a convention (naming, structure, workflow),
- discover a non-obvious gotcha or edge case,
- make a durable decision that future work must respect.

**Correct** an entry when:
- a prior belief proves wrong → move it to `## Corrections` with *what we
  thought → what's true → why*, and fix/remove the stale claim in place.
- a convention changes → update the line and note the change in `## Corrections`.

**Rules for entries:**
- One line each, dated `(YYYY-MM-DD)`, newest first within a section.
- Curate, don't dump. Promote a learning here only once it's **confirmed and
  durable**. Raw, session-by-session detail belongs in engram, not here.
- Don't duplicate the skill. Deep technical reference lives in
  `.claude/skills/hyprland-ags-shell/` — link to it, don't copy it.
- Never assert an unverified technical claim here. If unsure, mark it
  `(unverified)` until confirmed via context7 or testing.

Relationship to the other two memory layers:
- **engram** — raw running log across sessions/compactions (auto-saved).
- **this file** — curated, version-controlled project rules + confirmed learnings.
- **`.claude/skills/hyprland-ags-shell/`** — generalist, reusable technical
  reference (20 docs, context7-verified). Project-agnostic; this file is not.

---

## Hard rules (project)

- **Commit straight to `main`. No PRs.** Solo project (user + agent only).
  Never auto-push — the user pushes manually. Conventional commits, no AI
  attribution / no `Co-Authored-By`.
- **Never hallucinate an API.** For any AGS/Astal/gnim/Hyprland/GTK4 claim,
  verify via **context7** first (`/aylur/ags`, `/aylur/astal`,
  `/hyprwm/hyprland-wiki`) or the matching skill reference. Training data is stale.
- **GTK4 feasibility gate.** GTK4 CSS is a subset of web CSS. Confirm a design
  is renderable in GTK4 before implementing — see the skill's
  `gtk4-css-unsupported.md`.
- **Use the `hyprland-ags-shell` skill** for any shell work; **`ui-ux-pro-max`**
  for any visual/design decision.
- Tooling: use `bat`/`rg`/`fd`/`sd`/`eza`, never `cat`/`grep`/`find`/`sed`/`ls`.
- Validate AGS changes by reloading and reading `/tmp/ags-debug.log`
  (`ags quit; sleep 1; uwsm app -- ags run >/tmp/ags-debug.log 2>&1 & disown`) —
  there is no automated test suite; the build (esbuild) + bare-metal smoke is
  the gate.

---

## Conventions

- (2026-05-30) Config is symlinked from repo `config/` into `~/.config/` via
  `install.sh`; custom AGS icons installed to hicolor + `gtk-update-icon-cache`.
- (2026-05-30) Accent color is Catppuccin green `#a6e3a1`; theme is Mocha, dark,
  JetBrains Mono. Tokens in `config/ags/style/_tokens.scss` (use `*`, not `:root`).
- (2026-05-30) SDD changes archive to `openspec/archive/<name>-<YYYY-MM-DD>/`
  (9 files incl. apply-progress + archive-report); main specs live in
  `openspec/specs/`. Mirror the existing archive layout exactly.

---

## Confirmed learnings

- (2026-05-30) GTK boxes size to the **widest child's natural width**; GTK4 has
  no `max-width` → cap a card by ellipsizing/limiting its widest child. A
  horizontal scrim needs `hexpand=true` on the card for `halign=CENTER` to
  center it. → skill `gtk4-layout-patterns.md`.
- (2026-05-30) A child's background does NOT clip to the parent's
  `border-radius` → round the last child's bottom corners manually.
- (2026-05-30) Adding an MCP server (`claude mcp add ...`) requires a session
  restart (`claude --continue`) to load — MCPs load at session start, not hot.
- (2026-05-30) Only one daemon owns `org.freedesktop.Notifications`; swaync is
  `Type=dbus` (D-Bus activated) and steals it even when not started → mask/uninstall.
- (2026-05-30) hyprpaper 0.8+ needs block syntax + absolute paths; flat syntax
  is silently ignored.

---

## Corrections

> What we thought → what's true → why. Newest first.

- (2026-05-30) **ui-ux-pro-max in build slices** — *Thought:* injecting the
  derived `design-with-ui-ux-pro-max.md` reference into build sub-agents
  satisfied the "always use ui-ux-pro-max for design work" rule. *True:* the
  rule means running the **skill itself** (`search.py`) on the specific
  component during the build, not just a distilled reference. *Fix:* when
  delegating any UI build slice, instruct the sub-agent to run ui-ux-pro-max
  for that component, and audit the result against its rules before finishing.
- (2026-05-30) **Launcher width** — *Thought:* the card stretched because of
  `hexpand`. *True:* a GTK box sizes to its widest child's natural width; the
  real culprit was the RECENT row (8 un-truncated chips → 1178px). Fixed by
  capping + ellipsizing chips. Setting `hexpand=false` actually *broke*
  centering (horizontal box packs a non-expanding child to the left).
- (2026-05-30) **SDD archive automation** — *Thought:* the archive sub-agent
  would place files correctly. *True:* it used the wrong path
  (`openspec/changes/archive/...`) and copied instead of moved. Always verify
  the archive sub-agent's filesystem result against the existing convention
  before committing.
