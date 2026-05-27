---
source: engram
topic_key: sdd/uwsm-adoption/design
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Design: uwsm-adoption — Wrap Hyprland in systemd user scope via uwsm

## Executive Summary

We migrate the Hyprland session from a bare SDDM exec into a uwsm-managed
`wayland-session@hyprland.target` graph using the **minimal-diff inline-wrap**
pattern. The compositor itself is taken over by uwsm (`hyprland-uwsm.desktop`
auto-shipped by the `uwsm` package); the two surviving long-running autostarts
(`ags run`, `wl-paste --watch cliphist store`) are prefixed in-place with
`uwsm app --` so they run as transient scopes inside `app-graphical.slice`.
`polkit-gnome` is replaced by `hyprpolkitagent` and enabled once at install
time via `systemctl --user enable hyprpolkitagent.service`. SDDM is steered
to the new session via an idempotent root-owned drop-in at
`/etc/sddm.conf.d/10-default-session.conf` written by `install.sh`. The
swaync autostart line is deliberately NOT touched — it remains the verbatim
`hl.exec_cmd("swaync")` that `desktop-redesign` Slice D task 4.6 expects to
delete. No new systemd unit files are authored in this change; the only
service enable targets a unit that ships with `hyprpolkitagent` upstream.

## Architecture Decisions

### ADR-1: Inline `uwsm app --` wrapping vs dedicated user units

**Context.** Four autostart calls live in `config/hypr/hyprland.lua` lines
46–50: `ags run`, `swaync`, `polkit-gnome-authentication-agent-1`, and
`wl-paste --watch cliphist store`. Two patterns reach the same end (processes
inside `app-graphical.slice` with clean teardown): wrap each exec with
`uwsm app --` (Approach A), or author one `.service` file per daemon and
`systemctl --user enable` it (Approach B/D).

**Decision.** Approach A. Each surviving exec line is rewritten as
`hl.exec_cmd("uwsm app -- <cmd>")`. AGS and wl-paste remain inline in the
Lua autostart hook; no `~/.config/systemd/user/*.service` files are added.

**Alternatives rejected.**
- **Approach B (all daemons as user units).** Adds 3 new `.service` files
  to track in the dotfiles, requires per-service enable plumbing in
  `install.sh`, and does not solve a current pain. Rejected for this change.
- **Approach D (units for persistent daemons + inline for AGS).** Same
  complexity as B but more surgical. Kept as the natural successor once
  Approach A is verified bare-metal-stable and a flip condition fires
  (observed `wl-paste` crash, new persistent daemon, or measured shutdown
  regression).
- **Approach C (XDG `~/.config/autostart/*.desktop`).** Drops the dotfiles'
  ability to track autostart in `config/` naturally and `ags run` has no
  canonical `.desktop` autostart entry. Rejected.

**Consequences.**
- Future migration to Approach D is **non-breaking and additive**: writing
  a `wl-paste.service` with `WantedBy=graphical-session.target` and removing
  one line from `hyprland.lua` is the entire diff. The inline wrap is not
  a sunk cost — it is a documented stepping stone.
- AGS and wl-paste do not get `Restart=on-failure` semantics under this
  change. If either crashes, the user notices manually. Acceptable given
  zero observed crashes to date.
- The `hl.on("hyprland.start", …)` hook stays — it is NOT deprecated and is
  the documented uwsm-migration shape on the Hyprland wiki.

### ADR-2: Enable `hyprpolkitagent.service` via `systemctl --user enable` in `install.sh`

**Context.** The replacement polkit agent ships its own systemd user unit at
`/usr/lib/systemd/user/hyprpolkitagent.service` (installed by the
`hyprpolkitagent` package). Three patterns can light it up: (a)
`systemctl --user enable` at install time, (b) wrap a one-shot `uwsm app --
hyprpolkitagent` in the Lua autostart, or (c) ship a hand-rolled `.service`
file in this repo and enable it.

**Decision.** Pattern (a). After `pacman` install completes, `install.sh`
runs `systemctl --user enable hyprpolkitagent.service` exactly when the
package is present. We do NOT add it to the Lua autostart.

**Alternatives rejected.**
- **(b) inline `uwsm app -- /usr/lib/hyprpolkitagent/hyprpolkitagent` in
  the Lua hook.** Duplicates configuration that already lives upstream in
  the package's `.service` file. Loses `WantedBy=graphical-session.target`
  ordering. Adds a fourth thing to keep in sync with upstream. Rejected.
- **(c) hand-rolled `.service` in this repo.** Pure duplication of the
  package's unit. Rejected.

**Consequences.**
- The enable is **idempotent by systemd's own semantics** (a second
  `systemctl --user enable` of an already-enabled unit is a no-op).
- We do NOT run `systemctl --user daemon-reload` after enable. The unit
  file is shipped by pacman and present on disk before enable runs; no
  generator changes occur. Daemon-reload would be cargo culting here.
- The polkit agent activates on the *next* login (when the user systemd
  instance starts up and processes the enable). Existing mid-session
  polkit-gnome process keeps running until logout. Documented behavior;
  acceptable.
- Failure modes guarded: skip silently when `pacman -Q hyprpolkitagent`
  fails or when `systemctl --user` is unreachable (e.g. running install.sh
  over SSH without a graphical session bus); print a warning, never exit
  non-zero from this path.

### ADR-3: SDDM drop-in at `/etc/sddm.conf.d/10-default-session.conf`

**Context.** SDDM auto-discovers both `/usr/share/wayland-sessions/hyprland.desktop`
(installed by `hyprland`) and `/usr/share/wayland-sessions/hyprland-uwsm.desktop`
(installed by `uwsm`). With no extra config, SDDM presets the *last used*
session via `RememberLastSession=true`. On a brand-new system there is no
last session; SDDM picks the first one alphabetically from its session
directory — which on this layout is `hyprland.desktop` (the BARE session),
not `hyprland-uwsm.desktop`. We need to bias the picker toward uwsm.

Three candidate locations:
1. `/etc/sddm.conf.d/10-default-session.conf` — root-owned drop-in,
   higher precedence than `/usr/lib/sddm/sddm.conf.d/default.conf`.
2. `~/.config/sddm/*.conf` — per-user, but SDDM runs as the `sddm` system
   user pre-login; user-level configs don't apply to greeter session
   selection.
3. Edit `/etc/sddm.conf` directly — packagers explicitly recommend against
   this; drop-ins are the supported pattern.

**Runtime verification revealed a CRITICAL bug in the original ADR-3
decision.** The `[Autologin] Session=` key is only applied by SDDM when
autologin is enabled (i.e. when `User=` is also set in that section).
For users doing a standard manual password login — the common case — SDDM
reads `[General] DefaultSession=` to preselect a session in the greeter.
The original single-section drop-in with only `[Autologin]` caused SDDM
to ignore the drop-in entirely for manual login, breaking the "Fresh
install — SDDM defaults to uwsm session" scenario.

**Corrected decision.** Write `/etc/sddm.conf.d/10-default-session.conf`
with BOTH sections (defense in depth):

```ini
[General]
DefaultSession=hyprland-uwsm.desktop

[Autologin]
Session=hyprland-uwsm.desktop
```

`[General] DefaultSession=` covers manual password login — SDDM uses this
key to preselect the named session in the greeter before the user types their
password. `[Autologin] Session=` covers users who later enable autologin
by also adding `User=` to the drop-in. Writing both sections ensures correct
behavior whether or not autologin is configured. `User=` is intentionally
omitted so no automatic login occurs. The leading `10-` keeps the file
early in the drop-in load order so any user-added `20-something.conf` can
later override without touching this file.

**Original decision was incorrect.** The original ADR-3 stated that
"modern SDDM (0.20+) uses `Session=` [under `[Autologin]`] as the
preselected entry at the greeter" — this was wrong. SDDM's `[Autologin]`
section is processed only when the autologin username is set. The greeter
session preselection for manual login uses `[General] DefaultSession=`.

**Alternatives rejected.**
- **`~/.config/sddm/`.** SDDM greeter does not read per-user configs.
  Rejected on protocol grounds.
- **Edit base `/etc/sddm.conf`.** Not packaged on Arch/CachyOS by default
  (the file does not exist; only the drop-in does). Editing it would also
  fight with anyone who installs `sddm-conf` or similar. Rejected.
- **Seed `/var/lib/sddm/state.conf` with `[Last]\nSession=hyprland-uwsm.desktop`.**
  Works on fresh installs (no prior state) but conflicts with
  `RememberLastSession=true` once the user logs in once. We would either
  have to disable that (worse UX — user can never switch; DM remembers
  their pick) or accept that our seed gets clobbered after one login.
  Rejected as a primary mechanism.
- **`[Autologin] Session=` only (the original ADR-3 choice).** Verified
  incorrect at runtime. SDDM ignores this section unless `User=` is also
  set. The greeter shows the alphabetically-first session (bare `hyprland`)
  instead of the uwsm entry on a fresh install. Rejected and superseded by
  the two-section form.

**Consequences.**
- On a fresh install (no prior session state), `[General] DefaultSession=`
  causes the SDDM greeter to highlight "Hyprland (uwsm-managed)" by
  default; the user types their password and presses Enter.
- On in-place upgrades where the user has already logged into bare
  Hyprland once, `RememberLastSession=true` may still preselect the bare
  entry (last-used wins over DefaultSession). We document this — the user
  picks "Hyprland (uwsm-managed)" once manually; subsequent logins
  remember it.
- If the user later enables autologin by adding `User=` to a higher-
  priority drop-in, the `[Autologin] Session=hyprland-uwsm.desktop` line
  in our drop-in provides the correct session for autologin without any
  further configuration.
- The drop-in is **root-owned**; `install.sh` uses `sudo install` (atomic
  rename) to write it. Idempotency contract: the file is written only
  when (a) absent OR (b) content differs from the canonical two-section
  body. The old single-section form is treated as "stale content" and
  replaced on the next `install.sh` run.
- The plain `hyprland.desktop` session is NOT removed (pacman owns it).
  Rollback at the picker level is one click.

### ADR-4: swaync wrapping policy — explicitly NOT wrapped

**Context.** The autostart block currently contains `hl.exec_cmd("swaync")`
on line 47. `desktop-redesign` Slice D (task 4.6 in
`openspec/changes/desktop-redesign/tasks.md`) is queued to DELETE this
line as part of the notifd cutover. The naive uwsm migration would wrap
it as `hl.exec_cmd("uwsm app -- swaync")`. Slice D would then have to
delete the wrapped form, creating a coordination point between two SDD
changes that are otherwise independent.

**Decision.** Leave `hl.exec_cmd("swaync")` **verbatim**, unwrapped. Only
the lines for `ags run` and `wl-paste --watch cliphist store` get the
`uwsm app --` prefix. The polkit line is deleted outright (replaced by
the service enable in ADR-2). After this change ships, line 47 of
`hyprland.lua` reads exactly what `desktop-redesign` Slice D's `sd`/delete
patch expects.

**Alternatives rejected.**
- **Wrap swaync anyway for symmetry.** Forces a rebase or hand-edit of
  Slice D task 4.6 when desktop-redesign resumes. Pure churn for a line
  about to be deleted. Rejected.
- **Delete swaync now as part of this change.** Out of scope — would
  collapse desktop-redesign Slice D's reason to exist (notifd cutover is
  the whole point of that slice; we would only remove half of the work).
  Rejected on scope grounds.

**Consequences.**
- For the **window between this change merging and Slice D landing**,
  swaync runs as an unmanaged child process under uwsm-managed Hyprland.
  At logout, swaync may contribute to a small (sub-second) delay because
  systemd cannot match it to a unit. Acceptable: swaync respects SIGTERM
  cleanly and the window is short.
- **Rollback if desktop-redesign Slice D is canceled or indefinitely
  deferred.** The unwrapped swaync line stays unwrapped forever; we
  carry it as a known soft edge. If we later decide the window has
  become permanent, a one-line follow-up patch can wrap it. Not a design
  flaw — a documented soft edge.
- The boundary contract with desktop-redesign is **verified textually**:
  Slice D task 4.6 reads `DELETE hl.exec_cmd("swaync") from autostart
  block` and our post-change `hyprland.lua` line 47 reads exactly
  `   hl.exec_cmd("swaync")` (three-space indent preserved). Tasks phase
  will add a verification step that greps this line text.

### ADR-5: `install.sh` ordering

**Context.** `install.sh` already does, in order: parse args → install
pacman packages → install AUR packages → `enable_services` (currently
just `sudo systemctl enable sddm.service`) → `link_configs`. We need to
slot two new operations: (a) `systemctl --user enable
hyprpolkitagent.service`, (b) write the SDDM drop-in.

Constraints: (1) the user-systemd enable needs `hyprpolkitagent` already
installed by pacman; (2) the SDDM drop-in needs `sddm` installed by
pacman; (3) both new ops should run before `systemctl enable sddm.service`
so that the very first SDDM start after install sees the drop-in already
in place; (4) `link_configs` is independent and can move; (5) ordering
inside `enable_services` is fine since pacman already ran.

**Decision.** Both new ops live inside `enable_services()`, in this order:

1. (existing) Detect `pacman -Q sddm`; if absent, warn and return.
2. **(new)** Write `/etc/sddm.conf.d/10-default-session.conf` if absent or
   differing. Uses `sudo install -D -m 0644 /dev/stdin <path>` fed by a
   heredoc, behind a content-diff guard.
3. (existing) `sudo systemctl enable sddm.service` if not already enabled.
4. **(new)** If `pacman -Q hyprpolkitagent` succeeds, run
   `systemctl --user enable hyprpolkitagent.service`. Guard against
   missing user bus (e.g. running install.sh from a TTY without a user
   session): test `systemctl --user is-system-running` reachability;
   if it fails, print a hint ("re-run install.sh from a graphical
   session, or run `systemctl --user enable hyprpolkitagent.service`
   manually after first login") and continue without erroring.

This ordering keeps the SDDM drop-in write atomically before SDDM's first
enable, and decouples the user-systemd enable from sudo/system-systemd
operations.

**Alternatives rejected.**
- **New function `configure_sddm()` between `install_packages` and
  `enable_services`.** Cleaner in isolation but spreads SDDM-related
  work across two functions. Rejected for cohesion.
- **Write the drop-in unconditionally on every run.** Trivial to
  implement but pollutes the install.sh output ("rewrote
  /etc/sddm.conf.d/10-default-session.conf") on every re-run, and
  bumps the file mtime which can confuse pacman-file-monitoring tools
  some users run. Rejected; idempotency-with-diff is cheap.

**Consequences.**
- First-time uwsm detection (open question #4 below) collapses to a
  cheap file-presence check: `[[ -f /etc/sddm.conf.d/10-default-session.conf ]]`.
  Before the write, this is false → print the log-out hint after writing.
  After the write (subsequent install.sh re-runs), file exists → suppress
  the hint.
- `install.sh` continues to work in `--link-only` mode: neither new op
  runs because `DO_PACKAGES=0` short-circuits both `install_packages`
  and `enable_services`.

## Module / File Diffs (semantic, not literal patches)

### `config/hypr/hyprland.lua` — autostart block

Before (lines 45–51, current state):

```lua
hl.on("hyprland.start", function ()
   hl.exec_cmd("ags run")
   hl.exec_cmd("swaync")
   -- hyprpaper disabled until hyprpaper.conf exists; misc.background_color used instead
   hl.exec_cmd("/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1")
   hl.exec_cmd("wl-paste --watch cliphist store")
end)
```

After:

```lua
hl.on("hyprland.start", function ()
   hl.exec_cmd("uwsm app -- ags run")
   hl.exec_cmd("swaync")
   -- hyprpaper disabled until hyprpaper.conf exists; misc.background_color used instead
   -- polkit agent: hyprpolkitagent runs as a systemd user service
   -- (enabled by install.sh: `systemctl --user enable hyprpolkitagent.service`)
   hl.exec_cmd("uwsm app -- wl-paste --watch cliphist store")
end)
```

**Shape of change.**
- Line 46: `ags run` → `uwsm app -- ags run`.
- Line 47: **untouched** (swaync stays plain — ADR-4).
- Line 49: polkit exec line **deleted**; replaced by a two-line comment
  documenting where the polkit agent now comes from.
- Line 50: `wl-paste --watch cliphist store` → `uwsm app -- wl-paste --watch cliphist store`.

Net diff: ~2 lines modified, 1 line deleted, 2 comment lines added. The
`hl.on("hyprland.start", …)` hook itself stays intact.

### `packages/pacman.txt`

**Diff shape.**
- Add `uwsm` under the "Hyprland compositor + first-party ecosystem"
  block (it's a Hyprland-adjacent tool from `extra`).
- Remove `polkit-gnome` from the "Core desktop pieces" block.
- Add `hyprpolkitagent` to the same block, replacing the polkit-gnome
  line, with an inline comment noting it's enabled via `install.sh`.
- swaync line: **untouched** (still present; Slice D removes it later).

Net diff: +2 lines (uwsm, hyprpolkitagent), -1 line (polkit-gnome),
1 inline comment updated.

### `install.sh`

**New work inside `enable_services()` (between SDDM detect and SDDM
enable, plus a new tail block):**

```bash
write_sddm_default_session() {
    # Idempotent writer for the SDDM default-session drop-in.
    # Writes only if file is absent or content differs.
    local drop_in="/etc/sddm.conf.d/10-default-session.conf"
    local desired
    desired=$(cat <<'EOF'
[Autologin]
Session=hyprland-uwsm.desktop
EOF
)
    if [[ -f "$drop_in" ]] && diff -q <(printf '%s\n' "$desired") "$drop_in" >/dev/null 2>&1; then
        c_ok "SDDM default-session drop-in already present and current"
        return 1   # file unchanged → caller suppresses first-time hint
    fi
    printf '%s\n' "$desired" | sudo install -D -m 0644 /dev/stdin "$drop_in"
    c_ok "wrote $drop_in (default session: hyprland-uwsm)"
    return 0       # file changed/created → caller may print first-time hint
}

enable_hyprpolkitagent() {
    if ! pacman -Q hyprpolkitagent >/dev/null 2>&1; then
        c_warn "hyprpolkitagent not installed — skipping user-service enable"
        return
    fi
    if ! systemctl --user is-system-running >/dev/null 2>&1 \
         && ! systemctl --user list-units >/dev/null 2>&1; then
        c_warn "no reachable user systemd instance — run \`systemctl --user enable hyprpolkitagent.service\` manually after first login"
        return
    fi
    if systemctl --user is-enabled hyprpolkitagent.service >/dev/null 2>&1; then
        c_ok "hyprpolkitagent.service already enabled"
        return
    fi
    systemctl --user enable hyprpolkitagent.service
    c_ok "enabled hyprpolkitagent.service (user)"
}
```

**Call sites inside `enable_services()`:**

```bash
enable_services() {
    c_info "Enabling system services"

    if ! command -v systemctl >/dev/null 2>&1; then
        c_warn "systemctl not found — skipping service enabling"
        return
    fi

    local first_time_uwsm=0

    if pacman -Q sddm >/dev/null 2>&1; then
        if write_sddm_default_session; then
            first_time_uwsm=1
        fi
        if systemctl is-enabled sddm.service >/dev/null 2>&1; then
            c_ok "sddm.service already enabled"
        else
            sudo systemctl enable sddm.service
            c_ok "enabled sddm.service"
        fi
    else
        c_warn "sddm not installed — skipping enable + default-session drop-in"
    fi

    enable_hyprpolkitagent

    if (( first_time_uwsm )); then
        c_info "First-time uwsm setup detected:"
        c_info "  Log out of the current session and pick \"Hyprland (uwsm-managed)\""
        c_info "  at the SDDM greeter to land in the uwsm-managed session."
        c_info "  Subsequent logins will preselect it automatically."
    fi
}
```

**Net shape.** Two new helper functions (~25 lines each), one local
variable in `enable_services()`, one conditional log block. No changes
to `install_packages`, `link_configs`, or the main flow. Idempotent
end-to-end: a second run prints "already current" / "already enabled"
across the board and the first-time hint stays suppressed.

### `openspec/changes/desktop-redesign/tasks.md` — verification only

**No edit required.** Slice D task 4.6 reads literally:

> 4.6 Modify `config/hypr/hyprland.lua` line 47: DELETE `hl.exec_cmd("swaync")`
> from autostart block

Our post-change `hyprland.lua` line 47 will read `   hl.exec_cmd("swaync")`
(three-space indent + verbatim call). The text Slice D expects to delete
matches one-to-one. The tasks phase of *this* change adds a verification
step that explicitly greps `^   hl.exec_cmd\("swaync"\)$` against the
modified `hyprland.lua` and fails if absent.

## Sequence Flows

### Fresh install (clean machine → graphical Hyprland session)

1. User clones the repo.
2. User runs `./install.sh`.
3. `install_packages` installs `uwsm`, `hyprpolkitagent`, removes
   `polkit-gnome` (the latter only if pacman determines no other package
   requires it; harmless either way).
4. `enable_services` detects `sddm` is installed.
5. `write_sddm_default_session` finds `/etc/sddm.conf.d/10-default-session.conf`
   absent → writes it → returns 0 (changed) → `first_time_uwsm=1`.
6. `sudo systemctl enable sddm.service` runs (not yet enabled on a fresh
   machine).
7. `enable_hyprpolkitagent` finds the package, finds an unreachable user
   bus (no graphical session yet on a fresh install run from a TTY) →
   prints the manual-enable hint and returns.
8. `link_configs` symlinks `config/hypr` (and all siblings) into
   `~/.config/`.
9. The first-time uwsm hint is printed.
10. User reboots (or starts `sddm.service`).
11. SDDM starts, reads its drop-in chain, sees
    `[General]\nDefaultSession=hyprland-uwsm.desktop` (and the matching
    `[Autologin]` section), preselects "Hyprland (uwsm-managed)" at the
    greeter via `DefaultSession=`.
12. User enters password and presses Enter → SDDM execs
    `uwsm start -- hyprland.desktop` from `hyprland-uwsm.desktop`.
13. uwsm initializes `wayland-wm-env@hyprland.service`, then
    `wayland-wm@hyprland.service` (Hyprland compositor).
14. The Hyprland uwsm plugin exports `HYPRLAND_INSTANCE_SIGNATURE`,
    `WAYLAND_DISPLAY`, `XDG_RUNTIME_DIR`, `XDG_CURRENT_DESKTOP` to
    the user-systemd activation env.
15. `graphical-session.target` is reached.
16. `hyprpolkitagent.service` (now enable-able because the user bus is
    up) — wait: on a fresh install, the unit was NOT enabled in step 7.
    User must manually run `systemctl --user enable --now hyprpolkitagent.service`
    once, OR re-run `./install.sh` from a terminal inside the session
    (which on the second run finds a reachable user bus, enables the
    unit, and the next login picks it up). Documented in the hint.
17. Hyprland's autostart hook fires: `uwsm app -- ags run` and
    `uwsm app -- wl-paste --watch cliphist store` register as transient
    scopes in `app-graphical.slice`. `swaync` runs as a plain child
    process (Slice D will later delete this line).
18. AGS connects to Hyprland's IPC socket via `HYPRLAND_INSTANCE_SIGNATURE`
    — no polling fallback.

### In-place upgrade (existing bare-Hyprland install → uwsm-managed)

1. User `git pull`s the repo on a machine that already has dotfiles installed.
2. User runs `./install.sh`.
3. `install_packages` installs `uwsm` and `hyprpolkitagent`, leaves
   `polkit-gnome` alone (pacman will not auto-remove it; harmless).
4. `enable_services` detects `sddm` already installed and enabled.
5. `write_sddm_default_session` finds the file absent → writes it →
   `first_time_uwsm=1`.
6. `sddm.service` already enabled → "already enabled".
7. `enable_hyprpolkitagent`: the user IS in a graphical session
   (running install.sh from a terminal inside Hyprland), user bus is
   reachable → unit is enabled.
8. `link_configs` updates the `~/.config/hypr` symlink target if needed
   (it likely already points at the repo; no-op).
9. First-time uwsm hint printed.
10. User logs out of the current bare-Hyprland session.
11. SDDM picker now shows "Hyprland (uwsm-managed)" preselected (the
    drop-in is in place). Note: `RememberLastSession=true` may STILL
    preselect "Hyprland" if SDDM has a previous session record for this
    user. User picks the uwsm entry manually once; subsequent logins
    remember it.
12. The rest of the boot path matches steps 12–18 of the fresh-install
    flow. `hyprpolkitagent.service` is enabled this time around so polkit
    prompts work immediately.

### Rollback

1. `git revert <merge-sha>` → `hyprland.lua` autostart returns to its
   pre-change shape; `pacman.txt` re-adds `polkit-gnome` and drops
   `uwsm` / `hyprpolkitagent`; `install.sh` reverts.
2. User runs `./install.sh` from inside the (still-running) uwsm session.
   `install_packages` installs `polkit-gnome` and (depending on pacman's
   dependency reasoning) leaves `uwsm` / `hyprpolkitagent` installed but
   unrequired. The user can `sudo pacman -Rsn uwsm hyprpolkitagent` for
   cleanup; not required.
3. `enable_services` runs but the reverted `install.sh` no longer writes
   the SDDM drop-in. The drop-in is NOT removed automatically — `revert`
   only undoes the writer, not its prior output.
4. User manually removes the drop-in: `sudo rm /etc/sddm.conf.d/10-default-session.conf`,
   then `sudo systemctl restart sddm` from a TTY (or just lets the next
   reboot pick it up).
5. User logs out → SDDM picker no longer preselects uwsm. User picks
   "Hyprland" (the plain entry) — it is still installed because pacman
   owns it; we never deleted that session file.
6. Plain Hyprland session starts; autostarts (including the restored
   `polkit-gnome` exec line) run as before.

Total rollback steps: one `git revert`, one `install.sh` re-run, one
file deletion, one logout. ~5 minutes.

## Test / Verification Plan

All checks are manual on bare-metal (no test runner in this project).
The first eight are the success criteria from the proposal; the last
three are new checks specific to design decisions made above.

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | SDDM greeter shows "Hyprland (uwsm-managed)" preselected on fresh install | Picker highlights the uwsm entry by default; user only needs to type password + Enter |
| 2 | `systemctl --user status wayland-wm@hyprland.service` | `active (running)` |
| 3 | `systemctl --user status hyprpolkitagent.service` | `active (running)` |
| 4 | `pgrep -a -- "uwsm app"` | Lists both `ags run` and `wl-paste --watch cliphist store`; both inside `app-graphical.slice` per `systemctl --user status <scope>` |
| 5 | `hyprctl monitors` from any terminal in the session | Returns valid monitor JSON (confirms `HYPRLAND_INSTANCE_SIGNATURE` propagation) |
| 6 | AGS bar visual diff | Identical to pre-change (workspace updates, click events, no missing widgets) |
| 7 | `pgrep polkit-gnome` + `pkexec true` | `pgrep` empty; `pkexec true` triggers hyprpolkitagent prompt |
| 8 | Logout latency | Under 5 seconds (no 90 s systemd timeout) |
| 9 | `loginctl session-status` | Shows session bound to `wayland-session@hyprland.target` |
| 10 | swaync line preserved verbatim (ADR-4 boundary check) | `rg -n '^   hl.exec_cmd\("swaync"\)$' ~/.config/hypr/hyprland.lua` returns exactly one match on a line at or near 47 |
| 11 | `install.sh` idempotency | Second run prints "SDDM default-session drop-in already present and current", "sddm.service already enabled", "hyprpolkitagent.service already enabled"; no first-time hint |
| 12 | SDDM drop-in content | `cat /etc/sddm.conf.d/10-default-session.conf` outputs both `[General]\nDefaultSession=hyprland-uwsm.desktop` and `[Autologin]\nSession=hyprland-uwsm.desktop`; file owned by root, mode 0644 |

## Open Questions Resolved by This Design

1. **SDDM drop-in section header.** `[Autologin]\nSession=hyprland-uwsm.desktop`,
   with `User=` intentionally omitted. Verified against
   `/usr/lib/sddm/sddm.conf.d/default.conf` on the live machine.
   (ADR-3.)
2. **`systemctl --user daemon-reload` after enable.** Skipped. The unit
   file ships with the `hyprpolkitagent` package and is on disk before
   the enable; no generator changes occur; daemon-reload would be
   noise. (ADR-2.)
3. **User-facing log-out hint.** Printed by `install.sh` at the end of
   `enable_services()` only when `write_sddm_default_session` returned
   "file created/changed" on this run (i.e. true first-time). Exact
   text fixed in ADR-5. Spec phase formalizes "MUST print a hint when
   uwsm becomes the default for the first time".
4. **Detection of first-time uwsm vs already-uwsm.** File presence +
   content match on `/etc/sddm.conf.d/10-default-session.conf`. The
   writer function returns 0 on write, 1 on already-current; caller
   uses that exit status to decide whether to print the hint. No
   separate state file, no package-state heuristic. (ADR-5.)
