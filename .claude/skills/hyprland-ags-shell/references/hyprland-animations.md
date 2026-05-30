# Hyprland Animations Reference

## Overview

Animations are configured via:
1. **Curves** — named timing functions (bezier or spring)
2. **Animation leaves** — nodes in a hierarchy; each leaf inherits from its parent

---

## Defining Curves

### Bezier (cubic)

```lua
-- Lua
hl.curve("myCurve", { type = "bezier", points = { {X0, Y0}, {X1, Y1} } })
```

Two control points define the cubic bezier (P0 and P1; endpoints are implicit at {0,0} and {1,1}):

```lua
hl.curve("easeOutQuint",   { type = "bezier", points = { {0.23, 1},    {0.32, 1}    } })
hl.curve("easeInOutCubic", { type = "bezier", points = { {0.65, 0.05}, {0.36, 1}    } })
hl.curve("linear",         { type = "bezier", points = { {0, 0},       {1, 1}       } })
hl.curve("almostLinear",   { type = "bezier", points = { {0.5, 0.5},   {0.75, 1}    } })
hl.curve("quick",          { type = "bezier", points = { {0.15, 0},    {0.1, 1}     } })
hl.curve("overshoot",      { type = "bezier", points = { {0.5, 0.9},   {0.1, 1.1}   } })
```

### Spring

```lua
hl.curve("easy",   { type = "spring", mass = 1, stiffness = 71.2633, dampening = 15.8273644 })
hl.curve("rubber", { type = "spring", mass = 1, stiffness = 70,      dampening = 10         })
```

Spring curves ignore `speed` — duration is determined by the physics parameters.

### hyprlang equivalent

```ini
bezier = myCurve, X0, Y0, X1, Y1
```

---

## Animation Declaration

```lua
-- Full form
hl.animation({ leaf = STRING, enabled = BOOLEAN, speed = FLOAT, bezier = STRING[, style = STRING] })
hl.animation({ leaf = STRING, enabled = BOOLEAN, speed = FLOAT, spring = STRING[, style = STRING] })

-- Disable a leaf
hl.animation({ leaf = "fade", enabled = false })
```

`speed` is in units of 100ms (e.g., `speed = 8` → 800ms).  
`bezier` / `spring` reference a curve name defined with `hl.curve()`.  
`style` is optional; valid values depend on the leaf (see table below).  
`curve` is an alias for `bezier` in the Lua API.

### hyprlang equivalent

```ini
animation = windows, 1, 8, myCurve, slide
animation = fade, 0
```

---

## Animation Tree (Full Hierarchy)

Leaves inherit enabled/speed/curve from their parent when not explicitly set.

```
global
  ↳ windows                   styles: slide, popin, gnomed
    ↳ windowsIn               window open — same styles as windows
    ↳ windowsOut              window close — same styles as windows
    ↳ windowsMove             move/drag/resize (no style)
  ↳ layers                    styles: slide, popin, fade
    ↳ layersIn                layer open
    ↳ layersOut               layer close
  ↳ fade
    ↳ fadeIn                  fade in on window open
    ↳ fadeOut                 fade out on window close
    ↳ fadeSwitch              fade on activewindow change
    ↳ fadeShadow              fade on activewindow shadow change
    ↳ fadeDim                 easing of inactive-window dimming
    ↳ fadeLayers              fade for layer surfaces
      ↳ fadeLayersIn          fade in for layer open
      ↳ fadeLayersOut         fade out for layer close
    ↳ fadePopups              fade for Wayland popups
      ↳ fadePopupsIn          fade in for popup open
      ↳ fadePopupsOut         fade out for popup close
    ↳ fadeDpms                fade on DPMS toggle
  ↳ border                    border color switch
  ↳ borderangle               border gradient angle — styles: once (default), loop
  ↳ workspaces                styles: slide, slidevert, fade, slidefade, slidefadevert
    ↳ workspacesIn            same styles as workspaces
    ↳ workspacesOut           same styles as workspaces
    ↳ specialWorkspace        scratchpad open/close — same styles as workspaces
      ↳ specialWorkspaceIn
      ↳ specialWorkspaceOut
  ↳ zoomFactor                screen zoom animation
  ↳ monitorAdded              monitor added zoom animation
```

---

## Style Parameter Values

| Leaf group | Valid styles |
|---|---|
| `windows`, `windowsIn`, `windowsOut` | `slide`, `popin [N%]`, `gnomed` |
| `layers`, `layersIn`, `layersOut` | `slide`, `popin`, `fade` |
| `workspaces` and children | `slide`, `slidevert`, `fade`, `slidefade [N%]`, `slidefadevert [N%]` |
| `borderangle` | `once`, `loop` |
| `fade*` | (no style parameter) |
| `windowsMove` | (no style parameter) |

`popin N%` — window scales from N% of its size on open/close.  
`slidefade N%` — slides N% of screen width while fading (default: 20%).

---

## Example: Full Animation Config

```lua
-- Curves
hl.curve("easeOutQuint",   { type = "bezier", points = { {0.23, 1},    {0.32, 1}    } })
hl.curve("almostLinear",   { type = "bezier", points = { {0.5, 0.5},   {0.75, 1}    } })
hl.curve("linear",         { type = "bezier", points = { {0, 0},       {1, 1}       } })
hl.curve("quick",          { type = "bezier", points = { {0.15, 0},    {0.1, 1}     } })
hl.curve("easy",           { type = "spring", mass = 1, stiffness = 71.2633, dampening = 15.8273644 })

-- Global toggle
hl.animation({ leaf = "global",        enabled = true,  speed = 10,   bezier = "default" })

-- Windows (spring — speed ignored for springs)
hl.animation({ leaf = "windows",       enabled = true,  speed = 4.79, spring = "easy" })
hl.animation({ leaf = "windowsIn",     enabled = true,  speed = 4.1,  spring = "easy",       style = "popin 87%" })
hl.animation({ leaf = "windowsOut",    enabled = true,  speed = 1.49, bezier = "linear",     style = "popin 87%" })

-- Layers
hl.animation({ leaf = "layers",        enabled = true,  speed = 3.81, bezier = "easeOutQuint" })
hl.animation({ leaf = "layersIn",      enabled = true,  speed = 4,    bezier = "easeOutQuint", style = "fade" })
hl.animation({ leaf = "layersOut",     enabled = true,  speed = 1.5,  bezier = "linear",       style = "fade" })
hl.animation({ leaf = "fadeLayersIn",  enabled = true,  speed = 1.79, bezier = "almostLinear" })
hl.animation({ leaf = "fadeLayersOut", enabled = true,  speed = 1.39, bezier = "almostLinear" })

-- Fade
hl.animation({ leaf = "fadeIn",        enabled = true,  speed = 1.73, bezier = "almostLinear" })
hl.animation({ leaf = "fadeOut",       enabled = true,  speed = 1.46, bezier = "almostLinear" })
hl.animation({ leaf = "fade",          enabled = true,  speed = 3.03, bezier = "quick" })

-- Workspaces
hl.animation({ leaf = "workspaces",    enabled = true,  speed = 1.94, bezier = "almostLinear", style = "fade" })
hl.animation({ leaf = "workspacesIn",  enabled = true,  speed = 1.21, bezier = "almostLinear", style = "fade" })
hl.animation({ leaf = "workspacesOut", enabled = true,  speed = 1.94, bezier = "almostLinear", style = "fade" })

-- Border
hl.animation({ leaf = "border",        enabled = true,  speed = 5.39, bezier = "easeOutQuint" })

-- Zoom
hl.animation({ leaf = "zoomFactor",    enabled = true,  speed = 7,    bezier = "quick" })
```

---

## Toggle All Animations (Game Mode Pattern)

```lua
hl.bind("SUPER + F1", function()
    local game_mode = (hl.get_config("animations.enabled") == false)
    if game_mode then
        hl.exec_cmd("hyprctl reload")
        return
    end
    hl.config({
        general    = { gaps_in = 0, gaps_out = 0, border_size = 0 },
        animations = { enabled = false },
        decoration = { shadow = { enabled = false }, blur = { enabled = false }, rounding = 0 },
    })
end)
```

---

## Notes

- `"default"` is a built-in curve name (linear-ish, always available without `hl.curve()`).
- Setting `enabled = false` on `global` disables all animations. Setting it on a leaf only disables that branch.
- Spring curves do not use `speed` — the duration is determined by `stiffness` and `dampening`. Passing `speed` is harmless but ignored.
- Leaf names are case-sensitive.
