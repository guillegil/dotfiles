import app from "ags/gtk4/app"
import style from "./style.scss"
import { initMotionGate } from "./lib/motion"
import Bar from "./widget/Bar"
import Launcher from "./widget/Launcher.tsx"
import { CalendarPopover } from "./widget/Clock"

app.start({
  css: style,
  main() {
    initMotionGate()
    app.get_monitors().map(Bar)
    Launcher()
    CalendarPopover()   // singleton popover window, hidden by default (REQ-CL-03)
  },
})
