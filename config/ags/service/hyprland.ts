import GObject from "gi://GObject"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { register, property } from "gnim/gobject"
import { execAsync } from "ags/process"

@register()
class Hyprland extends GObject.Object {
  @property(Object)
  workspaces: number[] = []

  @property(Object)
  occupied: number[] = []

  @property(Object)
  urgent: number[] = []

  @property(Number)
  activeWorkspace: number = 0

  @property(String)
  activeTitle: string = ""

  @property(String)
  activeClass: string = ""

  static #instance: Hyprland | null = null

  static get_default(): Hyprland {
    return (this.#instance ??= new Hyprland())
  }

  constructor() {
    super()
    this.#init()
  }

  // Hyprland is loaded with a Lua config (hyprland.lua), so `hyprctl dispatch`
  // is eval'd as Lua. The legacy `dispatch workspace N` form fails — confirmed
  // experimentally that only `hl.dsp.focus({workspace=N})` works.
  // Numeric targets render bare; string targets (e.g. "e+1") must be quoted.
  focusWorkspace(target: number | string): Promise<string> {
    const arg = typeof target === "number" ? String(target) : `"${target}"`
    return execAsync(["hyprctl", "dispatch", `hl.dsp.focus({workspace=${arg}})`])
  }

  // Fetch workspace list + occupied set from hyprctl.
  // The `windows` field in `hyprctl -j workspaces` gives the window count per ws.
  #fetchWorkspaces() {
    return execAsync(["hyprctl", "-j", "workspaces"]).then(out => {
      const ws = JSON.parse(out) as Array<{ id: number; windows: number }>
      this.workspaces = ws.map(w => w.id).sort((a, b) => a - b)
      this.occupied   = ws.filter(w => w.windows > 0).map(w => w.id)
    })
  }

  #init() {
    this.#fetchWorkspaces()

    execAsync(["hyprctl", "-j", "activewindow"]).then(out => {
      const w = JSON.parse(out) as { title?: string; class?: string; workspace?: { id: number } }
      this.activeTitle = w.title ?? ""
      this.activeClass = w.class ?? ""
      this.activeWorkspace = w.workspace?.id ?? 0
    })

    const sig = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")
    const rdir = GLib.getenv("XDG_RUNTIME_DIR")

    if (sig && rdir) {
      this.#subscribeSocket(rdir, sig)
    } else {
      this.#startPolling()
    }
  }

  #subscribeSocket(rdir: string, sig: string) {
    const sockPath = `${rdir}/hypr/${sig}/.socket2.sock`
    const addr = Gio.UnixSocketAddress.new(sockPath)
    const client = new Gio.SocketClient()
    client.connect_async(addr, null, (_, res) => {
      const conn = client.connect_finish(res)
      const stream = new Gio.DataInputStream({ base_stream: conn.get_input_stream() })
      this.#readSocketLine(stream)
    })
  }

  #readSocketLine(stream: Gio.DataInputStream) {
    stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (_, res) => {
      const [line] = stream.read_line_finish_utf8(res)
      if (line !== null) {
        this.#handleEvent(line)
        this.#readSocketLine(stream)
      }
    })
  }

  #startPolling() {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
      execAsync(["hyprctl", "-j", "activeworkspace"]).then(out => {
        const ws = JSON.parse(out) as { id: number }
        if (this.activeWorkspace !== ws.id) {
          this.activeWorkspace = ws.id
          this.#fetchWorkspaces()
        }
      })

      execAsync(["hyprctl", "-j", "activewindow"]).then(out => {
        const w = JSON.parse(out) as { title?: string; class?: string }
        this.activeTitle = w.title ?? ""
        this.activeClass = w.class ?? ""
      })

      return GLib.SOURCE_CONTINUE
    })
  }

  #handleEvent(line: string) {
    const sep = line.indexOf(">>")
    if (sep === -1) return
    const event = line.slice(0, sep)
    const data = line.slice(sep + 2)

    if (event === "workspace") {
      const id = parseInt(data, 10)
      if (!isNaN(id)) {
        this.activeWorkspace = id
        // Clear urgency for the workspace we just switched to.
        if (this.urgent.includes(id)) {
          this.urgent = this.urgent.filter(u => u !== id)
        }
      }
    } else if (event === "workspacev2") {
      const id = parseInt(data.split(",")[0], 10)
      if (!isNaN(id)) {
        this.activeWorkspace = id
        // Clear urgency for the workspace we just switched to.
        if (this.urgent.includes(id)) {
          this.urgent = this.urgent.filter(u => u !== id)
        }
      }
    } else if (event === "createworkspace" || event === "createworkspacev2") {
      this.#fetchWorkspaces()
    } else if (event === "destroyworkspace" || event === "destroyworkspacev2") {
      this.#fetchWorkspaces()
    } else if (event === "openwindow") {
      // A window opened — re-fetch to update the occupied set.
      this.#fetchWorkspaces()
    } else if (event === "closewindow") {
      // A window closed — re-fetch occupied set + clear active title.
      this.#fetchWorkspaces()
      this.activeTitle = ""
      this.activeClass = ""
    } else if (event === "activewindow") {
      const comma = data.indexOf(",")
      if (comma === -1) return
      this.activeClass = data.slice(0, comma)
      this.activeTitle = data.slice(comma + 1)
    } else if (event === "urgent") {
      // Socket2 emits: urgent>>WINDOWADDRESS (hex, no 0x prefix per Hyprland wiki)
      // Resolve the address to a workspace id via hyprctl -j clients.
      // On failure we silently skip — never crash. If the format changes this
      // becomes a no-op rather than an error.
      // TODO: verify exact address format against Hyprland IPC wiki (may or may
      // not include "0x" prefix — clients json has `address` with "0x" prefix).
      const addr = data.trim()
      execAsync(["hyprctl", "-j", "clients"]).then(out => {
        try {
          const clients = JSON.parse(out) as Array<{ address: string; workspace: { id: number } }>
          // Hyprland clients list addresses with "0x" prefix; socket2 event
          // omits it. Try both forms.
          const client = clients.find(
            c => c.address === addr ||
                 c.address === `0x${addr}` ||
                 c.address.toLowerCase() === addr.toLowerCase() ||
                 c.address.toLowerCase() === `0x${addr}`.toLowerCase()
          )
          if (client) {
            const wsId = client.workspace.id
            if (!this.urgent.includes(wsId)) {
              this.urgent = [...this.urgent, wsId]
            }
          }
        } catch {
          // JSON parse failure or unexpected format — ignore silently.
        }
      }).catch(() => { /* hyprctl failure — ignore */ })
    }
  }
}

export default Hyprland.get_default()
