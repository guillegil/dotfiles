import app from "ags/gtk4/app"
import style from "./style.scss"
import { initMotionGate } from "./lib/motion"
import Bar from "./widget/Bar"
import Launcher from "./widget/Launcher.tsx"
import { CalendarPopover } from "./widget/Clock"
import VolumeOSD, { showVolumeOSD } from "./widget/VolumeOSD"
import { NotificationsPanel } from "./widget/NotificationsPanel"
import NotificationToasts from "./widget/NotificationToasts"

app.start({
  css: style,
  // Hyprland volume keys call `ags request volume-osd` (config/hypr/hyprland.lua)
  // to trigger the centered macOS-style OSD.
  requestHandler(argv: string[], res: (response: string) => void) {
    if (argv[0] === "volume-osd") {
      showVolumeOSD()
      res("ok")
      return
    }
    res("unknown request")
  },
  main() {
    initMotionGate()
    app.get_monitors().map(Bar)
    Launcher()
    CalendarPopover()    // singleton popover window, hidden by default (REQ-CL-03)
    VolumeOSD()          // singleton OSD window, hidden by default (volume keys)
    NotificationsPanel() // singleton panel window, hidden by default (REQ-NT-02)
    NotificationToasts() // transient arrival popups (top-right), DND-aware
  },
})
