// Widget library. All widgets read theme via CSS custom properties set on
// their parent bar (--bg, --bg2, --text, --dim, --accent, --radius, etc).
// They also accept an `accent` color override prop where it matters.

// ─── shared styles ─────────────────────────────────────────────────────────
if (!document.getElementById('widget-styles')) {
  const s = document.createElement('style');
  s.id = 'widget-styles';
  s.textContent = `
    .w {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: calc(var(--radius, 12px) - 4px);
      color: var(--text); font: 500 12.5px/1 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
      letter-spacing: 0.01em;
      white-space: nowrap;
      transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
      cursor: default; user-select: none;
    }
    .w:hover { background: var(--bg2); }
    .w-flat { padding: 4px 8px; }
    .w-chip { background: var(--bg2); }
    .w-chip:hover { background: var(--bg3, var(--bg2)); }
    .w .dim { color: var(--dim); }
    .w .accent { color: var(--accent); }
    .w-sep {
      width: 1px; height: 16px; background: var(--text);
      opacity: 0.08; margin: 0 4px; align-self: center;
    }
    .w-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent); flex-shrink: 0;
    }
    .w-pulse { animation: w-pulse 2.2s ease-in-out infinite; }
    @keyframes w-pulse { 0%,100% {opacity:1;transform:scale(1)} 50% {opacity:.5;transform:scale(1.4)} }
    .viz-bar { animation: viz 1.1s ease-in-out infinite; transform-origin: bottom; }
    .viz-bar:nth-child(2){animation-delay:.1s} .viz-bar:nth-child(3){animation-delay:.25s}
    .viz-bar:nth-child(4){animation-delay:.05s} .viz-bar:nth-child(5){animation-delay:.3s}
    .viz-bar:nth-child(6){animation-delay:.15s} .viz-bar:nth-child(7){animation-delay:.4s}
    .viz-bar:nth-child(8){animation-delay:.2s} .viz-bar:nth-child(9){animation-delay:.35s}
    .viz-bar:nth-child(10){animation-delay:.08s}
    @keyframes viz { 0%,100% {transform:scaleY(.35)} 50% {transform:scaleY(1)} }
    .marquee {
      display: inline-block; animation: marquee 14s linear infinite;
      padding-right: 24px;
    }
    @keyframes marquee { 0% {transform:translateX(0)} 100% {transform:translateX(-50%)} }
    .ws {
      display: inline-flex; align-items: center; gap: 4px;
    }
    .ws-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--text); opacity: 0.18;
      transition: all 0.18s ease;
    }
    .ws-dot.has { opacity: 0.55; background: var(--text); }
    .ws-dot.active {
      background: var(--accent); opacity: 1;
      width: 22px; border-radius: 4px;
    }
    .ws-pill {
      min-width: 22px; height: 22px; padding: 0 7px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 6px; color: var(--dim);
      font: 600 11px/1 'JetBrains Mono', ui-monospace, monospace;
      transition: all 0.18s ease;
    }
    .ws-pill.has { color: var(--text); background: var(--bg2); }
    .ws-pill.active {
      background: var(--accent); color: var(--bg);
      min-width: 30px;
    }
    .pom-ring { transform: rotate(-90deg); }
    .ai-talk-bar { animation: ai-talk 0.8s ease-in-out infinite; transform-origin: center; }
    .ai-talk-bar:nth-child(2){animation-delay:.1s} .ai-talk-bar:nth-child(3){animation-delay:.2s}
    .ai-talk-bar:nth-child(4){animation-delay:.05s} .ai-talk-bar:nth-child(5){animation-delay:.15s}
    @keyframes ai-talk { 0%,100% {transform:scaleY(.4)} 50% {transform:scaleY(1)} }
    .glow { box-shadow: 0 0 0 2px var(--accent-soft, transparent), 0 0 24px -8px var(--accent); }
    .badge {
      position: absolute; top: -3px; right: -4px;
      min-width: 14px; height: 14px; padding: 0 4px;
      background: var(--accent); color: var(--bg);
      font: 700 9px/14px 'JetBrains Mono', ui-monospace, monospace;
      border-radius: 7px; text-align: center;
      border: 2px solid var(--bg);
    }
  `;
  document.head.appendChild(s);
}

// ─── core widgets ──────────────────────────────────────────────────────────

function Workspaces({ active = 2, count = 5, hasWindows = [1, 2, 3], style = 'dots', labels }) {
  // style: 'dots' | 'pills'
  return (
    <div className="w w-flat" style={{padding:'4px 6px'}}>
      <div className="ws">
        {Array.from({length: count}).map((_, i) => {
          const n = i + 1;
          const isActive = n === active;
          const has = hasWindows.includes(n);
          if (style === 'pills') {
            return <div key={n} className={`ws-pill ${has?'has':''} ${isActive?'active':''}`}>
              {labels ? labels[i] : n}
            </div>;
          }
          return <div key={n} className={`ws-dot ${has?'has':''} ${isActive?'active':''}`}/>;
        })}
      </div>
    </div>
  );
}

function ActiveWindow({ icon = '', title = 'kitty — ~/dev/cachy-rice', maxWidth = 240 }) {
  return (
    <div className="w" style={{maxWidth, overflow:'hidden'}}>
      {icon && <span style={{fontSize:14}}>{icon}</span>}
      <Icon name="window" size={13} style={{color:'var(--dim)'}}/>
      <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{title}</span>
    </div>
  );
}

function Clock({ time = '14:32', date = 'Mon · May 25', dateFirst = false, accent }) {
  return (
    <div className="w">
      <Icon name="clock" size={13} style={{color:accent||'var(--accent)'}}/>
      {dateFirst ? <><span className="dim" style={{fontWeight:500}}>{date}</span><span style={{color:accent||'var(--text)',fontWeight:700}}>{time}</span></>
                 : <><span style={{color:accent||'var(--text)',fontWeight:700}}>{time}</span><span className="dim" style={{fontWeight:500}}>{date}</span></>}
    </div>
  );
}

function Battery({ pct = 78, charging = false }) {
  const color = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="w">
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
        <rect x="0.5" y="0.5" width="18" height="11" rx="2" stroke="currentColor" strokeOpacity="0.5"/>
        <rect x="20" y="3.5" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.5"/>
        <rect x="2" y="2" width={15 * (pct/100)} height="8" rx="1" fill={color}/>
      </svg>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{charging ? '⚡' : ''}{pct}%</span>
    </div>
  );
}

function Sparkline({ data = [3,5,4,7,6,8,5,9,7,10,8,11], color = 'var(--accent)', width = 38, height = 14 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*width},${height - ((v-min)/range)*height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{flexShrink:0}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function CpuChip({ pct = 34, data, label = 'CPU' }) {
  return (
    <div className="w">
      <Icon name="cpu" size={13} style={{color:'var(--blue)'}}/>
      <Sparkline data={data || [3,5,4,7,6,8,5,9,7,10,8,11]} color="var(--blue)"/>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
    </div>
  );
}
function RamChip({ pct = 42 }) {
  return (
    <div className="w">
      <Icon name="ram" size={13} style={{color:'var(--mauve)'}}/>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{pct}%</span>
    </div>
  );
}
function TempChip({ c = 54 }) {
  return (
    <div className="w">
      <Icon name="thermo" size={13} style={{color:c>70?'var(--red)':'var(--peach)'}}/>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{c}°</span>
    </div>
  );
}

function Volume({ v = 65, muted = false }) {
  return (
    <div className="w">
      <Icon name={muted?'mute':'volume'} size={14} style={{color:muted?'var(--red)':'var(--text)'}}/>
      <div style={{width:46,height:4,background:'var(--bg2)',borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${v}%`,height:'100%',background:'var(--accent)',borderRadius:2}}/>
      </div>
    </div>
  );
}
function Brightness({ v = 80 }) {
  return (
    <div className="w">
      <Icon name="brightness" size={14} style={{color:'var(--yellow)'}}/>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{v}%</span>
    </div>
  );
}
function Net({ ssid = 'mocha-5G', strength = 'good' }) {
  return (
    <div className="w">
      <Icon name="wifi" size={14} style={{color:'var(--sky)'}}/>
      <span>{ssid}</span>
    </div>
  );
}
function NetIcon() { return <div className="w w-flat"><Icon name="wifi" size={14} style={{color:'var(--sky)'}}/></div>; }
function BTIcon({ count = 0 }) {
  if (!count) return <div className="w w-flat"><Icon name="bluetooth" size={14} style={{color:'var(--blue)'}}/></div>;
  return (
    <div className="w w-flat" style={{gap:5,padding:'4px 7px'}}>
      <Icon name="bluetooth" size={14} style={{color:'var(--blue)'}}/>
      <span style={{
        fontSize:10,fontWeight:700,color:'var(--blue)',
        background:'color-mix(in oklab, var(--blue) 22%, transparent)',
        padding:'1px 5px',borderRadius:6,lineHeight:1.3,
        fontVariantNumeric:'tabular-nums',
      }}>{count}</span>
    </div>
  );
}

function Notifications({ count = 3 }) {
  return (
    <div className="w" style={{position:'relative'}}>
      <span style={{position:'relative'}}>
        <Icon name="bell" size={14}/>
        {count > 0 && <span className="badge">{count}</span>}
      </span>
    </div>
  );
}

function Tray({ items = ['discord', 'syncthing', 'tailscale', 'nm'] }) {
  const colors = ['var(--mauve)', 'var(--blue)', 'var(--green)', 'var(--sky)', 'var(--peach)'];
  return (
    <div className="w w-flat" style={{gap:6}}>
      {items.map((id, i) => (
        <div key={id} title={id} style={{
          width:8, height:8, borderRadius:2, background: colors[i % colors.length], opacity:0.85
        }}/>
      ))}
    </div>
  );
}

function PowerMenu() {
  return <div className="w w-chip" style={{padding:'5px 8px',background:'var(--red-soft, rgba(243,139,168,0.15))'}}>
    <Icon name="power" size={13} style={{color:'var(--red)'}}/>
  </div>;
}

function KeyLayout({ layout = 'us' }) {
  return <div className="w"><Icon name="keyboard" size={13} style={{color:'var(--dim)'}}/><span style={{textTransform:'uppercase',fontSize:10,fontWeight:700,letterSpacing:'0.08em'}}>{layout}</span></div>;
}

// ─── plugin widgets ────────────────────────────────────────────────────────

function NowPlaying({ title = 'Midnight City', artist = 'M83', compact = false, accent, showViz = true, sources, app }) {
  // If `sources` array of >=2 is passed, render with a cycle arrow and stateful index.
  // Falls back to single-track render otherwise.
  const single = !sources || sources.length < 2;
  const [idx, setIdx] = React.useState(0);
  if (single) {
    return <NowPlayingTrack title={title} artist={artist} accent={accent} compact={compact} showViz={showViz} app={app}/>;
  }
  const cur = sources[idx % sources.length];
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:0}}>
      <NowPlayingTrack {...cur} compact={compact} showViz={showViz}/>
      <button onClick={(e)=>{e.stopPropagation(); setIdx(i=>(i+1)%sources.length);}}
        title={`source ${idx+1}/${sources.length} — click to switch`}
        style={{
          all:'unset',display:'inline-flex',alignItems:'center',gap:4,
          padding:'4px 7px 4px 4px',marginLeft:-2,
          borderRadius:'calc(var(--radius, 12px) - 4px)',
          background:'color-mix(in oklab, var(--text) 4%, transparent)',
          cursor:'pointer',transition:'background .12s',
        }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
        onMouseLeave={e=>e.currentTarget.style.background='color-mix(in oklab, var(--text) 4%, transparent)'}>
        <Icon name="chevron" size={9} style={{color:'var(--dim)'}}/>
        <span style={{fontSize:9,fontWeight:700,color:'var(--dim)',
          fontVariantNumeric:'tabular-nums',letterSpacing:'0.04em'}}>
          {idx+1}/{sources.length}
        </span>
      </button>
    </div>
  );
}

function NowPlayingTrack({ title = 'Midnight City', artist = 'M83', compact = false, accent, showViz = true, app }) {
  const ac = accent || 'var(--accent)';
  if (compact) {
    return (
      <div className="w" style={{gap:8, padding:'4px 10px 4px 4px'}}>
        <span style={{position:'relative',display:'inline-flex'}}>
          <AlbumArt size={22} accent={ac}/>
          {app && <span title={app} style={{position:'absolute',bottom:-2,right:-2,
            width:9,height:9,borderRadius:'50%',background:appColor(app),
            border:'1.5px solid var(--bg)',
          }}/>}
        </span>
        {showViz && <Viz n={5} h={14} accent={ac}/>}
        <span style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>
          <span style={{fontWeight:600}}>{title}</span>
          <span className="dim"> · {artist}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="w" style={{gap:10, padding:'5px 12px 5px 5px'}}>
      <span style={{position:'relative',display:'inline-flex'}}>
        <AlbumArt size={26} accent={ac}/>
        {app && <span title={app} style={{position:'absolute',bottom:-3,right:-3,
          width:10,height:10,borderRadius:'50%',background:appColor(app),
          border:'1.5px solid var(--bg)',
        }}/>}
      </span>
      <div style={{display:'flex',flexDirection:'column',gap:2,lineHeight:1.1,minWidth:0}}>
        <span style={{fontSize:11,fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{title}</span>
        <span className="dim" style={{fontSize:10}}>{artist}{app?` · ${app}`:''}</span>
      </div>
      {showViz && <Viz n={7} h={18} accent={ac}/>}
      <Icon name="play" size={11} style={{color:ac}}/>
    </div>
  );
}

function appColor(app) {
  const m = {
    Spotify:'#1db954', Firefox:'#ff7139', 'Zen Browser':'#7c3aed',
    YouTube:'#ff0000', mpv:'#691f69', Cmus:'#94e2d5', Discord:'#5865f2',
  };
  return m[app] || 'var(--accent)';
}

function AlbumArt({ size = 28, accent = 'var(--accent)' }) {
  // procedural "album art" — gradient swatch with a mark
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: `linear-gradient(135deg, ${accent}, var(--mauve) 60%, var(--blue))`,
      position:'relative', overflow:'hidden', flexShrink:0,
      boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.1)',
    }}>
      <div style={{
        position:'absolute', inset:'25% 25%',
        borderRadius:'50%', background:'rgba(0,0,0,0.4)',
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)'
      }}/>
    </div>
  );
}

function Viz({ n = 6, h = 14, w = 2.5, gap = 2, accent = 'var(--accent)' }) {
  return (
    <div style={{display:'inline-flex',alignItems:'flex-end',gap,height:h,flexShrink:0}}>
      {Array.from({length:n}).map((_, i) => (
        <div key={i} className="viz-bar" style={{
          width: w, height: h, background: accent, borderRadius: 1,
        }}/>
      ))}
    </div>
  );
}

function Pomodoro({ minutes = 18, total = 25, label, size = 18 }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const progress = (total - minutes) / total;
  return (
    <div className="w">
      <svg width={size} height={size} className="pom-ring">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg2)" strokeWidth="2"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--red)" strokeWidth="2"
          strokeDasharray={c} strokeDashoffset={c*(1-progress)} strokeLinecap="round"/>
      </svg>
      <span style={{fontVariantNumeric:'tabular-nums',color:'var(--red)',fontWeight:600}}>{minutes}m</span>
      {label && <span className="dim">{label}</span>}
    </div>
  );
}

function HyprMap({ workspaces = 5, active = 2, compact = true }) {
  // Each ws shows 0-3 mini windows
  const layouts = [
    [{x:0,y:0,w:1,h:1}],
    [{x:0,y:0,w:0.6,h:1},{x:0.62,y:0,w:0.38,h:0.5},{x:0.62,y:0.52,w:0.38,h:0.48}],
    [{x:0,y:0,w:1,h:0.55},{x:0,y:0.57,w:1,h:0.43}],
    [],
    [{x:0,y:0,w:0.5,h:1},{x:0.52,y:0,w:0.48,h:1}],
  ];
  const cellW = compact ? 18 : 26;
  const cellH = compact ? 12 : 18;
  return (
    <div className="w w-flat" style={{gap:3,padding:'4px 6px'}}>
      {Array.from({length:workspaces}).map((_, i) => {
        const isActive = i+1 === active;
        const wins = layouts[i] || [];
        return (
          <div key={i} style={{
            width:cellW, height:cellH, borderRadius:3,
            background: isActive ? 'var(--accent)' : 'var(--bg2)',
            opacity: isActive ? 1 : 0.55,
            position:'relative', padding:1, boxSizing:'border-box',
            transition:'all .18s',
          }}>
            {wins.map((w, j) => (
              <div key={j} style={{
                position:'absolute',
                left:`${2 + w.x*(cellW-4)}px`, top:`${2 + w.y*(cellH-4)}px`,
                width: `${w.w*(cellW-4)-1}px`, height: `${w.h*(cellH-4)-1}px`,
                borderRadius: 1.5,
                background: isActive ? 'rgba(30,30,46,0.55)' : 'var(--text)',
                opacity: isActive ? 1 : 0.4,
              }}/>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function GitHub({ prs = 4, mentions = 2 }) {
  // avatar stack
  const avs = ['var(--peach)', 'var(--mauve)', 'var(--green)'];
  return (
    <div className="w" style={{gap:6}}>
      <Icon name="github" size={13}/>
      <div style={{display:'inline-flex'}}>
        {avs.slice(0, Math.min(3, prs)).map((c, i) => (
          <div key={i} style={{
            width:14, height:14, borderRadius:'50%',
            background: c, border: '1.5px solid var(--bg)',
            marginLeft: i === 0 ? 0 : -5,
          }}/>
        ))}
      </div>
      <span style={{fontWeight:600}}>{prs}</span>
      <span className="dim">PRs</span>
      {mentions > 0 && <>
        <span style={{color:'var(--peach)',fontWeight:700}}>@{mentions}</span>
      </>}
    </div>
  );
}

function Updates({ count = 23 }) {
  return (
    <div className="w" style={{gap:6}}>
      <Icon name="arch" size={13} style={{color:'var(--sky)'}}/>
      <span style={{fontWeight:600}}>{count}</span>
      <span className="dim">upd</span>
    </div>
  );
}

function CalendarChip({ when = '3:30p', what = 'Design review' }) {
  return (
    <div className="w" style={{gap:6}}>
      <Icon name="calendar" size={13} style={{color:'var(--green)'}}/>
      <span style={{color:'var(--green)',fontWeight:600}}>{when}</span>
      <span className="dim" style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{what}</span>
    </div>
  );
}

function AILauncher({ label = 'Ask AI', pulse = true }) {
  return (
    <div className="w w-chip" style={{
      gap:6, padding:'5px 10px',
      background:'linear-gradient(135deg, color-mix(in oklab, var(--mauve) 18%, transparent), color-mix(in oklab, var(--blue) 18%, transparent))',
      boxShadow:'inset 0 0 0 1px color-mix(in oklab, var(--mauve) 30%, transparent)',
    }}>
      <span style={{position:'relative',display:'inline-flex'}}>
        <Icon name="ai" size={13} style={{color:'var(--mauve)'}}/>
        {pulse && <span className="w-pulse" style={{position:'absolute',inset:-2,borderRadius:'50%',background:'var(--mauve)',opacity:0.3}}/>}
      </span>
      <span style={{fontWeight:600,background:'linear-gradient(90deg,var(--mauve),var(--blue))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{label}</span>
      <span className="dim" style={{fontSize:10,padding:'2px 4px',borderRadius:3,background:'var(--bg2)'}}>⌘K</span>
    </div>
  );
}

function AITalk({ listening = true }) {
  return (
    <div className="w w-chip" style={{
      gap:6, padding:'5px 10px',
      background: listening ? 'color-mix(in oklab, var(--red) 16%, transparent)' : 'var(--bg2)',
    }}>
      <Icon name="mic" size={13} style={{color:listening?'var(--red)':'var(--dim)'}}/>
      {listening ? (
        <div style={{display:'inline-flex',alignItems:'center',gap:1.5,height:12}}>
          {[6,10,8,12,7].map((h, i) => (
            <div key={i} className="ai-talk-bar" style={{
              width:2, height: h, background:'var(--red)', borderRadius:1,
            }}/>
          ))}
        </div>
      ) : <span className="dim">tap to talk</span>}
    </div>
  );
}

function NetSpeed({ down = 1.2, up = 0.3 }) {
  return (
    <div className="w" style={{gap:6}}>
      <Sparkline data={[1,2,1.5,3,2,4,2.5,5,3,4,6,3.5]} color="var(--teal)" width={28} height={12}/>
      <span style={{color:'var(--teal)',fontSize:10,fontWeight:600}}>↓{down}M</span>
      <span style={{color:'var(--peach)',fontSize:10,fontWeight:600}}>↑{up}M</span>
    </div>
  );
}

function RecIndicator() {
  return (
    <div className="w" style={{gap:6,color:'var(--red)'}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:'var(--red)'}} className="w-pulse"/>
      <span style={{fontWeight:600,fontSize:10,letterSpacing:'0.08em'}}>REC 02:14</span>
    </div>
  );
}

function CameraIndicator({ time = '00:42', label = 'CAM' }) {
  return (
    <div className="w" style={{gap:6,color:'var(--green)',
      background:'color-mix(in oklab, var(--green) 14%, transparent)',
      border:'1px solid color-mix(in oklab, var(--green) 28%, transparent)',
      padding:'4px 8px',borderRadius:'calc(var(--radius, 12px) - 4px)',
    }}>
      <span style={{position:'relative',display:'inline-flex'}}>
        <Icon name="camera" size={12}/>
        <span className="w-pulse" style={{position:'absolute',top:-1,right:-2,
          width:5,height:5,borderRadius:'50%',background:'var(--green)',
          border:'1.5px solid var(--bg)'}}/>
      </span>
      <span style={{fontWeight:700,fontSize:10,letterSpacing:'0.08em'}}>{label} {time}</span>
    </div>
  );
}

function Performance({ mode = 'auto', compact = false }) {
  const modes = [
    {id:'eco',  icon:'leaf',  color:'var(--green)', label:'Eco'},
    {id:'auto', icon:'scale', color:'var(--blue)',  label:'Auto'},
    {id:'perf', icon:'bolt',  color:'var(--peach)', label:'Perf'},
  ];
  if (compact) {
    const m = modes.find(x => x.id === mode);
    return (
      <div className="w" style={{gap:5}}>
        <Icon name={m.icon} size={13} style={{color:m.color}}/>
        <span style={{color:m.color,fontWeight:600,fontSize:11}}>{m.label}</span>
      </div>
    );
  }
  return (
    <div className="w" style={{gap:1,padding:'3px 4px',background:'var(--bg2)',
      borderRadius:'calc(var(--radius, 12px) - 4px)'}}>
      {modes.map(m => {
        const active = m.id === mode;
        return (
          <div key={m.id} style={{
            display:'inline-flex',alignItems:'center',gap:4,
            padding: active ? '3px 8px' : '3px 6px', borderRadius: 5,
            background: active ? `color-mix(in oklab, ${m.color} 24%, transparent)` : 'transparent',
            transition:'all .15s',
          }}>
            <Icon name={m.icon} size={11} style={{color: active ? m.color : 'var(--dim)'}}/>
            {active && <span style={{color: m.color, fontWeight:700, fontSize:10}}>{m.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Weather({ temp = 19, cond = 'cloudy' }) {
  return (
    <div className="w" style={{gap:6}}>
      <Icon name="cloud" size={14} style={{color:'var(--sapphire)'}}/>
      <span style={{fontWeight:600}}>{temp}°</span>
      <span className="dim">{cond}</span>
    </div>
  );
}

function Sep() { return <div className="w-sep"/>; }

function Launcher({ label = 'Apps', hint = '⌘ Space' }) {
  return (
    <div className="w w-chip" style={{gap:7,padding:'5px 10px'}}>
      <Icon name="tray" size={12} style={{color:'var(--accent)'}}/>
      <span style={{fontWeight:600}}>{label}</span>
      <span className="dim" style={{fontSize:10,padding:'2px 5px',borderRadius:3,background:'var(--bg)',letterSpacing:'0.04em'}}>{hint}</span>
    </div>
  );
}

// ─── extra plugin widgets ──────────────────────────────────────────────────

function ScreenshotWidget() {
  return (
    <div className="w" style={{gap:0,padding:0,background:'var(--bg2)',
      borderRadius:'calc(var(--radius, 12px) - 4px)'}}>
      <div className="w w-flat" style={{padding:'5px 7px',borderRadius:0}} title="Region">
        <Icon name="region" size={13} style={{color:'var(--mauve)'}}/>
      </div>
      <div style={{width:1,height:14,background:'var(--text)',opacity:0.08}}/>
      <div className="w w-flat" style={{padding:'5px 7px',borderRadius:0}} title="Window">
        <Icon name="window" size={12} style={{color:'var(--dim)'}}/>
      </div>
      <div style={{width:1,height:14,background:'var(--text)',opacity:0.08}}/>
      <div className="w w-flat" style={{padding:'5px 7px',borderRadius:0}} title="Full">
        <Icon name="display" size={12} style={{color:'var(--dim)'}}/>
      </div>
    </div>
  );
}

function ColorPickerWidget({ recent = '#cba6f7' }) {
  return (
    <div className="w" style={{gap:6}}>
      <Icon name="dropper" size={13} style={{color:'var(--text)'}}/>
      <span style={{
        width:14,height:14,borderRadius:3,background:recent,
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)',
      }}/>
      <span style={{fontFamily:'"JetBrains Mono", monospace',fontSize:10,
        color:'var(--dim)',letterSpacing:'0.02em',textTransform:'uppercase'}}>
        {recent.replace('#','')}
      </span>
    </div>
  );
}

function AudioSourceWidget({ device = 'AirPods Pro', icon = 'airpods' }) {
  return (
    <div className="w" style={{gap:6}}>
      <Icon name={icon} size={13} style={{color:'var(--blue)'}}/>
      <span style={{maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',
        whiteSpace:'nowrap',fontWeight:500}}>{device}</span>
      <Icon name="arrow_down" size={10} style={{color:'var(--dim)'}}/>
    </div>
  );
}

function IdleInhibitor({ on = true, reason = 'manual', remaining }) {
  return (
    <div className="w" style={{gap:6,
      background: on ? 'color-mix(in oklab, var(--peach) 16%, transparent)' : 'var(--bg2)',
      border: '1px solid ' + (on ? 'color-mix(in oklab, var(--peach) 28%, transparent)' : 'transparent'),
      padding:'4px 8px',borderRadius:'calc(var(--radius, 12px) - 4px)',
    }}>
      <Icon name="coffee" size={13} style={{color: on?'var(--peach)':'var(--dim)'}}/>
      {on ? (
        <>
          <span style={{color:'var(--peach)',fontWeight:700,fontSize:10,letterSpacing:'0.04em'}}>AWAKE</span>
          {remaining && <span className="dim" style={{fontSize:10,fontVariantNumeric:'tabular-nums'}}>{remaining}</span>}
        </>
      ) : <span className="dim" style={{fontSize:10}}>idle ok</span>}
    </div>
  );
}

Object.assign(window, {
  Workspaces, ActiveWindow, Clock, Battery, Sparkline, CpuChip, RamChip, TempChip,
  Volume, Brightness, Net, NetIcon, BTIcon, Notifications, Tray, PowerMenu, KeyLayout,
  NowPlaying, NowPlayingTrack, AlbumArt, Viz, Pomodoro, HyprMap, GitHub, Updates, CalendarChip,
  AILauncher, AITalk, NetSpeed, RecIndicator, CameraIndicator, Performance,
  Weather, Sep, Launcher,
  ScreenshotWidget, ColorPickerWidget, AudioSourceWidget, IdleInhibitor, appColor,
});
