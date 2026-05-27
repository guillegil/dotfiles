---
source: engram
topic_key: sdd/desktop-redesign/apply-progress
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Apply Progress: desktop-redesign — Slice A0

## Completed Tasks (Slice A0 — service/hyprland.ts only)

- [x] 1.12 Create `config/ags/service/hyprland.ts`: GObject subclass with `workspaces: number[]`, `activeWorkspace: number`, `activeTitle: string`, `activeClass: string` bindable properties using gnim `@register()` + `@property()` decorators; init via `hyprctl -j workspaces` + `hyprctl -j activewindow`; live updates via `Gio.SocketClient` + `Gio.DataInputStream` reading `.socket2.sock` parsing `workspace>>N`, `workspacev2>>N,name`, `createworkspace>>`, `destroyworkspace>>`, `activewindow>>CLASS,TITLE`, `closewindow>>` events; `dispatch(cmd, ...args)` method via `execAsync`; polling fallback (250ms GLib.timeout_add) when `HYPRLAND_INSTANCE_SIGNATURE` or `XDG_RUNTIME_DIR` env vars are absent; singleton via `Hyprland.get_default()`; default export is the singleton instance (ADR-2; REQ-WS-01, REQ-AW-01). 137 lines.
- [x] 1.13 (partial — manual verification steps documented below; the file compiles clean via `ags bundle`)

## Deferred Tasks (rest of Slice A — do NOT implement until next apply batch)

Phase 0 pre-flight tasks: 0.1–0.9 (all)
Slice A package list: 1.1, 1.2
Slice A SCSS: 1.3–1.9
Slice A lib: 1.10, 1.11
Slice A shell widgets: 1.14, 1.15, 1.16, 1.17
Slice A Hyprland Lua: 1.18
Slice A app.ts: 1.19
Slice A verification: 1.20, 1.21, 1.22
All of Slice B (tasks 2.1–2.8)
All of Slice C (tasks 3.1–3.7)
All of Slice D (tasks 4.1–4.8)

## Files Created

- `config/ags/service/hyprland.ts` — NEW, 137 lines

## Implementation Notes

- Used `Gio.SocketClient` + `Gio.DataInputStream.read_line_async` for socket2, NOT socat (socat not installed on this system — verified via `which socat`).
- `@property(Object)` for `workspaces: number[]` — maps to `ParamSpec.jsobject` in gnim (line 394 of gobject.ts handles `Object`/`Array`/`Function` → jsobject boxed type). Confirmed correct.
- `ags bundle` compiles cleanly on both the service in isolation and the full `app.ts`.
- Hyprland socket2 now uses both `workspace>>` (legacy) and `workspacev2>>` (current format) events.
- Import style: `gnim/gobject` for decorators (matches Process class in AGS source), `gi://Gio` for Gio, `gi://GLib` for GLib, `ags/process` for execAsync.
- No `subprocess` import needed (removed after socat approach was dropped).

## Manual Verification Steps (task 1.13)

To verify the service in isolation without touching other files:

1. In `app.ts`, temporarily add below the imports:
   ```ts
   import hyprland from "./service/hyprland"
   ```
   And inside `main()`, before `app.get_monitors().map(Bar)`:
   ```ts
   hyprland.connect("notify::workspaces", () => console.log("workspaces:", hyprland.workspaces))
   hyprland.connect("notify::active-workspace", () => console.log("activeWorkspace:", hyprland.activeWorkspace))
   hyprland.connect("notify::active-title", () => console.log("activeTitle:", hyprland.activeTitle))
   ```
2. Run `ags run` from the config/ags directory.
3. Expected: console shows initial workspace list. Switching workspaces (Super+1 etc.) triggers the `activeWorkspace` log. Focusing different windows triggers `activeTitle` log.
4. After smoke test, REVERT the temporary app.ts changes.

GObject property name convention: gnim kebabifies camelCase, so `activeWorkspace` → `"notify::active-workspace"`, `activeTitle` → `"notify::active-title"`, `activeClass` → `"notify::active-class"`.

For widget `createBinding(hyprland, "activeWorkspace")` — use camelCase in createBinding (Astal's binding layer maps to kebab-case internally).

## Risks / Blockers

1. **`Gio.DataInputStream` constructor with object literal**: GJS allows `new Gio.DataInputStream({ base_stream: ... })` as a GObject construction property pattern. This is standard GJS but if AGS's bundler/GJS version has issues with it, the alternative is `Gio.DataInputStream.new(conn.get_input_stream())`. If the smoke test fails on the socket subscription, try that alternative.

2. **`workspaces` binding in Workspaces.tsx**: Since `workspaces` is a `jsobject` ParamSpec, `createBinding(hyprland, "workspaces")` will return `Accessor<number[]>`. When the array is reassigned (new reference), the binding fires correctly. However if code tries to mutate in place (e.g., `push`), notify won't fire. The service always creates a new array via `.map()` so this is safe — just document this constraint for the next apply batch.

3. **Socket2 path format**: Verified against Hyprland docs — path is `$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock`. If the user's Hyprland version uses a different path layout, the `#startPolling()` fallback kicks in automatically.

## Next Apply Batch

Continue with the rest of Slice A: tasks 1.1–1.11, 1.14–1.22 (SCSS partials, lib/motion.ts, lib/a11y.ts, BarShell, Bar Aurora layout, Workspaces, Popover, Lua layerrules, app.ts edits).
