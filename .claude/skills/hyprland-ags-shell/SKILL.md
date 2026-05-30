---
name: hyprland-ags-shell
description: "Trigger: Hyprland, AGS, Astal, gnim, GTK4 shell, Wayland desktop shell, bar, launcher, widget, layer-shell, hyprland.conf/.lua, hyprpaper, GTK4 SCSS. Build Arch/Hyprland desktop shells without hallucinating the toolkit."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use when building or editing a Wayland desktop shell on the **Hyprland + AGS v3 (Astal + gnim, GTK4)** stack on Arch-based distros: bars, launchers, OSDs, notification UIs, Hyprland config (hyprlang or Lua), layer-shell windows, GTK4 SCSS/CSS, wallpaper, theming, session, and packaging.

## Hard Rules

1. NEVER state an AGS / Astal / gnim / Hyprland API (method, prop, signal, config option) from memory. VERIFY it first via context7 (`/aylur/ags`, `/aylur/astal`, `/hyprwm/hyprland-wiki`) or the matching reference below. The API drifts; training data is stale.
2. Verify every Astal GObject property name + nesting against generated types (`ags types -d <dir>`) BEFORE binding — wrong names fail SILENTLY.
3. GTK4 CSS is a SUBSET of web CSS. Before writing any CSS, check `references/gtk4-css-unsupported.md` — `width`/`height`/`max-width`, flexbox/grid, `::before`/`::after`, attribute selectors, and `background-clip:text` all fail silently.
4. Target AGS v3 ONLY (Astal + gnim, GTK4). AGS v1 was GTK3 with a different API — never mix them.
5. For any visual or design decision, load `references/design-with-ui-ux-pro-max.md` (adapts the `ui-ux-pro-max` skill to GTK4 constraints).
6. Keep guidance GENERALIST — references avoid project-specific paths; use placeholders.

## Always-true gotchas (load the reference for detail)

- `hexpand`/`vexpand` propagate UP the tree; a horizontal box sizes to its widest child; no `max-width` → cap width by ellipsizing the widest child.
- No `<flowbox>`/`<calendar>` JSX intrinsic → build imperatively in a `$` setter; the `Gtk.FlowBoxChild` wrapper is mandatory (raw `append` is a silent no-op).
- `.as(arr => arr.map(...))` inside JSX renders literal `Accessor{}` → use `<For>`.
- Only one daemon owns `org.freedesktop.Notifications`; swaync is D-Bus-activated and steals it even when not started → mask or uninstall.
- hyprpaper 0.8+ needs block syntax + absolute paths; the old flat syntax is silently ignored.

## Trigger Table

| When (file / keyword) | Load reference |
|---|---|
| `*.tsx`, widget, JSX, reactive, state, `For`, accessor | `references/ags-gnim-reactivity.md`, `references/ags-windows-widgets.md` |
| window, layer-shell, anchor, popup, overlay, namespace | `references/gtk4-layer-shell.md`, `references/ags-windows-widgets.md` |
| Astal service, notifd, battery, network, audio, mpris | `references/ags-services.md` |
| IPC, `ags request`, CLI, type stubs | `references/ags-ipc.md` |
| `*.scss` / `*.css`, styling | `references/gtk4-css-supported.md`, `references/gtk4-css-unsupported.md` |
| layout, width, centering, `hexpand`, alignment | `references/gtk4-layout-patterns.md` |
| theme, tokens, `color-mix`, dark mode | `references/gtk4-css-theming.md` |
| icon, symbolic, recolor | `references/icons-and-theming.md` |
| `hypr*.conf` / `.lua`, keybind, monitor, rule, dispatch | `references/hyprland-config.md` |
| blur, glass, layer rule | `references/hyprland-layer-rules.md` |
| animation, bezier, curve | `references/hyprland-animations.md` |
| NVIDIA, GPU, env vars | `references/hyprland-nvidia.md`, `references/uwsm-session.md` |
| wallpaper, hyprpaper | `references/hyprpaper.md` |
| notification, toast, daemon, DND | `references/notification-daemon.md` |
| session, autostart, uwsm, systemd | `references/uwsm-session.md` |
| clipboard, screenshot, brightness, media keys | `references/wayland-utilities.md` |
| install, package, paru, AUR, SCSS build | `references/arch-packaging.md` |
| UI, design, spacing, hierarchy, motion, accessibility | `references/design-with-ui-ux-pro-max.md` |

## Output Contract

State which reference(s) you loaded and which API claims you context7-verified this session. Flag any claim you could not verify instead of asserting it.

## References

All under `references/` — routed by the Trigger Table. Each file is self-contained and version-anchored (AGS v3 / GTK4 / modern Hyprland). Claims are marked context7-verified, spec-defined, or empirically-verified; treat empirical claims as "confirm against your version".
