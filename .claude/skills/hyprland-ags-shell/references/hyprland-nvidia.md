# Hyprland + NVIDIA Reference

> **VERSION-SENSITIVE.** The NVIDIA + Wayland ecosystem changes frequently with driver releases. Always cross-check against the current wiki: https://wiki.hypr.land/Nvidia/

---

## Driver Requirements

- **Open kernel modules required** for modern NVIDIA GPUs (Turing/Ampere/Ada/Blackwell): install `nvidia-open` (or `nvidia-open-dkms`) + `nvidia-utils`.
- Proprietary closed modules (`nvidia`) may work for older generations — check your GPU generation.
- Minimum supported driver: check the current Hyprland NVIDIA wiki page (version floor changes).

### Arch/CachyOS package names

```
nvidia-open          # open kernel module (recommended for RTX 20+)
nvidia-open-dkms     # DKMS variant (needed for custom/CachyOS kernels)
nvidia-utils         # userspace utilities (OpenGL, Vulkan, VA-API)
```

---

## Kernel Parameters

Add to bootloader config (e.g., `/boot/loader/entries/*.conf` for systemd-boot):

```
nvidia_drm.modeset=1
nvidia_drm.fbdev=1
```

`modeset=1` is mandatory for DRM/KMS and Wayland. `fbdev=1` enables the NVIDIA framebuffer device (may be required for some setups — verify against current wiki).

---

## Environment Variables

> These are the variables documented in the Hyprland wiki (verified against `/hyprwm/hyprland-wiki`). Mark as **version-sensitive** — the set of required vars shifts with driver releases.

| Variable | Value | Purpose |
|---|---|---|
| `LIBVA_DRIVER_NAME` | `nvidia` | Force VA-API to use the NVIDIA backend |
| `__GLX_VENDOR_LIBRARY_NAME` | `nvidia` | Force GLX vendor to NVIDIA |
| `NVD_BACKEND` | `direct` | Enable VA-API hardware video acceleration via NVD |
| `GBM_BACKEND` | `nvidia-drm` | Force GBM backend to nvidia-drm (may cause issues on some setups — test first) |
| `ELECTRON_OZONE_PLATFORM_HINT` | `auto` | Enable native Wayland for Electron apps |

### Where to set them

**Session environment (preferred for NVIDIA vars):** `~/.config/uwsm/env` (when using UWSM session manager):

```sh
# ~/.config/uwsm/env
export LIBVA_DRIVER_NAME=nvidia
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export NVD_BACKEND=direct
export ELECTRON_OZONE_PLATFORM_HINT=auto
# GBM_BACKEND=nvidia-drm  # enable only if needed; can break Firefox VA-API
```

**In hyprland config (Lua)** — only for vars that don't need to exist before the compositor starts:

```lua
hl.env("LIBVA_DRIVER_NAME", "nvidia")
hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")
hl.env("NVD_BACKEND", "direct")
hl.env("ELECTRON_OZONE_PLATFORM_HINT", "auto")
```

`hl.env()` / `env=` propagates the variable to child processes of Hyprland, but it is set AFTER the compositor starts. If the variable is needed by the compositor itself at startup, set it in the session env file instead.

---

## Hybrid Intel + NVIDIA (Optimus)

For laptops with integrated Intel GPU + discrete NVIDIA:

1. The iGPU (Intel) drives the display by default; NVIDIA offloads rendering.
2. Electron/Chromium stall fix: load `i915` before NVIDIA modules in initramfs.

```
# /etc/mkinitcpio.conf
MODULES=(i915 nvidia nvidia_modeset nvidia_uvm nvidia_drm)
```

Rebuild initramfs after changes:

```bash
sudo mkinitcpio -P
```

3. For primary NVIDIA rendering (eGPU or desktop): set `WLR_DRM_DEVICES` or configure via `udev` rules — consult current Hyprland wiki.

---

## Tearing

For NVIDIA + Hyprland tearing support:

```lua
hl.config({ general = { allow_tearing = true } })
-- Also add a window rule for games:
hl.window_rule({ match = { class = "^steam_app_.*" }, immediate = true })
```

Read the Hyprland tearing wiki page before enabling — it has caveats for NVIDIA.

---

## Common Symptoms and Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank screen on launch | DRM modeset not enabled | Add `nvidia_drm.modeset=1` to kernel params |
| Screen tearing | Missing `allow_tearing` or wrong driver | Enable tearing + immediate window rule |
| Firefox VA-API broken | `GBM_BACKEND` conflict | Remove `GBM_BACKEND=nvidia-drm` |
| Electron apps on XWayland | Missing ozone hint | Add `ELECTRON_OZONE_PLATFORM_HINT=auto` |
| Apps stall on hybrid | i915 vs nvidia load order | Add `i915` first in mkinitcpio MODULES |
| Cursor disappears | `WLR_NO_HARDWARE_CURSORS` | Set `WLR_NO_HARDWARE_CURSORS=1` (legacy — verify if still needed for your driver) |

> `WLR_NO_HARDWARE_CURSORS` was frequently needed on older drivers. Verify against current wiki — it may no longer be required with recent `nvidia-open` + DRM cursor support.

---

## Verification Commands

```bash
# Confirm NVIDIA module is loaded
lsmod | grep nvidia

# Check DRM modeset
cat /sys/module/nvidia_drm/parameters/modeset

# Verify VA-API uses NVIDIA backend
vainfo --display drm --device /dev/dri/renderD128

# Check active DRM devices
ls /dev/dri/

# Wayland compositor env (from inside a running session)
env | grep -E 'LIBVA|GLX|NVD|GBM|ELECTRON'
```
