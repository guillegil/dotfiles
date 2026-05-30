# Wayland Utilities — shell-out reference

> Verification status: tool names and core flags are **well-established** in the Wayland
> ecosystem. Flags documented here are standard and widely confirmed; none are invented.
> Specific flag combinations marked "verify empirically" where behavior may vary by
> distro/version. The `execAsync` pattern is **context7-verified** as the idiomatic
> AGS subprocess call.

---

## The pattern: always `execAsync`, never sync

From AGS/gnim TypeScript, always call external utilities **asynchronously**:

```ts
import { execAsync } from "astal/process"

// Good — non-blocking
const output = await execAsync(["wl-paste"])

// Also good — fire-and-forget
execAsync(["brightnessctl", "set", "5%+"])

// Bad — blocks the GJS main loop, freezes the shell
import { exec } from "astal/process"
exec("wl-paste")   // avoid in production widgets
```

`execAsync` returns a `Promise<string>` (stdout). On non-zero exit it rejects with
stderr as the error message.

---

## Clipboard — wl-clipboard + cliphist

### wl-clipboard

Package: `wl-clipboard` (official repos, Arch)

| Command | Purpose |
|---------|---------|
| `wl-copy <text>` | Write to clipboard |
| `wl-paste` | Read current clipboard |
| `wl-paste --primary` | Read primary selection (middle-click buffer) |
| `wl-copy --clear` | Clear the clipboard |

```ts
// Read clipboard
const text = await execAsync(["wl-paste"])

// Write to clipboard
await execAsync(["wl-copy", someText])
```

### cliphist — clipboard history daemon

Package: `cliphist` (official repos, Arch)

cliphist listens on a Unix socket and stores a ring buffer of clipboard entries. It
requires a separate watcher process piping `wl-paste` output into it (usually started
in Hyprland autostart):

```sh
# autostart — pipe clipboard changes into cliphist
exec-once = uwsm app -- wl-paste --watch cliphist store
```

Querying history:

```sh
cliphist list           # list all entries (tab-separated: id \t preview)
cliphist decode <id>    # decode and print entry by id
cliphist decode <id> | wl-copy   # restore to clipboard
cliphist wipe           # clear all history
```

From AGS (e.g. feeding a fuzzy picker):

```ts
const entries = (await execAsync(["cliphist", "list"])).trim().split("\n")
// entries: ["1\tsome text", "2\tanother entry", ...]

// Restore selected entry
await execAsync(["sh", "-c", `cliphist decode "${id}" | wl-copy`])
```

---

## Screenshots — grim + slurp

Package: `grim`, `slurp` (official repos, Arch)

`grim` captures Wayland output. `slurp` presents an interactive region selector.

```sh
# Full screen (primary output)
grim ~/Pictures/screenshot.png

# Specific output
grim -o DP-1 ~/Pictures/screenshot.png

# Region (interactive select via slurp)
grim -g "$(slurp)" ~/Pictures/screenshot.png

# Capture to clipboard directly
grim -g "$(slurp)" - | wl-copy
```

From AGS:

```ts
// Region screenshot to clipboard
await execAsync(["sh", "-c", "grim -g \"$(slurp)\" - | wl-copy"])

// Full screenshot to file
const file = `${GLib.get_home_dir()}/Pictures/screenshot-${Date.now()}.png`
await execAsync(["grim", file])
```

> `slurp` is interactive — it blocks until the user selects a region or presses Escape.
> On Escape it exits non-zero; handle the rejection.

---

## Brightness — brightnessctl

Package: `brightnessctl` (official repos, Arch)

Requires the user to be in the `video` group (`sudo usermod -aG video $USER`).

```sh
brightnessctl get           # current value (raw)
brightnessctl max           # maximum value (raw)
brightnessctl set 50%       # set absolute percentage
brightnessctl set 5%+       # increase by 5%
brightnessctl set 5%-       # decrease by 5%
brightnessctl set 1%-       # minimum step down
```

From AGS:

```ts
// Get brightness as percentage (0–100)
const raw = parseInt(await execAsync(["brightnessctl", "get"]))
const max = parseInt(await execAsync(["brightnessctl", "max"]))
const percent = Math.round((raw / max) * 100)

// Adjust
await execAsync(["brightnessctl", "set", "5%+"])
```

For reactive brightness display, poll on a timer or watch `/sys/class/backlight/*/brightness` via a file monitor rather than polling with `execAsync` in a loop.

---

## Media control — playerctl

Package: `playerctl` (official repos, Arch)

`playerctl` speaks MPRIS2 over D-Bus — controls any compliant player (Spotify, mpv,
browsers, etc.).

```sh
playerctl play-pause        # toggle
playerctl play
playerctl pause
playerctl stop
playerctl next
playerctl previous
playerctl metadata          # current track metadata (title, artist, album, url)
playerctl metadata title    # just the title
playerctl volume 0.5        # set volume (0.0–1.0)
playerctl volume 0.1+       # increase by 10%
playerctl status            # Playing / Paused / Stopped
```

From AGS:

```ts
// Get current track title
const title = await execAsync(["playerctl", "metadata", "title"])

// Toggle play/pause
await execAsync(["playerctl", "play-pause"])
```

For reactive now-playing widgets, prefer `libastal-mpris` (AstalMpris GObject service)
over polling `playerctl` — it emits signals on track change and playback state change.

---

## Audio — PipeWire / WirePlumber

Packages: `pipewire`, `pipewire-pulse`, `wireplumber` (official repos, Arch)

PipeWire is the audio server; WirePlumber is the session manager.

### wpctl (WirePlumber control)

```sh
wpctl status                          # full graph overview
wpctl get-volume @DEFAULT_AUDIO_SINK@          # e.g. "Volume: 0.50"
wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+      # increase sink 5%
wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-      # decrease sink 5%
wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle     # toggle sink mute
wpctl set-volume @DEFAULT_AUDIO_SOURCE@ 5%+    # microphone
wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle   # mute mic
```

`@DEFAULT_AUDIO_SINK@` and `@DEFAULT_AUDIO_SOURCE@` are symbolic aliases — they always
refer to the current default device.

From AGS:

```ts
await execAsync(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "5%+"])
await execAsync(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
```

### libastal-wireplumber (preferred for widgets)

For reactive volume/mute widgets use `libastal-wireplumber` (AstalWp GObject service).
It emits signals on volume/mute changes, avoiding polling:

```ts
import Wp from "gi://AstalWp"

const audio = Wp.get_default()
const sink  = audio.default_speaker   // AudioDevice

// Reactive binding
const vol  = bind(sink, "volume")     // 0.0–1.0
const mute = bind(sink, "muted")
```

`wpctl` via `execAsync` is fine for one-shot keybinding handlers; `libastal-wireplumber`
is better for live status widgets.
