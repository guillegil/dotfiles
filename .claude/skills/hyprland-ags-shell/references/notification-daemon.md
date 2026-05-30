# Notification Daemon — FreeDesktop spec + AstalNotifd

> Verification status:
> - AstalNotifd API (signals, `get_notification`, `dismiss`, daemon-vs-client behavior)
>   **context7-verified** via `/aylur/astal`.
> - FreeDesktop D-Bus name exclusivity is **spec + empirical** (FreeDesktop Notification
>   Spec §3.1; confirmed by observation).
> - swaync D-Bus activation behavior is **empirical** — observed in this project
>   (see `packages/pacman.txt` comments); confirm for your swaync version.
> - Urgency levels are **spec-defined** (FreeDesktop Notification Spec §3.6).

---

## The D-Bus name is exclusive

The FreeDesktop Notification Specification reserves the well-known D-Bus name
`org.freedesktop.Notifications`. **Only one process can own it at a time.** The first
process to claim it becomes the active daemon; all subsequent callers are clients.

Consequence: if any other notification daemon holds the name, AstalNotifd becomes a
**client** — it receives no new notifications and cannot manage them. No error is thrown;
it silently acts as a client.

---

## The swaync activation trap

swaync ships a **`Type=dbus` systemd user unit** (`swaync.service`) that is **D-Bus
activated** — the system starts it automatically the first time something calls
`org.freedesktop.Notifications`, even if you never explicitly started swaync.

**This means**: if swaync is installed (even unused), it will race AstalNotifd for the
name on every session start, and often win.

### Fix: mask swaync's unit

```sh
systemctl --user mask swaync.service
```

Masking prevents D-Bus activation from launching it. If you want to fully remove the
race, uninstall swaync:

```sh
sudo pacman -R swaync      # Arch/CachyOS
```

The same pattern applies to **dunst** and **mako** — check whether they ship a
`Type=dbus` unit:

```sh
systemctl --user cat dunst.service   # look for Type=dbus
```

Mask any that do.

---

## AstalNotifd: daemon vs client behavior

AstalNotifd is a **library**, not a standalone binary. The first GJS/Python process to
call `Notifd.get_default()` and request ownership of `org.freedesktop.Notifications`
becomes the daemon. Subsequent processes get a client view.

AGS/gnim wires this up automatically when you import and use `AstalNotifd` — your shell
IS the daemon as long as nothing else holds the name.

```ts
// TypeScript / gnim (AGS v3)
import Notifd from "gi://AstalNotifd"

const notifd = Notifd.get_default()

// "notified" fires when a new notification arrives
notifd.connect("notified", (_, id) => {
    const n = notifd.get_notification(id)
    console.log(n.summary, n.body, n.app_name)
})

// "resolved" fires when a notification is dismissed or times out
notifd.connect("resolved", (_, id, reason) => {
    console.log(`notification ${id} resolved: ${reason}`)
})

// Dismiss programmatically
notifd.get_notification(id)?.dismiss()
```

---

## Urgency levels

Defined by the FreeDesktop spec. AstalNotifd exposes them as a property on the
notification object:

| Level | Numeric | Meaning |
|-------|---------|---------|
| `LOW` | 0 | Informational; may be suppressed in DND |
| `NORMAL` | 1 | Default; standard behavior |
| `CRITICAL` | 2 | Must not be suppressed even in DND |

```ts
import Notifd from "gi://AstalNotifd"

notifd.connect("notified", (_, id) => {
    const n = notifd.get_notification(id)
    if (n.urgency === Notifd.Urgency.CRITICAL) {
        // always show — bypass DND
    }
})
```

---

## Do Not Disturb (DND)

AstalNotifd exposes a `dont-disturb` (also accessible as `dontDisturb` in JS) boolean
on the default instance. When `true`, the daemon still receives and stores notifications
but your shell can gate toast display on this flag.

```ts
// Toggle DND
notifd.dontDisturb = !notifd.dontDisturb

// React to DND in a widget
const dnd = bind(notifd, "dont-disturb")
```

> DND is a **shell-side** convention, not enforced by the D-Bus spec. CRITICAL urgency
> notifications are typically shown regardless.

---

## Notification object properties (commonly used)

| Property | Type | Description |
|----------|------|-------------|
| `summary` | string | Notification title |
| `body` | string | Main text (may be empty) |
| `app_name` | string | Sending application name |
| `app_icon` | string | Icon name or path |
| `urgency` | `Notifd.Urgency` | LOW / NORMAL / CRITICAL |
| `actions` | `Action[]` | Array of `{ id, label }` |
| `image` | string | Inline image hint (may be empty) |

---

## Checklist: replacing another daemon with AstalNotifd

1. Identify installed daemons: `pacman -Q swaync dunst mako` (Arch)
2. For each installed daemon, check `systemctl --user cat <name>.service` for `Type=dbus`
3. Mask D-Bus–activated units: `systemctl --user mask <name>.service`
4. Optionally uninstall to remove the unit entirely
5. Start AGS — AstalNotifd claims `org.freedesktop.Notifications` on first use
6. Verify with: `busctl --user get-property org.freedesktop.Notifications / org.freedesktop.Notifications ServerInformation` (or `gdbus introspect`)
