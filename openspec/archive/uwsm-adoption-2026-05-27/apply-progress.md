# Apply Progress: uwsm-adoption

## Status: complete (Phases 1–4 + drop-in fix)

## Tasks completed

### Phase 1: Package Set Updates
- [x] 1.1 Add `uwsm` to `packages/pacman.txt` — added under "Hyprland compositor + first-party ecosystem"
- [x] 1.2 Remove `polkit-gnome` from `packages/pacman.txt` — line deleted
- [x] 1.3 Add `hyprpolkitagent` to `packages/pacman.txt` — added in "Core desktop pieces" with inline comment

### Phase 2: Hyprland Lua Autostart Edits
- [x] 2.1 Wrap `ags run` with `uwsm app --` in `config/hypr/hyprland.lua` — line 46 updated
- [x] 2.2 Delete `polkit-gnome-authentication-agent-1` exec line — replaced with two-line comment block
- [x] 2.3 Wrap `wl-paste --watch cliphist store` with `uwsm app --` — line 51 updated
- [x] 2.4 swaync line verified untouched — line 47 reads `hl.exec_cmd("swaync")` verbatim (ADR-4)

### Phase 3: install.sh — SDDM Drop-in Writer
- [x] 3.1 `write_sddm_default_session()` added — heredoc + `sudo cat` diff guard + `sudo install -D -m 0644`; returns 0 on write/change, 1 on already-current
- [x] 3.2 Called inside `enable_services()` BEFORE `sudo systemctl enable sddm.service`; result captured in `local first_time_uwsm`
- [x] 3.3 First-time logout hint printed via `c_warn` when `first_time_uwsm == 0`

### Phase 4: install.sh — hyprpolkitagent User-Unit Enable
- [x] 4.1 `enable_hyprpolkitagent()` added — guards: `pacman -Q hyprpolkitagent` + `systemctl --user show-environment`; non-fatal on either guard failure
- [x] 4.2 Called inside `enable_services()` AFTER `sudo systemctl enable sddm.service` (ADR-5 ordering)

## Files touched

| File | Net change |
|------|-----------|
| `packages/pacman.txt` | +2 lines, -1 line (uwsm added, polkit-gnome removed, hyprpolkitagent added) |
| `config/hypr/hyprland.lua` | +4 lines, -3 lines (2 execs wrapped, polkit line replaced by 2 comments) |
| `install.sh` | +39 lines (two helper functions + call sites + local var) |

## Commits created

- `6bd4810` feat(uwsm): adopt uwsm for systemd-managed Hyprland session
- `9e2538d` fix(uwsm): use [General] DefaultSession= in SDDM drop-in for manual login preselection

## Verification checks (all pass)

- `rg -n 'uwsm app -- ags run' config/hypr/hyprland.lua` → 1 match (line 46)
- `rg -n 'uwsm app -- wl-paste' config/hypr/hyprland.lua` → 1 match (line 51)
- `rg -n 'hl\.exec_cmd\("swaync"\)' config/hypr/hyprland.lua` → 1 match (line 47, UNTOUCHED)
- `rg -n 'polkit-gnome' config/hypr/hyprland.lua packages/pacman.txt` → 0 matches
- `rg -n 'hyprpolkitagent|uwsm' packages/pacman.txt` → 2 matches (lines 12 + 20)
- `bash -n install.sh` → syntax OK
- Idempotency trace: `write_sddm_default_session()` diff guard uses `sudo cat` comparison; `sudo install -D -m 0644` atomic write; return-0 on write, return-1 on already-current. Check passes.

## Deviations from design.md

None. Implementation matches design exactly, including:
- ADR-4: swaync left verbatim
- ADR-5: ordering inside `enable_services()` preserved
- ADR-3: `[Autologin]\nSession=hyprland-uwsm.desktop` exact content
- Idempotency contract satisfied (write-if-differs)
- Non-fatal guards on `enable_hyprpolkitagent()`

## Fix: drop-in writer correction (follow-up to 6bd4810)

**Bug:** `write_sddm_default_session()` in 6bd4810 wrote only `[Autologin]\nSession=hyprland-uwsm.desktop`. SDDM only processes the `[Autologin]` section when autologin is enabled (i.e. `User=` is also set). For users doing a manual password login — the common case — SDDM reads `[General] DefaultSession=` to preselect a session in the greeter. The `[Autologin]`-only drop-in caused SDDM to show the alphabetically-first session (`hyprland.desktop`, the bare entry) instead of the uwsm entry on a fresh install. The spec scenario "Fresh install — SDDM defaults to uwsm session" failed at runtime.

**Fix (9e2538d):** Updated `write_sddm_default_session()` to write both sections:
```
[General]
DefaultSession=hyprland-uwsm.desktop

[Autologin]
Session=hyprland-uwsm.desktop
```

This ensures greeter preselection works for manual login (via `[General]`) and also covers users who later enable autologin (via `[Autologin]`). The existing single-section drop-in is treated as stale content and replaced on next `install.sh` run (write-if-differs semantics are preserved).

Spec, design (ADR-3), and tasks updated in the same commit to reflect the correction.

## Notes

- `.atl/skill-registry.md` had a pre-existing unstaged diff (unrelated reformatting). Excluded from this commit; it remains unstaged.
- Git identity was not configured on the bare-metal install. Set `user.email=guillermo.gilrodriguez@renorbis.ai` and `user.name=Guillermo Gil Rodriguez` via `git config --global` before committing.
