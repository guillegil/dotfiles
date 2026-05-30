# Hyprland Config Reference

## Config Formats: hyprlang vs Lua

Hyprland supports two config backends:

| Backend | File | Notes |
|---|---|---|
| **hyprlang** (UCL-like) | `hyprland.conf` | Legacy, flat key=value + blocks |
| **Lua plugin** | `hyprland.lua` | Modern; uses `hl.*` API; requires `hyprland-lua-config` plugin |

Set via env: `HYPRLAND_CONFIG=/path/to/hyprland.lua`

Both backends are mutually exclusive per session. If you use Lua, do not maintain a parallel `.conf` — Hyprland loads whichever is configured.

---

## Lua API (`hl.*`) — Core Functions

```lua
-- Monitor
hl.monitor({ output = "<MONITOR>", mode = "preferred", position = "auto", scale = 1.0 })

-- Environment variable (session env)
hl.env("VAR_NAME", "value")

-- Autostart (fires once after compositor init)
hl.on("hyprland.start", function()
    hl.exec_cmd("uwsm app -- some-daemon")
end)

-- Config blocks (general, decoration, input, misc, dwindle, master, …)
hl.config({
    general = { gaps_in = 5, gaps_out = 20, border_size = 2, layout = "dwindle" },
    decoration = {
        rounding = 10,
        blur = { enabled = true, size = 3, passes = 1 },
        shadow = { enabled = true, range = 4, render_power = 3 },
    },
    misc = { force_default_wallpaper = 0, disable_hyprland_logo = true },
})

-- Keybind
hl.bind("SUPER + Q", hl.dsp.exec_cmd("kitty"))
hl.bind("SUPER + mouse:272", hl.dsp.window.drag(), { mouse = true })
-- Flags: locked, repeating, mouse, release, longpress, code, catchall, transparent

-- Window rule
hl.window_rule({
    name  = "rule-name",           -- optional but useful for debugging
    match = { class = "^firefox$", title = ".*", float = false },
    -- properties: opacity, move, size, float, no_focus, pin, suppress_event, …
})

-- Layer rule
hl.layer_rule({ match = { namespace = "^<ns>$" }, blur = true })

-- Workspace rule
hl.workspace_rule({ workspace = "w[tv1]", gaps_out = 0, gaps_in = 0 })

-- Device config
hl.device({ name = "device-name", sensitivity = -0.5 })
```

### hyprlang equivalent (for reference)

```ini
monitor=<MONITOR>,preferred,auto,1.0
exec-once=some-daemon
env=VAR_NAME,value
bind=SUPER,Q,exec,kitty
bindm=SUPER,mouse:272,movewindow
windowrule=float,^(pavucontrol)$
windowrulev2=opacity 0.8,class:^(kitty)$
layerrule=blur,^<ns>$
workspace=1,monitor:<MONITOR>
```

---

## Monitors

```lua
-- Auto-detect, default scale
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = 1.0 })

-- Explicit monitor
hl.monitor({ output = "<MONITOR>", mode = "2560x1440@144", position = "0x0", scale = 1.5 })

-- Disable monitor
hl.monitor({ output = "<MONITOR>", mode = "disable" })
```

`output = ""` = wildcard (applies to any monitor not explicitly configured).

---

## Keybinds — Lua Dispatch API

In Lua config, `hyprctl dispatch` is interpreted server-side as a Lua expression. The legacy hyprlang dispatch strings (`workspace 2`, `movetoworkspace 3`) do NOT work — use the `hl.dsp.*` namespace.

```lua
-- Focus dispatchers
hl.dsp.focus({ workspace = 2 })           -- numeric: bare number
hl.dsp.focus({ workspace = "e+1" })       -- relative: quoted string
hl.dsp.focus({ direction = "left" })      -- direction focus

-- Window dispatchers
hl.dsp.window.close()
hl.dsp.window.float({ action = "toggle" })
hl.dsp.window.move({ workspace = 3 })
hl.dsp.window.drag()
hl.dsp.window.resize()
hl.dsp.window.pseudo()
hl.dsp.window.tag({ tag = "alpha_0.5" })

-- Workspace
hl.dsp.workspace.toggle_special("magic")

-- System
hl.dsp.exec_cmd("command")
hl.dsp.exit()
hl.dsp.layout("togglesplit")
```

When calling `hyprctl dispatch` from a shell script or external process while using Lua config, pass a Lua expression:

```bash
# Correct (Lua config mode)
hyprctl dispatch 'hl.dsp.focus({workspace=2})'

# Wrong — silently fails or errors with Lua config
hyprctl dispatch workspace 2
```

---

## Environment Variables

`hl.env()` sets variables in the Hyprland session environment (propagated to child processes). For variables that must exist before Hyprland starts (e.g., NVIDIA driver vars), set them in the session launcher env instead — e.g., `~/.config/uwsm/env` when using UWSM.

```lua
hl.env("XCURSOR_SIZE", "24")
hl.env("HYPRCURSOR_SIZE", "24")
-- NVIDIA-specific vars: see hyprland-nvidia.md
```

---

## exec-once / Autostart

```lua
hl.on("hyprland.start", function()
    hl.exec_cmd("uwsm app -- ags run")       -- shell bar / AGS
    hl.exec_cmd("uwsm app -- hyprpaper")     -- wallpaper daemon
    hl.exec_cmd("uwsm app -- wl-paste --watch cliphist store")
end)
```

`uwsm app --` launches the process as a UWSM-managed systemd unit (recommended when using UWSM session manager). Without UWSM, use bare `hl.exec_cmd("daemon &")`.

---

## Window Rules

```lua
hl.window_rule({
    name  = "descriptive-name",
    match = {
        class      = "^regex$",
        title      = ".*pattern.*",
        float      = true,         -- boolean filters
        fullscreen = false,
        xwayland   = true,
        workspace  = "w[tv1]",     -- workspace selector
        tag        = "my-tag",
    },
    -- Actions (one or more):
    float        = true,
    opacity      = "0.9 override",
    move         = "100 200",
    size         = "800 600",
    pin          = true,
    no_focus     = true,
    border_size  = 0,
    rounding     = 0,
    suppress_event = "maximize",
})
```

---

## Workspace Rules

```lua
hl.workspace_rule({ workspace = "1", monitor = "<MONITOR>" })

-- Selector syntax
-- "1"          → workspace ID 1
-- "w[tv1]"     → tiled-view-1 (smart gaps)
-- "f[1]"       → floating-1
-- "name:foo"   → named workspace
-- "special:bar"→ special/scratchpad workspace
-- "w[tv1]s[false]" → tiled-view-1 excluding special workspaces
```

---

## IPC — socket2

**Socket path:**

```
$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock
```

`HYPRLAND_INSTANCE_SIGNATURE` is set in the Hyprland environment automatically.

**Event wire format:** each line is `EVENT>>DATA\n`

```
workspace>>2
workspacev2>>2,workspace-name
activewindow>>class,title
createworkspace>>3
createworkspacev2>>3,name
destroyworkspace>>3
destroyworkspacev2>>3,name
monitoradded>>MONITOR-NAME
focusedmon>>MONITOR-NAME,workspaceid
closewindow>>windowaddress
```

**Consuming from bash:**

```bash
socat -U - UNIX-CONNECT:"$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock" \
  | while read -r line; do
      event="${line%%>>*}"
      data="${line#*>>}"
      case "$event" in
        workspace) echo "switched to $data" ;;
        activewindow) echo "window: $data" ;;
      esac
    done
```

**Consuming from TypeScript/GJS (Gio.UnixSocketAddress):**

```typescript
const sockPath = `${rdir}/hypr/${sig}/.socket2.sock`
const addr = Gio.UnixSocketAddress.new(sockPath)
// connect → read lines → parse "event>>data" by indexOf(">>")
```

**hyprctl JSON queries (one-shot):**

```bash
hyprctl -j workspaces
hyprctl -j activewindow
hyprctl -j activeworkspace
hyprctl -j monitors
hyprctl -j clients
hyprctl -j layers
```

---

## Lua Config — Tips

- Split config via `require("module")` (standard Lua module system).
- `hl.bind()` returns a handle; call `:set_enabled(false)` to disable at runtime.
- `hl.layer_rule()` and `hl.window_rule()` also return handles with `:set_enabled()`.
- `hl.get_config("animations.enabled")` reads live config values.
- Permissions (`hl.permission()`) require a Hyprland restart to take effect.
