# AGS v3 — Astal Services Reference

> Target: **AGS v3** (Astal + gnim, GTK4).
> Verified against context7 `/aylur/astal` (243 snippets).

---

## Golden Rule: Always Verify Property Names Before Binding

GObject property names differ between top-level objects and nested sub-objects, and a wrong name fails **silently** — no error, the binding just never updates.

**Before binding any service property:**

1. Generate type stubs: `ags types -d <output-dir>`
2. Check the generated `.d.ts` for exact property names (camelCase in GJS)
3. For nested objects (e.g. `network.wifi.ssid`), verify each level separately

```ts
// WRONG — may silently do nothing:
createBinding(network, "ssid")

// CORRECT — ssid lives on the nested wifi object:
const wifi = network.get_wifi()
createBinding(wifi, "ssid")
```

---

## Service Import Pattern

All Astal services follow the same GObject singleton pattern:

```ts
import AstalApps from "gi://AstalApps"
import Notifd from "gi://AstalNotifd"
import AstalBattery from "gi://AstalBattery"
import AstalNetwork from "gi://AstalNetwork"
import AstalMpris from "gi://AstalMpris"
// etc.

const apps    = new AstalApps.Apps()        // Apps is NOT a singleton — instantiate
const notifd  = Notifd.get_default()        // singleton
const battery = AstalBattery.get_default()  // singleton
const network = AstalNetwork.get_default()  // singleton
const mpris   = AstalMpris.get_default()    // singleton
```

**VERIFIED** — context7 `/aylur/astal` examples for each service.

---

## AstalApps

```ts
import Apps from "gi://AstalApps"

const apps = new Apps.Apps({
  nameMultiplier:       2,
  entryMultiplier:      0,
  executableMultiplier: 2,
})

// All installed apps
const all: Apps.Application[] = apps.get_list()
// or: apps.list (GJS auto-property)

// Fuzzy search
const results: Apps.Application[] = apps.fuzzy_query("fire")

// Application properties (verified from context7 + GJS types)
const app = results[0]
app.name        // display name
app.description // short description
app.executable  // executable path
app.icon_name   // icon name for Gtk.Image (snake_case in GJS; camelCase: iconName)
app.entry       // .desktop entry ID (unique key)
app.launch()    // launch the app
```

**Note on `icon_name` vs `iconName`:** GJS exposes GObject properties in both snake_case and camelCase. Context7 docs show `icon_name` (snake_case); empirically `iconName` (camelCase) also works in GJS. Use the form your type stubs expose.

**VERIFIED** — context7 `/aylur/astal`, "Query and Launch Applications with AstalApps".

---

## AstalNotifd

```ts
import Notifd from "gi://AstalNotifd"

const notifd = Notifd.get_default()

// Reactive binding to the full notification list
const notifications = createBinding(notifd, "notifications")
const dnd           = createBinding(notifd, "dontDisturb")

// Signal: fires when a new notification arrives
notifd.connect("notified", (_src, id: number) => {
  const n = notifd.get_notification(id)
  // n is Notifd.Notification | null
})

// Signal: fires when a notification is dismissed/closed
notifd.connect("resolved", (_src, id: number) => {
  // remove from local state
})

// DND control
notifd.get_dont_disturb()           // read
notifd.set_dont_disturb(true)       // write

// Dismiss a notification (removes from panel)
n.dismiss()

// Notification properties (verified against AstalNotifd-0.1.gir)
n.id
n.summary
n.body
n.appIcon      // icon name
n.urgency      // Notifd.Urgency enum: NORMAL | LOW | CRITICAL
n.time         // unix timestamp (seconds)
n.actions      // array of action objects
```

`notifd` alone collects notifications — it does NOT show toasts. To show toasts, listen to the `notified` signal and render your own transient widget.

**VERIFIED** — context7 `/aylur/astal`, "AstalNotifd Client" and Python/GJS examples. Property names also verified empirically against AstalNotifd-0.1.gir.

---

## AstalBattery

```ts
import AstalBattery from "gi://AstalBattery"

const battery = AstalBattery.get_default()

// Bindable properties
createBinding(battery, "percentage")  // 0.0–1.0
createBinding(battery, "isPresent")
createBinding(battery, "charging")
createBinding(battery, "iconName")
```

**VERIFIED** — context7 `/aylur/astal`, "Monitor Battery Status" + `createBinding` example.

---

## AstalNetwork

```ts
import AstalNetwork from "gi://AstalNetwork"

const network = AstalNetwork.get_default()

// Sub-objects — DO NOT bind top-level "ssid" etc.
const wifi   = network.get_wifi()    // may be null if no wifi device
const wired  = network.get_wired()   // may be null

// Wifi properties (on the wifi sub-object, not on network)
createBinding(wifi, "ssid")
createBinding(wifi, "strength")   // 0–100
createBinding(wifi, "iconName")

// Wired properties
createBinding(wired, "iconName")
```

**VERIFIED** — context7 `/aylur/astal`, "Manage Network Connections with AstalNetwork".

---

## AstalMpris

```ts
import AstalMpris from "gi://AstalMpris"

const mpris = AstalMpris.get_default()

// Reactive list of players
const players = createBinding(mpris, "players")

// Per-player properties
<For each={players}>
  {(player) => (
    <box>
      <label label={createBinding(player, "title")} />
      <label label={createBinding(player, "artist")} />
      <button onClicked={() => player.play_pause()}>⏯</button>
    </box>
  )}
</For>
```

**VERIFIED** — context7 `/aylur/ags`, `createBinding` APIDOC example (NowPlaying widget).

---

## AstalWp / AstalAudio

> **Naming note:** the library may be imported as `AstalWp` or `AstalAudio` depending on your Astal build. Check your installed GIR files.

```ts
import AstalWp from "gi://AstalWp"     // or "gi://AstalAudio"

const wp = AstalWp.get_default()

// Endpoints hang off the `audio` sub-object (context7 shape)
const speaker = wp.audio.default_speaker
const mic     = wp.audio.default_microphone

// Properties — note the property is `volume` + `muted` (NOT "mute")
createBinding(speaker, "volume")        // 0.0–1.0
createBinding(speaker, "muted")
createBinding(speaker, "volumeIcon")    // ready-made icon name
speaker.set_muted(true)                 // setter
```

**Partially verified** — context7 `/aylur/astal` attests the `wp.audio.default_speaker` / `default_microphone` shape and the `muted` / `volume` / `volume_icon` properties. The `AstalWp` vs `AstalAudio` import name varies by build. **Always confirm the exact members with `ags types -d <dir>` before use** — property nesting differs across Astal versions.

---

## Custom GObject Services

To build your own singleton service (e.g. for Hyprland IPC), use gnim's `@register()` and `@property()` decorators:

```ts
import GObject from "gi://GObject"
import { register, property } from "gnim/gobject"

@register()
class MyService extends GObject.Object {
  @property(Number)
  value: number = 0

  static #instance: MyService | null = null
  static get_default(): MyService {
    return (this.#instance ??= new MyService())
  }
}

export default MyService.get_default()
```

Then bind to it exactly like a built-in Astal service:

```ts
createBinding(MyService.get_default(), "value")
```

**Verified empirically** — service/hyprland.ts uses this exact pattern.
