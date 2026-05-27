---
source: engram
topic_key: sdd/uwsm-adoption/proposal
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Proposal: uwsm-adoption — Wrap Hyprland in systemd user scope via uwsm

## Intent

The Hyprland session is launched bare by SDDM, with autostarts run as orphan child processes via `hl.exec_cmd` inside `hl.on("hyprland.start", …)`. No systemd user units track them, so logout can hang for up to 90 seconds, env vars (notably `HYPRLAND_INSTANCE_SIGNATURE`) propagate only by inheritance, and crashed daemons stay dead. Adopting `uwsm` brings Hyprland into a proper `wayland-session@hyprland.target` graph: clean teardown, deterministic env propagation, per-process slices, and a clear future path to promote daemons to managed units. Doing it now also gives `desktop-redesign` Slice D a stable autostart shape to delete `swaync` from instead of moving against a target that is being rewritten.

## Scope

### In Scope
- Add `uwsm` to `packages/pacman.txt`.
- Swap `polkit-gnome` for `hyprpolkitagent` in `packages/pacman.txt` (drop the polkit-gnome line, add `hyprpolkitagent`).
- Wrap surviving autostart commands in `config/hypr/hyprland.lua` with `uwsm app --` (Approach A) for `ags run` and `wl-paste --watch cliphist store`.
- Delete the `polkit-gnome-authentication-agent-1` exec line; replace its role with `systemctl --user enable hyprpolkitagent.service` invoked once by `install.sh`.
- Update `install.sh` to (a) `loginctl enable-linger $USER` is NOT required (uwsm runs inside the login session); (b) `systemctl --user enable hyprpolkitagent.service` after package install; (c) set SDDM `defaultSession=hyprland-uwsm` via a managed drop-in (e.g. `/etc/sddm.conf.d/10-default-session.conf`) so clean installs land on the uwsm session.
- Document the user-facing change in `install.sh` output and add a short note to the change README/explore mirror.

### Out of Scope
- Wrapping `swaync` with `uwsm app --` — `desktop-redesign` Slice D deletes that line entirely; wrapping it now creates an immediate deletion target with no benefit.
- Approach D (dedicated `~/.config/systemd/user/*.service` units for persistent daemons like `wl-paste`). Deferred to a follow-up change once Approach A is verified on bare metal.
- AGS-as-a-systemd-unit. AGS is a Glib app loop, not a daemon; inline `uwsm app --` is the documented pattern until AGS ships its own unit.
- Switching D-Bus implementation (dbus-broker vs reference). CachyOS already ships dbus-broker; no action needed.
- Any changes to `config/ags/service/hyprland.ts`. Env propagation is confirmed; the socket path will resolve under uwsm without code changes.
- Touching `desktop-redesign` artifacts. The two changes sequence cleanly; uwsm-adoption ships first, desktop-redesign Slice D then deletes the plain `hl.exec_cmd("swaync")` line.

## Capabilities

### New Capabilities
- `session-management`: how the Hyprland desktop session is launched, supervised, and torn down by systemd-user under uwsm, including SDDM default-session selection and the contract for autostart wrapping.

### Modified Capabilities
None — no existing spec files in `openspec/specs/` to modify.

## Approach

Approach A (inline `uwsm app --` wrapping) from exploration. Minimal-diff migration: keep the existing `hl.on("hyprland.start", …)` hook, prefix each surviving exec with `uwsm app --` so the daemon runs as a transient scope inside `app-graphical.slice`. Drop the polkit exec line entirely and replace it with `hyprpolkitagent.service` enabled at install time. Install `uwsm`; SDDM auto-discovers `/usr/share/wayland-sessions/hyprland-uwsm.desktop`. Force selection of that session via a managed SDDM drop-in so a clean install reboots into the uwsm-managed session without manual picker interaction.

### Alternatives Considered

- **Approach B (dedicated user units for every daemon):** Rejected for this change. Adds 3 new `.service` files to track in the dotfiles, requires `systemctl --user enable` plumbing in `install.sh` per service, and inflates scope without a concrete current pain point. Revisit if `wl-paste` crashes are observed or if we want `Restart=on-failure` semantics.
- **Approach C (XDG `.desktop` files in `~/.config/autostart/`):** Rejected. Drops the dotfiles' ability to track autostart in version control naturally (the files would live outside `config/`), removes ordering control, and `ags run` does not ship a canonical `.desktop` autostart entry.
- **Approach D (hybrid: units for persistent daemons + inline for AGS):** Rejected for THIS change, kept as the natural successor. Same complexity as B but more surgical. We will revisit once Approach A is verified bare-metal-stable and once `wl-paste` warrants restart-on-failure.

Flip conditions for moving to D: any observed `wl-paste` crash in normal use, OR adoption of additional persistent daemons (e.g. an idle inhibitor, a status notifier proxy), OR a measured shutdown-timeout regression tied to a non-unit-managed process.

### Boundary with desktop-redesign

`desktop-redesign` Slice D (currently pending in `openspec/changes/desktop-redesign/tasks.md`, task 4.6) deletes `hl.exec_cmd("swaync")` from `config/hypr/hyprland.lua` line 47. This proposal deliberately does NOT wrap that line. After uwsm-adoption merges, `hyprland.lua` line 47 still reads `hl.exec_cmd("swaync")` verbatim, and Slice D's `sd`/delete patch applies cleanly without modification. The two changes sequence as: uwsm-adoption merges → desktop-redesign resumes from Slice A → Slice D deletes the unchanged swaync line. No coordination, no rebase friction.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/pacman.txt` | Modified | Add `uwsm`. Remove `polkit-gnome`. Add `hyprpolkitagent`. Update inline comment on swaync line if needed. |
| `config/hypr/hyprland.lua` | Modified | Lines 46–50: wrap `ags run` and `wl-paste --watch cliphist store` with `uwsm app --`. Delete the `polkit-gnome-authentication-agent-1` exec line. Leave `swaync` line untouched (owned by desktop-redesign Slice D). |
| `install.sh` | Modified | After package install: `systemctl --user enable hyprpolkitagent.service` (idempotent, guarded by `pacman -Q hyprpolkitagent`). Add SDDM default-session drop-in writer that creates `/etc/sddm.conf.d/10-default-session.conf` with `[Autologin]`-adjacent `[General]\nSession=hyprland-uwsm` content (use the SDDM-documented `[Autologin]` or `[General]` section as appropriate — spec phase resolves exact key). Idempotent: only write if file differs or absent. |
| `config/ags/service/hyprland.ts` | Unchanged | Env propagation confirmed by uwsm's Hyprland plugin (`UWSM_FINALIZE_VARNAMES` includes `HYPRLAND_INSTANCE_SIGNATURE`). |
| `openspec/changes/uwsm-adoption/proposal.md` | New | This file. |
| Engram `sdd/uwsm-adoption/proposal` | New | Topic key for proposal artifact. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SDDM drop-in syntax wrong → no boot to graphical session | Low | Drop-in writer is idempotent and only sets `defaultSession`; user can still pick the plain Hyprland session at the SDDM picker. Verify the file in spec/design phase against SDDM docs (`man sddm.conf`). |
| `hyprpolkitagent.service` not auto-enabled on fresh install | Low | `install.sh` explicitly runs `systemctl --user enable hyprpolkitagent.service` after package install. Guarded by `pacman -Q hyprpolkitagent` so re-runs are safe. |
| Autostart timing changes — AGS racing Hyprland readiness | Low | `uwsm app` runs inside `app-graphical.slice` which orders after `graphical-session.target`. Hyprland's uwsm plugin blocks readiness on `HYPRLAND_INSTANCE_SIGNATURE`, so AGS will not start before the socket exists. |
| User-on-bare-metal upgrades but stays on the plain Hyprland SDDM entry | Low | Default-session drop-in selects `hyprland-uwsm` on fresh installs; for in-place upgrades the user re-runs `install.sh` which writes the drop-in. Document in PR description. |
| Hyprland wiki labels uwsm "for advanced users" — possible upstream churn | Medium | We pin behavior to documented `uwsm app --` and `wayland-wm@hyprland.service` interfaces; both are stable. Rollback path is one commit. |
| Existing session running under plain Hyprland during install does not switch automatically | Expected | User must log out/in once. Documented in install.sh output. |
| `polkit-gnome` removal breaks polkit prompts for users mid-session before re-login | Low | The replacement (`hyprpolkitagent.service`) is enabled in the install step; a fresh login picks it up. Mid-session, the old polkit-gnome process keeps running until logout. |

## Rollback Plan

1. Revert the single commit containing this change: `git revert <sha>`.
2. (Optional) Uninstall the now-unused package: `sudo pacman -Rs uwsm hyprpolkitagent && sudo pacman -S polkit-gnome` to restore the prior polkit agent. Not required if disk space is irrelevant.
3. (Optional) Remove the SDDM drop-in: `sudo rm /etc/sddm.conf.d/10-default-session.conf` then `sudo systemctl restart sddm` from a TTY. SDDM falls back to its built-in default session ordering. Alternative: select "Hyprland" (not "Hyprland (uwsm-managed)") at the SDDM picker on next login.
4. Log out and back in. The plain `hyprland.desktop` session is still installed (we never removed it) so this is a one-step recovery at the picker level even without uninstalling `uwsm`.

Rollback complexity: low. The change is additive (one new package, one polkit swap, one SDDM drop-in, one Lua autostart wrap). No state migration. No data loss path.

## Dependencies

- `uwsm` package available in CachyOS `extra/any` (verified in exploration).
- `hyprpolkitagent` package available in CachyOS extra (verified via Hyprland wiki link in exploration).
- `desktop-redesign` Slice A0 is already committed; this change targets `main` and is independent of slices A–D. Sequencing requirement: this change MUST merge before `desktop-redesign` resumes Slice A so the autostart shape Slice D will edit is the final, post-uwsm form.

## Success Criteria

Verified by hand on bare-metal post-install:

- [ ] SDDM picker shows "Hyprland (uwsm-managed)" pre-selected (via `defaultSession=hyprland-uwsm`).
- [ ] `systemctl --user status wayland-wm@hyprland.service` shows `active (running)` after login.
- [ ] `systemctl --user status hyprpolkitagent.service` shows `active (running)` after login.
- [ ] `pgrep -a -- "uwsm app"` lists both `ags run` and `wl-paste --watch cliphist store` as transient scopes under `app-graphical.slice`.
- [ ] `hyprctl monitors` returns valid output from any terminal in the session (confirms `HYPRLAND_INSTANCE_SIGNATURE` is propagated to user units).
- [ ] The AGS bar renders identically to the pre-change state (visual diff: no missing widgets, workspace updates work, click events fire).
- [ ] `pgrep polkit-gnome` returns empty; a polkit prompt (e.g. `pkexec true`) is handled by hyprpolkitagent.
- [ ] Logout from Hyprland completes in under 5 seconds (no 90-second systemd timeout).
- [ ] `loginctl session-status` shows the active session bound to `wayland-session@hyprland.target`.
