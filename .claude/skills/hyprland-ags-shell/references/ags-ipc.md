# AGS v3 — IPC & CLI Reference

> Target: **AGS v3** (Astal + gnim, GTK4).
> Verified against context7 `/aylur/ags` (306 snippets).

---

## `app.start()` — Full Signature

```ts
import app from "ags/gtk4/app"

app.start({
  // Optional: CSS string or imported stylesheet
  css: `window { background: transparent; }`,

  // Optional: path to extra icon theme directory
  icons: `${import.meta.dir}/icons`,

  // Optional: GTK theme name
  gtkTheme: "Adwaita-dark",

  // Optional: DBus instance name (default: "io.Astal.Ags")
  // Sets DBus name to io.Astal.<instanceName>
  instanceName: "my-shell",

  // IPC handler — called when `ags request <args>` is run
  requestHandler(argv: string[], response: (reply: string) => void) {
    const [cmd, ...rest] = argv
    if (cmd === "my-action") {
      doSomething()
      return response("ok")
    }
    response("unknown command")
  },

  // Main entry point — runs once after Gtk.Application is ready
  main() {
    app.get_monitors().map(monitor => Bar(monitor))
    Launcher()
    // ... mount all singleton windows here
  },
})
```

**VERIFIED** — context7 `/aylur/ags`, `app.start()` APIDOC. All fields above are from the verified snippet.

---

## IPC: `requestHandler` + `ags request`

`requestHandler` receives `argv: string[]` — the arguments passed to `ags request`.

```ts
// In app.ts:
requestHandler(argv, res) {
  if (argv[0] === "volume-osd") {
    showVolumeOSD()
    return res("ok")
  }
  res("unknown request")
}
```

```sh
# Trigger from a keybind or script:
ags request volume-osd
# → calls requestHandler(["volume-osd"], res)
```

The response is echoed to stdout of the `ags request` call. Always call `res()` — not calling it leaves the caller hanging.

**VERIFIED** — context7 `/aylur/ags`, `app.start()` APIDOC `requestHandler` field. Empirically confirmed in app.ts.

---

## Generating Type Stubs

```sh
ags types -d <output-directory>
```

Generates TypeScript `.d.ts` files for all available Astal GObject types (services, widgets, enums). **Run this before binding to any service property** — it is the authoritative source for exact property names and nesting structure.

```sh
ags types -d ./types
# then check ./types/AstalApps-0.1.d.ts, AstalNotifd-0.1.d.ts, etc.
```

**VERIFIED** — context7 `/aylur/ags` references `ags types`. Exact flag `-d` confirmed empirically.

---

## CLI Quick Reference

```sh
# Run the shell (entry file auto-detected from package.json or passed explicitly)
ags run

# Run a specific file
ags run app.ts

# Toggle a window from the CLI (first-class — preferred over a custom request)
ags toggle <window-name>
ags toggle <window-name> -i my-shell   # target a named instance

# Send an IPC request to a running instance
ags request <arg> [arg...]
ags request <arg> -i my-shell          # target a named instance

# Inspect the GTK tree / generate type stubs
ags inspect
ags types -d <output-dir>

# Stop / list instances
ags quit
ags list
```

**Verification** — context7 `/aylur/ags` attests `ags run`, `ags request`, `ags toggle`, `ags inspect`, `ags types`, and the **`-i` short flag** for targeting a named instance (context7 shows `-i`, NOT `--instance`). `ags quit` and `ags list` are **not surfaced in context7 snippets — verify against your installed AGS version** (`ags --help`).

---

## Multi-Monitor Pattern

`app.get_monitors()` returns an array of `Gdk.Monitor`. Map over it to create one window per monitor:

```ts
main() {
  app.get_monitors().map(monitor => Bar(monitor))
}
```

Inside `Bar`, pass the monitor to the window:

```tsx
function Bar(monitor: Gdk.Monitor) {
  return (
    <window
      gdkmonitor={monitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      application={app}
    />
  )
}
```

**VERIFIED** — `app.get_monitors()` confirmed via context7 `/aylur/ags` and empirically in app.ts. `gdkmonitor` prop: **verified empirically; confirm against your AGS version.**

---

## Singleton Window Pattern

Overlay windows (launcher, notification panel, OSD) are mounted once in `main()` with `visible={false}`. Toggle them via IPC or internal signals:

```ts
main() {
  Launcher()           // mounts hidden; toggle via app.toggle_window("launcher")
  NotificationsPanel() // mounts hidden
  VolumeOSD()          // mounts hidden; shown by requestHandler
}
```

```ts
// Toggle from anywhere:
import app from "ags/gtk4/app"
app.toggle_window("launcher")
```

Name must match the `name` prop on the `<window>`.

**Verified empirically** — app.ts and Launcher.tsx. `app.toggle_window` also confirmed in context7 examples.
