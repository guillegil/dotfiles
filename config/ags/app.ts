import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./widget/Bar"
import Launcher from "./widget/Launcher.tsx"

app.start({
  css: style,
  main() {
    app.get_monitors().map(Bar)
    Launcher()
  },
})
