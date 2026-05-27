# Verify Report: uwsm-adoption

## Verdict

**Static checks PASS.** No CRITICAL findings. WARNING W1 is now RESOLVED (spec updated to use `.desktop` form and two-section drop-in; spec matches implementation). Runtime verification is **PENDING USER ACTION** — 9 of 12 checklist items require the user to run `./install.sh` (which will upgrade the existing single-section drop-in to the two-section form) and then log out / log in to the uwsm-managed session.

**IMPORTANT — 5.10 re-check required:** The fix in commit `9e2538d` changes the SDDM drop-in content. If you previously ran `install.sh` and the old single-section drop-in was written to `/etc/sddm.conf.d/10-default-session.conf`, re-run `install.sh` to replace it with the two-section form before checking 5.10 and 5.1.

---

## User Action Required (RUN IN ORDER)

You are currently in a Hyprland session NOT yet managed by uwsm. To complete runtime verification, follow these steps from a terminal in the current session:

### Step 1 — Run install.sh (writes SDDM drop-in + enables hyprpolkitagent)

```bash
cd /home/guille/dotfiles
./install.sh
```

Expected output highlights:
- `SDDM default session set to hyprland-uwsm.` (first-time write)
- `sddm.service already enabled` (no change)
- `enabled hyprpolkitagent.service`
- `Log out and back in to switch to the uwsm-managed Hyprland session.` (first-time hint)

### Step 2 — Re-run install.sh (idempotency check, covers 5.11)

```bash
./install.sh
```

Expected output highlights:
- `SDDM drop-in already up to date — skipped.`
- `sddm.service already enabled`
- (hyprpolkitagent enable is a systemd no-op the second time)
- **NO** "Log out and back in" hint

### Step 3 — Inspect SDDM drop-in file (covers 5.10)

```bash
sudo bat /etc/sddm.conf.d/10-default-session.conf
eza -la /etc/sddm.conf.d/10-default-session.conf
```

Expected:
- Content exactly (two-section form from fix commit `9e2538d`):
  ```
  [General]
  DefaultSession=hyprland-uwsm.desktop

  [Autologin]
  Session=hyprland-uwsm.desktop
  ```
- Owner: `root root`, mode `0644`.
- NOTE: if the file shows the old single-section `[Autologin]`-only form, re-run `./install.sh` first. The write-if-differs logic will detect the content differs and replace it.

### Step 4 — Log out from current Hyprland session

Trigger logout via your usual keybind (Mod+M on this config) or `loginctl terminate-session`.

### Step 5 — At SDDM greeter (covers 5.1)

- Confirm session picker preselects **"Hyprland (uwsm-managed)"** (NOT plain "Hyprland").
- Confirm plain "Hyprland" entry is still listed (rollback path).
- Log in.

### Step 6 — Inside the uwsm-managed session (covers 5.2, 5.3, 5.4-runtime, 5.5, 5.6, 5.7-runtime, 5.9)

From any terminal:

```bash
# 5.2 — compositor under systemd
systemctl --user status wayland-wm@hyprland.service

# 5.3 — polkit agent
systemctl --user status hyprpolkitagent.service

# 5.4-runtime — wrapped autostarts as transient scopes
pgrep -a -- 'ags run'
pgrep -a -- 'wl-paste --watch cliphist store'
systemctl --user status app-graphical.slice

# 5.5 — HIS propagated
hyprctl monitors

# 5.7-runtime — polkit prompt works via hyprpolkitagent
pgrep polkit-gnome          # expect empty
pkexec true                  # expect graphical prompt

# 5.9 — session bound to wayland-session target
loginctl session-status
```

- 5.6 (AGS bar) is a visual check — confirm bar renders identically to before.

### Step 7 — Logout latency (covers 5.8)

- Log out and time it (mental count or `time loginctl terminate-session`).
- Expected: under 5 seconds, no orphan processes.

When done, return the outputs and I'll close out verify.

---

## Per-requirement findings

### REQ: Session launch via uwsm

| Scenario | Status | Notes |
|---|---|---|
| Fresh install — SDDM defaults to uwsm session | PENDING-USER | Needs Step 5 |
| Successful uwsm session start | PENDING-USER | Needs Step 6 (5.2) |
| Clean shutdown | PENDING-USER | Needs Step 7 (5.8) |
| Plain session still available for rollback | PENDING-USER | Needs Step 5 visual check |

### REQ: Autostart wrapping

| Scenario | Status | Notes |
|---|---|---|
| AGS starts as a transient scope | PASS-STATIC (wrap) / PENDING-USER (runtime) | Line 46: `hl.exec_cmd("uwsm app -- ags run")` verbatim ✓. Slice/runtime check via 5.4. |
| wl-paste starts as a transient scope | PASS-STATIC (wrap) / PENDING-USER (runtime) | Line 51: `hl.exec_cmd("uwsm app -- wl-paste --watch cliphist store")` verbatim ✓. |
| swaync line left plain | **PASS-STATIC** | Line 47: `hl.exec_cmd("swaync")` — exactly 1 match, ADR-4 + C2 satisfied (5.12). |
| polkit-gnome exec line is absent | **PASS-STATIC** | Replaced by 2-line comment block at lines 49-50. Zero `polkit-gnome` matches in `config/`, `packages/`, `install.sh`. |

### REQ: polkit migration

| Scenario | Status | Notes |
|---|---|---|
| hyprpolkitagent enabled on fresh install | PASS-STATIC (code) / PENDING-USER (runtime) | `enable_hyprpolkitagent()` calls `systemctl --user enable hyprpolkitagent.service` (install.sh:122). Runtime check 5.3. |
| enable step is idempotent | PASS-STATIC | systemd's `enable` of already-enabled unit is a no-op (ADR-2). Step 2 also verifies. |
| polkit-gnome not present at runtime | PASS-STATIC (package/config) / PENDING-USER (runtime) | Package removed from `pacman.txt`. Runtime check 5.7. Note: pacman won't auto-uninstall on in-place upgrade — user may need `sudo pacman -Rns polkit-gnome` after install.sh runs. See **Risks**. |

### REQ: Environment propagation guarantee

| Scenario | Status | Notes |
|---|---|---|
| AGS reads socket path without polling | PENDING-USER | Needs Step 6 (`hyprctl monitors`). |
| hyprland.ts is not modified | **PASS-STATIC** | `git show 6bd4810 -- config/ags/service/hyprland.ts` and `git show b208494 -- config/ags/service/hyprland.ts` both empty. C3 satisfied. |

### REQ: install.sh SDDM drop-in writer

| Scenario | Status | Notes |
|---|---|---|
| Drop-in written on first install | PASS-STATIC | `write_sddm_default_session()` lines 97-110: heredoc + `sudo install -D -m 0644 /dev/stdin`. Returns 0 on write. |
| Drop-in skipped when already correct | PASS-STATIC | Lines 102-105: diff guard via `sudo cat "$drop_in" == "$expected"`; returns 1 + `c_ok "...already up to date — skipped."`. |
| Drop-in updated when content differs | PASS-STATIC | Same diff guard — falls through to write path when content differs. |
| Drop-in skipped in link-only mode | PASS-STATIC | Caller is `enable_services()` which is gated by `DO_PACKAGES=0` short-circuit in `--link-only` mode (per design ADR-5). |

### REQ: In-place upgrade hint

| Scenario | Status | Notes |
|---|---|---|
| Upgrade hint printed on first uwsm install | PASS-STATIC | install.sh:148-150: `if (( first_time_uwsm == 0 )); then c_warn "Log out and back in..."`. `first_time_uwsm=0` only when writer returned 0 (file was written). |
| Upgrade hint suppressed on repeat runs | PASS-STATIC | When writer returns 1 (already current), `first_time_uwsm` stays 1, condition false, hint not printed. Step 2 also verifies. |

### REQ: Rollback leaves no orphan units

| Scenario | Status | Notes |
|---|---|---|
| Code revert restores autostart | PASS-STATIC | Single commit `6bd4810` carries all 3-file diff; `git revert 6bd4810` restores pre-change form. |
| Optional SDDM drop-in removal | PASS-STATIC | Drop-in is a single root-owned file; `sudo rm` works. Plain `hyprland.desktop` session is pacman-owned, not touched. |

### Package manifest changes (normative)

| Package | Required | Present | Status |
|---|---|---|---|
| `uwsm` | ADD | line 12 | PASS-STATIC |
| `polkit-gnome` | REMOVE | absent | PASS-STATIC |
| `hyprpolkitagent` | ADD | line 20 (with inline comment) | PASS-STATIC |

### Constraints

| ID | Constraint | Status |
|---|---|---|
| C1 | Config stays in `hyprland.lua` (Lua) | PASS-STATIC — no `hyprland.conf` created. |
| C2 | swaync NOT wrapped | PASS-STATIC — verified (5.12). |
| C3 | `hyprland.ts` untouched | PASS-STATIC — verified above. |
| C4 | install.sh idempotent | PASS-STATIC (logic), PENDING-USER (5.11 runtime). |
| C5 | Merges before desktop-redesign Slice A | TRACKED — desktop-redesign state still paused (last verified `current_phase: apply, pending Slices A-D`); confirm before opening PR. Phase 6.1 task. |
| C6 | dbus-broker — no changes | PASS-STATIC — no D-Bus changes in diff. |

---

## Findings by severity

### CRITICAL
None.

### WARNING

**W1: RESOLVED** (as of commit `9e2538d`). Spec ↔ implementation literal drift on the SDDM drop-in content has been fixed:
- `specs.md` now documents the two-section form (`[General] DefaultSession=` + `[Autologin] Session=`) with `.desktop` suffix throughout.
- `design.md` ADR-3 updated to document the corrected decision and why the original `[Autologin]`-only approach was incorrect.
- `tasks.md` 5.10 updated to expect the two-section form.
- Implementation (`install.sh`) updated to write both sections.
- All references now consistently use `hyprland-uwsm.desktop` (with suffix).

### SUGGESTION

**S1: First-time logout hint uses `c_warn` (yellow).**
- The hint at install.sh:149 is informational, not a warning. Using `c_warn` colors it yellow, which may read as scary.
- Consider switching to `c_info` after first runtime confirmation. Not blocking.

**S2: In-place upgrade does not auto-remove `polkit-gnome`.**
- pacman won't uninstall `polkit-gnome` just because it left `pacman.txt`. Users upgrading in place will need `sudo pacman -Rns polkit-gnome` once.
- The spec scenario "polkit-gnome not present at runtime" assumes a fresh install. The user is on a fresh CachyOS install per session context, so 5.7 should pass — but document this for future upgrade paths in a follow-up README note.

---

## Static checks executed (commands + results)

| Check | Command | Result |
|---|---|---|
| uwsm-wrapped ags + wl-paste | `rg -n 'uwsm app -- (ags run|wl-paste)' config/hypr/hyprland.lua` | 2 matches at lines 46, 51 |
| swaync verbatim (Tier 1, 5.12) | `rg -n 'hl\.exec_cmd\("swaync"\)' config/hypr/hyprland.lua` | exactly 1 match at line 47 |
| polkit-gnome absent | `rg -n 'polkit-gnome' config/ packages/ install.sh` | 0 matches |
| Package manifest delta | `rg -n 'uwsm\|hyprpolkitagent\|polkit-gnome' packages/pacman.txt` | 2 matches (line 12, 20); polkit-gnome absent |
| hyprland.ts untouched | `git show 6bd4810 -- config/ags/service/hyprland.ts` | empty diff |
| install.sh syntax | `bash -n install.sh` | OK |
| commit boundary | `git show --stat 6bd4810` | 3 files: `+45/-4` lines |

---

## Risks for the user

- **SDDM drop-in file naming:** the writer always emits `/etc/sddm.conf.d/10-default-session.conf`. If a leftover file with a different name exists (e.g. `90-default-session.conf` from a manual experiment), it could override ours. Quick check: `eza -la /etc/sddm.conf.d/` before Step 5.
- **In-place polkit-gnome process:** the currently-running `polkit-gnome-authentication-agent-1` keeps running until logout. After logout/login into uwsm session, it should be gone (because the autostart line was deleted). If `pgrep polkit-gnome` returns non-empty after Step 6, run `sudo pacman -Rns polkit-gnome`.
- **`RememberLastSession=true`:** on this in-place upgrade, SDDM may preselect the bare "Hyprland" entry the first time at the greeter (last-used wins). User picks "Hyprland (uwsm-managed)" once manually; subsequent logins remember it. The drop-in is the fallback default, not an override of last-used.

---

## Next action

User runs Steps 1–7 above. Return the outputs (especially `systemctl --user status wayland-wm@hyprland.service`, `pgrep -a` results, `hyprctl monitors`, `loginctl session-status`, and the install.sh second-run output). I will then close out verify and recommend `sdd-archive uwsm-adoption`.

If any runtime check fails, that becomes a CRITICAL and the recommendation flips to `sdd-apply uwsm-adoption (fix)`.
