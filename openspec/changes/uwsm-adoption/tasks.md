---
source: engram
topic_key: sdd/uwsm-adoption/tasks
exported_at: 2026-05-27
---

# Tasks: uwsm-adoption — Wrap Hyprland in systemd user scope via uwsm

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~63 (additions + deletions across 3 files) |
| File count touched | 3 (`packages/pacman.txt`, `config/hypr/hyprland.lua`, `install.sh`) |
| Chained PRs recommended | No |
| 400-line budget risk | Low |
| Decision needed before apply | No — single PR, proceed directly |
| Delivery strategy | ask-on-risk (resolved: No split needed) |
| Chain strategy | stacked-to-main (single PR, N/A) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All uwsm-adoption changes | PR 1 → main | 3 files, ~63 lines, single atomic PR |

---

## Phase 1: Package Set Updates

- [ ] 1.1 Add `uwsm` to `packages/pacman.txt` — add line under "Hyprland compositor + first-party ecosystem" section; satisfies REQ:package-manifest, ADR-1.
- [ ] 1.2 Remove `polkit-gnome` from `packages/pacman.txt` — delete line 19 (the `polkit-gnome` entry); satisfies REQ:polkit-migration.
- [ ] 1.3 Add `hyprpolkitagent` to `packages/pacman.txt` — add line in "Core desktop pieces" section with inline comment `# polkit agent; enabled by install.sh`; satisfies REQ:polkit-migration.

## Phase 2: Hyprland Lua Autostart Edits

- [ ] 2.1 Wrap `ags run` with `uwsm app --` in `config/hypr/hyprland.lua` — change line 46 from `hl.exec_cmd("ags run")` to `hl.exec_cmd("uwsm app -- ags run")`; satisfies REQ:autostart-wrapping, Constraint C2.
- [ ] 2.2 Delete the `polkit-gnome-authentication-agent-1` exec line in `config/hypr/hyprland.lua` — remove line 49 (`hl.exec_cmd("/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1")`); replace with comment `-- polkit agent: hyprpolkitagent runs as a systemd user service`; satisfies REQ:polkit-migration.
- [ ] 2.3 Wrap `wl-paste --watch cliphist store` with `uwsm app --` in `config/hypr/hyprland.lua` — change line 50 from `hl.exec_cmd("wl-paste --watch cliphist store")` to `hl.exec_cmd("uwsm app -- wl-paste --watch cliphist store")`; satisfies REQ:autostart-wrapping.
- [ ] 2.4 Verify swaync line is untouched in `config/hypr/hyprland.lua` — confirm line 47 reads exactly `hl.exec_cmd("swaync")` verbatim; satisfies Constraint C2 / ADR-4.

## Phase 3: install.sh — SDDM Drop-in Writer

- [ ] 3.1 Add `write_sddm_default_session()` helper function to `install.sh` — implements write-if-differs semantics: heredoc content `[Autologin]\nSession=hyprland-uwsm.desktop`, diff guard, `sudo install -D -m 0644` atomic write, returns exit-0 on write/change and exit-1 on already-current; ~20 lines; satisfies REQ:sddm-drop-in-writer, Constraint C4.
- [ ] 3.2 Call `write_sddm_default_session()` inside `enable_services()` in `install.sh` — insert call BEFORE `sudo systemctl enable sddm.service`; capture return value into `local first_time_uwsm`; satisfies ADR-5 ordering contract.
- [ ] 3.3 Add first-time logout hint in `enable_services()` in `install.sh` — after the `sddm.service` enable block, print `! Log out and back in to switch to the uwsm-managed Hyprland session.` only when `first_time_uwsm` is 0 (writer returned success); satisfies REQ:in-place-upgrade-hint.

## Phase 4: install.sh — hyprpolkitagent User-Unit Enable

- [ ] 4.1 Add `enable_hyprpolkitagent()` helper function to `install.sh` — guards: `pacman -Q hyprpolkitagent` check; user-bus reachability check (`systemctl --user show-environment` or equivalent); runs `systemctl --user enable hyprpolkitagent.service` when both pass; prints warning and returns 0 (non-fatal) when either guard fails; ~15 lines; satisfies REQ:polkit-migration, ADR-2.
- [ ] 4.2 Call `enable_hyprpolkitagent()` inside `enable_services()` in `install.sh` — insert call AFTER `sudo systemctl enable sddm.service` (per ADR-5 ordering); satisfies ADR-5.

## Phase 5: Verification Checklist (Manual / Verify Phase)

- [ ] 5.1 Confirm SDDM greeter shows "Hyprland (uwsm-managed)" preselected on fresh install — verifies REQ:session-launch-via-uwsm scenario "Fresh install".
- [ ] 5.2 Confirm `systemctl --user status wayland-wm@hyprland.service` is `active (running)` — verifies REQ:session-launch-via-uwsm scenario "Successful uwsm session start".
- [ ] 5.3 Confirm `systemctl --user status hyprpolkitagent.service` is `active (running)` — verifies REQ:polkit-migration scenario "hyprpolkitagent enabled".
- [ ] 5.4 Confirm `pgrep -a -- "uwsm app"` lists both `ags run` and `wl-paste --watch cliphist store` under `app-graphical.slice` — verifies REQ:autostart-wrapping scenarios.
- [ ] 5.5 Confirm `hyprctl monitors` returns valid output (HIS propagated) — verifies REQ:env-propagation-guarantee.
- [ ] 5.6 Confirm AGS bar renders identically to pre-change state — verifies REQ:autostart-wrapping AGS scenario.
- [ ] 5.7 Confirm `pgrep polkit-gnome` is empty and `pkexec true` triggers hyprpolkitagent prompt — verifies REQ:polkit-migration runtime scenario.
- [ ] 5.8 Confirm logout completes under 5 seconds — verifies REQ:session-launch-via-uwsm "Clean shutdown" scenario.
- [ ] 5.9 Confirm `loginctl session-status` is bound to `wayland-session@hyprland.target` — verifies REQ:session-launch-via-uwsm scenario.
- [ ] 5.10 Confirm `/etc/sddm.conf.d/10-default-session.conf` content and permissions (`root:root 0644`, `[Autologin]\nSession=hyprland-uwsm.desktop`) — verifies REQ:sddm-drop-in-writer.
- [ ] 5.11 Confirm install.sh idempotency: second run prints "already" on all paths, no first-time hint — verifies Constraint C4 and REQ:upgrade-hint-suppressed.
- [ ] 5.12 Confirm swaync line verbatim: `rg -n 'hl\.exec_cmd\("swaync"\)' config/hypr/hyprland.lua` returns exactly one match — verifies Constraint C2 / ADR-4.

## Phase 6: Sequencing Guard

- [ ] 6.1 Confirm `desktop-redesign` state is still paused at `current_phase: apply, pending Slices A–D` — check `openspec/changes/desktop-redesign/state.yaml` before opening PR; uwsm-adoption MUST merge and verify before desktop-redesign Slice A resumes; satisfies Constraint C5 and proposal Boundary contract.
