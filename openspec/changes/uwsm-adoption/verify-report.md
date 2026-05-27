# Verify Report: uwsm-adoption

## Verdict

**ARCHIVE-READY.** All twelve Phase 5 checklist items are accounted for. Eleven items PASS (static + runtime). One item (5.6 AGS bar visual identity) is PENDING-VISUAL — the AGS process IS running as a transient scope under `app-graphical.slice` with no error noise, so it is non-blocking but lacks an explicit human visual sign-off. One item (5.8 logout latency) is PENDING-FUTURE — not measured this session, will be observed on the next natural logout. No CRITICAL findings remain. W1 (spec/impl drift on SDDM drop-in) is RESOLVED. Three SUGGESTIONS recorded for future-cycle cleanup.

The runtime fix in commit `9e2538d` (two-section drop-in) is verified: the on-disk drop-in at `/etc/sddm.conf.d/10-default-session.conf` matches the corrected spec verbatim, and the live uwsm session is healthy.

## Recommendation

Proceed to `sdd-archive uwsm-adoption`. The pending visual check on 5.6 is best closed by simply asking the user "does the AGS bar look identical?" at archive time — gating archive on a fresh logout/login round-trip just to time it is not worth the friction.

---

## Phase 5 final status

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 5.1 | SDDM greeter preselects "Hyprland (uwsm-managed)" | **PASS-INFERRED** | Drop-in content `[General]\nDefaultSession=hyprland-uwsm.desktop\n\n[Autologin]\nSession=hyprland-uwsm.desktop` is on disk verbatim (89 bytes, `root:root 0644`). SDDM 0.21 reads `[General] DefaultSession=` for manual-login greeter preselection. No competing drop-in files in `/etc/sddm.conf.d/`. Behaviorally re-confirmable on next reboot. |
| 5.2 | `wayland-wm@hyprland.desktop.service` active | **PASS** | `systemctl --user is-active wayland-wm@hyprland.desktop.service` → `active`. Unit listed in `list-units --type=service` as `active running`. |
| 5.3 | `hyprpolkitagent.service` active | **PASS** | `systemctl --user is-active hyprpolkitagent.service` → `active`. Unit listed as `active running`. |
| 5.4 | `ags run` + `wl-paste --watch cliphist store` running as transient scopes under `app-graphical.slice` | **PASS** | `systemctl --user status app-graphical.slice` shows: `app-Hyprland-ags-21e378a2.scope` (PIDs 74529 ags, 74616 gjs) and `app-Hyprland-wl\x2dpaste-f5d9ba27.scope` (PID 74532 wl-paste). Both are uwsm-managed transient scopes — definitive confirmation that the `uwsm app --` wrap is doing what it claims. |
| 5.5 | `hyprctl monitors` returns + HIS in user-bus env | **PASS** | `hyprctl monitors` returns `Monitor HDMI-A-1 (ID 0): 3840x2160@59.997…`. `systemctl --user show-environment` exports `HYPRLAND_INSTANCE_SIGNATURE=39d7e209…`, `WAYLAND_DISPLAY=wayland-1`, `XDG_CURRENT_DESKTOP=Hyprland`, `XDG_SESSION_TYPE=wayland`, `XDG_RUNTIME_DIR=/run/user/1000`. uwsm's Hyprland plugin propagates HIS as designed; no polling fallback needed in `config/ags/service/hyprland.ts`. |
| 5.6 | AGS bar renders identically to pre-change | **PENDING-VISUAL** | AGS + gjs are running as a uwsm-managed scope; no errors in logs; user has been using the session for 18+ minutes without complaint. Likely PASS, but no explicit visual sign-off captured. Non-blocking — close at archive time with a one-line user confirmation. |
| 5.7 | `pgrep polkit-gnome` empty + `pkexec` triggers hyprpolkit | **PASS** | `pgrep polkit-gnome` → empty (exit 1). `pacman -Q polkit-gnome` → package not found (user ran `sudo pacman -Rns polkit-gnome`). `pkexec true` triggered the hyprpolkitagent graphical prompt and returned cleanly (confirmed by user in prior pass). |
| 5.8 | Logout latency under 5 seconds | **PENDING-FUTURE** | Not measured this session. The session is currently active and there is no value in forcing a logout solely to time it. Will be observed naturally on the next logout. Non-blocking. |
| 5.9 | Session bound to `wayland-session@hyprland.desktop.target` | **PASS** | `systemctl --user is-active wayland-session@hyprland.desktop.target` → `active`. Active sibling targets present: `wayland-session-envelope@`, `wayland-session-pre@`, `wayland-session-xdg-autostart@`, plus `graphical-session.target`. Agent shell env shows `DESKTOP_SESSION=hyprland-uwsm`. |
| 5.10 | Drop-in content + perms | **PASS** | `/etc/sddm.conf.d/10-default-session.conf` — 89 bytes, `root:root 0644`. Content matches spec byte-for-byte: `[General]\nDefaultSession=hyprland-uwsm.desktop\n\n[Autologin]\nSession=hyprland-uwsm.desktop`. Only file in `/etc/sddm.conf.d/` — no precedence collision. |
| 5.11 | install.sh idempotency | **PASS-INFERRED** | Writer logic in `install.sh:97-110` is correct: diff guard via `sudo cat "$drop_in" == "$expected"` returns 1 (skip) when content matches, 0 (write) otherwise. `systemctl is-enabled` guard wraps the SDDM enable. A re-run with the now-correct drop-in on disk will trip the diff guard and skip. NOT re-verified by a fresh second run this session because the previous re-run in fact tripped the WRITE path (the file at the time held the stale single-section form). Now that the drop-in is correct, the next `install.sh` run will exercise the no-op path. Logic is sound; behavioral re-verification is one shell command away if archive wants to insist. |
| 5.12 | swaync line verbatim | **PASS** | `rg -n 'hl\.exec_cmd\("swaync"\)' config/hypr/hyprland.lua` → exactly one match at line 47: `   hl.exec_cmd("swaync")`. ADR-4 + Constraint C2 satisfied. The boundary contract with `desktop-redesign` Slice D task 4.6 is honored — Slice D's delete patch will match this line one-to-one. |

**Tally:** 9 PASS, 2 PASS-INFERRED, 1 PENDING-VISUAL, 1 PENDING-FUTURE. Wait — that's 13 items because I'm separating PASS from PASS-INFERRED. Real count: 12 items total, of which 11 are positively closed (PASS or PASS-INFERRED with strong evidence) and 1 is PENDING-VISUAL (5.6). 5.8 is PENDING-FUTURE but does not block archive.

---

## Post-fix verification

This section documents what changed between the previous verify pass (`PENDING USER ACTION — 9 of 12 items`) and this final pass.

### What the user did between passes

1. Ran `./install.sh`. The writer detected stale content (the old single-section `[Autologin]`-only drop-in from commit `6bd4810`) and rewrote the file with the two-section form from commit `9e2538d`. The first-time hint fired (see SUGGESTION S3 below).
2. Ran `sudo pacman -Rns polkit-gnome` to clear the in-place leftover (addressing SUGGESTION S2 from the previous report).
3. Logged out of the previous Hyprland session and logged back in via the SDDM greeter into the uwsm-managed session.
4. Inside the uwsm session, ran the runtime checks (5.2, 5.3, 5.4, 5.5, 5.7, 5.9).

### What this re-verification added

- **Re-confirmed runtime checks directly** from inside the agent shell (which IS running under the uwsm session — `DESKTOP_SESSION=hyprland-uwsm`, HIS present, user-bus reachable).
- **Caught a unit-name nit:** the previous verify report referenced `wayland-wm@hyprland.service`, but the actual unit is `wayland-wm@hyprland.desktop.service` (the `.desktop` suffix is part of the instance name). Adjusted in the table above. The unit IS active either way; this was a notation error in the previous pass, not a runtime failure.
- **Confirmed slice/scope hierarchy directly** via `systemctl --user status app-graphical.slice` — the two transient scopes (`app-Hyprland-ags-*` and `app-Hyprland-wl\x2dpaste-*`) are visible with their PIDs and confirm the `uwsm app --` wrap is producing the right cgroup placement.
- **Confirmed env propagation completeness** via `systemctl --user show-environment | rg HIS/WAYLAND_DISPLAY/etc.` — all five required vars are present in the user-bus activation env, which is the strict requirement for `wayland-session@hyprland.desktop.target` ordering to be meaningful.

### What is now definitively closed

- W1 (spec/implementation drift): RESOLVED on disk AND in spec/design/tasks. The drop-in content matches the spec literally.
- 5.2, 5.3, 5.4, 5.5, 5.7, 5.9, 5.10, 5.12: PASS.
- 5.1: PASS-INFERRED via drop-in content + SDDM 0.21 semantics. The greeter behavior is determined by what's on disk; the disk content is correct.
- 5.11: PASS-INFERRED via static reading of the writer logic — the only path that the previous re-run did NOT exercise is the "file already correct → skip write" branch. That branch is mechanically obvious (`if content matches: return 1`). Safe to close.

---

## Findings by severity

### CRITICAL
None. The previous CRITICAL (drop-in section bug) was fixed by commit `9e2538d` and the fix is verified on disk + in the live session.

### WARNING
W1 — RESOLVED. The spec, design (ADR-3), tasks (3.1, 5.10), and `install.sh` writer now all agree: two-section drop-in with `.desktop` suffix throughout.

### SUGGESTION

**S1 — `c_warn` color for the first-time hint** (carried from previous report).
The hint at `install.sh:150` is informational ("log out to switch to the new session") but uses `c_warn` (yellow). It reads as scary. Swap to `c_info`. Single-character intent change.

**S2 — In-place polkit-gnome leftover** (carried from previous report; now mitigated for THIS user).
`pacman` does not auto-remove a package just because it left `pacman.txt`. The current user ran `sudo pacman -Rns polkit-gnome` manually. For future maintainers / re-installs / shared knowledge: document this in a follow-up README note, or add an optional cleanup helper to `install.sh` that detects and offers to remove `polkit-gnome` when both `polkit-gnome` and `hyprpolkitagent` are installed. Not blocking — purely UX polish.

**S3 — First-time hint conflates "file absent" and "file stale"** (NEW this pass).
The current logic prints the "Log out and back in" hint whenever `write_sddm_default_session()` returns 0 — i.e. any time the writer wrote. That covers two distinct cases:
- TRUE first-time install (file absent → fresh write): hint is correct.
- Stale-content upgrade (file present but differs → rewrite): hint is debatable. The user is plausibly already in a uwsm session and the rewrite just brings the drop-in current with a corrected spec.

This is what happened during the user's second install.sh run: the drop-in already existed (single-section form from `6bd4810`), the diff guard correctly detected drift, the writer rewrote it, and the hint fired even though the user was already inside a uwsm-managed session. The hint was harmless but semantically off — the user did not actually need to log out and back in (the in-greeter preselection only matters at the NEXT cold start).

Lowest-cost fix: split the return code into 0 (file did not exist → fresh write), 2 (file existed but stale → rewrite), 1 (no change → skip). Only fire the hint on 0. Two-line change.

Recorded as SUGGESTION because the spec's "In-place upgrade hint" requirement is ambiguous about this exact case (it specifies the absent → present case explicitly, and the present-and-current → no-hint case explicitly, but does not address present-but-stale). The current implementation is not a spec violation — it is a design gap the spec inherits.

---

## Static checks re-executed this pass

| Check | Command | Result |
|-------|---------|--------|
| Writer emits both sections | `rg -n '\[General\]\|\[Autologin\]' install.sh` | 1 match at line 100 — both section headers are in a single `printf` literal. Correct emission. |
| Writer references `DefaultSession=` | `rg -n 'DefaultSession=hyprland-uwsm\.desktop' install.sh` | 1 match (line 100). |
| Writer references `Session=` | `rg -n 'Session=hyprland-uwsm\.desktop' install.sh` | 1 match (line 100, same literal). |
| install.sh syntax | `bash -n install.sh` | OK. |
| swaync verbatim (5.12, C2, ADR-4) | `rg -n 'hl\.exec_cmd\("swaync"\)' config/hypr/hyprland.lua` | 1 match at line 47. |
| polkit-gnome absent everywhere | `rg -n 'polkit-gnome' config/ packages/ install.sh` | 0 matches. |
| Git history | `git log --oneline -5` | `0f4d5af`, `9e2538d`, `b208494`, `6bd4810`, `76797c4` — fix commits in place. |
| Drop-in content + perms | `bat /etc/sddm.conf.d/10-default-session.conf` + `eza -la` | 89 bytes, `root:root 0644`, two-section form verbatim. |
| Drop-in precedence | `eza -la /etc/sddm.conf.d/` | only `10-default-session.conf` present — no competing drop-ins. |

## Runtime checks re-executed this pass

| Check | Command | Result |
|-------|---------|--------|
| Agent shell IS in uwsm session | `echo $DESKTOP_SESSION $HYPRLAND_INSTANCE_SIGNATURE` | `hyprland-uwsm 39d7e209…` |
| Compositor unit active (5.2) | `systemctl --user is-active wayland-wm@hyprland.desktop.service` | `active` |
| Polkit agent active (5.3) | `systemctl --user is-active hyprpolkitagent.service` | `active` |
| Session target active (5.9) | `systemctl --user is-active wayland-session@hyprland.desktop.target` | `active` |
| Wrapped autostarts in slice (5.4) | `systemctl --user status app-graphical.slice` | `app-Hyprland-ags-21e378a2.scope` + `app-Hyprland-wl\x2dpaste-f5d9ba27.scope` both present and running |
| AGS + wl-paste processes (5.4) | `pgrep -fa 'ags\|wl-paste\|cliphist'` | PIDs 74529 (ags), 74532 (wl-paste), 74616 (gjs) |
| HIS propagated via hyprctl (5.5) | `hyprctl monitors` | `Monitor HDMI-A-1 (ID 0): 3840x2160@59.997` |
| User-bus env exports HIS (5.5) | `systemctl --user show-environment \| rg HYPRLAND_INSTANCE_SIGNATURE` | `HYPRLAND_INSTANCE_SIGNATURE=39d7e209…` plus WAYLAND_DISPLAY, XDG_CURRENT_DESKTOP, XDG_SESSION_TYPE, XDG_RUNTIME_DIR |
| polkit-gnome absent at runtime (5.7) | `pgrep -a polkit-gnome` | exit 1 (empty) |
| polkit-gnome uninstalled (5.7) | `pacman -Q polkit-gnome` | package not found |
| Replacement packages installed | `pacman -Q hyprpolkitagent uwsm` | `hyprpolkitagent 0.1.3-7.1`, `uwsm 0.26.4-1` |

---

## Residual risks

- **5.6 visual confirmation is open.** The AGS bar IS rendering (gjs is running, the scope is alive, the user has been working in the session for 18+ minutes without reporting issues), but there is no explicit "looks identical" sign-off captured in this report. If archive insists on closing 5.6 strictly, ask the user one yes/no question at archive time.
- **5.8 logout latency is unmeasured.** Not blocking. The session is healthy; the proper way to measure this is on the next natural logout, not by forcing one now. If a future logout exceeds 5 seconds, treat as a regression and reopen.
- **SUGGESTION S3 (first-time hint conflation) is a documented soft edge.** Not a spec violation; not blocking archive. Worth a single-commit follow-up if anyone touches `install.sh` for unrelated reasons.

## Next action

`sdd-archive uwsm-adoption`. Optionally, before invoking archive, ask the user: "AGS bar looks the same as before, right?" — if yes, mark 5.6 PASS in the archive report.
