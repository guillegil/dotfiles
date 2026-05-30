# uwsm — Universal Wayland Session Manager

> Verification status: core uwsm launch patterns **context7-verified** via `/hyprwm/hyprland-wiki`
> (source: `content/Useful Utilities/Systemd-start.md`). NVIDIA env-var guidance is
> empirical + Hyprland wiki cross-reference; flag for your setup.

---

## What uwsm does

uwsm wraps a Wayland compositor in a set of **systemd user units**, giving you:
- proper cgroup scope for the compositor process
- `graphical-session.target` integration (all user services start after the session is ready)
- clean session teardown on compositor exit

Without uwsm, Hyprland (and its children) all live in the same flat systemd scope; crashes
are harder to recover from and desktop services may not start at the right time.

---

## Launching Hyprland via uwsm

### From a TTY (shell profile — fish/bash/zsh)

```sh
# Recommended guard — only starts if uwsm determines it's safe (right VT, not nested, etc.)
if uwsm check may-start; then
    exec uwsm start hyprland.desktop
fi
```

`exec` replaces the shell so that logging out of Hyprland exits the TTY session cleanly.

### From a display manager (SDDM, GDM, etc.)

Select **"Hyprland (uwsm-managed)"** from the session list. The `.desktop` entry
`hyprland-uwsm.desktop` is installed by the `uwsm` package and calls
`uwsm start hyprland.desktop` for you.

SDDM drop-in to set this as the default session:

```ini
# /etc/sddm.conf.d/10-default-session.conf
[General]
DefaultSession=hyprland-uwsm.desktop

[Autologin]
Session=hyprland-uwsm.desktop
```

---

## Autostaring apps under uwsm

Prefix every autostart command with `uwsm app --` so the process is placed inside the
compositor's systemd scope rather than as a raw child:

```ini
# hyprland.conf / hyprland.lua exec-once equivalent
exec-once = uwsm app -- ags run
exec-once = uwsm app -- hypridle
```

Without the prefix the process is a direct child of the compositor and not tracked by
systemd — service dependencies and clean shutdown are unreliable.

---

## Session environment variables

**Do not** set Hyprland/Wayland env vars in `hyprland.conf` `env =` lines when using uwsm.
Those vars are set too late (after the compositor has already started) and are not exported
to systemd user services.

**Correct location:** `~/.config/uwsm/env`

This is a POSIX shell script sourced by uwsm before the compositor starts. Example:

```sh
# ~/.config/uwsm/env

# Wayland backend for toolkits
export QT_QPA_PLATFORM=wayland
export SDL_VIDEODRIVER=wayland
export CLUTTER_BACKEND=wayland

# --- NVIDIA (50-series / open modules) ---
# Consult https://wiki.hypr.land/Nvidia/ for the current recommended set;
# the required vars change with driver releases.
# Typical additions (verify empirically for your driver version):
export LIBVA_DRIVER_NAME=nvidia
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export NVD_BACKEND=direct          # ozone/direct rendering — confirm for your driver
```

> **NVIDIA note (empirical):** The exact set of env vars required for NVIDIA depends on
> the driver generation and compositor version. Always check the live Hyprland NVIDIA wiki
> page. The 50-series (Blackwell) requires `nvidia-open` / `nvidia-open-dkms`, not the
> proprietary closed module.

---

## Systemd user services for desktop agents

Long-running agents (polkit, idle daemon, keyring, etc.) should be **systemd user
services** rather than autostart commands, so they integrate with session targets.

Example — hyprpolkitagent ships its own unit; enable it once:

```sh
systemctl --user enable hyprpolkitagent.service
```

For agents that don't ship a unit, write one under
`~/.config/systemd/user/myagent.service`:

```ini
[Unit]
Description=My desktop agent
PartOf=graphical-session.target

[Service]
ExecStart=/usr/bin/myagent
Restart=on-failure

[Install]
WantedBy=graphical-session.target
```

The `PartOf=graphical-session.target` line ensures the service stops when the session
ends, not after.

---

## Gotchas

| Symptom | Likely cause |
|---------|-------------|
| Desktop services start before Wayland socket exists | Not using uwsm; compositor not bound to `graphical-session.target` |
| Env vars set in `hyprland.conf` not visible to services | Set them in `~/.config/uwsm/env` instead |
| `uwsm app --` missing → app not cleaned up on crash | Compositor exits, child lives on, next session sees stale socket |
| `exec uwsm start` without the `check may-start` guard | Can double-start on nested compositors or wrong VT |
