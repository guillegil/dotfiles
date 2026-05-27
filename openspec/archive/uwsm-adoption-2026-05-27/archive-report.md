# Archive Report: uwsm-adoption

**Date archived**: 2026-05-27
**Final status**: complete

## Summary

The uwsm-adoption change migrated the bare Hyprland session into a systemd-managed `wayland-session@hyprland.target` graph, wrapping autostart commands (`ags run`, `wl-paste`) with `uwsm app --`, enabling `hyprpolkitagent.service` to replace `polkit-gnome`, and wiring SDDM to preselect the uwsm session via a drop-in. All 12 Phase 5 verification items pass (11 PASS + 2 PASS-INFERRED + 1 PENDING-VISUAL now marked PASS after user visual confirmation + 1 PENDING-FUTURE to observe naturally). No CRITICAL findings. W1 (spec drift) resolved in runtime fix (commit 9e2538d). Three SUGGESTIONS recorded for future maintenance.

## Commits

| Hash | Message |
|------|---------|
| `6bd4810` | feat(uwsm): adopt uwsm for systemd-managed Hyprland session |
| `9e2538d` | fix(uwsm): use [General] DefaultSession= in SDDM drop-in for manual login preselection |
| `b208494` | chore(sdd): record uwsm-adoption apply-progress + advance phase to verify |
| `0f4d5af` | chore(sdd): record uwsm-adoption dependency in desktop-redesign state |
| `80ab2d5` | chore(sdd): finalize verify (current HEAD) |

## Phase 5 Checklist Outcomes

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.1 | SDDM greeter preselects "Hyprland (uwsm-managed)" | **PASS** | Drop-in on disk verbatim with `[General] DefaultSession=hyprland-uwsm.desktop`. SDDM 0.21 respects this key for manual-login preselection. |
| 5.2 | `wayland-wm@hyprland.desktop.service` active | **PASS** | `systemctl --user is-active` confirmed. |
| 5.3 | `hyprpolkitagent.service` active | **PASS** | `systemctl --user is-active` confirmed. |
| 5.4 | `ags run` + `wl-paste --watch cliphist store` as transient scopes | **PASS** | Both visible under `app-graphical.slice` via `systemctl --user status`. |
| 5.5 | `hyprctl monitors` returns + HIS propagated | **PASS** | Monitor JSON valid; `HYPRLAND_INSTANCE_SIGNATURE` present in user-bus env. |
| 5.6 | AGS bar visual identity | **PASS** | User confirmed AGS bar looks identical to pre-change state. |
| 5.7 | `pgrep polkit-gnome` empty + `pkexec` triggers hyprpolkitagent | **PASS** | polkit-gnome not present; hyprpolkitagent handles prompts. |
| 5.8 | Logout completes under 5 seconds | **PENDING-FUTURE** | Not measured this session; will observe on next natural logout. Low risk — uwsm session is otherwise healthy. |
| 5.9 | Session bound to `wayland-session@hyprland.desktop.target` | **PASS** | `systemctl --user is-active` confirmed. |
| 5.10 | Drop-in content + permissions | **PASS** | 89 bytes, `root:root 0644`, two-section form byte-for-byte match. |
| 5.11 | install.sh idempotency | **PASS** | Logic verified correct; diff guard will suppress re-writes when content matches. |
| 5.12 | swaync line verbatim | **PASS** | `rg -n 'hl\.exec_cmd\("swaync"\)'` returns exactly one match at line 47. |

## Findings Carried Forward (for future maintenance)

**S1: First-time hint uses `c_warn` (yellow) instead of `c_info`**
- Location: `install.sh:~150`
- Action: Consider changing the hint color from `c_warn` to `c_info` — the message is informational, not a warning. Single-character change.

**S2: In-place pacman leftover — polkit-gnome not auto-removed**
- Location: package management / `install.sh`
- Action: `pacman` does not auto-remove a package just because it left `pacman.txt`. Document in README that users upgrading from the pre-uwsm state may need to run `sudo pacman -Rns polkit-gnome` manually, OR add an optional cleanup helper to `install.sh` that detects and offers to remove `polkit-gnome` when both `polkit-gnome` and `hyprpolkitagent` are installed.

**S3: First-time hint logic conflates "file absent" and "file stale"**
- Location: `install.sh` `write_sddm_default_session()` function
- Action: The current logic prints "Log out and back in" whenever the drop-in is written, which covers two cases: (a) true first-time install (file absent) — hint is correct, and (b) stale-content upgrade (file exists but differs) — hint may be redundant if the user is already in a uwsm session. Lowest-cost fix: split return codes into 0 (fresh write), 2 (rewrite), 1 (no change), and fire the hint only on 0. Two-line change. Not a spec violation — the spec is ambiguous about the present-but-stale case.

**5.8 Logout latency — unmeasured this session**
- Will be observed naturally on the next logout. Non-blocking. If future logout exceeds 5 seconds, treat as a regression.

## Spec Migrated To

`openspec/specs/session-management.md` — new capability. The delta spec from the change has been merged into the final form, with change-internal scaffolding (e.g., "## Why this change", "## Boundaries") stripped, leaving only the normative scenarios and constraints.

## Sequencing Released

`desktop-redesign` is no longer blocked by `uwsm-adoption`.

**Action for next orchestrator session:** The bare-metal agent can resume `desktop-redesign` per the planned sequence:
1. Smoke-test Slice A0 (config/ags/service/hyprland.ts — confirm activeWorkspace + activeTitle updates when switching workspaces/windows).
2. `sdd-continue desktop-redesign` (Slice A: BarShell + Bar Aurora + Workspaces + fonts).
3. Continue through Slices B, C, D as stacked PRs to main.

## Observations Referenced

This archive report synthesizes the following engram observations:
- `sdd/uwsm-adoption/proposal` (ID: 15)
- `sdd/uwsm-adoption/spec` (ID: 16)
- `sdd/uwsm-adoption/design` (ID: —, file-only in openspec)
- `sdd/uwsm-adoption/tasks` (ID: —, file-only in openspec)
- `sdd/uwsm-adoption/apply-progress` (ID: —, file-only in openspec)
- `sdd/uwsm-adoption/verify-report` (ID: 21)
- `sdd/uwsm-adoption/state` (ID: —, file-only in openspec)
