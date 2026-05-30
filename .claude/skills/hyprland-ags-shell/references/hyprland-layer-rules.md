# Hyprland Layer Rules Reference

Layer rules control compositor behavior for Wayland layer-shell surfaces (bars, overlays, launchers, notification popups, lock screens, etc.).

## The Match Target: Namespace, Not CSS Class

The `namespace` is the string the client passes to `zwlr_layer_shell_v1` when it creates the surface. It is NOT the widget class or CSS class — those live inside the client. You cannot change a layer surface's namespace from the compositor side; it is set by the application.

Common namespaces:
- `ags` — AGS (Astal shell) surfaces (all windows share one namespace by default)
- `waybar` — Waybar status bar
- `rofi` — Rofi launcher
- `selection` — screenshot area selectors (e.g., hyprshot)
- `gtk-layer-shell` — apps using the gtk-layer-shell library
- `nwg-*` — nwg-panel, nwg-dock, etc.

Find the namespace of a running layer surface:

```bash
hyprctl layers
```

Output shows each monitor's layer surfaces grouped by zone (background, bottom, top, overlay), with their namespace, address, and dimensions.

---

## Rule Syntax

### Lua config

```lua
hl.layer_rule({
    name  = "optional-rule-name",          -- for debugging; shows in hyprctl
    match = { namespace = "^<pattern>$" }, -- regex matched against namespace
    -- one or more effect properties:
    blur         = true,
    ignore_alpha = 0.5,    -- float 0.0–1.0
    blur_popups  = true,
    no_anim      = true,
    dim_around   = true,
    xray         = true,
    animation    = "fade",
    order        = 0,      -- integer; higher = closer to monitor edge
    above_lock   = 1,      -- 1 = visible on lockscreen, 2 = interactive on lockscreen
    no_screen_share = true,
})
```

### hyprlang config

```ini
layerrule = blur, ^<pattern>$
layerrule = ignorezero, ^<pattern>$
layerrule = ignorealpha 0.5, ^<pattern>$
layerrule = blurpopups, ^<pattern>$
layerrule = noanim, ^<pattern>$
layerrule = dimaround, ^<pattern>$
layerrule = xray 1, ^<pattern>$
layerrule = animation fade, ^<pattern>$
layerrule = order -1, ^<pattern>$
layerrule = abovelock 2, ^<pattern>$
layerrule = noscreenshare, ^<pattern>$
```

> Note: hyprlang property names differ slightly from Lua (`ignorezero` vs `ignore_alpha = 0`, `dimaround` vs `dim_around`, etc.).

---

## Effect Reference

| Lua property | hyprlang keyword | Type | Description |
|---|---|---|---|
| `blur = true` | `blur` | bool | Enable compositor blur behind this layer |
| `ignore_alpha = N` | `ignorealpha N` / `ignorezero` | float 0–1 | Blur ignores pixels with opacity ≤ N. Use to kill halo artifacts on transparent-bg layers |
| `blur_popups = true` | `blurpopups` | bool | Also blur Wayland popups owned by this surface |
| `no_anim = true` | `noanim` | bool | Disable open/close animations for this layer |
| `dim_around = true` | `dimaround` | bool | Dim everything rendered behind this layer (modal overlay effect) |
| `xray = true` | `xray 1` | bool/int | Blur xray mode: shows what's below rather than blending |
| `animation = "<style>"` | `animation <style>` | string | Override animation style for this layer (e.g., `"fade"`, `"slide"`) |
| `order = N` | `order N` | int | Z-order relative to other layers; higher = closer to screen edge |
| `above_lock = N` | `abovelock N` | int | `1` = render above lockscreen; `2` = interactive above lockscreen |
| `no_screen_share = true` | `noscreenshare` | bool | Hide this layer from screen capture / sharing |

---

## Common Patterns

### Blur behind a transparent bar (e.g., AGS, Waybar)

```lua
-- Lua
hl.layer_rule({ match = { namespace = "^ags$" }, blur = true })
-- ignore_alpha prevents blur "halo" on fully-transparent pixels
hl.layer_rule({ match = { namespace = "^ags$" }, ignore_alpha = true })
```

```ini
# hyprlang
layerrule = blur, ^ags$
layerrule = ignorezero, ^ags$
```

The `ignorezero` / `ignore_alpha` rule is critical: without it, the blur kernel spreads into transparent regions around the surface, producing a glowing artifact around the bar edges.

For `ignore_alpha = N` (non-zero float), set N above your shadow/background alpha but below your content alpha. A value of `0.1`–`0.2` is typical.

### Blur behind a launcher with transparent popup menus

```lua
hl.layer_rule({ match = { namespace = "^rofi$" }, blur = true })
hl.layer_rule({ match = { namespace = "^rofi$" }, ignore_alpha = 0.5 })
hl.layer_rule({ match = { namespace = "^rofi$" }, blur_popups = true })
```

### Disable animations for a screenshot selector

```lua
hl.layer_rule({ match = { namespace = "^selection$" }, no_anim = true })
```

### Dim desktop behind a modal overlay

```lua
hl.layer_rule({ match = { namespace = "^my-modal$" }, dim_around = true })
```

---

## Debugging

```bash
# List all active layer surfaces with namespace, zone, and geometry
hyprctl layers

# Watch for layer surface creation/destruction events
socat -U - UNIX-CONNECT:"$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock" \
  | grep --line-buffered "^openlayer\|^closelayer"
```

Relevant socket2 events: `openlayer>>namespace`, `closelayer>>namespace`.

If a rule seems to have no effect, verify:
1. The namespace matches: `hyprctl layers` shows the exact string.
2. The regex anchors are correct (`^...$` for exact match, no anchors for substring).
3. Blur is enabled globally: `hl.config({ decoration = { blur = { enabled = true } } })`.
