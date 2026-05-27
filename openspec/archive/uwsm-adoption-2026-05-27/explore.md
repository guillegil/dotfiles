---
source: engram
topic_key: sdd/uwsm-adoption/explore
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

## Exploration: uwsm-adoption — Wrapping Hyprland in systemd user scope via uwsm

### Current State

Hyprland is launched directly by SDDM using `hyprland.desktop` (the plain session file). The session is NOT managed by systemd user scope. Autostarts live in `config/hypr/hyprland.lua` via `hl.on("hyprland.start", ...)` + `hl.exec_cmd()` for:

1. `ags run` — the AGS shell (bar + launcher + notifications future home)
2. `swaync` — notification daemon (pending removal in desktop-redesign Slice D)
3. `/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1` — polkit agent
4. `wl-paste --watch cliphist store` — clipboard history

No systemd user units exist for any of these. The `config/ags/service/hyprland.ts` service reads `HYPRLAND_INSTANCE_SIGNATURE` and `XDG_RUNTIME_DIR` from the environment to locate `.socket2.sock`. It falls back to 250ms polling if those vars are absent.

**Package state:** `uwsm` is listed as an optional dependency of `hyprland` on CachyOS extra repo. The package is `uwsm` in `extra/any`. No `hyprland-uwsm-meta` package exists — it is just `uwsm` plus `hyprland` together.

**In-flight dependency:** `desktop-redesign` is mid-apply (Slice A0 committed, A–D pending). Slice D will remove `swaync` from autostart and add notifd. `uwsm-adoption` must ship BEFORE `desktop-redesign` resumes.

---

### What uwsm Does

uwsm (Universal Wayland Session Manager) wraps standalone Wayland compositors into a set of systemd user units:

- `wayland-wm@hyprland.service` — the Hyprland compositor service (Type=notify)
- `wayland-wm-env@hyprland.service` — environment preloader (sources `~/.config/uwsm/env`, `env.d/`, `env-hyprland`)
- `wayland-session@hyprland.target` — main session target
- Slices: `app-graphical.slice`, `background-graphical.slice`, `session-graphical.slice`
- `wayland-session-bindpid@.service` — binds session lifetime to login session (clean logout)

**SDDM integration:** The `hyprland-uwsm.desktop` session file is auto-generated when both `hyprland` and `uwsm` are installed. It lives at `/usr/share/wayland-sessions/hyprland-uwsm.desktop` and its Exec line is `uwsm start -- hyprland.desktop`. SDDM presents it as a second session option ("Hyprland (uwsm-managed)"). No session file needs to be manually written.

**Environment propagation:** The Hyprland uwsm plugin (`uwsm-plugins/hyprland.sh`) explicitly includes `HYPRLAND_INSTANCE_SIGNATURE` in both `UWSM_FINALIZE_VARNAMES` (exported to all units via D-Bus activation env) and `UWSM_WAIT_VARNAMES` (blocks unit readiness until it appears). `WAYLAND_DISPLAY`, `XDG_RUNTIME_DIR`, `XDG_CURRENT_DESKTOP` are all propagated. This means `config/ags/service/hyprland.ts` will receive `HYPRLAND_INSTANCE_SIGNATURE` and connect via socket — the polling fallback will NOT be hit.

**Autostart approach with uwsm:** Two patterns coexist:
- **Inline uwsm app:** Keep `hl.on("hyprland.start", ...)` but replace `hl.exec_cmd("some-daemon")` with `hl.exec_cmd("uwsm app -- some-daemon")`. The daemon runs as a transient scope unit inside `app-graphical.slice`. This is the lowest-friction migration path.
- **Systemd user units:** Write `~/.config/systemd/user/some-daemon.service` with `After=graphical-session.target` + `WantedBy=graphical-session.target`, then `systemctl --user enable some-daemon.service`. This is more robust but adds complexity per daemon.
- **XDG autostart .desktop files:** Drop a `.desktop` file in `~/.config/autostart/`. UWSM activates `xdg-desktop-autostart.target` automatically. Good for apps that already ship `.desktop` files.

**hl.exec_cmd and hl.on: NOT deprecated.** Using `hl.exec_cmd("uwsm app -- cmd")` inside `hl.on("hyprland.start", ...)` is the Hyprland wiki's own documented example for uwsm migration. The hook itself remains valid.

**xdg-desktop-portal-hyprland:** No unit override needed. XDPH ships its own systemd user socket activation. Under uwsm, `WAYLAND_DISPLAY` and `XDG_CURRENT_DESKTOP=Hyprland` are propagated before `graphical-session.target` is reached, so XDPH activates correctly. The `hyprland-portals.conf` at `/usr/share/xdg-desktop-portal/hyprland-portals.conf` is used by default and requires no changes.

**polkit:** The Hyprland ecosystem now recommends `hyprpolkitagent` over `polkit-gnome`. With uwsm, the clean setup is `systemctl --user enable --now hyprpolkitagent.service` — no exec-once needed. The `polkit-gnome` exec-once can be dropped entirely if `hyprpolkitagent` is adopted.

**Hyprland wiki warning:** As of mid-2025, the Hyprland wiki explicitly states uwsm is "for advanced users and has its issues and additional quirks." The team no longer actively recommends it for most users. It is stable but not the default path.

---

### Affected Areas

- `config/hypr/hyprland.lua` — autostart block (lines 45–51): each `hl.exec_cmd(...)` call needs either wrapping with `uwsm app --` or replacement with systemd unit enable
- `packages/pacman.txt` — needs `uwsm` added (it's in Arch/CachyOS `extra`)
- `packages/pacman.txt` — optionally swap `polkit-gnome` for `hyprpolkitagent` (separate concern, can be sequenced)
- `install.sh` — no changes needed; SDDM will auto-present `hyprland-uwsm.desktop` once uwsm is installed
- `config/ags/service/hyprland.ts` — NO changes needed; env propagation confirmed for `HYPRLAND_INSTANCE_SIGNATURE`
- New optional: `config/systemd/user/` directory (if dedicated unit files are chosen over inline `uwsm app`)
- `openspec/changes/desktop-redesign/tasks.md` — Slice D removes swaync from autostart; this is compatible with both uwsm migration approaches

---

### Approaches

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| **A — Inline uwsm app** Wrap each `hl.exec_cmd(...)` with `uwsm app --` | Minimal diff (4 lines changed); keeps config co-located; no new files; reversible | Apps still child-launched from hyprland.lua trigger; restart-on-crash not automatic; no per-service resource accounting | Low |
| **B — Systemd user units** Write `.service` files for ags, polkit, wl-paste; `systemctl --user enable` each | Restart policies; journalctl per service; clean dependencies; resource slices | 3–4 new .service files to maintain in dotfiles; install.sh needs `systemctl --user enable` calls; more moving parts | Medium |
| **C — XDG autostart .desktop** Drop `.desktop` files in `~/.config/autostart/` | Zero Hyprland config changes; portable | Not stored in dotfiles naturally; less control over ordering; `ags run` may not have a standard .desktop | Medium |
| **D — Hybrid: units for persistent daemons, inline for AGS** polkit+wl-paste as units; `ags run` stays inline uwsm app | Best separation of concerns; AGS benefits from hyprland readiness ordering; polkit/clipboard are restart-worthy | Medium complexity; two patterns to understand | Medium |

**Recommendation: Approach A first, Approach D as a follow-up.** Start with Approach A (pure inline `uwsm app --` wrapping) for zero-risk adoption — it's a 4-line diff to `hyprland.lua` and adding `uwsm` to `pacman.txt`. After verifying stability on bare-metal, incrementally promote persistent daemons (polkit, wl-paste) to proper user units (Approach D). AGS (`ags run`) is atypical as it is not a simple daemon but a Glib app loop managing windows — keeping it inline is fine until AGS itself ships a proper service unit.

---

### Sequencing Impact on desktop-redesign

**Slice A (BarShell + Workspaces + tokens):** ZERO impact. Adds layerrules to `hyprland.lua` and SCSS files. Whether uwsm is in place or not is irrelevant to these changes.

**Slice B (Info widgets — Clock, ActiveWindow, LauncherPill, Mic):** ZERO impact. Pure widget code changes.

**Slice C (System widgets — Volume, Battery, Network):** ZERO impact. Uses libastal-* GIR bindings, no session management concern.

**Slice D (Notifications — notifd cutover + swaync removal):** ONE important interaction. Slice D deletes `hl.exec_cmd("swaync")` from the autostart block. If uwsm-adoption ships first with Approach A, the swaync line will have been changed to `hl.exec_cmd("uwsm app -- swaync")`. Slice D must then delete that wrapped line. The swaync removal in Slice D remains safe either way — deleting one line.

**New bar/launcher:** The bar is rendered by AGS (`ags run`) and surfaces as layer-shell windows. AGS does NOT need to be a systemd unit for the bar to work. The aurora 3-module bar is a Glib application loop that uwsm launches either via inline `uwsm app` (Approach A) or a dedicated unit. No additional systemd unit is required for the bar/launcher to function post-uwsm-adoption.

---

### Risk Areas / Unknowns for Propose Phase

1. **swaync removal timing conflict:** If uwsm Approach A ships and wraps `hl.exec_cmd("swaync")` as `hl.exec_cmd("uwsm app -- swaync")`, then Slice D of desktop-redesign must delete the WRAPPED form. The propose phase must decide: either desktop-redesign Slice D stays unaffected (swaync line is plain, not wrapped) or uwsm-adoption deliberately wraps only the services that survive past Slice D (i.e., skip wrapping swaync since it gets deleted imminently).

2. **hyprpolkitagent adoption:** The propose phase should decide whether to replace `polkit-gnome` with `hyprpolkitagent` as part of uwsm-adoption or as a separate concern. It's a one-package swap and `hyprpolkitagent.service` integrates cleanly with uwsm, but it introduces a new Hypr-ecosystem dependency.

3. **wl-paste as a unit:** `wl-paste --watch cliphist store` is a persistent process. Under Approach A it runs as a transient scope (no restart on crash). Under Approach B/D it runs as a proper service with `Restart=on-failure`. The propose phase should decide the level of robustness desired.

4. **SDDM session selection:** After installing uwsm, SDDM will show BOTH `Hyprland` and `Hyprland (uwsm-managed)` sessions. There is no mechanism in this dotfiles repo to force-select the uwsm session. The user must manually pick it at the login screen the first time, or SDDM's `defaultSession` must be set. This is a bare-metal setup step that install.sh does not currently handle.

5. **90-second shutdown delays (known sharp edge):** Without uwsm, Hyprland exit can trigger a 90-second systemd timeout waiting for processes to die. uwsm solves this via proper unit teardown. But if some services are NOT managed as units (inline exec), the timeout risk remains for those.

6. **Hyprland wiki "experimental" caveat:** As of 2025, the Hyprland team explicitly calls uwsm "for advanced users." This is a known position, not a blocker, but the propose phase should document this user-awareness requirement.

7. **dbus-broker vs reference D-Bus:** uwsm recommends dbus-broker over the reference D-Bus implementation (which cannot unset variables). CachyOS default should be checked; it likely ships dbus-broker already as it's a modern Arch derivative.

---

### Ready for Proposal

Yes. The exploration has enough information to produce a concrete proposal. The propose phase should resolve: (1) Approach A vs D vs hybrid, (2) polkit-gnome vs hyprpolkitagent, (3) SDDM defaultSession in install.sh, (4) swaync/wl-paste wrapping strategy given the imminent desktop-redesign Slice D removal.

### Sources

- Hyprland wiki, Systemd startup: https://wiki.hypr.land/Useful-Utilities/Systemd-start/
- uwsm GitHub README: https://github.com/Vladimir-csp/uwsm
- uwsm Hyprland plugin source: https://github.com/Vladimir-csp/uwsm/blob/master/uwsm-plugins/hyprland.sh
- Hyprland discussion #8459: https://github.com/hyprwm/Hyprland/discussions/8459
- CachyOS hyprland package page: https://packages.cachyos.org/package/extra/x86_64/hyprland
- CachyOS uwsm package: https://packages.cachyos.org/package/extra/any/uwsm
- Hyprland wiki, hyprpolkitagent: https://wiki.hypr.land/Hypr-Ecosystem/hyprpolkitagent/
