import GObject from "gi://GObject"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { register, property } from "gnim/gobject"
import { execAsync } from "ags/process"

@register()
class Hyprland extends GObject.Object {
  @property(Object)
  workspaces: number[] = []

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

  dispatch(cmd: string, ...args: string[]): Promise<string> {
    return execAsync(["hyprctl", "dispatch", cmd, ...args])
  }

  #init() {
    execAsync(["hyprctl", "-j", "workspaces"]).then(out => {
      const ws = JSON.parse(out) as Array<{ id: number }>
      this.workspaces = ws.map(w => w.id).sort((a, b) => a - b)
    })

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
          execAsync(["hyprctl", "-j", "workspaces"]).then(o => {
            const list = JSON.parse(o) as Array<{ id: number }>
            this.workspaces = list.map(w => w.id).sort((a, b) => a - b)
          })
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
      if (!isNaN(id)) this.activeWorkspace = id
    } else if (event === "workspacev2") {
      const id = parseInt(data.split(",")[0], 10)
      if (!isNaN(id)) this.activeWorkspace = id
    } else if (event === "createworkspace" || event === "createworkspacev2") {
      execAsync(["hyprctl", "-j", "workspaces"]).then(out => {
        const ws = JSON.parse(out) as Array<{ id: number }>
        this.workspaces = ws.map(w => w.id).sort((a, b) => a - b)
      })
    } else if (event === "destroyworkspace" || event === "destroyworkspacev2") {
      execAsync(["hyprctl", "-j", "workspaces"]).then(out => {
        const ws = JSON.parse(out) as Array<{ id: number }>
        this.workspaces = ws.map(w => w.id).sort((a, b) => a - b)
      })
    } else if (event === "activewindow") {
      const comma = data.indexOf(",")
      if (comma === -1) return
      this.activeClass = data.slice(0, comma)
      this.activeTitle = data.slice(comma + 1)
    } else if (event === "closewindow") {
      this.activeTitle = ""
      this.activeClass = ""
    }
  }
}

export default Hyprland.get_default()
