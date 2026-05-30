# hyprpaper Reference

hyprpaper is the official Hyprland wallpaper daemon. It is IPC-controlled and supports per-monitor wallpapers with multiple fit modes.

Config file location: `~/.config/hypr/hyprpaper.conf`

---

## Config Syntax — Block Format (current)

hyprpaper uses a **block syntax** (verified against `/hyprwm/hyprland-wiki`, `hyprpaper.md`):

```ini
wallpaper {
    monitor  = <MONITOR>      # exact connector name, e.g. DP-1, HDMI-A-1, eDP-1
    path     = /absolute/path/to/image.jpg
    fit_mode = cover
}

# Fallback — applies to monitors not explicitly configured
wallpaper {
    monitor  =                # empty = wildcard
    path     = /absolute/path/to/fallback.jpg
    fit_mode = cover
}
```

Multiple `wallpaper {}` blocks are supported. Matching is first-wins per monitor.

---

## Old Flat Syntax (DO NOT USE)

```ini
# This syntax is IGNORED by hyprpaper v0.8+ — no error, no effect.
preload = /path/to/image.jpg
wallpaper = <MONITOR>,/path/to/image.jpg
```

**If your wallpaper isn't loading, check for old `preload=` / `wallpaper=` flat syntax — it is silently ignored.**

---

## Path Handling

> **Empirically verified in practice (this project):** hyprpaper does NOT reliably expand `~` in paths. Use absolute paths.
>
> **Conflict with wiki docs:** The hyprpaper wiki examples show `path = ~/myFile.jxl` (tilde paths). Behavior may depend on how hyprpaper is launched (shell vs. systemd/uwsm service). When launched as a systemd/uwsm unit, `HOME` may be set but tilde expansion is not guaranteed.
>
> **Recommendation:** Always use absolute paths to be safe across all launch contexts.

```ini
# Safe
path = /home/<USER>/.config/hypr/wallpaper.jpg

# Risky when launched from systemd/uwsm
path = ~/wallpaper.jpg
```

---

## fit_mode Values

| Value | Behavior |
|---|---|
| `cover` | Scale to fill, cropping if necessary (default for most use cases) |
| `contain` | Scale to fit, letterboxing if necessary |
| `stretch` | Stretch to exact monitor resolution (may distort) |
| `center` | Center at original resolution, no scaling |
| `tile` | Tile the image |

---

## Parameters Reference

```ini
wallpaper {
    monitor   = <MONITOR>         # connector name or empty for fallback
    path      = /abs/path         # absolute path to image; supports jpg, png, jxl, webp, gif
    fit_mode  = cover             # see fit_mode values above
    # timeout = 0                 # seconds between images (for directory paths; 0 = static)
    # order   = random            # "random" or "sequential" (for directory paths)
    # recursive = false           # scan subdirectories when path is a directory
}
```

When `path` points to a **directory**, hyprpaper cycles through images in it. `timeout`, `order`, and `recursive` only apply to directory paths.

---

## IPC — Dynamic Wallpaper Change

Change wallpaper without restarting hyprpaper:

```bash
# Set wallpaper for a specific monitor
hyprctl hyprpaper wallpaper '<MONITOR>, /abs/path/to/image.jpg, cover'

# Set wallpaper for all monitors (empty monitor)
hyprctl hyprpaper wallpaper ', /abs/path/to/image.jpg, cover'

# Fit mode is optional (defaults to cover)
hyprctl hyprpaper wallpaper '<MONITOR>, /abs/path/to/image.jpg'
```

---

## Autostart

### With UWSM (recommended)

```lua
-- hyprland.lua
hl.on("hyprland.start", function()
    hl.exec_cmd("uwsm app -- hyprpaper")
end)
```

### Without UWSM (hyprlang)

```ini
exec-once = hyprpaper
```

### Systemd user service

hyprpaper can run as a systemd user service. If using this approach, ensure `HYPRLAND_INSTANCE_SIGNATURE` and `WAYLAND_DISPLAY` are available in the service environment (UWSM handles this automatically).

---

## Fallback Background Color

While hyprpaper loads (or if it crashes), Hyprland renders the background color from `misc.background_color`:

```lua
hl.config({ misc = { background_color = 0xff1e1e2e } })  -- 32-bit ARGB, alpha must be 0xff
```

`alpha < 0xff` makes Hyprland render a void (black), not a transparent compositor — set alpha to `0xff` for a solid color.

---

## Debugging

```bash
# Verify hyprpaper is running
pidof hyprpaper

# Check if IPC socket exists
ls "$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/"

# Query current wallpaper state
hyprctl hyprpaper listloaded
hyprctl hyprpaper listactive

# Reload config
pkill hyprpaper && hyprpaper &
```
