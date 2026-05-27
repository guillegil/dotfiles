// Desktop frame + the 8 bar variations.
// Each bar accepts theme overrides (accent, radius, padding) via CSS vars.

// ── Desktop frame ──────────────────────────────────────────────────────────
// Provides the wallpaper, sets palette CSS vars, slots the bar into the
// right position (top/bottom/left). Also paints a tiny "app window" so the
// bar has context.
function Desktop({ palette = MOCHA, wallpaper = 'mocha-a', position = 'top', accent, radius = 14, pad = 8, showApp = true, children }) {
  const p = palette;
  const isLight = !!p.isLight;
  const cssVars = {
    '--bg':       hexToRgba(p.base,     isLight ? 0.92 : 0.82),
    '--bg2':      hexToRgba(p.surface1, isLight ? 0.55 : 0.55),
    '--bg3':      hexToRgba(p.surface2, isLight ? 0.70 : 0.70),
    '--text':     p.text, '--dim': p.subtext0,
    '--accent':   accent || p.mauve,
    '--green': p.green, '--red': p.red, '--yellow': p.yellow, '--blue': p.blue,
    '--mauve': p.mauve, '--peach': p.peach, '--pink': p.pink, '--sky': p.sky,
    '--sapphire': p.sapphire, '--teal': p.teal, '--lavender': p.lavender, '--maroon': p.maroon,
    '--radius': radius + 'px', '--pad': pad + 'px',
    color: p.text,
    fontFamily: p.font || '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
    fontSize: p.name === 'pixel' ? 15 : undefined,
    imageRendering: p.name === 'pixel' ? 'pixelated' : undefined,
  };
  return (
    <div style={{...cssVars, position:'relative', width:'100%', height:'100%', overflow:'hidden', borderRadius: 6}}>
      <Wallpaper variant={wallpaper} style={{position:'absolute',inset:0}}/>
      {showApp && <FakeApp position={position} palette={p}/>}
      <div style={{
        position:'absolute',
        ...(position === 'top' ? {top:0,left:0,right:0} :
            position === 'bottom' ? {bottom:0,left:0,right:0} :
            position === 'left' ? {left:0,top:0,bottom:0} : {}),
        zIndex: 10, pointerEvents:'none',
      }}>
        <div style={{pointerEvents:'auto'}}>{children}</div>
      </div>
    </div>
  );
}

// A faded fake "code window" in the wallpaper so the bar has context.
function FakeApp({ position, palette }) {
  const isLight = !!palette.isLight;
  const bg = isLight ? hexToRgba(palette.base, 0.55) : hexToRgba(palette.crust, 0.6);
  const txt = hexToRgba(palette.text, isLight ? 0.65 : 0.5);
  // offset so it doesn't collide with the bar
  const offsetTop = position === 'top' ? 90 : 24;
  const offsetBottom = position === 'bottom' ? 90 : 24;
  return (
    <div style={{
      position:'absolute', left:position==='left'?100:80, right:80,
      top: offsetTop, bottom: offsetBottom,
      background: bg, borderRadius: 10, padding: 14,
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      border: `1px solid ${isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)'}`,
      fontFamily:'"JetBrains Mono", monospace', fontSize:10, color: txt, lineHeight:1.7,
      overflow:'hidden',
    }}>
      <div style={{display:'flex',gap:4,marginBottom:8}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:palette.red,opacity:0.7}}/>
        <span style={{width:8,height:8,borderRadius:'50%',background:palette.yellow,opacity:0.7}}/>
        <span style={{width:8,height:8,borderRadius:'50%',background:palette.green,opacity:0.7}}/>
        <span style={{marginLeft:10,opacity:0.6}}>~ kitty</span>
      </div>
      <div><span style={{color:palette.green}}>❯</span> hyprctl monitors</div>
      <div style={{opacity:0.7}}>Monitor DP-1 (ID 0): 3440x1440@165.00 Hz</div>
      <div style={{opacity:0.7}}>  description: LG Ultragear 34GP950G</div>
      <div style={{marginTop:6}}><span style={{color:palette.green}}>❯</span> paru -Syu</div>
      <div style={{opacity:0.7}}>:: Synchronizing package databases…</div>
      <div style={{opacity:0.7}}>:: 23 packages to upgrade</div>
    </div>
  );
}

// ── 1. AURORA — floating top, segmented (3 modules with gaps) ──────────────
function BarAurora() {
  return (
    <div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
      <BarShell><Workspaces active={2} count={5} hasWindows={[1,2,3]} style="dots"/>
        <Sep/>
        <Launcher/>
        <Sep/>
        <ActiveWindow icon="" title="kitty — paru -Syu" maxWidth={180}/>
      </BarShell>
      <BarShell>
        <NowPlaying compact accent="var(--mauve)" sources={[
          {title:'Midnight City', artist:'M83', accent:'var(--mauve)', app:'Spotify'},
          {title:'lo-fi beats 24/7', artist:'YouTube', accent:'var(--red)', app:'Firefox'},
        ]}/>
        <Sep/>
        <Clock time="14:32" date="Mon · May 25"/>
        <Sep/>
        <Pomodoro minutes={18} label="focus"/>
      </BarShell>
      <BarShell>
        <Updates count={23}/>
        <GitHub prs={4} mentions={2}/>
        <Sep/>
        <CpuChip pct={34}/>
        <RamChip pct={42}/>
        <Performance mode="auto" compact/>
        <Sep/>
        <Volume v={65}/>
        <Battery pct={78}/>
        <Notifications count={3}/>
        <AILauncher/>
      </BarShell>
    </div>
  );
}
function BarShell({ children, style }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:2,
      background:'var(--bg)',
      backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
      borderRadius:'var(--radius)',
      padding:'4px var(--pad)',
      boxShadow:'0 8px 28px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      ...style,
    }}>{children}</div>
  );
}

// ── 2. PILLBOX — edge-to-edge top, dense pills ─────────────────────────────
function BarPillbox() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      gap:8, padding:'5px 12px', background:'var(--bg)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      borderBottom:'1px solid color-mix(in oklab, var(--text) 6%, transparent)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <div className="w w-chip" style={{padding:'4px 8px'}}>
          <Icon name="arch" size={14} style={{color:'var(--accent)'}}/>
        </div>
        <Workspaces active={2} count={9} hasWindows={[1,2,3,5,7]} style="pills"/>
        <Sep/>
        <ActiveWindow title="zen-browser — Cachy Rice Wiki" maxWidth={220}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <NowPlaying title="Midnight City" artist="M83" compact accent="var(--blue)"/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <NetSpeed down="1.2" up="0.3"/>
        <CameraIndicator time="00:42"/>
        <Sep/>
        <Pomodoro minutes={18}/>
        <GitHub prs={4} mentions={2}/>
        <Updates count={23}/>
        <Sep/>
        <Tray/>
        <CpuChip pct={34}/><TempChip c={54}/>
        <Performance mode="auto" compact/>
        <IdleInhibitor on remaining="42m"/>
        <Sep/>
        <ScreenshotWidget/>
        <KeyLayout layout="us"/>
        <Sep/>
        <NetIcon/><BTIcon count={3}/><Volume v={65}/><Battery pct={78}/>
        <Sep/>
        <Clock time="14:32" date="May 25"/>
        <AILauncher label="AI"/>
        <PowerMenu/>
      </div>
    </div>
  );
}

// ── 3. MANTLE — bottom dock, hero now-playing in center ────────────────────
function BarMantle() {
  return (
    <div style={{padding:'0 16px 14px 16px',display:'flex',justifyContent:'center',alignItems:'flex-end'}}>
      <div style={{
        display:'inline-flex',alignItems:'center',gap:6,
        background:'var(--bg)',
        backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
        border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
        borderRadius: 'calc(var(--radius) + 6px)',
        padding:'8px 12px',
        boxShadow:'0 16px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <Launcher hint="⌘ ␣"/>
        <Sep/>
        <Workspaces active={2} count={5} hasWindows={[1,2,3]} style="pills"/>
        <Sep/>
        <HyprMap workspaces={5} active={2}/>
        <Sep/>
        {/* Hero now playing */}
        <div className="w" style={{
          gap:10, padding:'6px 12px 6px 6px',
          background:'linear-gradient(135deg, color-mix(in oklab, var(--peach) 16%, transparent), color-mix(in oklab, var(--mauve) 12%, transparent))',
          border:'1px solid color-mix(in oklab, var(--peach) 22%, transparent)',
          borderRadius:'calc(var(--radius) - 2px)',
        }}>
          <AlbumArt size={32} accent="var(--peach)"/>
          <div style={{display:'flex',flexDirection:'column',gap:2,lineHeight:1.1}}>
            <span style={{fontSize:11.5,fontWeight:700,color:'var(--text)'}}>Midnight City</span>
            <span className="dim" style={{fontSize:10}}>M83 · Hurry Up, We're Dreaming</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:3,marginLeft:4}}>
            <Icon name="prev" size={12} style={{color:'var(--dim)'}}/>
            <Icon name="pause" size={14} style={{color:'var(--peach)'}}/>
            <Icon name="skip" size={12} style={{color:'var(--dim)'}}/>
          </div>
          <Viz n={8} h={20} accent="var(--peach)"/>
        </div>
        <Sep/>
        <Pomodoro minutes={18}/>
        <AITalk listening/>
        <Sep/>
        <Tray/>
        <Volume v={65}/>
        <Battery pct={78}/>
        <Sep/>
        <Clock time="14:32" date="Mon"/>
      </div>
    </div>
  );
}

// ── 4. SPINE — vertical left rail ──────────────────────────────────────────
function BarSpine() {
  return (
    <div style={{padding:'14px 0 14px 12px',height:'100%',display:'flex',alignItems:'stretch'}}>
      <div style={{
        display:'flex',flexDirection:'column',alignItems:'center',gap:14,
        background:'var(--bg)',
        backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
        border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
        borderRadius:'var(--radius)',
        padding:'14px 8px',
        boxShadow:'0 12px 40px -8px rgba(0,0,0,0.5)',
      }}>
        {/* top: logo */}
        <Icon name="arch" size={20} style={{color:'var(--accent)'}}/>
        {/* workspaces vertical */}
        <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
          {[1,2,3,4,5].map(n => (
            <div key={n} className={`ws-pill ${[1,2,3].includes(n)?'has':''} ${n===2?'active':''}`}
              style={{minWidth:n===2?28:22,height:22,flexDirection:'column',
                ...(n===2?{minWidth:22,height:28,borderRadius:6}:{})}}>
              {n}
            </div>
          ))}
        </div>
        <div style={{width:20,height:1,background:'var(--text)',opacity:0.08}}/>
        {/* plugins */}
        <IconBtn icon="ai" color="var(--mauve)" badge="AI" rotate/>
        <IconBtn icon="github" color="var(--text)" badge="4"/>
        <IconBtn icon="package" color="var(--sky)" badge="23"/>
        <IconBtn icon="calendar" color="var(--green)"/>
        <IconBtn icon="tomato" color="var(--red)"/>
        <div style={{flex:1}}/>
        <div style={{width:20,height:1,background:'var(--text)',opacity:0.08}}/>
        {/* stats vertical */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,fontSize:9}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <Icon name="cpu" size={12} style={{color:'var(--blue)'}}/>
            <span style={{color:'var(--blue)',fontWeight:600,fontSize:9}}>34</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <Icon name="ram" size={12} style={{color:'var(--mauve)'}}/>
            <span style={{color:'var(--mauve)',fontWeight:600,fontSize:9}}>42</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <Icon name="thermo" size={12} style={{color:'var(--peach)'}}/>
            <span style={{color:'var(--peach)',fontWeight:600,fontSize:9}}>54°</span>
          </div>
        </div>
        <div style={{width:20,height:1,background:'var(--text)',opacity:0.08}}/>
        <Icon name="bluetooth" size={13} style={{color:'var(--blue)'}}/>
        <Icon name="wifi" size={13} style={{color:'var(--sky)'}}/>
        <Icon name="volume" size={13} style={{color:'var(--text)'}}/>
        {/* battery (vertical) */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <svg width="12" height="22" viewBox="0 0 12 22" fill="none">
            <rect x="0.5" y="3.5" width="11" height="18" rx="2" stroke="currentColor" strokeOpacity="0.5"/>
            <rect x="3.5" y="1.5" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
            <rect x="2" y="9" width="8" height="11" rx="1" fill="var(--green)"/>
          </svg>
          <span style={{fontWeight:600,fontSize:9}}>78</span>
        </div>
        {/* vertical clock */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,lineHeight:1.1,marginTop:4}}>
          <span style={{fontWeight:700,fontSize:13,color:'var(--accent)'}}>14</span>
          <span style={{fontWeight:700,fontSize:13,color:'var(--accent)'}}>32</span>
          <span className="dim" style={{fontSize:9,marginTop:2}}>MON</span>
          <span className="dim" style={{fontSize:9}}>25</span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ icon, color, badge, rotate }) {
  return (
    <div style={{position:'relative',display:'inline-flex',padding:6,borderRadius:8,
      transition:'background 0.15s', cursor:'default'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <Icon name={icon} size={15} style={{color}}/>
      {badge && <span style={{
        position:'absolute', top:-2, right:-4,
        minWidth:14, height:12, padding:'0 3px',
        background:'var(--accent)', color:'var(--bg)',
        fontSize:8, fontWeight:700, lineHeight:'12px',
        borderRadius:6, border:'2px solid var(--bg)',
        boxSizing:'content-box',
      }}>{badge}</span>}
    </div>
  );
}

// ── 5. ATLAS — split top, 3 separate floating modules ──────────────────────
function BarAtlas() {
  return (
    <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'auto 1fr auto',gap:12,alignItems:'start'}}>
      <BarShell style={{justifySelf:'start'}}>
        <Icon name="arch" size={15} style={{color:'var(--accent)',marginRight:4}}/>
        <Workspaces active={2} count={5} hasWindows={[1,2,3]} style="pills"/>
        <Sep/>
        <HyprMap workspaces={5} active={2}/>
      </BarShell>
      <BarShell style={{justifySelf:'center'}}>
        <CalendarChip when="3:30p" what="Design review · @sam"/>
        <Sep/>
        <NowPlaying title="Midnight City" artist="M83" compact accent="var(--pink)"/>
        <Sep/>
        <AITalk listening/>
      </BarShell>
      <BarShell style={{justifySelf:'end'}}>
        <ColorPickerWidget recent="#f5c2e7"/>
        <Sep/>
        <Updates count={23}/>
        <GitHub prs={4} mentions={2}/>
        <Sep/>
        <CpuChip pct={34}/><RamChip pct={42}/><TempChip c={54}/>
        <Sep/>
        <AudioSourceWidget device="AirPods Pro" icon="airpods"/>
        <Battery pct={78}/>
        <Sep/>
        <Clock time="14:32" date="May 25"/>
      </BarShell>
    </div>
  );
}

// ── 6. CATHEDRAL — top with a TALL center "hero" bulge ─────────────────────
function BarCathedral() {
  return (
    <div style={{
      position:'relative', padding:'4px 16px 0',
      display:'flex', justifyContent:'space-between', alignItems:'flex-start',
    }}>
      {/* left module */}
      <div style={{...shellStyle(), marginTop:8}}>
        <div className="w" style={{padding:'4px 8px'}}>
          <Icon name="arch" size={14} style={{color:'var(--accent)'}}/>
        </div>
        <Workspaces active={2} count={9} hasWindows={[1,2,3,5,7]} style="pills"/>
        <Sep/>
        <ActiveWindow title="kitty — vim hyprland.conf" maxWidth={180}/>
      </div>
      {/* hero center widget extends down */}
      <div style={{
        ...shellStyle(),
        flexDirection:'column', alignItems:'stretch',
        padding:'10px 14px 12px', gap:8,
        background:'linear-gradient(180deg, var(--bg), color-mix(in oklab, var(--lavender) 8%, var(--bg)) 100%)',
        boxShadow:'0 20px 50px -16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
        minWidth:340,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <AlbumArt size={42} accent="var(--lavender)"/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Midnight City</div>
            <div className="dim" style={{fontSize:10.5,marginTop:1}}>M83 · Hurry Up, We're Dreaming · 2011</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Icon name="prev" size={13} style={{color:'var(--dim)'}}/>
            <div style={{width:24,height:24,borderRadius:'50%',background:'var(--lavender)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
              <Icon name="pause" size={11} style={{color:'var(--bg)'}}/>
            </div>
            <Icon name="skip" size={13} style={{color:'var(--dim)'}}/>
          </div>
        </div>
        {/* big visualizer */}
        <div style={{display:'flex',alignItems:'flex-end',gap:2,height:18}}>
          {Array.from({length:46}).map((_, i) => (
            <div key={i} className="viz-bar" style={{
              flex:1, height: 18, background: `color-mix(in oklab, var(--lavender) ${30 + (i%10)*7}%, transparent)`,
              borderRadius:1, animationDelay: `${(i*0.06)%1.2}s`,
            }}/>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:9.5,fontVariantNumeric:'tabular-nums'}}>
          <span className="dim">1:42</span>
          <div style={{flex:1,margin:'0 8px',height:3,background:'var(--bg2)',borderRadius:2,overflow:'hidden'}}>
            <div style={{width:'34%',height:'100%',background:'var(--lavender)'}}/>
          </div>
          <span className="dim">4:03</span>
        </div>
      </div>
      {/* right module */}
      <div style={{...shellStyle(), marginTop:8}}>
        <Updates count={23}/>
        <GitHub prs={4}/>
        <Sep/>
        <Pomodoro minutes={18}/>
        <Sep/>
        <Volume v={65}/><Battery pct={78}/>
        <Sep/>
        <Clock time="14:32" date="Mon"/>
        <AILauncher label="AI"/>
      </div>
    </div>
  );
}
function shellStyle() {
  return {
    display:'inline-flex', alignItems:'center', gap:2,
    background:'var(--bg)',
    backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)',
    border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
    borderRadius:'var(--radius)',
    padding:'4px var(--pad)',
    boxShadow:'0 8px 28px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
}

// ── 7. LINEN — Aurora in Latte (light mode segmented) ──────────────────────
function BarLinen() { return <BarAurora/>; }

// ── 8. MARBLE — light edge-to-edge ─────────────────────────────────────────
function BarMarble() { return <BarPillbox/>; }

Object.assign(window, {
  Desktop, BarAurora, BarPillbox, BarMantle, BarSpine, BarAtlas, BarCathedral,
  BarLinen, BarMarble, BarShell,
});
