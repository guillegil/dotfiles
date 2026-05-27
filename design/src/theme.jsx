// Palettes + wallpaper backdrops for the AGS bar.
// Themes follow Catppuccin's key vocabulary (mauve/blue/peach/teal/etc.)
// so the same widgets can render across any palette. `isLight` flips the
// glass background math in <Desktop>.

// ── Catppuccin ─────────────────────────────────────────────────────────────
const MOCHA = {
  name: 'mocha', label: 'Catppuccin Mocha', isLight: false,
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#cba6f7',
  red: '#f38ba8', maroon: '#eba0ac', peach: '#fab387', yellow: '#f9e2af',
  green: '#a6e3a1', teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe',
  text: '#cdd6f4', subtext1: '#bac2de', subtext0: '#a6adc8',
  overlay2: '#9399b2', overlay1: '#7f849c', overlay0: '#6c7086',
  surface2: '#585b70', surface1: '#45475a', surface0: '#313244',
  base: '#1e1e2e', mantle: '#181825', crust: '#11111b',
};

const LATTE = {
  name: 'latte', label: 'Catppuccin Latte', isLight: true,
  rosewater: '#dc8a78', flamingo: '#dd7878', pink: '#ea76cb', mauve: '#8839ef',
  red: '#d20f39', maroon: '#e64553', peach: '#fe640b', yellow: '#df8e1d',
  green: '#40a02b', teal: '#179299', sky: '#04a5e5', sapphire: '#209fb5',
  blue: '#1e66f5', lavender: '#7287fd',
  text: '#4c4f69', subtext1: '#5c5f77', subtext0: '#6c6f85',
  overlay2: '#7c7f93', overlay1: '#8c8fa1', overlay0: '#9ca0b0',
  surface2: '#acb0be', surface1: '#bcc0cc', surface0: '#ccd0da',
  base: '#eff1f5', mantle: '#e6e9ef', crust: '#dce0e8',
};

// ── Gruvbox Dark ───────────────────────────────────────────────────────────
const GRUVBOX = {
  name: 'gruvbox', label: 'Gruvbox Dark', isLight: false,
  rosewater: '#fbf1c7', flamingo: '#d65d0e', pink: '#d3869b', mauve: '#d3869b',
  red: '#fb4934', maroon: '#cc241d', peach: '#fe8019', yellow: '#fabd2f',
  green: '#b8bb26', teal: '#8ec07c', sky: '#83a598', sapphire: '#458588',
  blue: '#83a598', lavender: '#d3869b',
  text: '#ebdbb2', subtext1: '#d5c4a1', subtext0: '#bdae93',
  overlay2: '#a89984', overlay1: '#928374', overlay0: '#7c6f64',
  surface2: '#665c54', surface1: '#504945', surface0: '#3c3836',
  base: '#282828', mantle: '#1d2021', crust: '#161616',
};

// ── Tokyo Night (Storm) ────────────────────────────────────────────────────
const TOKYONIGHT = {
  name: 'tokyonight', label: 'Tokyo Night', isLight: false,
  rosewater: '#c0caf5', flamingo: '#ff9e64', pink: '#ff007c', mauve: '#bb9af7',
  red: '#f7768e', maroon: '#db4b4b', peach: '#ff9e64', yellow: '#e0af68',
  green: '#9ece6a', teal: '#73daca', sky: '#7dcfff', sapphire: '#2ac3de',
  blue: '#7aa2f7', lavender: '#9d7cd8',
  text: '#c0caf5', subtext1: '#a9b1d6', subtext0: '#9aa5ce',
  overlay2: '#737aa2', overlay1: '#565f89', overlay0: '#414868',
  surface2: '#414868', surface1: '#292e42', surface0: '#24283b',
  base: '#1a1b26', mantle: '#16161e', crust: '#13131a',
};

// ── Nord ───────────────────────────────────────────────────────────────────
const NORD = {
  name: 'nord', label: 'Nord', isLight: false,
  rosewater: '#eceff4', flamingo: '#d08770', pink: '#b48ead', mauve: '#b48ead',
  red: '#bf616a', maroon: '#bf616a', peach: '#d08770', yellow: '#ebcb8b',
  green: '#a3be8c', teal: '#8fbcbb', sky: '#88c0d0', sapphire: '#5e81ac',
  blue: '#81a1c1', lavender: '#b48ead',
  text: '#eceff4', subtext1: '#e5e9f0', subtext0: '#d8dee9',
  overlay2: '#7b88a1', overlay1: '#5c6a82', overlay0: '#4c566a',
  surface2: '#4c566a', surface1: '#434c5e', surface0: '#3b4252',
  base: '#2e3440', mantle: '#272c36', crust: '#22272f',
};

// ── Dracula ────────────────────────────────────────────────────────────────
const DRACULA = {
  name: 'dracula', label: 'Dracula', isLight: false,
  rosewater: '#f8f8f2', flamingo: '#ffb86c', pink: '#ff79c6', mauve: '#bd93f9',
  red: '#ff5555', maroon: '#ff5555', peach: '#ffb86c', yellow: '#f1fa8c',
  green: '#50fa7b', teal: '#8be9fd', sky: '#8be9fd', sapphire: '#6272a4',
  blue: '#8be9fd', lavender: '#bd93f9',
  text: '#f8f8f2', subtext1: '#dcdce8', subtext0: '#a9a9b8',
  overlay2: '#7c7f96', overlay1: '#6272a4', overlay0: '#525574',
  surface2: '#44475a', surface1: '#383a4e', surface0: '#2c2e3f',
  base: '#282a36', mantle: '#21222c', crust: '#191a21',
};

// ── Rosé Pine ──────────────────────────────────────────────────────────────
const ROSEPINE = {
  name: 'rosepine', label: 'Rosé Pine', isLight: false,
  rosewater: '#ebbcba', flamingo: '#f6c177', pink: '#ebbcba', mauve: '#c4a7e7',
  red: '#eb6f92', maroon: '#eb6f92', peach: '#f6c177', yellow: '#f6c177',
  green: '#9ccfd8', teal: '#31748f', sky: '#9ccfd8', sapphire: '#31748f',
  blue: '#9ccfd8', lavender: '#c4a7e7',
  text: '#e0def4', subtext1: '#cbc7e3', subtext0: '#908caa',
  overlay2: '#817c9c', overlay1: '#6e6a86', overlay0: '#403d52',
  surface2: '#403d52', surface1: '#26233a', surface0: '#1f1d2e',
  base: '#191724', mantle: '#1f1d2e', crust: '#14121f',
};

// ── Everforest (Dark, Medium) ──────────────────────────────────────────────
const EVERFOREST = {
  name: 'everforest', label: 'Everforest Dark', isLight: false,
  rosewater: '#d3c6aa', flamingo: '#e69875', pink: '#d699b6', mauve: '#d699b6',
  red: '#e67e80', maroon: '#e67e80', peach: '#e69875', yellow: '#dbbc7f',
  green: '#a7c080', teal: '#83c092', sky: '#7fbbb3', sapphire: '#4f6c7a',
  blue: '#7fbbb3', lavender: '#d699b6',
  text: '#d3c6aa', subtext1: '#b6b099', subtext0: '#9da9a0',
  overlay2: '#859289', overlay1: '#7a8478', overlay0: '#56635f',
  surface2: '#4f585e', surface1: '#3d484d', surface0: '#343f44',
  base: '#2d353b', mantle: '#232a2e', crust: '#1e2326',
};

// ── Kanagawa (Wave) ────────────────────────────────────────────────────────
const KANAGAWA = {
  name: 'kanagawa', label: 'Kanagawa', isLight: false,
  rosewater: '#dcd7ba', flamingo: '#ffa066', pink: '#d27e99', mauve: '#957fb8',
  red: '#e46876', maroon: '#c34043', peach: '#ffa066', yellow: '#e6c384',
  green: '#98bb6c', teal: '#7aa89f', sky: '#7fb4ca', sapphire: '#2d4f67',
  blue: '#7e9cd8', lavender: '#9cabca',
  text: '#dcd7ba', subtext1: '#c8c093', subtext0: '#938aa9',
  overlay2: '#727169', overlay1: '#54546d', overlay0: '#363646',
  surface2: '#2d4f67', surface1: '#223249', surface0: '#2a2a37',
  base: '#1f1f28', mantle: '#181820', crust: '#16161d',
};

// ── Gruvbox Light ──────────────────────────────────────────────────────────
const GRUVBOX_LIGHT = {
  name: 'gruvbox-light', label: 'Gruvbox Light', isLight: true,
  rosewater: '#3c3836', flamingo: '#af3a03', pink: '#b16286', mauve: '#8f3f71',
  red: '#9d0006', maroon: '#cc241d', peach: '#af3a03', yellow: '#b57614',
  green: '#79740e', teal: '#427b58', sky: '#689d6a', sapphire: '#458588',
  blue: '#076678', lavender: '#8f3f71',
  text: '#3c3836', subtext1: '#504945', subtext0: '#665c54',
  overlay2: '#7c6f64', overlay1: '#928374', overlay0: '#a89984',
  surface2: '#bdae93', surface1: '#d5c4a1', surface0: '#ebdbb2',
  base: '#fbf1c7', mantle: '#f2e5bc', crust: '#ebdbb2',
};

// ── Solarized Light ────────────────────────────────────────────────────────
const SOLARIZED_LIGHT = {
  name: 'solarized-light', label: 'Solarized Light', isLight: true,
  rosewater: '#586e75', flamingo: '#cb4b16', pink: '#d33682', mauve: '#6c71c4',
  red: '#dc322f', maroon: '#cb4b16', peach: '#cb4b16', yellow: '#b58900',
  green: '#859900', teal: '#2aa198', sky: '#2aa198', sapphire: '#268bd2',
  blue: '#268bd2', lavender: '#6c71c4',
  text: '#586e75', subtext1: '#657b83', subtext0: '#839496',
  overlay2: '#93a1a1', overlay1: '#a1adad', overlay0: '#b8bdb8',
  surface2: '#93a1a1', surface1: '#d5cfb8', surface0: '#eee8d5',
  base: '#fdf6e3', mantle: '#eee8d5', crust: '#e4ddc9',
};

// ── Pixel — retro 8-bit (PICO-8 inspired) ──────────────────────
const PIXEL = {
  name: 'pixel', label: 'Pixel 8-bit', isLight: false,
  font: '"VT323", "Press Start 2P", "JetBrains Mono", monospace',
  rosewater: '#ffccaa', flamingo: '#ab5236', pink: '#ff77a8', mauve: '#c77dff',
  red: '#ff004d', maroon: '#7e2553', peach: '#ffa300', yellow: '#ffec27',
  green: '#00e436', teal: '#29adff', sky: '#29adff', sapphire: '#1d2b53',
  blue: '#29adff', lavender: '#c77dff',
  text: '#fff1e8', subtext1: '#c2c3c7', subtext0: '#83769c',
  overlay2: '#c2c3c7', overlay1: '#83769c', overlay0: '#5f574f',
  surface2: '#5f574f', surface1: '#2d3a6a', surface0: '#1a2548',
  base: '#1d2b53', mantle: '#0d1430', crust: '#000000',
};

const PALETTES = {
  mocha: MOCHA, latte: LATTE,
  gruvbox: GRUVBOX, tokyonight: TOKYONIGHT, nord: NORD, dracula: DRACULA,
  rosepine: ROSEPINE, everforest: EVERFOREST, kanagawa: KANAGAWA,
  'gruvbox-light': GRUVBOX_LIGHT, 'solarized-light': SOLARIZED_LIGHT,
  pixel: PIXEL,
};

// ── Wallpaper ──────────────────────────────────────────────────────────────
// Each variant is a vibe-name → gradient. Light variants are detected by
// suffix `-light` (or the legacy `latte-*` prefix) so mountain + star colours
// adjust correctly.
function Wallpaper({ variant = 'mocha-a', children, style }) {
  const grads = {
    // Catppuccin Mocha
    'mocha-a': 'radial-gradient(ellipse at 20% 0%, #45475a 0%, #1e1e2e 45%, #11111b 100%)',
    'mocha-b': 'radial-gradient(ellipse at 80% 100%, #585b70 0%, #313244 35%, #11111b 95%)',
    'mocha-c': 'linear-gradient(160deg, #181825 0%, #1e1e2e 40%, #313244 100%)',
    'mocha-d': 'radial-gradient(ellipse at 50% 110%, #cba6f7 0%, #45475a 25%, #181825 70%)',
    'mocha-e': 'linear-gradient(180deg, #11111b 0%, #1e1e2e 60%, #313244 100%)',
    'mocha-f': 'radial-gradient(ellipse at 100% 0%, #74c7ec 0%, #313244 25%, #11111b 85%)',
    // Catppuccin Latte
    'latte-a': 'radial-gradient(ellipse at 20% 0%, #dce0e8 0%, #eff1f5 50%, #ccd0da 100%)',
    'latte-b': 'radial-gradient(ellipse at 80% 100%, #bcc0cc 0%, #eff1f5 60%, #dce0e8 100%)',
    'latte-c': 'linear-gradient(160deg, #eff1f5 0%, #e6e9ef 50%, #dce0e8 100%)',
    // Gruvbox Dark — warm sandstone
    'gruvbox-a': 'radial-gradient(ellipse at 30% 0%, #504945 0%, #282828 50%, #1d2021 100%)',
    'gruvbox-b': 'linear-gradient(160deg, #1d2021 0%, #282828 40%, #3c3836 100%)',
    // Tokyo Night — neon city
    'tokyonight-a': 'radial-gradient(ellipse at 50% 100%, #7aa2f7 -10%, #292e42 30%, #1a1b26 70%, #13131a 100%)',
    'tokyonight-b': 'linear-gradient(180deg, #13131a 0%, #1a1b26 50%, #292e42 100%)',
    // Nord — frosted glacier
    'nord-a': 'radial-gradient(ellipse at 70% 0%, #5e81ac 0%, #3b4252 35%, #2e3440 80%)',
    'nord-b': 'linear-gradient(160deg, #2e3440 0%, #3b4252 50%, #4c566a 100%)',
    // Dracula — gothic mist
    'dracula-a': 'radial-gradient(ellipse at 20% 0%, #bd93f9 -10%, #44475a 25%, #282a36 65%, #191a21 100%)',
    'dracula-b': 'linear-gradient(180deg, #191a21 0%, #282a36 50%, #44475a 100%)',
    // Rosé Pine — moody dawn
    'rosepine-a': 'radial-gradient(ellipse at 80% 0%, #c4a7e7 -10%, #403d52 25%, #1f1d2e 60%, #14121f 100%)',
    'rosepine-b': 'linear-gradient(160deg, #191724 0%, #1f1d2e 40%, #26233a 100%)',
    // Everforest — fog in pines
    'everforest-a': 'radial-gradient(ellipse at 50% 110%, #a7c080 -20%, #3d484d 25%, #2d353b 60%, #1e2326 100%)',
    'everforest-b': 'linear-gradient(160deg, #1e2326 0%, #2d353b 50%, #3d484d 100%)',
    // Kanagawa — woodblock wave
    'kanagawa-a': 'radial-gradient(ellipse at 30% 110%, #2d4f67 -10%, #223249 30%, #1f1f28 65%, #16161d 100%)',
    'kanagawa-b': 'linear-gradient(180deg, #16161d 0%, #1f1f28 50%, #2a2a37 100%)',
    // Gruvbox Light — warm paper
    'gruvbox-light-a': 'radial-gradient(ellipse at 30% 0%, #f2e5bc 0%, #fbf1c7 50%, #ebdbb2 100%)',
    'gruvbox-light-b': 'linear-gradient(160deg, #fbf1c7 0%, #f2e5bc 50%, #ebdbb2 100%)',
    // Solarized Light — sepia desk
    'solarized-light-a': 'radial-gradient(ellipse at 70% 0%, #eee8d5 0%, #fdf6e3 50%, #e4ddc9 100%)',
    'solarized-light-b': 'linear-gradient(160deg, #fdf6e3 0%, #eee8d5 50%, #e4ddc9 100%)',
    // Pixel — CRT arcade night, deep blue with a magenta sunrise
    'pixel-a': 'linear-gradient(180deg, #000000 0%, #1d2b53 35%, #7e2553 75%, #ff004d 100%)',
    'pixel-b': 'linear-gradient(180deg, #000000 0%, #1d2b53 50%, #2d3a6a 100%)',
  };
  const isLight = variant.startsWith('latte') || variant.includes('-light');
  // pick mountain colors by variant family
  let mtnA = '#181825', mtnB = '#11111b';
  if (isLight) {
    if (variant.startsWith('latte')) { mtnA = '#bcc0cc'; mtnB = '#acb0be'; }
    else if (variant.startsWith('gruvbox-light')) { mtnA = '#d5c4a1'; mtnB = '#bdae93'; }
    else if (variant.startsWith('solarized-light')) { mtnA = '#d5cfb8'; mtnB = '#b8b29a'; }
  } else if (variant.startsWith('gruvbox')) { mtnA = '#3c3836'; mtnB = '#1d2021'; }
  else if (variant.startsWith('tokyonight')) { mtnA = '#16161e'; mtnB = '#13131a'; }
  else if (variant.startsWith('nord')) { mtnA = '#272c36'; mtnB = '#22272f'; }
  else if (variant.startsWith('dracula')) { mtnA = '#21222c'; mtnB = '#191a21'; }
  else if (variant.startsWith('rosepine')) { mtnA = '#1f1d2e'; mtnB = '#14121f'; }
  else if (variant.startsWith('everforest')) { mtnA = '#232a2e'; mtnB = '#1e2326'; }
  else if (variant.startsWith('kanagawa')) { mtnA = '#181820'; mtnB = '#16161d'; }
  else if (variant.startsWith('pixel')) { mtnA = '#1d2b53'; mtnB = '#000000'; }

  // 8-bit variants use pixelated mountains + scanlines instead of smooth shapes.
  const isPixel = variant.startsWith('pixel');

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: grads[variant] || grads['mocha-a'],
      overflow: 'hidden',
      ...style,
    }}>
      {isPixel ? (
        <PixelLandscape/>
      ) : (
        <>
          {/* soft "mountain" silhouettes */}
          <svg viewBox="0 0 1400 400" preserveAspectRatio="none"
            style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.35}}>
            <path d="M0 320 L180 200 L320 270 L500 160 L700 240 L880 180 L1080 250 L1250 200 L1400 280 L1400 400 L0 400 Z"
              fill={mtnA} opacity="0.55"/>
            <path d="M0 360 L220 280 L420 330 L620 260 L820 320 L1020 270 L1220 320 L1400 290 L1400 400 L0 400 Z"
              fill={mtnB} opacity="0.7"/>
          </svg>
          {/* subtle starfield for dark wallpapers */}
          {!isLight && (
            <svg viewBox="0 0 1400 400" preserveAspectRatio="none"
              style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.5}}>
              {Array.from({length: 60}).map((_, i) => {
                const x = (i * 137.5) % 1400;
                const y = ((i * 91.3) % 280);
                const r = (i % 5 === 0) ? 1.2 : 0.6;
                return <circle key={i} cx={x} cy={y} r={r} fill="#cdd6f4" opacity={0.4 + (i%4)*0.15}/>;
              })}
            </svg>
          )}
        </>
      )}
      {children}
    </div>
  );
}

// Pixel-art landscape used by the 8-bit theme: chunky stepped mountains,
// blocky stars, sun disc, and CRT scanline overlay.
function PixelLandscape() {
  // Build stepped "mountain" rectangles
  const ranges = [
    { color: '#1d2b53', y: 280, peaks: [80,140,90,200,120,90,160,110,90,150] },
    { color: '#000000', y: 330, peaks: [40,80,50,110,60,40,90,50,40,80] },
  ];
  // pixel stars (square)
  const stars = Array.from({length: 28}).map((_, i) => ({
    x: (i * 53) % 1400,
    y: ((i * 31) % 180) + 10,
    s: i % 4 === 0 ? 4 : 2,
  }));
  return (
    <>
      {/* pixel sun */}
      <svg viewBox="0 0 1400 400" preserveAspectRatio="none"
        style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        {/* sun disc — chunky concentric arcs */}
        <g transform="translate(700, 260)">
          <circle r="110" fill="#ffa300"/>
          <circle r="110" fill="#ffec27" clipPath="url(#sunclip-pixel)"/>
          <rect x="-110" y="-30" width="220" height="6" fill="#1d2b53"/>
          <rect x="-110" y="-10" width="220" height="4" fill="#1d2b53"/>
          <rect x="-110" y="10"  width="220" height="3" fill="#1d2b53"/>
          <rect x="-110" y="26"  width="220" height="2" fill="#1d2b53"/>
        </g>
        <defs>
          <clipPath id="sunclip-pixel"><rect x="-200" y="-110" width="400" height="110"/></clipPath>
        </defs>

        {/* pixel stars */}
        {stars.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} fill="#fff1e8" opacity={0.9}/>
        ))}

        {/* stepped mountain ranges (chunky rectangles) */}
        {ranges.map((r, ri) => {
          const step = 30; // px per chunk in viewBox
          const blocks = [];
          let x = 0;
          for (let i = 0; i < 1400/step; i++) {
            const h = r.peaks[i % r.peaks.length] + ((i*7)%30);
            blocks.push(<rect key={i} x={x} y={r.y - h} width={step} height={h + (400 - r.y)} fill={r.color}/>);
            x += step;
          }
          return <g key={ri} opacity={ri === 0 ? 0.9 : 1}>{blocks}</g>;
        })}

        {/* ground baseline */}
        <rect x="0" y="360" width="1400" height="40" fill="#000000"/>
      </svg>

      {/* CRT scanlines */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
        mixBlendMode:'multiply',
      }}/>
      {/* CRT vignette */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }}/>
    </>
  );
}

// Small hex→rgba helper so <Desktop> can derive glass backgrounds from any palette.
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

Object.assign(window, {
  MOCHA, LATTE, GRUVBOX, TOKYONIGHT, NORD, DRACULA,
  ROSEPINE, EVERFOREST, KANAGAWA, GRUVBOX_LIGHT, SOLARIZED_LIGHT, PIXEL,
  PALETTES, Wallpaper, hexToRgba,
});
