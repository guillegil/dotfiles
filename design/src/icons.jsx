// Phosphor-style inline SVG icons. Stroke-based, geometric.
// <Icon name="clock" size={14} /> — color via currentColor.

const ICONS = {
  // ── core widgets
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  wifi: <><path d="M2 8.5c5.5-5 14.5-5 20 0"/><path d="M5 12c4-3.5 10-3.5 14 0"/><path d="M8.5 15.5c2-1.7 5-1.7 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
  bluetooth: <><path d="M7 7l10 10-5 4V3l5 4L7 17"/></>,
  battery: <><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><rect x="4" y="9" width="11" height="6" fill="currentColor" stroke="none"/></>,
  volume: <><path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6"/><path d="M19 6c3 3 3 9 0 12"/></>,
  mute: <><path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9l5 6M21 9l-5 6"/></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>,
  brightness: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></>,
  ram: <><rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v8M10 8v8M14 8v8M18 8v8"/></>,
  thermo: <><path d="M12 3a2.5 2.5 0 00-2.5 2.5v9.1a4 4 0 105 0V5.5A2.5 2.5 0 0012 3z"/><circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none"/></>,
  power: <><path d="M12 3v9"/><path d="M6.5 7.5a8 8 0 1011 0"/></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></>,
  tray: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  window: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18"/><circle cx="6.5" cy="6" r=".5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="6" r=".5" fill="currentColor" stroke="none"/></>,

  // ── plugin widgets
  play: <><polygon points="7 4 19 12 7 20 7 4" fill="currentColor" stroke="none"/></>,
  pause: <><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></>,
  skip: <><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><rect x="17" y="4" width="2" height="16" fill="currentColor" stroke="none"/></>,
  prev: <><polygon points="19 4 9 12 19 20 19 4" fill="currentColor" stroke="none"/><rect x="5" y="4" width="2" height="16" fill="currentColor" stroke="none"/></>,
  tomato: <><path d="M12 4c-1-1.5-3-1.5-4 0"/><path d="M12 4c1-1.5 3-1.5 4 0"/><ellipse cx="12" cy="14" rx="8" ry="7.5"/><path d="M9 11c-1 1.5-1 4 .5 5.5" opacity="0.5"/></>,
  github: <><path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 00-1-2.3c3-.3 6-1.5 6-6.5a5 5 0 00-1.4-3.5 4.6 4.6 0 00-.1-3.4S17 1.5 14 3.5a13.4 13.4 0 00-6 0C5 1.5 4 2 4 2a4.6 4.6 0 00-.1 3.4A5 5 0 002.5 9c0 5 3 6.2 6 6.5a3 3 0 00-1 2.3V22"/></>,
  package: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
  ai: <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="currentColor" stroke="none" opacity="0.85"/><circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/></>,
  spark: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></>,
  cloud: <><path d="M7 18a5 5 0 010-10 6 6 0 0111.3 1.7A4 4 0 0117 18H7z"/></>,
  rec: <><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></>,
  chevron: <><path d="M9 6l6 6-6 6"/></>,
  arch: <><path d="M12 2L3 22h18L12 2z"/><path d="M12 9l-4 9M12 9l4 9"/></>,
  hypr: <><circle cx="12" cy="12" r="9"/><path d="M12 3l4 6h-8l4-6zM12 21l-4-6h8l-4 6z"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
  vpn: <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></>,
  camera: <><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M9 4h6l1 2H8l1-2z"/></>,
  cam_off: <><path d="M3 6h13M21 6v13M3 19V8M5 19h13M3 3l18 18"/><circle cx="12" cy="12.5" r="3"/></>,
  leaf: <><path d="M21 3c0 10-7 18-18 18 0-10 8-18 18-18z"/><path d="M3 21l9-9"/></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none"/></>,
  scale: <><path d="M12 4v16M4 8h16M7 12a3 3 0 006 0M11 12a3 3 0 006 0"/></>,
  coffee: <><path d="M4 8h12v6a5 5 0 01-10 0V8z"/><path d="M16 9h3a2 2 0 010 4h-3"/><path d="M8 4c0 1 1 1 1 2s-1 2-1 3M12 4c0 1 1 1 1 2s-1 2-1 3"/></>,
  moon: <><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z"/></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></>,
  snip: <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" opacity="0.4"/><path d="M9 6h6M6 9v6M18 9v6M9 18h6"/></>,
  dnd: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>,
  airpods: <><ellipse cx="7" cy="8" rx="2.5" ry="3"/><ellipse cx="17" cy="8" rx="2.5" ry="3"/><path d="M7 11v7M17 11v7M5 19h4M15 19h4"/></>,
  headphones: <><path d="M3 13a9 9 0 0118 0v5M3 13v5a2 2 0 002 2h1v-7H5a2 2 0 00-2 2zM21 13v5a2 2 0 01-2 2h-1v-7h1a2 2 0 012 2z"/></>,
  mouse: <><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/></>,
  laptop: <><rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 19h20l-1 1H3l-1-1z"/></>,
  dropper: <><path d="M19 3a2.5 2.5 0 010 3.5L17 8.5l-1.5-1.5L17.5 5A2.5 2.5 0 0119 3z"/><path d="M16 7.5L7 16.5l-4 4 4-.5L16.5 11"/><path d="M14 9l1 1"/></>,
  region: <><path d="M4 4h3M9 4h2M13 4h2M17 4h3v3M20 9v2M20 13v2M20 17v3h-3M15 20h-2M11 20h-2M7 20h-3v-3M4 15v-2M4 11V9M4 7V4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  speaker: <><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="15" r="3"/><circle cx="12" cy="7" r="1" fill="currentColor" stroke="none"/></>,
  display: <><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  monitor: <><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  arrow_down: <><path d="M6 9l6 6 6-6"/></>,
  arrow_up: <><path d="M6 15l6-6 6 6"/></>,
  swap: <><path d="M7 4l-4 4 4 4M3 8h11M17 12l4 4-4 4M21 16H10"/></>,
};

// Some icons are filled glyphs — keep them solid. Default: stroke 1.75.
function Icon({ name, size = 16, stroke = 1.75, style, color }) {
  const path = ICONS[name];
  if (!path) return <span style={{display:'inline-block',width:size,height:size,...style}}>?</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{display:'inline-block',flexShrink:0,...style}}>
      {path}
    </svg>
  );
}

Object.assign(window, { Icon, ICONS });
