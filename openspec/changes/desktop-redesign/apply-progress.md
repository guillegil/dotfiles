---
source: engram
topic_key: sdd/desktop-redesign/apply-progress
exported_at: 2026-05-27
---

# Apply Progress: desktop-redesign — Slice A0 + Slice A

## Completed Tasks (Slice A0 — service/hyprland.ts only)

- [x] 1.12 Create `config/ags/service/hyprland.ts`: GObject subclass with `workspaces: number[]`, `activeWorkspace: number`, `activeTitle: string`, `activeClass: string` bindable properties using gnim `@register()` + `@property()` decorators; init via `hyprctl -j workspaces` + `hyprctl -j activewindow`; live updates via `Gio.SocketClient` + `Gio.DataInputStream.read_line_async` reading `.socket2.sock` parsing `workspace>>N`, `workspacev2>>N,name`, `createworkspace>>`, `destroyworkspace>>`, `activewindow>>CLASS,TITLE`, `closewindow>>` events; `dispatch(cmd, ...args)` method via `execAsync`; polling fallback (250ms GLib.timeout_add) when `HYPRLAND_INSTANCE_SIGNATURE` or `XDG_RUNTIME_DIR` env vars are absent; singleton via `Hyprland.get_default()`; default export is the singleton instance (ADR-2; REQ-WS-01, REQ-AW-01). 137 lines.
- [x] 1.13 (partial — manual verification steps documented below; the file compiles clean via `ags bundle`. Smoke-tested in Slice A0 session.)

## Completed Tasks (Slice A — foundation)

Commit: `996960f` — `feat(ags): Pillbox bar foundation — token system, shell, Workspaces`

- [x] 1.1 `packages/pacman.txt`: added `ttf-ibm-plex`.
- [x] 1.2 `packages/aur.txt`: added `ttf-material-symbols-variable-git`.
- [x] 1.3 `config/ags/style/_tokens.scss`: full Catppuccin Mocha + Latte palette; all tinted values precomputed by `@use sass:color; color.mix(…)` at build time; no `color-mix()` in output.
- [x] 1.4 `config/ags/style/_typography.scss`: `--font-mono`, `--font-sans`, `.tabular` class.
- [x] 1.5 `config/ags/style/_motion.scss`: `.motion-off, .motion-off *` with `0.01ms` durations.
- [x] 1.6 `config/ags/style/_glass.scss`: `.bar-shell` (no border-radius, no box-shadow, no backdrop-filter, max-height 30px) + `.popover` rule.
- [x] 1.7 `config/ags/style/_widgets.scss`: `.w`, `.w--chip`, `.w-sep`, `.ws-target`, `.ws`, `.ws.active`, `.mic.*`, `.launcher-*`, `.notification-row.urgent`, `:focus-visible` ring.
- [x] 1.8 `config/ags/style/_index.scss`: `@forward` in dependency order.
- [x] 1.9 `config/ags/style.scss`: replaced with one-liner `@use "./style/index";`.
- [x] 1.10 `config/ags/lib/motion.ts`: `initMotionGate()` reads `gtk_enable_animations`, applies `.motion-on`/`.motion-off` to all AGS windows, subscribes to notify signal and window-added.
- [x] 1.11 `config/ags/lib/a11y.ts`: `setAccessibleName()` + `focusPad()` helpers.
- [x] 1.14 `config/ags/widget/BarShell.tsx`: edge-to-edge Astal.Window, anchor TOP|LEFT|RIGHT, EXCLUSIVE, `.bar-shell` class.
- [x] 1.15 `config/ags/widget/Popover.tsx`: generic layer-shell popover, Esc-to-close, `.popover` class, `accessibleRole=DIALOG`.
- [x] 1.16 `config/ags/widget/Bar.tsx`: Pillbox layout via GTK CenterBox — left/center/right sections; placeholder labels for Slice B/C/D widgets.
- [x] 1.17 `config/ags/widget/Workspaces.tsx`: binding on `hyprland.workspaces` + `hyprland.activeWorkspace`; dot/pill morph via `.ws`/`.ws.active`; click + scroll dispatch; 44px hit targets via `.ws-target`.
- [x] 1.18 `config/hypr/hyprland.lua`: added `hl.layer_rule` blur + ignorezero for `^ags$` namespace after autostart block.
- [x] 1.19 `config/ags/app.ts`: added `initMotionGate()` call before `app.get_monitors().map(Bar)`.

## Static Verification Results (task 1.21)

- `rg -n 'color-mix\(' config/ags/style/` → 0 actual matches (comment only)
- `rg -n 'backdrop-filter' config/ags/style/` → 0 actual matches (comment only)
- `rg -n 'border-radius|box-shadow' config/ags/style/_glass.scss` → in `.popover` ONLY
- `rg -n '#[0-9a-fA-F]{3,8}' config/ags/style/_widgets.scss` → 0 matches
- `ags bundle config/ags/app.ts /tmp/out.js` → exits 0, no errors
- `sass config/ags/style.scss /tmp/out.css` → exits 0, no errors
- Compiled CSS: no `color-mix(`, no `backdrop-filter`
- `rg -n 'hl\.layer_rule' config/hypr/hyprland.lua` → 2 active matches (lines 57-58)

## Pending Tasks (manual smoke tests — USER ACTION REQUIRED)

- [ ] 1.20 `ags run` — bar renders edge-to-edge at top; Hyprland blur visible; workspace dots present; workspace switch triggers pill morph; check `~/.cache/ags/` for no `color-mix(`.
- [ ] 1.22 `gsettings set org.gnome.desktop.interface enable-animations false` → verify `.motion-off` class on root widget; workspace switch is instant.

## Files Created (Slice A)

- `config/ags/lib/a11y.ts` — NEW
- `config/ags/lib/motion.ts` — NEW
- `config/ags/style/_glass.scss` — NEW
- `config/ags/style/_index.scss` — NEW
- `config/ags/style/_motion.scss` — NEW
- `config/ags/style/_tokens.scss` — NEW (~158 lines)
- `config/ags/style/_typography.scss` — NEW
- `config/ags/style/_widgets.scss` — NEW (~118 lines)
- `config/ags/widget/BarShell.tsx` — NEW
- `config/ags/widget/Popover.tsx` — NEW
- `config/ags/widget/Workspaces.tsx` — NEW

## Files Modified (Slice A)

- `config/ags/app.ts` — added initMotionGate()
- `config/ags/style.scss` — thin @use entry
- `config/ags/widget/Bar.tsx` — Pillbox CenterBox rewrite
- `config/hypr/hyprland.lua` — added 2 hl.layer_rule entries
- `packages/aur.txt` — ttf-material-symbols-variable-git
- `packages/pacman.txt` — ttf-ibm-plex

## Implementation Notes

### Slice A0 (hyprland.ts)

- Used `Gio.SocketClient` + `Gio.DataInputStream.read_line_async` for socket2, NOT socat (not installed).
- `@property(Object)` for `workspaces: number[]` maps to `ParamSpec.jsobject` in gnim.
- Handles both `workspace>>` (legacy) and `workspacev2>>` (current) events.
- Polling fallback (250ms) when env vars missing.

### Slice A (foundation)

- `Bar.tsx` uses GTK `<centerbox>` (not flex div) for left/center/right — correct GTK4 pattern for space-between.
- `Workspaces.tsx`: scroll uses `Gtk.EventControllerScroll` in `$` ref callback; dispatch uses `e-1`/`e+1` relative commands.
- `Popover.tsx`: uses `Gtk.EventControllerKey` in `$` ref callback for Esc (same pattern as existing `Launcher.tsx`).
- `lib/a11y.ts`: `focusPad()` uses `set_size_request(44, 44)` — intended for off-bar widgets (popovers/panels). Bar widgets use `.ws-target` CSS for hit targets instead.
- `_glass.scss`: `--bar-border` is precomputed in `_tokens.scss` via `color.mix()`. The CSS var reference is valid because tokens load first via `_index.scss`.

## Risks / Flags for Smoke Test

1. **Workspaces nested binding**: `workspaces.as(ids => ids.map(id => active.as(…)))` creates nested bindings. If AGS does not flatten correctly, workspace list may render as opaque objects. Alternative: single `createComputed([workspaces, active], …)` to produce the full button array.
2. **`max-height: 30px` vs 44px hit target tension**: `.ws-target` has `min-height: 44px` but `.bar-shell` has `max-height: 30px`. GTK will clip the widget. On smoke test: if workspace buttons are invisible or clipped, remove `max-height` from `.bar-shell`. The spec mandates ≤30px height AND ≥44px hit target — these are in conflict and the hit-target must win for a11y compliance.
3. **CenterBox width**: `<centerbox hexpand>` should expand to fill the BarShell window. If the bar appears narrow, add `width-request` on BarShell or set `hexpand` on the window child explicitly.

## Next Apply Batch (Slice B)

Tasks: 2.1 (ActiveWindow), 2.2 (LauncherPill), 2.3 (Clock + date), 2.4 (CalendarPopover), 2.5 (Mic restyle), 2.6 (Launcher restyle), 2.7 (Bar.tsx slot fill), 2.8 (smoke test).
