---
source: engram
topic_key: sdd/uwsm-adoption/spec
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence. The engram copy at
  topic_key sdd/uwsm-adoption/spec remains authoritative for in-session
  evolution. Re-export via mem_get_observation to refresh.
---

# session-management Specification

## Purpose

Defines what MUST be true after uwsm-adoption is applied: how the Hyprland
desktop session is launched, supervised, and torn down by systemd-user under
uwsm; how SDDM selects the uwsm-managed session by default; how autostart
commands are wrapped; how polkit is migrated; how HYPRLAND_INSTANCE_SIGNATURE
reaches all user units; and how install.sh writes the SDDM drop-in
idempotently.

---

## Constraints (apply to all capabilities)

| ID | Constraint |
|----|------------|
| C1 | Hyprland configuration MUST remain in `config/hypr/hyprland.lua` (Lua). `hyprland.conf` MUST NOT be created or edited. |
| C2 | The `swaync` exec line (`hl.exec_cmd("swaync")`) MUST NOT be wrapped with `uwsm app --`. It remains plain, owned by desktop-redesign Slice D which deletes it. |
| C3 | `config/ags/service/hyprland.ts` MUST NOT be modified. Env propagation is confirmed via uwsm's Hyprland plugin. |
| C4 | The SDDM drop-in writer in `install.sh` MUST be idempotent (write-if-differs semantics). |
| C5 | This change MUST merge before desktop-redesign Slice A resumes. |
| C6 | CachyOS already ships dbus-broker; no D-Bus configuration changes are required. |

---

## Requirements

### Requirement: Session launch via uwsm

The system MUST launch the Hyprland session through `uwsm` so that the
compositor and all its child units are tracked under a `wayland-session@hyprland.target`
systemd user scope. SDDM MUST default to the `hyprland-uwsm.desktop` session
on fresh installs so no manual picker interaction is required.

#### Scenario: Fresh install — SDDM defaults to uwsm session

- GIVEN `uwsm` is installed and `/usr/share/wayland-sessions/hyprland-uwsm.desktop` is present
- AND `/etc/sddm.conf.d/10-default-session.conf` exists with `[General]\nDefaultSession=hyprland-uwsm.desktop` and `[Autologin]\nSession=hyprland-uwsm.desktop`
- WHEN the user arrives at the SDDM login screen for the first time (manual password login, autologin NOT enabled)
- THEN SDDM pre-selects "Hyprland (uwsm-managed)" in the session picker via the `[General] DefaultSession=` key

#### Scenario: Successful uwsm session start

- GIVEN the user logs in via `hyprland-uwsm.desktop`
- WHEN Hyprland finishes its startup handshake with uwsm
- THEN `systemctl --user status wayland-wm@hyprland.service` shows `active (running)`
- AND `loginctl session-status` shows the session bound to `wayland-session@hyprland.target`

#### Scenario: Clean shutdown

- GIVEN the user is in an active uwsm-managed Hyprland session
- WHEN the user triggers logout (e.g., via keybind or `hyprctl dispatch exit`)
- THEN the session terminates in under 5 seconds
- AND no orphan compositor or autostart processes remain after logout

#### Scenario: Plain session still available for rollback

- GIVEN `uwsm` is installed and `hyprland-uwsm.desktop` is the SDDM default
- WHEN the user opens the SDDM session picker
- THEN the plain "Hyprland" session is still listed and selectable

---

### Requirement: Autostart wrapping

Commands in the `hl.on("hyprland.start", …)` block in `config/hypr/hyprland.lua`
that survive past desktop-redesign MUST be prefixed with `uwsm app --` so they
run as transient scopes inside `app-graphical.slice`. The `swaync` line MUST
NOT be wrapped (see Constraint C2).

Commands that MUST be wrapped:
- `ags run` → `uwsm app -- ags run`
- `wl-paste --watch cliphist store` → `uwsm app -- wl-paste --watch cliphist store`

The `polkit-gnome-authentication-agent-1` exec line MUST be deleted (replaced
by `hyprpolkitagent.service`; see polkit migration requirement).

#### Scenario: AGS starts as a transient scope

- GIVEN the Hyprland session is active under uwsm
- WHEN `hl.on("hyprland.start", …)` fires
- THEN `ags run` is started via `uwsm app -- ags run`
- AND the AGS process appears as a transient scope under `app-graphical.slice`
- AND the AGS bar renders identically to the pre-change state

#### Scenario: wl-paste starts as a transient scope

- GIVEN the Hyprland session is active under uwsm
- WHEN `hl.on("hyprland.start", …)` fires
- THEN `wl-paste --watch cliphist store` is started via `uwsm app -- wl-paste --watch cliphist store`
- AND the process appears as a transient scope under `app-graphical.slice`

#### Scenario: swaync line left plain

- GIVEN the Hyprland session starts under uwsm
- WHEN `hl.on("hyprland.start", …)` fires
- THEN `swaync` is started via the unmodified plain `hl.exec_cmd("swaync")` call
- AND the line reads identically to its pre-change form

#### Scenario: polkit-gnome exec line is absent

- GIVEN the Hyprland session starts under uwsm
- WHEN `hl.on("hyprland.start", …)` fires
- THEN NO call to `polkit-gnome-authentication-agent-1` is executed from the Lua config

---

### Requirement: polkit migration

`polkit-gnome` MUST be removed from `packages/pacman.txt` and replaced with
`hyprpolkitagent`. `install.sh` MUST enable `hyprpolkitagent.service` as a
systemd user service after package installation. The enable step MUST be
idempotent (safe to run multiple times).

#### Scenario: hyprpolkitagent enabled on fresh install

- GIVEN `install.sh` runs on a system where `hyprpolkitagent` was just installed
- WHEN the `enable_services` step executes
- THEN `systemctl --user enable hyprpolkitagent.service` is called
- AND subsequent logins show `systemctl --user status hyprpolkitagent.service` as `active (running)`

#### Scenario: enable step is idempotent

- GIVEN `install.sh` has been run once and `hyprpolkitagent.service` is already enabled
- WHEN `install.sh` is run again
- THEN the enable step completes without error
- AND the service unit is still enabled (not double-enabled or reset)

#### Scenario: polkit-gnome not present at runtime

- GIVEN the user completes a fresh login under the uwsm session
- WHEN a polkit prompt is triggered (e.g., mounting a drive)
- THEN `pgrep polkit-gnome` returns empty
- AND the prompt is handled by `hyprpolkitagent`

---

### Requirement: Environment propagation guarantee

`HYPRLAND_INSTANCE_SIGNATURE` MUST be available in the systemd user environment
by the time `graphical-session.target` is reached, without any polling fallback
in `config/ags/service/hyprland.ts`. This is guaranteed by uwsm's Hyprland
plugin which exports `HYPRLAND_INSTANCE_SIGNATURE` via `UWSM_FINALIZE_VARNAMES`
and waits on it via `UWSM_WAIT_VARNAMES`.

#### Scenario: AGS reads socket path without polling

- GIVEN the session launched via `hyprland-uwsm.desktop`
- WHEN AGS starts and `config/ags/service/hyprland.ts` initializes
- THEN `HYPRLAND_INSTANCE_SIGNATURE` is present in the process environment
- AND `hyprctl monitors` returns valid output from any terminal in the session
- AND the polling fallback branch in `hyprland.ts` is NOT triggered

#### Scenario: config/ags/service/hyprland.ts is not modified

- GIVEN the uwsm-adoption change is applied
- WHEN the file diff is inspected
- THEN `config/ags/service/hyprland.ts` has zero modifications (byte-for-byte identical to pre-change)

---

### Requirement: install.sh SDDM drop-in writer

`install.sh` MUST write `/etc/sddm.conf.d/10-default-session.conf` with the
following exact content to set SDDM's default session for both manual login
(greeter preselection) and optional autologin:

```
[General]
DefaultSession=hyprland-uwsm.desktop

[Autologin]
Session=hyprland-uwsm.desktop
```

**Defense in depth:** `[General] DefaultSession=` covers manual password login
(the common case) — SDDM uses this key to preselect a session in the greeter
before the user logs in. `[Autologin] Session=` covers users who later enable
autologin. Writing both sections ensures correct behavior regardless of whether
autologin is configured. The `[Autologin]` section alone is NOT sufficient for
manual login preselection; SDDM only reads it when `User=` is also set.

The write MUST follow write-if-differs semantics (idempotent):

```
if /etc/sddm.conf.d/10-default-session.conf does not exist
   OR its content differs from the expected content:
    mkdir -p /etc/sddm.conf.d/
    write expected content to file (requires sudo)
    print: "SDDM default session set to hyprland-uwsm.desktop."
else:
    print: "SDDM drop-in already up to date — skipped."
```

The writer MUST run as part of the package + services phase (after `enable_services`),
NOT in the `--link-only` code path.

#### Scenario: Drop-in written on first install

- GIVEN `/etc/sddm.conf.d/10-default-session.conf` does not exist
- WHEN `install.sh` runs without `--link-only`
- THEN the file is created with both `[General] DefaultSession=hyprland-uwsm.desktop` and `[Autologin] Session=hyprland-uwsm.desktop`
- AND the file is owned by root with mode 644
- AND the console prints "SDDM default session set to hyprland-uwsm.desktop."

#### Scenario: Drop-in skipped when already correct

- GIVEN `/etc/sddm.conf.d/10-default-session.conf` already contains the expected two-section content
- WHEN `install.sh` runs
- THEN the file is NOT overwritten
- AND the console prints "SDDM drop-in already up to date — skipped."

#### Scenario: Drop-in updated when content differs

- GIVEN `/etc/sddm.conf.d/10-default-session.conf` exists but contains stale content (e.g. the old single-section `[Autologin]`-only form)
- WHEN `install.sh` runs
- THEN the file is overwritten with the new two-section expected content
- AND the console prints "SDDM default session set to hyprland-uwsm.desktop."

#### Scenario: Drop-in skipped in link-only mode

- GIVEN `install.sh` is invoked with `--link-only`
- WHEN the script runs
- THEN the SDDM drop-in writer is NOT executed
- AND `/etc/sddm.conf.d/10-default-session.conf` is not created or modified

---

### Requirement: In-place upgrade hint

When `install.sh` runs on a system where the previous install did NOT have
`/etc/sddm.conf.d/10-default-session.conf` (indicating an upgrade from a
non-uwsm install), `install.sh` MUST print the following user-facing message
after writing the drop-in:

```
  ! Log out and back in to switch to the uwsm-managed Hyprland session.
```

This message MUST NOT be printed when the drop-in already exists and is
up to date (repeat runs on a system already running uwsm).

#### Scenario: Upgrade hint printed on first uwsm install

- GIVEN an in-place upgrade where no previous SDDM drop-in existed
- WHEN `install.sh` runs and writes the drop-in for the first time
- THEN the console prints the logout hint after the drop-in write confirmation

#### Scenario: Upgrade hint suppressed on repeat runs

- GIVEN `install.sh` was previously run and the drop-in is already up to date
- WHEN `install.sh` runs again
- THEN the logout hint is NOT printed

---

### Requirement: Rollback leaves no orphan units

A single `git revert <sha>` MUST be sufficient to restore the pre-change
autostart shape. After revert and re-login:
- `polkit-gnome` can be re-installed optionally; `hyprpolkitagent.service` stays
  installed until the user manually removes it (no data loss, no conflict).
- The plain `hyprland.desktop` session is always present and selectable at the
  SDDM picker (SDDM falls back to showing all available sessions when
  `[Autologin] Session=` is absent or the file is removed).
- No state migration is required.

#### Scenario: Code revert restores autostart

- GIVEN the uwsm-adoption commit is reverted via `git revert`
- AND `install.sh` is run again (or the user logs out/in)
- WHEN the Hyprland session starts (plain `hyprland.desktop`)
- THEN the autostart block in `hyprland.lua` matches the pre-change form
- AND `ags run`, `swaync`, `polkit-gnome-authentication-agent-1`, and `wl-paste` all exec directly without `uwsm app --`

#### Scenario: Optional SDDM drop-in removal

- GIVEN the revert commit is applied and the user optionally removes `/etc/sddm.conf.d/10-default-session.conf`
- WHEN SDDM restarts
- THEN SDDM presents all available sessions in the picker with no forced default
- AND the plain "Hyprland" session is selectable

---

## Package manifest changes (normative)

| Package | Action | File |
|---------|--------|------|
| `uwsm` | ADD | `packages/pacman.txt` |
| `polkit-gnome` | REMOVE | `packages/pacman.txt` |
| `hyprpolkitagent` | ADD | `packages/pacman.txt` |
