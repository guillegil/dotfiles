// Network.tsx — network status indicator (REQ-NW-01..03)
// AstalNetwork: connectivity (enum) + iconName (reflects active link) + wifi
// (Wifi|null). Icon swaps wifi/ethernet/disconnected via the service's own
// iconName. SSID shown only when a wifi link is present, truncated >12 chars.
// Property names verified against AstalNetwork-0.1.gir.
//
// Known limitation (acceptable for a status chip): the SSID label binds to the
// wifi object that exists at build time. The top-level iconName binding always
// reflects the active connection type, so a wired↔wifi switch still updates the
// glyph and color; only the SSID text may lag until AGS reloads. Full dynamic
// rebinding is deferred.

import { createBinding } from "ags"
import AstalNetwork from "gi://AstalNetwork"
import { Gtk } from "ags/gtk4"
import Pango from "gi://Pango"

export default function Network() {
  const net = AstalNetwork.get_default()

  const connectivity = createBinding(net, "connectivity")
  const iconName = createBinding(net, "iconName")

  // REQ-NW-02: --sky when online, --dim when disconnected/limited.
  const cssClasses = connectivity.as(c =>
    c === AstalNetwork.Connectivity.FULL
      ? ["network", "w", "online"]
      : ["network", "w", "offline"])

  const wifi = net.wifi

  return (
    <box
      cssClasses={cssClasses}
      accessibleRole={Gtk.AccessibleRole.GROUP}
      valign={Gtk.Align.CENTER}
      $={(self) => {
        // REQ-NW-03: accessible-name reflects connection type
        const update = () => {
          const c = net.get_connectivity()
          const online = c === AstalNetwork.Connectivity.FULL
          const kind = net.wifi ? "Wi-Fi" : net.wired ? "Ethernet" : "Network"
          self.update_property(
            [Gtk.AccessibleProperty.LABEL],
            [online ? `${kind} connected` : `${kind} disconnected`],
          )
        }
        update()
        connectivity.subscribe(update)
      }}
    >
      <box spacing={4} valign={Gtk.Align.CENTER}>
        <image iconName={iconName} valign={Gtk.Align.CENTER} />
        {wifi && (
          <label
            cssClasses={["network-ssid"]}
            label={createBinding(wifi, "ssid").as(s => s ?? "")}
            maxWidthChars={12}
            ellipsize={Pango.EllipsizeMode.END}
            valign={Gtk.Align.CENTER}
          />
        )}
      </box>
    </box>
  )
}
