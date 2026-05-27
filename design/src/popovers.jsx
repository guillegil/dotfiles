// Popovers & overlays: AI assistant, now playing expanded, control center,
// calendar, hyprland minimap, app launcher.

// ── AI ASSISTANT overlay (full-screen, dim backdrop) ───────────────────────
function AIOverlay() {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'rgba(17,17,27,0.55)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:32,
    }}>
      <div style={{
        width:'min(560px, 90%)',
        background:'rgba(30,30,46,0.92)',
        backdropFilter:'blur(40px) saturate(160%)', WebkitBackdropFilter:'blur(40px) saturate(160%)',
        border:'1px solid color-mix(in oklab, var(--mauve) 25%, transparent)',
        borderRadius:18,
        boxShadow:'0 24px 80px -20px rgba(0,0,0,0.7), 0 0 60px -20px color-mix(in oklab, var(--mauve) 40%, transparent)',
        overflow:'hidden',
      }}>
        {/* gradient halo top */}
        <div style={{height:2,background:'linear-gradient(90deg, var(--mauve), var(--blue), var(--teal))'}}/>
        <div style={{padding:'14px 16px 0',display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:28,height:28,borderRadius:8,
            background:'linear-gradient(135deg, var(--mauve), var(--blue))',
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 0 20px -4px var(--mauve)',
          }}>
            <Icon name="ai" size={14} style={{color:'var(--bg)'}}/>
          </div>
          <div style={{flex:1,fontWeight:600,fontSize:13}}>cachy<span style={{opacity:0.5}}>::ai</span></div>
          <div className="dim" style={{fontSize:10,padding:'3px 6px',borderRadius:4,background:'var(--bg2)'}}>llama3.2 · local</div>
          <Icon name="chevron" size={12} style={{color:'var(--dim)',transform:'rotate(90deg)'}}/>
        </div>
        {/* messages */}
        <div style={{padding:'12px 16px 8px',display:'flex',flexDirection:'column',gap:10,maxHeight:280,overflow:'hidden'}}>
          <Msg role="user">how do I bind super+v to clipboard history?</Msg>
          <Msg role="ai">
            Add this to <code>~/.config/hypr/hyprland.conf</code>:
            <pre style={{margin:'6px 0 0',padding:'8px 10px',background:'rgba(17,17,27,0.7)',
              borderRadius:6,fontSize:10.5,color:'var(--green)',overflow:'auto',
              border:'1px solid color-mix(in oklab, var(--green) 15%, transparent)'}}>
{`bind = SUPER, V, exec, cliphist list | \\
  rofi -dmenu | cliphist decode | wl-copy`}
            </pre>
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <ActionChip icon="clipboard" label="Copy"/>
              <ActionChip icon="spark" label="Apply & reload"/>
              <ActionChip icon="search" label="Explain"/>
            </div>
          </Msg>
        </div>
        {/* mic + input */}
        <div style={{padding:'10px 12px 12px',display:'flex',alignItems:'center',gap:8,
          borderTop:'1px solid color-mix(in oklab, var(--text) 6%, transparent)'}}>
          <div style={{
            width:38,height:38,borderRadius:'50%',
            background:'color-mix(in oklab, var(--red) 22%, transparent)',
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 0 0 4px color-mix(in oklab, var(--red) 10%, transparent)',
            position:'relative',
          }}>
            <Icon name="mic" size={16} style={{color:'var(--red)'}}/>
            <span className="w-pulse" style={{position:'absolute',inset:-6,borderRadius:'50%',
              border:'1.5px solid var(--red)',opacity:0.4}}/>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'8px 12px',
            background:'rgba(17,17,27,0.6)',borderRadius:10,
            border:'1px solid color-mix(in oklab, var(--text) 6%, transparent)'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:1.5,height:14}}>
              {[8,12,6,14,9,11,7].map((h,i) => (
                <div key={i} className="ai-talk-bar" style={{width:2,height:h,
                  background:'var(--red)',borderRadius:1}}/>
              ))}
            </div>
            <span style={{color:'var(--text)',fontSize:12}}>"set my pomodoro to 50…"</span>
          </div>
          <div style={{padding:'6px 10px',background:'var(--bg2)',borderRadius:6,fontSize:10,
            color:'var(--dim)'}}>esc</div>
        </div>
      </div>
    </div>
  );
}
function Msg({ role, children }) {
  if (role === 'user') {
    return (
      <div style={{alignSelf:'flex-end',maxWidth:'85%',
        padding:'7px 12px',background:'color-mix(in oklab, var(--mauve) 25%, transparent)',
        borderRadius:'12px 12px 2px 12px',fontSize:12,color:'var(--text)'}}>{children}</div>
    );
  }
  return (
    <div style={{display:'flex',gap:8,alignItems:'flex-start',maxWidth:'95%'}}>
      <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
        background:'linear-gradient(135deg, var(--mauve), var(--blue))',
        display:'inline-flex',alignItems:'center',justifyContent:'center',marginTop:2}}>
        <Icon name="ai" size={10} style={{color:'var(--bg)'}}/>
      </div>
      <div style={{padding:'7px 12px',background:'var(--bg2)',
        borderRadius:'2px 12px 12px 12px',fontSize:12,color:'var(--text)',lineHeight:1.5}}>{children}</div>
    </div>
  );
}
function ActionChip({ icon, label }) {
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:4,
      padding:'3px 8px',background:'var(--bg)',
      border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
      borderRadius:5,fontSize:10.5,color:'var(--dim)'}}>
      <Icon name={icon} size={11}/>{label}
    </div>
  );
}

// ── NOW PLAYING expanded popover ───────────────────────────────────────────
function NowPlayingPanel() {
  return (
    <PopoverShell width={320}>
      <div style={{display:'flex',gap:14,marginBottom:12}}>
        <AlbumArt size={88} accent="var(--peach)"/>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>Midnight City</div>
            <div className="dim" style={{fontSize:11,marginTop:2}}>M83</div>
            <div className="dim" style={{fontSize:10,marginTop:1,opacity:0.6}}>Hurry Up, We're Dreaming · 2011</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
            <Icon name="prev" size={14} style={{color:'var(--dim)'}}/>
            <div style={{width:32,height:32,borderRadius:'50%',
              background:'var(--peach)',display:'inline-flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 0 18px -4px var(--peach)'}}>
              <Icon name="pause" size={13} style={{color:'var(--bg)'}}/>
            </div>
            <Icon name="skip" size={14} style={{color:'var(--dim)'}}/>
            <div style={{flex:1}}/>
            <Icon name="volume" size={13} style={{color:'var(--dim)'}}/>
          </div>
        </div>
      </div>
      {/* waveform progress */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,
        fontVariantNumeric:'tabular-nums',fontSize:10}}>
        <span className="dim">1:42</span>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:1.5,height:24}}>
          {Array.from({length:72}).map((_, i) => {
            const h = 4 + Math.abs(Math.sin(i*0.5))*18 + (i%5)*1.5;
            const played = i/72 < 0.42;
            return <div key={i} style={{
              flex:1, height: Math.min(h, 22),
              background: played ? 'var(--peach)' : 'var(--bg3)',
              borderRadius: 0.5,
            }}/>;
          })}
        </div>
        <span className="dim">4:03</span>
      </div>
      {/* up next */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>UP NEXT</div>
      {[
        ['Outro', 'M83', '4:08'],
        ['Strobe', 'Deadmau5', '10:33'],
        ['Sun Models', 'ODESZA', '4:21'],
      ].map(([t,a,d], i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 4px',
          borderRadius:6,fontSize:11}}>
          <span className="dim" style={{width:14,textAlign:'right',fontSize:10}}>{i+1}</span>
          <AlbumArt size={20} accent={['var(--mauve)','var(--blue)','var(--green)'][i]}/>
          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t}<span className="dim"> · {a}</span></span>
          <span className="dim" style={{fontSize:10}}>{d}</span>
        </div>
      ))}
    </PopoverShell>
  );
}

// ── CONTROL CENTER (refined) ───────────────────────────────────────────────
function ControlCenter() {
  return (
    <PopoverShell width={360}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Control Center</span>
        <span className="dim" style={{fontSize:10}}>Hyprland · DP-1</span>
      </div>

      {/* ── connection cards ────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
        <ConnCard icon="wifi" color="var(--sky)" name="mocha-5G"
          sub="194 Mbps" on/>
        <ConnCard icon="bluetooth" color="var(--blue)" name="Bluetooth"
          sub="3 devices" on>
          <span style={{fontSize:10,fontWeight:700,color:'var(--blue)',
            background:'color-mix(in oklab, var(--blue) 22%, transparent)',
            padding:'1px 5px',borderRadius:6,marginLeft:'auto'}}>3</span>
        </ConnCard>
        <ConnCard icon="vpn" color="var(--green)" name="tailscale"
          sub="exit: nyc-1" on/>
      </div>

      {/* VPN detail strip */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,marginBottom:10,
        padding:'8px 12px',borderRadius:9,
        background:'color-mix(in oklab, var(--green) 10%, transparent)',
        border:'1px solid color-mix(in oklab, var(--green) 22%, transparent)',
        fontSize:11,
      }}>
        <Icon name="shield" size={13} style={{color:'var(--green)'}}/>
        <span className="dim" style={{fontSize:10}}>tailscale0</span>
        <span style={{fontFamily:'"JetBrains Mono", monospace',fontWeight:600,
          fontVariantNumeric:'tabular-nums'}}>100.74.12.41</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,
          background:'color-mix(in oklab, var(--green) 24%, transparent)',
          color:'var(--green)',fontWeight:700,letterSpacing:'0.04em'}}>● ONLINE</span>
      </div>

      {/* ── privacy row ─────────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
        <PrivacyPill icon="camera" label="Camera" on={true} color="var(--green)" hint="OBS"/>
        <PrivacyPill icon="mic" label="Mic" on={false} color="var(--red)"/>
        <PrivacyPill icon="shield" label="Location" on={false} color="var(--peach)"/>
      </div>

      {/* ── performance ─────────────────────────────────────────────── */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>POWER PROFILE</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12,
        padding:3,background:'var(--bg2)',borderRadius:10}}>
        <PerfTab icon="leaf"  label="Eco"  color="var(--green)"/>
        <PerfTab icon="scale" label="Auto" color="var(--blue)" active/>
        <PerfTab icon="bolt"  label="Perf" color="var(--peach)"/>
      </div>

      {/* ── sliders ─────────────────────────────────────────────────── */}
      <SliderRow icon="volume" color="var(--mauve)" label="Volume" v={65}/>
      <SliderRow icon="brightness" color="var(--yellow)" label="Brightness" v={80}/>
      <SliderRow icon="mic" color="var(--red)" label="Mic" v={40}/>

      {/* ── small toggle row ────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,margin:'10px 0'}}>
        <MiniToggle icon="coffee" label="Caffeine" on color="var(--peach)"/>
        <MiniToggle icon="moon"   label="Night"   on color="var(--yellow)"/>
        <MiniToggle icon="dnd"    label="DND"     color="var(--red)"/>
        <MiniToggle icon="snip"   label="Snip"    color="var(--mauve)"/>
      </div>

      {/* ── stats card ──────────────────────────────────────────────── */}
      <div style={{padding:'10px 12px',background:'var(--bg2)',borderRadius:10,
        display:'flex',gap:14,alignItems:'center',marginBottom:10}}>
        <Stat color="var(--blue)" label="CPU" v="34%" data={[3,5,4,7,6,8,5,9,7,10,8,11,9,7,8]}/>
        <Stat color="var(--mauve)" label="RAM" v="42%" data={[4,5,4,5,5,6,5,5,6,5,5,6]}/>
        <Stat color="var(--teal)" label="NET" v="1.2 MB/s" data={[1,2,1.5,3,2,4,2.5,5,3,4,6,3.5,2.5,3]}/>
      </div>

      <div style={{display:'flex',gap:6}}>
        <PowerBtn icon="power" label="Shut down" color="var(--red)"/>
        <PowerBtn icon="spark" label="Reboot" color="var(--peach)"/>
        <PowerBtn icon="user"  label="Lock" color="var(--blue)"/>
      </div>
    </PopoverShell>
  );
}

function ConnCard({ icon, color, name, sub, on, children }) {
  return (
    <div style={{
      padding:'10px',borderRadius:10,
      background: on ? `color-mix(in oklab, ${color} 16%, transparent)` : 'var(--bg2)',
      border: on ? `1px solid color-mix(in oklab, ${color} 32%, transparent)` : '1px solid transparent',
      display:'flex',flexDirection:'column',gap:5,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <Icon name={icon} size={14} style={{color: on?color:'var(--dim)'}}/>
        {children}
      </div>
      <div style={{fontSize:11,fontWeight:600,
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
      <div className="dim" style={{fontSize:9.5,
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sub}</div>
    </div>
  );
}

function PrivacyPill({ icon, label, on, color, hint }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:6,
      padding:'6px 9px',borderRadius:7,
      background: on ? `color-mix(in oklab, ${color} 14%, transparent)` : 'var(--bg2)',
      border: '1px solid ' + (on ? `color-mix(in oklab, ${color} 28%, transparent)` : 'transparent'),
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background: on?color:'var(--dim)',opacity:on?1:0.4}}
        className={on?'w-pulse':''}/>
      <Icon name={icon} size={12} style={{color: on?color:'var(--dim)'}}/>
      <span style={{fontSize:10,fontWeight:600,
        color: on?'var(--text)':'var(--dim)',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hint || label}</span>
    </div>
  );
}

function PerfTab({ icon, label, color, active }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'center',gap:5,
      padding:'7px 6px',borderRadius:7,
      background: active ? `color-mix(in oklab, ${color} 24%, transparent)` : 'transparent',
      border: active ? `1px solid color-mix(in oklab, ${color} 38%, transparent)` : '1px solid transparent',
    }}>
      <Icon name={icon} size={12} style={{color: active?color:'var(--dim)'}}/>
      <span style={{fontSize:11,fontWeight:600,
        color: active?color:'var(--dim)'}}>{label}</span>
    </div>
  );
}

function MiniToggle({ icon, label, on, color }) {
  return (
    <div style={{
      padding:'9px 6px',borderRadius:9,
      display:'flex',flexDirection:'column',alignItems:'center',gap:4,
      background: on ? `color-mix(in oklab, ${color} 18%, transparent)` : 'var(--bg2)',
      border: '1px solid ' + (on ? `color-mix(in oklab, ${color} 32%, transparent)` : 'transparent'),
    }}>
      <Icon name={icon} size={14} style={{color: on?color:'var(--dim)'}}/>
      <span style={{fontSize:9,fontWeight:600,color: on?'var(--text)':'var(--dim)'}}>{label}</span>
    </div>
  );
}

function Stat({ color, label, v, data }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:1,flex:1,minWidth:0}}>
      <span className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em'}}>{label}</span>
      <Sparkline data={data} color={color} width={70} height={18}/>
      <span style={{fontSize:11,fontWeight:600,color,
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</span>
    </div>
  );
}
function SliderRow({ icon, color, label, v }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 4px'}}>
      <Icon name={icon} size={14} style={{color}}/>
      <div style={{flex:1,height:6,background:'var(--bg2)',borderRadius:3,position:'relative'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${v}%`,
          background:color,borderRadius:3}}/>
        <div style={{position:'absolute',left:`${v}%`,top:'50%',width:12,height:12,
          background:'var(--text)',borderRadius:'50%',transform:'translate(-50%,-50%)',
          boxShadow:'0 1px 4px rgba(0,0,0,0.4)'}}/>
      </div>
      <span style={{fontSize:10,fontVariantNumeric:'tabular-nums',color:'var(--dim)',width:24,textAlign:'right'}}>{v}%</span>
    </div>
  );
}
function PowerBtn({ icon, label, color }) {
  return (
    <div style={{flex:1,padding:'8px 6px',background:'var(--bg2)',borderRadius:8,
      display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <Icon name={icon} size={14} style={{color}}/>
      <span style={{fontSize:9,fontWeight:600,color:'var(--dim)'}}>{label}</span>
    </div>
  );
}

// ── CALENDAR popover ───────────────────────────────────────────────────────
function CalendarPanel() {
  const today = 25;
  const days = Array.from({length: 35}).map((_, i) => i - 3); // May 2026 layout
  const events = [3,8,12,15,25,28];
  return (
    <PopoverShell width={300}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontWeight:700,fontSize:13}}>May 2026</span>
        <div style={{display:'flex',gap:4}}>
          <Icon name="chevron" size={12} style={{transform:'rotate(180deg)',color:'var(--dim)'}}/>
          <Icon name="chevron" size={12} style={{color:'var(--dim)'}}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} className="dim" style={{textAlign:'center',fontSize:9,fontWeight:700,padding:'4px 0',letterSpacing:'0.05em'}}>{d}</div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
        {days.map((d, i) => {
          const valid = d > 0 && d <= 31;
          const isToday = d === today;
          const hasEvent = events.includes(d);
          return (
            <div key={i} style={{
              aspectRatio:'1', display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:10.5, fontWeight:600,
              borderRadius:6, position:'relative',
              color: !valid ? 'transparent' : isToday ? 'var(--bg)' : 'var(--text)',
              background: isToday ? 'var(--accent)' : 'transparent',
            }}>
              {valid ? d : ''}
              {hasEvent && !isToday && <div style={{position:'absolute',bottom:3,
                width:3,height:3,borderRadius:'50%',background:'var(--accent)'}}/>}
            </div>
          );
        })}
      </div>
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>TODAY · MAY 25</div>
      {[
        ['9:00', '10:00', 'Standup', 'var(--blue)'],
        ['11:30', '12:00', '1:1 with Riley', 'var(--green)'],
        ['15:30', '16:30', 'Design review · Cachy bar', 'var(--mauve)'],
        ['18:00', '19:00', 'Climbing @ Mesa', 'var(--peach)'],
      ].map(([s,e,t,c], i) => (
        <div key={i} style={{display:'flex',gap:10,padding:'6px 4px',alignItems:'flex-start'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',
            fontVariantNumeric:'tabular-nums',fontSize:10,minWidth:36}}>
            <span style={{fontWeight:600}}>{s}</span>
            <span className="dim" style={{fontSize:9}}>{e}</span>
          </div>
          <div style={{width:3,alignSelf:'stretch',background:c,borderRadius:2}}/>
          <span style={{fontSize:11,fontWeight:500,paddingTop:1}}>{t}</span>
        </div>
      ))}
    </PopoverShell>
  );
}

// ── HYPRLAND MINIMAP expanded ──────────────────────────────────────────────
function HyprMapPanel() {
  const wsLayouts = [
    {windows: [{x:0,y:0,w:1,h:1,app:'kitty',c:'var(--green)'}]},
    {windows: [
      {x:0,y:0,w:0.6,h:1,app:'zen-browser',c:'var(--blue)'},
      {x:0.62,y:0,w:0.38,h:0.5,app:'kitty',c:'var(--green)'},
      {x:0.62,y:0.52,w:0.38,h:0.48,app:'discord',c:'var(--mauve)'},
    ]},
    {windows: [
      {x:0,y:0,w:1,h:0.55,app:'vscode',c:'var(--blue)'},
      {x:0,y:0.57,w:1,h:0.43,app:'kitty',c:'var(--green)'},
    ]},
    {windows: []},
    {windows: [
      {x:0,y:0,w:0.5,h:1,app:'figma',c:'var(--peach)'},
      {x:0.52,y:0,w:0.48,h:1,app:'obsidian',c:'var(--mauve)'},
    ]},
  ];
  return (
    <PopoverShell width={340}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Workspaces</span>
        <span className="dim" style={{fontSize:10}}>DP-1 · 3440×1440</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
        {wsLayouts.map((ws, i) => {
          const isActive = i === 1;
          const empty = ws.windows.length === 0;
          return (
            <div key={i} style={{
              aspectRatio:'16/9',
              background: isActive ? 'color-mix(in oklab, var(--accent) 22%, transparent)' : 'var(--bg2)',
              border: isActive ? `1.5px solid var(--accent)` : '1px solid transparent',
              borderRadius:6,position:'relative',padding:3,
            }}>
              {ws.windows.map((w, j) => (
                <div key={j} style={{
                  position:'absolute',
                  left:`${3 + w.x*94}%`, top:`${4 + w.y*92}%`,
                  width:`${w.w*94-1}%`, height:`${w.h*92-1}%`,
                  background: w.c, opacity:0.55, borderRadius:2,
                }}/>
              ))}
              {empty && <div style={{position:'absolute',inset:0,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'var(--dim)',fontSize:10,opacity:0.5}}>empty</div>}
              <span style={{position:'absolute',bottom:3,right:5,
                fontSize:9,fontWeight:700,color: isActive?'var(--accent)':'var(--dim)',
                fontVariantNumeric:'tabular-nums'}}>{i+1}</span>
            </div>
          );
        })}
      </div>
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',margin:'12px 0 6px'}}>
        WS 2 · 3 WINDOWS
      </div>
      {[
        ['zen-browser', 'Cachy Rice Wiki — gh.com', 'var(--blue)'],
        ['kitty', 'paru -Syu · 23 packages', 'var(--green)'],
        ['discord', 'cachyos · #ricing', 'var(--mauve)'],
      ].map(([app, title, c], i) => (
        <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'5px 4px',fontSize:11}}>
          <div style={{width:3,height:14,background:c,borderRadius:2}}/>
          <span style={{fontWeight:600,minWidth:90}}>{app}</span>
          <span className="dim" style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</span>
        </div>
      ))}
    </PopoverShell>
  );
}

// ── APP LAUNCHER overlay ───────────────────────────────────────────────────
function AppLauncher() {
  // colorful "app icon" tiles — procedural so we don't need real PNGs
  const apps = [
    {name:'Firefox',     g:['#ff7139','#9059ff'], glyph:'🦊', cat:'web'},
    {name:'VS Code',     g:['#0098e6','#1f6feb'], glyph:'</>', cat:'dev'},
    {name:'Discord',     g:['#5865f2','#7289da'], glyph:'◉◉', cat:'chat'},
    {name:'Spotify',     g:['#1db954','#0f5132'], glyph:'♫', cat:'music'},
    {name:'Obsidian',    g:['#7c3aed','#4c1d95'], glyph:'◇', cat:'notes'},
    {name:'Steam',       g:['#1b2838','#66c0f4'], glyph:'⛭', cat:'games'},
    {name:'Telegram',    g:['#229ed9','#5eb5f7'], glyph:'✈', cat:'chat'},
    {name:'Figma',       g:['#f24e1e','#a259ff'], glyph:'⬢', cat:'design'},
    {name:'Blender',     g:['#ea7600','#265787'], glyph:'⊙', cat:'3d'},
    {name:'GIMP',        g:['#5c5543','#a89f8b'], glyph:'⌬', cat:'design'},
    {name:'Krita',       g:['#3daee9','#1d99f3'], glyph:'❉', cat:'art'},
    {name:'Thunderbird', g:['#0a84ff','#0060df'], glyph:'✉', cat:'mail'},
  ];
  const recent = ['kitty', 'zen', 'paru', 'btop', 'hyprctl'];

  return (
    <div style={{
      position:'absolute', inset:0,
      background:'rgba(17,17,27,0.6)',
      backdropFilter:'blur(12px) saturate(140%)', WebkitBackdropFilter:'blur(12px) saturate(140%)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      paddingTop:88,
    }}>
      <div style={{
        width:560,
        background:'rgba(24,24,37,0.92)',
        backdropFilter:'blur(40px) saturate(160%)', WebkitBackdropFilter:'blur(40px) saturate(160%)',
        border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
        borderRadius:18,
        boxShadow:'0 28px 80px -20px rgba(0,0,0,0.75), 0 0 60px -20px color-mix(in oklab, var(--accent) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow:'hidden',
        color:'var(--text)',
        fontFamily:'"JetBrains Mono", monospace',
      }}>
        {/* ── search input ─────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 18px',
          borderBottom:'1px solid color-mix(in oklab, var(--text) 6%, transparent)',
        }}>
          <Icon name="search" size={18} style={{color:'var(--accent)'}}/>
          <span style={{fontSize:18,fontWeight:500,color:'var(--text)'}}>fi</span>
          <span style={{display:'inline-block',width:2,height:20,background:'var(--accent)',
            animation:'blink 1s steps(2) infinite'}}/>
          <div style={{flex:1}}/>
          <span style={{fontSize:10,padding:'3px 7px',borderRadius:4,
            background:'color-mix(in oklab, var(--accent) 18%, transparent)',
            color:'var(--accent)',fontWeight:600,letterSpacing:'0.06em'}}>= 2 RESULTS</span>
          <kbd style={kbd}>esc</kbd>
        </div>

        {/* ── calculator banner (cool plugin) ──────────────────── */}
        <div style={{
          margin:'10px 14px',
          padding:'10px 14px', borderRadius:10,
          background:'linear-gradient(135deg, color-mix(in oklab, var(--teal) 14%, transparent), color-mix(in oklab, var(--blue) 12%, transparent))',
          border:'1px solid color-mix(in oklab, var(--teal) 24%, transparent)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <Icon name="spark" size={14} style={{color:'var(--teal)'}}/>
          <span className="dim" style={{fontSize:11}}>calc</span>
          <span style={{fontVariantNumeric:'tabular-nums',fontSize:13,fontWeight:600}}>fi → 1.618033</span>
          <span className="dim" style={{fontSize:10}}>· golden ratio</span>
          <div style={{flex:1}}/>
          <kbd style={kbd}>↵ copy</kbd>
        </div>

        {/* ── search results ───────────────────────────────────── */}
        <div style={{padding:'0 14px 8px',display:'flex',flexDirection:'column',gap:2}}>
          <ResultRow icon="firefox" glyph="🦊" g={['#ff7139','#9059ff']}
            name="Firefox" hint="firefox" sub="Web browser"/>
          <ResultRow selected icon="figma" glyph="⬢" g={['#f24e1e','#a259ff']}
            name="Figma" hint="figma" sub="Design tool · /opt/figma-linux"/>
        </div>

        {/* ── recent commands ──────────────────────────────────── */}
        <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.12em',
          padding:'8px 18px 4px'}}>RECENT</div>
        <div style={{display:'flex',gap:6,padding:'0 14px 10px',flexWrap:'wrap'}}>
          {recent.map(r => (
            <div key={r} style={{
              display:'inline-flex',alignItems:'center',gap:5,
              padding:'5px 10px',borderRadius:6,
              background:'var(--bg2)',fontSize:11,
            }}>
              <span className="dim" style={{fontSize:10}}>›</span>{r}
            </div>
          ))}
        </div>

        {/* ── app grid ─────────────────────────────────────────── */}
        <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.12em',
          padding:'4px 18px 6px'}}>ALL APPS · 142</div>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8,
          padding:'4px 14px 14px',
        }}>
          {apps.map((a, i) => (
            <div key={a.name} style={{
              padding:'10px 6px 8px',borderRadius:10,
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              background: i === 7 ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'transparent',
              border: i === 7 ? '1px solid color-mix(in oklab, var(--accent) 40%, transparent)' : '1px solid transparent',
              transition:'background .12s',
            }}>
              <AppTile glyph={a.glyph} g={a.g}/>
              <span style={{fontSize:10,fontWeight:500,
                color: i === 7 ? 'var(--text)' : 'var(--dim)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{a.name}</span>
            </div>
          ))}
        </div>

        {/* ── footer hints ─────────────────────────────────────── */}
        <div style={{
          display:'flex',alignItems:'center',gap:14,
          padding:'10px 18px',
          borderTop:'1px solid color-mix(in oklab, var(--text) 6%, transparent)',
          background:'rgba(17,17,27,0.5)',fontSize:10,
        }}>
          <span className="dim"><kbd style={kbd}>↑↓</kbd> nav</span>
          <span className="dim"><kbd style={kbd}>↵</kbd> launch</span>
          <span className="dim"><kbd style={kbd}>⌘↵</kbd> in terminal</span>
          <span className="dim"><kbd style={kbd}>=</kbd> calc</span>
          <span className="dim"><kbd style={kbd}>?</kbd> ask AI</span>
          <div style={{flex:1}}/>
          <span style={{display:'inline-flex',alignItems:'center',gap:5,
            padding:'3px 8px',borderRadius:5,
            background:'linear-gradient(135deg, color-mix(in oklab, var(--mauve) 22%, transparent), color-mix(in oklab, var(--blue) 22%, transparent))',
            border:'1px solid color-mix(in oklab, var(--mauve) 30%, transparent)'}}>
            <Icon name="ai" size={10} style={{color:'var(--mauve)'}}/>
            <span style={{fontWeight:600,fontSize:10,
              background:'linear-gradient(90deg,var(--mauve),var(--blue))',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ask cachy::ai</span>
          </span>
        </div>
      </div>
      <style>{`@keyframes blink { 50% {opacity:0} }`}</style>
    </div>
  );
}

const kbd = {
  display:'inline-block',padding:'1px 5px',borderRadius:3,
  background:'var(--bg2)',border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
  fontSize:9,fontWeight:600,color:'var(--text)',
  fontFamily:'"JetBrains Mono", monospace',letterSpacing:'0.04em',
};

function AppTile({ glyph, g, size = 38 }) {
  return (
    <div style={{
      width:size,height:size,borderRadius:10,
      background:`linear-gradient(135deg, ${g[0]}, ${g[1]})`,
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      color:'rgba(255,255,255,0.95)',fontSize:size*0.42,fontWeight:700,
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -4px rgba(0,0,0,0.5)',
      flexShrink:0,
    }}>{glyph}</div>
  );
}

function ResultRow({ glyph, g, name, hint, sub, selected }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:12,
      padding:'8px 10px',borderRadius:8,
      background: selected ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'transparent',
      border: selected ? '1px solid color-mix(in oklab, var(--accent) 35%, transparent)' : '1px solid transparent',
    }}>
      <AppTile glyph={glyph} g={g} size={28}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600}}>
          <span style={{color: selected?'var(--accent)':'var(--text)'}}>{hint}</span>
          <span className="dim">{name.slice(hint.length)}</span>
        </div>
        <div className="dim" style={{fontSize:10,marginTop:1}}>{sub}</div>
      </div>
      {selected && <kbd style={kbd}>↵</kbd>}
    </div>
  );
}

// ── shared popover shell ───────────────────────────────────────────────────
function PopoverShell({ children, width = 300 }) {
  return (
    <div style={{
      width,
      background:'rgba(30,30,46,0.92)',
      backdropFilter:'blur(36px) saturate(160%)', WebkitBackdropFilter:'blur(36px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
      borderRadius:14,
      boxShadow:'0 20px 60px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
      padding:14,
      color:'var(--text)',
      fontFamily:'"JetBrains Mono", monospace',
    }}>
      {/* connector tab from bar */}
      <div style={{position:'absolute',top:-6,left:30,width:12,height:12,
        background:'rgba(30,30,46,0.92)',transform:'rotate(45deg)',
        borderLeft:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
        borderTop:'1px solid color-mix(in oklab, var(--text) 8%, transparent)'}}/>
      {children}
    </div>
  );
}

// ── CAMERA preview popover ─────────────────────────────────────────────────
function CameraPopover() {
  return (
    <PopoverShell width={340}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Camera</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:5,
          padding:'2px 8px',borderRadius:5,
          background:'color-mix(in oklab, var(--green) 18%, transparent)',
          color:'var(--green)',fontSize:9,fontWeight:700,letterSpacing:'0.06em'}}>
          <span className="w-pulse" style={{width:5,height:5,borderRadius:'50%',background:'var(--green)'}}/>
          LIVE · 00:42
        </span>
      </div>

      {/* video preview */}
      <div style={{
        position:'relative',width:'100%',aspectRatio:'16/9',
        borderRadius:10,overflow:'hidden',marginBottom:10,
        background:'linear-gradient(155deg, #2a2640 0%, #45475a 40%, #1e1e2e 100%)',
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.06), 0 6px 20px -8px rgba(0,0,0,0.6)',
      }}>
        {/* stylized silhouette */}
        <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"
          style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
          <defs>
            <radialGradient id="cam-light" cx="50%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(203,166,247,0.35)"/>
              <stop offset="100%" stopColor="rgba(203,166,247,0)"/>
            </radialGradient>
          </defs>
          <rect width="320" height="180" fill="url(#cam-light)"/>
          {/* head + shoulders */}
          <circle cx="160" cy="80" r="32" fill="rgba(17,17,27,0.55)"/>
          <path d="M90 180 Q90 130 160 124 Q230 130 230 180 Z" fill="rgba(17,17,27,0.55)"/>
          {/* highlight */}
          <ellipse cx="150" cy="70" rx="6" ry="3" fill="rgba(245,224,220,0.25)"/>
        </svg>
        {/* scanlines */}
        <div style={{position:'absolute',inset:0,
          backgroundImage:'repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0 1px,transparent 1px 3px)',
          mixBlendMode:'overlay',pointerEvents:'none'}}/>
        {/* corner brackets */}
        {[
          {top:6,left:6,b:'rt'},{top:6,right:6,b:'lt'},
          {bottom:6,left:6,b:'rb'},{bottom:6,right:6,b:'lb'},
        ].map((c,i) => (
          <div key={i} style={{position:'absolute',width:10,height:10,
            ...c,
            borderTop: c.top ? '1.5px solid var(--green)' : 'none',
            borderBottom: c.bottom ? '1.5px solid var(--green)' : 'none',
            borderLeft: c.left ? '1.5px solid var(--green)' : 'none',
            borderRight: c.right ? '1.5px solid var(--green)' : 'none',
            opacity:0.7,
          }}/>
        ))}
        {/* corner info */}
        <div style={{position:'absolute',top:8,left:14,fontSize:9,fontWeight:700,
          color:'var(--green)',letterSpacing:'0.08em',
          textShadow:'0 1px 2px rgba(0,0,0,0.6)'}}>
          ● REC 00:42
        </div>
        <div style={{position:'absolute',top:8,right:14,fontSize:9,fontWeight:600,
          color:'rgba(205,214,244,0.85)',
          fontFamily:'"JetBrains Mono", monospace',textShadow:'0 1px 2px rgba(0,0,0,0.6)'}}>
          1080p · 30fps
        </div>
        <div style={{position:'absolute',bottom:8,left:14,fontSize:9,
          color:'rgba(205,214,244,0.7)',fontFamily:'"JetBrains Mono", monospace',
          textShadow:'0 1px 2px rgba(0,0,0,0.6)'}}>
          /dev/video0 · Integrated Camera
        </div>
      </div>

      {/* controls */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        <div style={{flex:1,padding:'8px',borderRadius:8,
          background:'color-mix(in oklab, var(--red) 18%, transparent)',
          border:'1px solid color-mix(in oklab, var(--red) 32%, transparent)',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'var(--red)'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'var(--red)',letterSpacing:'0.06em'}}>STOP</span>
        </div>
        <div style={{flex:1,padding:'8px',borderRadius:8,background:'var(--bg2)',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <Icon name="pause" size={11} style={{color:'var(--text)'}}/>
          <span style={{fontSize:11,fontWeight:600}}>Pause</span>
        </div>
        <div style={{padding:'8px 10px',borderRadius:8,background:'var(--bg2)',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon name="snip" size={12} style={{color:'var(--text)'}}/>
        </div>
        <div style={{padding:'8px 10px',borderRadius:8,background:'var(--bg2)',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon name="cam_off" size={12} style={{color:'var(--text)'}}/>
        </div>
      </div>

      {/* settings strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
        <SettingChip label="Res" value="1080p"/>
        <SettingChip label="FPS" value="30"/>
        <SettingChip label="Mic" value="On" color="var(--green)"/>
        <SettingChip label="Codec" value="H.264"/>
      </div>

      {/* apps using camera */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>USING CAMERA</div>
      {[
        ['OBS Studio', 'recording · 00:42', 'var(--red)', true],
        ['Zoom', 'paused', 'var(--blue)', false],
      ].map(([app,sub,c,active], i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 4px',fontSize:11}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:c,opacity:active?1:0.4}}
            className={active?'w-pulse':''}/>
          <span style={{fontWeight:600,minWidth:100}}>{app}</span>
          <span className="dim" style={{flex:1,fontSize:10}}>{sub}</span>
          <Icon name="cam_off" size={11} style={{color:'var(--dim)'}}/>
        </div>
      ))}
    </PopoverShell>
  );
}
function SettingChip({ label, value, color }) {
  return (
    <div style={{padding:'6px 8px',borderRadius:7,background:'var(--bg2)',
      display:'flex',flexDirection:'column',gap:1,alignItems:'flex-start'}}>
      <span className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.08em'}}>{label}</span>
      <span style={{fontSize:11,fontWeight:600,color:color||'var(--text)'}}>{value}</span>
    </div>
  );
}

// ── BATTERY + DEVICES popover ──────────────────────────────────────────────
function BatteryDevicesPopover() {
  const devices = [
    {name:'AirPods Pro', icon:'airpods', sub:'L 84% · R 81% · case 92%', pct:81, c:'var(--blue)'},
    {name:'Magic Keyboard', icon:'keyboard', sub:'connected · USB-C', pct:92, c:'var(--green)'},
    {name:'MX Master 3', icon:'mouse', sub:'connected', pct:67, c:'var(--peach)'},
    {name:'WH-1000XM5', icon:'headphones', sub:'low battery', pct:18, c:'var(--red)'},
  ];
  return (
    <PopoverShell width={360}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Battery & Devices</span>
        <span className="dim" style={{fontSize:10}}>4 connected</span>
      </div>

      {/* hero laptop battery */}
      <div style={{
        padding:'14px',borderRadius:12,marginBottom:12,
        background:'linear-gradient(135deg, color-mix(in oklab, var(--green) 14%, transparent), color-mix(in oklab, var(--accent) 8%, transparent))',
        border:'1px solid color-mix(in oklab, var(--green) 22%, transparent)',
        display:'flex',alignItems:'center',gap:14,
      }}>
        <BatteryRing pct={78} size={60} color="var(--green)" charging/>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:2}}>
          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
            <Icon name="laptop" size={13} style={{color:'var(--dim)',alignSelf:'center'}}/>
            <span style={{fontWeight:700,fontSize:13}}>Framework 16</span>
          </div>
          <div className="dim" style={{fontSize:10.5}}>4h 12m remaining</div>
          <div style={{display:'flex',gap:8,marginTop:4,fontSize:10}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,
              color:'var(--green)',fontWeight:600}}>
              <span style={{fontSize:11}}>⚡</span> 38W AC
            </span>
            <span className="dim">·</span>
            <span className="dim">health 98%</span>
            <span className="dim">·</span>
            <span className="dim">cycles 142</span>
          </div>
        </div>
      </div>

      {/* power profile inline */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>POWER PROFILE</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12,
        padding:3,background:'var(--bg2)',borderRadius:10}}>
        <PerfTab icon="leaf"  label="Eco"  color="var(--green)"/>
        <PerfTab icon="scale" label="Auto" color="var(--blue)" active/>
        <PerfTab icon="bolt"  label="Perf" color="var(--peach)"/>
      </div>

      {/* device list */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>BLUETOOTH DEVICES</div>
      {devices.map((d, i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'7px 4px'}}>
          <BatteryRing pct={d.pct} size={28} color={d.c} thin/>
          <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:1}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,fontWeight:600}}>
              <Icon name={d.icon} size={12} style={{color:'var(--dim)'}}/>
              <span>{d.name}</span>
              {d.pct < 25 && <span style={{fontSize:9,fontWeight:700,
                padding:'1px 5px',borderRadius:4,
                background:'color-mix(in oklab, var(--red) 22%, transparent)',
                color:'var(--red)',letterSpacing:'0.04em'}}>LOW</span>}
            </div>
            <span className="dim" style={{fontSize:10}}>{d.sub}</span>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:d.c,fontVariantNumeric:'tabular-nums'}}>{d.pct}%</span>
        </div>
      ))}
    </PopoverShell>
  );
}

function BatteryRing({ pct, size = 40, color = 'var(--green)', thin = false, charging = false }) {
  const stroke = thin ? 2.5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--bg2)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct/100)}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
        fontSize: thin?9.5:13, fontWeight:700, color, lineHeight:1,
        fontVariantNumeric:'tabular-nums'}}>
        {charging && !thin ? '⚡' : pct}
        {!thin && !charging && <span style={{fontSize:8,marginLeft:1,opacity:0.7}}>%</span>}
      </div>
    </div>
  );
}

// ── SCREENSHOT popover ─────────────────────────────────────────────────────
function ScreenshotPopover() {
  return (
    <PopoverShell width={340}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Screenshot</span>
        <span className="dim" style={{fontSize:10}}>grim · slurp · swappy</span>
      </div>

      {/* mode buttons */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:10}}>
        <ModeBtn icon="region" label="Region" color="var(--mauve)" active hint="Sh+S"/>
        <ModeBtn icon="window" label="Window" color="var(--blue)" hint="W"/>
        <ModeBtn icon="display" label="Full" color="var(--teal)" hint="F"/>
        <ModeBtn icon="clock" label="Delay" color="var(--peach)"/>
      </div>

      {/* region preview */}
      <div style={{
        position:'relative',width:'100%',aspectRatio:'16/10',
        borderRadius:10,overflow:'hidden',marginBottom:10,
        background:'linear-gradient(135deg, #313244, #1e1e2e 60%, #11111b)',
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 14px -6px rgba(0,0,0,0.5)',
      }}>
        {/* "desktop" inside the thumbnail */}
        <div style={{position:'absolute',top:'6%',left:'6%',right:'6%',height:'14%',
          background:'rgba(30,30,46,0.7)',borderRadius:4,
          border:'1px solid rgba(205,214,244,0.05)'}}>
          <div style={{padding:'4px 6px',display:'flex',gap:3}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#f38ba8',opacity:0.6}}/>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#f9e2af',opacity:0.6}}/>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#a6e3a1',opacity:0.6}}/>
          </div>
        </div>
        <div style={{position:'absolute',top:'25%',left:'6%',width:'56%',bottom:'8%',
          background:'rgba(17,17,27,0.6)',borderRadius:4,padding:'8px 10px',
          fontFamily:'"JetBrains Mono", monospace',fontSize:8,
          color:'rgba(166,227,161,0.7)',lineHeight:1.6}}>
          ❯ hyprctl<br/>
          monitors<br/>
          <span style={{color:'rgba(205,214,244,0.5)'}}>DP-1 3440x1440</span>
        </div>
        <div style={{position:'absolute',top:'25%',right:'6%',width:'30%',bottom:'8%',
          background:'rgba(69,71,90,0.5)',borderRadius:4}}/>
        {/* dashed selection rect */}
        <div style={{position:'absolute',top:'30%',left:'18%',width:'46%',height:'48%',
          border:'1.5px dashed var(--teal)',
          background:'color-mix(in oklab, var(--teal) 10%, transparent)',
          boxShadow:'0 0 0 9999px rgba(17,17,27,0.45)',
          borderRadius:2,
        }}>
          {/* corner handles */}
          {[[0,0],[1,0],[0,1],[1,1]].map(([x,y],i) => (
            <span key={i} style={{position:'absolute',
              left: x ? 'auto' : -4, right: x ? -4 : 'auto',
              top: y ? 'auto' : -4, bottom: y ? -4 : 'auto',
              width:7,height:7,background:'var(--teal)',borderRadius:1.5,
              boxShadow:'0 0 0 1.5px var(--bg)'}}/>
          ))}
          {/* dimensions chip */}
          <span style={{position:'absolute',top:-22,left:0,
            padding:'2px 6px',borderRadius:3,
            background:'var(--teal)',color:'var(--bg)',
            fontSize:9,fontWeight:700,fontFamily:'"JetBrains Mono", monospace'}}>
            1248 × 720
          </span>
          {/* crosshair at cursor */}
          <span style={{position:'absolute',right:8,bottom:8,
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:14,height:14}}>
            <span style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,
              background:'var(--teal)',opacity:0.85}}/>
            <span style={{position:'absolute',top:'50%',left:0,right:0,height:1,
              background:'var(--teal)',opacity:0.85}}/>
          </span>
        </div>
      </div>

      {/* delay options */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>DELAY</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
        {['Now','3s','5s','10s'].map((d,i) => (
          <div key={d} style={{
            padding:'6px',borderRadius:6,textAlign:'center',
            background: i===0 ? 'color-mix(in oklab, var(--accent) 22%, transparent)' : 'var(--bg2)',
            border: '1px solid ' + (i===0 ? 'color-mix(in oklab, var(--accent) 35%, transparent)' : 'transparent'),
            color: i===0 ? 'var(--accent)' : 'var(--text)',
            fontSize:11,fontWeight:600,fontVariantNumeric:'tabular-nums',
          }}>{d}</div>
        ))}
      </div>

      {/* action row */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        <ActionBig icon="clipboard" label="Copy" color="var(--mauve)" active/>
        <ActionBig icon="package" label="Save" color="var(--blue)"/>
        <ActionBig icon="spark" label="Annotate" color="var(--peach)"/>
      </div>

      {/* recent */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>RECENT</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
        {[
          {g:['#cba6f7','#89b4fa'], t:'2 min'},
          {g:['#a6e3a1','#94e2d5'], t:'14 min'},
          {g:['#fab387','#f38ba8'], t:'1 hr'},
        ].map((s,i) => (
          <div key={i} style={{position:'relative',aspectRatio:'16/10',borderRadius:6,
            background:`linear-gradient(135deg, ${s.g[0]}, ${s.g[1]})`,
            boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.08)'}}>
            <span style={{position:'absolute',bottom:3,right:5,
              fontSize:8,fontWeight:600,color:'rgba(17,17,27,0.7)'}}>{s.t}</span>
          </div>
        ))}
      </div>
    </PopoverShell>
  );
}
function ModeBtn({ icon, label, color, active, hint }) {
  return (
    <div style={{
      padding:'8px 6px',borderRadius:9,
      display:'flex',flexDirection:'column',alignItems:'center',gap:5,
      background: active ? `color-mix(in oklab, ${color} 22%, transparent)` : 'var(--bg2)',
      border: '1px solid ' + (active ? `color-mix(in oklab, ${color} 35%, transparent)` : 'transparent'),
    }}>
      <Icon name={icon} size={14} style={{color: active?color:'var(--dim)'}}/>
      <span style={{fontSize:10,fontWeight:600,color: active?'var(--text)':'var(--dim)'}}>{label}</span>
      {hint && <span style={{fontSize:8,color: active?color:'var(--dim)',opacity:0.7,
        fontFamily:'"JetBrains Mono", monospace'}}>⌘{hint}</span>}
    </div>
  );
}
function ActionBig({ icon, label, color, active }) {
  return (
    <div style={{flex:1,padding:'8px',borderRadius:8,
      background: active ? `color-mix(in oklab, ${color} 18%, transparent)` : 'var(--bg2)',
      border: '1px solid ' + (active ? `color-mix(in oklab, ${color} 30%, transparent)` : 'transparent'),
      display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
      <Icon name={icon} size={12} style={{color: active?color:'var(--text)'}}/>
      <span style={{fontSize:11,fontWeight:600,color: active?color:'var(--text)'}}>{label}</span>
    </div>
  );
}

// ── COLOR PICKER popover ───────────────────────────────────────────────────
function ColorPickerPopover() {
  const cur = '#cba6f7';
  const rgb = [203, 166, 247];
  const recent = ['#cba6f7','#89b4fa','#a6e3a1','#f9e2af','#fab387','#f38ba8','#74c7ec','#94e2d5'];
  const palette = [
    MOCHA.rosewater, MOCHA.flamingo, MOCHA.pink, MOCHA.mauve, MOCHA.red, MOCHA.maroon,
    MOCHA.peach, MOCHA.yellow, MOCHA.green, MOCHA.teal, MOCHA.sky, MOCHA.sapphire,
    MOCHA.blue, MOCHA.lavender,
  ];
  return (
    <PopoverShell width={320}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Color Picker</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:5,
          padding:'2px 8px',borderRadius:5,
          background:'color-mix(in oklab, var(--accent) 18%, transparent)',
          color:'var(--accent)',fontSize:9,fontWeight:700,letterSpacing:'0.04em'}}>
          <Icon name="dropper" size={10}/> PICKING
        </span>
      </div>

      {/* pixel loupe + swatch */}
      <div style={{display:'flex',gap:10,marginBottom:12}}>
        <PixelLoupe center={cur}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          <div style={{height:42,borderRadius:8,background:cur,
            boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)'}}/>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            <FormatRow label="HEX" value={cur.toUpperCase()}/>
            <FormatRow label="RGB" value={`${rgb.join(' ')}`}/>
            <FormatRow label="HSL" value="267 84% 81%"/>
            <FormatRow label="OKLCH" value="78% 0.12 308"/>
          </div>
        </div>
      </div>

      {/* recent */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>RECENT</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5,marginBottom:12}}>
        {recent.map((c,i) => (
          <div key={i} style={{aspectRatio:'1',borderRadius:5,background:c,
            border: i===0 ? '1.5px solid var(--text)' : '1px solid rgba(255,255,255,0.08)'}}/>
        ))}
      </div>

      {/* catppuccin palette */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>CATPPUCCIN MOCHA</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5}}>
        {palette.map((c,i) => (
          <div key={i} style={{aspectRatio:'1',borderRadius:5,background:c,
            boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.1)'}}/>
        ))}
      </div>
    </PopoverShell>
  );
}
function PixelLoupe({ center }) {
  // 9x9 grid of "pixels" with the picked color at center
  const grid = [];
  for (let y=0; y<9; y++) for (let x=0; x<9; x++) {
    const d = Math.abs(x-4) + Math.abs(y-4);
    // procedural neighboring color variation
    const palette = ['#cba6f7','#b4befe','#89b4fa','#1e1e2e','#45475a','#a6e3a1','#cdd6f4'];
    grid.push(palette[(x*3+y*5+d)%palette.length]);
  }
  return (
    <div style={{
      width:110,height:110,borderRadius:'50%',overflow:'hidden',position:'relative',
      boxShadow:'inset 0 0 0 2px rgba(255,255,255,0.12), 0 4px 14px -4px rgba(0,0,0,0.5)',
      flexShrink:0,
    }}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(9,1fr)',
        width:'100%',height:'100%'}}>
        {grid.map((c,i) => {
          const x = i%9, y = Math.floor(i/9);
          const isCenter = x===4 && y===4;
          return <div key={i} style={{background: isCenter?center:c,
            outline:'0.5px solid rgba(17,17,27,0.3)'}}/>;
        })}
      </div>
      {/* crosshair on center pixel */}
      <div style={{position:'absolute',top:'50%',left:'50%',
        transform:'translate(-50%,-50%)',
        width:'11.11%',height:'11.11%',
        outline:'2px solid white',outlineOffset:'1px',
        boxShadow:'0 0 0 3px rgba(0,0,0,0.6)'}}/>
    </div>
  );
}
function FormatRow({ label, value }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'3px 6px',
      background:'var(--bg2)',borderRadius:5}}>
      <span className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.08em',
        minWidth:30}}>{label}</span>
      <span style={{fontFamily:'"JetBrains Mono", monospace',fontSize:11,
        fontWeight:600,flex:1,fontVariantNumeric:'tabular-nums'}}>{value}</span>
      <Icon name="clipboard" size={10} style={{color:'var(--dim)'}}/>
    </div>
  );
}

// ── AUDIO SOURCE switcher ──────────────────────────────────────────────────
function AudioSourcePopover() {
  const outputs = [
    {name:'AirPods Pro', sub:'bluetooth · AAC', icon:'airpods', v:65, active:true},
    {name:'WH-1000XM5', sub:'bluetooth · LDAC', icon:'headphones', v:80},
    {name:'Built-in Speakers', sub:'analog', icon:'speaker', v:50},
    {name:'LG Ultragear', sub:'HDMI · DP-1', icon:'display', v:30},
  ];
  const inputs = [
    {name:'AirPods Pro', icon:'airpods', active:true},
    {name:'Yeti Nano', icon:'mic'},
  ];
  const apps = [
    {name:'Spotify', sub:'Midnight City', v:72, c:'#1db954', icon:'play'},
    {name:'Firefox', sub:'YouTube — lo-fi mix', v:45, c:'#ff7139', icon:'play'},
    {name:'Discord', sub:'@riley speaking', v:90, c:'#5865f2', icon:'mic'},
    {name:'System', sub:'notifications', v:30, c:'var(--text)', icon:'bell', muted:true},
  ];
  return (
    <PopoverShell width={360}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Audio</span>
        <span className="dim" style={{fontSize:10}}>PipeWire · WirePlumber</span>
      </div>

      {/* outputs */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>OUTPUT</div>
      <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
        {outputs.map((o,i) => (
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,
            background: o.active ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'var(--bg2)',
            border: '1px solid ' + (o.active ? 'color-mix(in oklab, var(--accent) 32%, transparent)' : 'transparent'),
          }}>
            <Icon name={o.icon} size={14} style={{color: o.active?'var(--accent)':'var(--dim)'}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600}}>{o.name}</div>
              <div className="dim" style={{fontSize:9.5}}>{o.sub}</div>
            </div>
            {o.active && <span style={{fontSize:9,padding:'2px 6px',borderRadius:4,
              background:'color-mix(in oklab, var(--accent) 30%, transparent)',
              color:'var(--accent)',fontWeight:700,letterSpacing:'0.04em'}}>● ACTIVE</span>}
            <span style={{fontSize:10,color:'var(--dim)',fontVariantNumeric:'tabular-nums',
              minWidth:24,textAlign:'right'}}>{o.v}%</span>
          </div>
        ))}
      </div>

      {/* inputs (compact) */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>INPUT</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
        {inputs.map((i,k) => (
          <div key={k} style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,
            background: i.active ? 'color-mix(in oklab, var(--red) 16%, transparent)' : 'var(--bg2)',
            border: '1px solid ' + (i.active ? 'color-mix(in oklab, var(--red) 28%, transparent)' : 'transparent'),
          }}>
            <Icon name={i.icon} size={13} style={{color: i.active?'var(--red)':'var(--dim)'}}/>
            <span style={{fontSize:11,fontWeight:600,flex:1,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.name}</span>
            {i.active && <div style={{display:'inline-flex',alignItems:'center',gap:1.5,height:10}}>
              {[6,9,7].map((h,j) => <div key={j} className="ai-talk-bar"
                style={{width:2,height:h,background:'var(--red)',borderRadius:1}}/>)}
            </div>}
          </div>
        ))}
      </div>

      {/* per-app mixer */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>PER-APP MIXER</div>
      {apps.map((a,i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 4px'}}>
          <div style={{width:22,height:22,borderRadius:5,
            background: a.muted ? 'var(--bg2)' : `color-mix(in oklab, ${a.c} 24%, transparent)`,
            display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <Icon name={a.icon} size={11} style={{color: a.muted?'var(--dim)':a.c}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color: a.muted?'var(--dim)':'var(--text)'}}>{a.name}</div>
            <div className="dim" style={{fontSize:9.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.sub}</div>
          </div>
          <div style={{width:90,height:5,background:'var(--bg2)',borderRadius:3,position:'relative'}}>
            <div style={{position:'absolute',inset:0,width:`${a.v}%`,
              background: a.muted ? 'var(--dim)' : a.c, borderRadius:3, opacity: a.muted?0.4:1}}/>
          </div>
          <Icon name={a.muted?'mute':'volume'} size={11}
            style={{color: a.muted?'var(--red)':'var(--dim)'}}/>
        </div>
      ))}
    </PopoverShell>
  );
}

// ── KEYBOARD LAYOUT popover ────────────────────────────────────────────────
function KeyboardLayoutPopover() {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L',';'],
    ['Z','X','C','V','B','N','M',',','.','/'],
  ];
  const layouts = [
    {code:'us', name:'English (US)', active:true},
    {code:'us-intl', name:'English (US, intl AltGr)'},
    {code:'es', name:'Spanish'},
    {code:'de', name:'German'},
  ];
  return (
    <PopoverShell width={340}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Keyboard</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:5,
          padding:'2px 8px',borderRadius:5,
          background:'color-mix(in oklab, var(--accent) 18%, transparent)',
          color:'var(--accent)',fontSize:9,fontWeight:700,letterSpacing:'0.04em'}}>
          US · QWERTY
        </span>
      </div>

      {/* mini keyboard preview */}
      <div style={{
        padding:'10px',borderRadius:10,marginBottom:12,
        background:'rgba(17,17,27,0.6)',
        border:'1px solid color-mix(in oklab, var(--text) 6%, transparent)',
        display:'flex',flexDirection:'column',gap:3,
      }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{display:'flex',gap:3,paddingLeft: ri*8}}>
            {row.map((k,ki) => (
              <div key={ki} style={{
                flex:1,aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
                background:'var(--bg2)',borderRadius:3,fontSize:10,fontWeight:600,
                color:'var(--text)',fontFamily:'"JetBrains Mono", monospace',
                boxShadow:'inset 0 -1px 0 rgba(0,0,0,0.3)',
              }}>{k}</div>
            ))}
          </div>
        ))}
        <div style={{display:'flex',gap:3,marginTop:2}}>
          <KeyBig label="ctrl" w={1.4}/>
          <KeyBig label="super" w={1.4} highlight/>
          <KeyBig label="alt" w={1.2}/>
          <KeyBig label="" w={5} flat/>
          <KeyBig label="alt" w={1.2}/>
          <KeyBig label="fn" w={1.2}/>
          <KeyBig label="ctrl" w={1.4}/>
        </div>
      </div>

      {/* indicators */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12}}>
        <StatePill label="Caps" on={false} color="var(--peach)"/>
        <StatePill label="Num"  on={true}  color="var(--blue)"/>
        <StatePill label="Scroll" on={false} color="var(--green)"/>
      </div>

      {/* layouts list */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>LAYOUTS</div>
      {layouts.map((l,i) => (
        <div key={l.code} style={{
          display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:7,
          background: l.active ? 'color-mix(in oklab, var(--accent) 18%, transparent)' : 'transparent',
          border: '1px solid ' + (l.active ? 'color-mix(in oklab, var(--accent) 30%, transparent)' : 'transparent'),
          marginBottom:3,
        }}>
          <span style={{
            fontFamily:'"JetBrains Mono", monospace',fontSize:9,fontWeight:700,
            textTransform:'uppercase',letterSpacing:'0.08em',
            padding:'2px 5px',borderRadius:3,
            background: l.active ? 'var(--accent)' : 'var(--bg2)',
            color: l.active ? 'var(--bg)' : 'var(--dim)',
            minWidth:42,textAlign:'center',
          }}>{l.code}</span>
          <span style={{fontSize:11,fontWeight:500,flex:1}}>{l.name}</span>
          {l.active && <span style={{fontSize:9,color:'var(--accent)',fontWeight:700}}>● ACTIVE</span>}
        </div>
      ))}
      <div style={{display:'flex',gap:6,marginTop:8,fontSize:10}}>
        <span className="dim">switch: <kbd style={{padding:'1px 5px',borderRadius:3,
          background:'var(--bg2)',fontFamily:'"JetBrains Mono", monospace',fontSize:9}}>super+space</kbd></span>
      </div>
    </PopoverShell>
  );
}
function KeyBig({ label, w, highlight, flat }) {
  return <div style={{
    flex: w, aspectRatio: `${w} / 1`, display:'flex',alignItems:'center',justifyContent:'center',
    background: highlight ? 'color-mix(in oklab, var(--accent) 25%, transparent)' : 'var(--bg2)',
    borderRadius:3,fontSize:9,fontWeight:600,
    color: highlight ? 'var(--accent)' : 'var(--text)',
    opacity: flat ? 0.6 : 1,
    fontFamily:'"JetBrains Mono", monospace',
    boxShadow:'inset 0 -1px 0 rgba(0,0,0,0.3)',
  }}>{label}</div>;
}
function StatePill({ label, on, color }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:7,
      background: on ? `color-mix(in oklab, ${color} 18%, transparent)` : 'var(--bg2)',
      border: '1px solid ' + (on ? `color-mix(in oklab, ${color} 30%, transparent)` : 'transparent'),
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background: on?color:'var(--dim)',opacity:on?1:0.4}}/>
      <span style={{fontSize:10,fontWeight:600,color: on?'var(--text)':'var(--dim)'}}>{label}</span>
    </div>
  );
}

// ── IDLE INHIBITOR popover ─────────────────────────────────────────────────
function IdleInhibitorPopover() {
  return (
    <PopoverShell width={320}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13}}>Caffeine</span>
        <span className="dim" style={{fontSize:10}}>hypridle · systemd-inhibit</span>
      </div>

      {/* big state card */}
      <div style={{
        padding:'16px',borderRadius:12,marginBottom:12,
        background:'linear-gradient(135deg, color-mix(in oklab, var(--peach) 18%, transparent), color-mix(in oklab, var(--yellow) 10%, transparent))',
        border:'1px solid color-mix(in oklab, var(--peach) 28%, transparent)',
        display:'flex',alignItems:'center',gap:14,
      }}>
        <div style={{width:48,height:48,borderRadius:12,
          background:'var(--peach)',
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 24px -4px var(--peach)'}}>
          <Icon name="coffee" size={22} style={{color:'var(--bg)'}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--peach)'}}>Awake</div>
          <div className="dim" style={{fontSize:10.5,marginTop:2}}>
            screen + system inhibited · <span style={{color:'var(--text)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>42m 18s</span> left
          </div>
        </div>
        <div style={{width:42,height:24,borderRadius:12,background:'var(--peach)',
          padding:2,display:'flex',alignItems:'center',justifyContent:'flex-end',
          boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15)'}}>
          <div style={{width:20,height:20,borderRadius:'50%',background:'var(--bg)',
            boxShadow:'0 2px 4px rgba(0,0,0,0.3)'}}/>
        </div>
      </div>

      {/* quick duration */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>INHIBIT FOR</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:6}}>
        {['15m','30m','1h','2h','Until reboot','Indefinitely'].map((d,i) => (
          <div key={d} style={{
            padding:'7px 4px',borderRadius:7,textAlign:'center',
            background: i===2 ? 'color-mix(in oklab, var(--peach) 22%, transparent)' : 'var(--bg2)',
            border: '1px solid ' + (i===2 ? 'color-mix(in oklab, var(--peach) 35%, transparent)' : 'transparent'),
            fontSize:11,fontWeight:600,
            color: i===2 ? 'var(--peach)' : 'var(--text)',
            fontVariantNumeric:'tabular-nums',
          }}>{d}</div>
        ))}
      </div>

      {/* reason chips */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',margin:'10px 0 6px'}}>REASON</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
        {[
          {l:'Manual', a:true},
          {l:'Watching video'},
          {l:'Presentation'},
          {l:'Downloading'},
          {l:'Compiling'},
          {l:'Gaming'},
        ].map((r,i) => (
          <div key={i} style={{
            padding:'5px 10px',borderRadius:6,fontSize:10.5,fontWeight:600,
            background: r.a ? 'color-mix(in oklab, var(--accent) 22%, transparent)' : 'var(--bg2)',
            color: r.a ? 'var(--accent)' : 'var(--dim)',
          }}>{r.l}</div>
        ))}
      </div>

      {/* apps preventing sleep */}
      <div className="dim" style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',marginBottom:6}}>OTHER INHIBITORS</div>
      {[
        ['mpv', 'video playback · /watch?v=…', 'var(--blue)'],
        ['steam', 'downloading Hades II', 'var(--green)'],
      ].map(([app,sub,c],i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 4px',fontSize:11}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:c}}/>
          <span style={{fontWeight:600,minWidth:60}}>{app}</span>
          <span className="dim" style={{flex:1,fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</span>
        </div>
      ))}
    </PopoverShell>
  );
}

// ── NOTIFICATIONS — toast stack with snooze ────────────────────────────────
function NotificationsPopover() {
  const notes = [
    {
      app:'Discord', appColor:'#5865f2', glyph:'◉◉', ago:'now',
      title:'@riley in #cachy-bar',
      body:'pushed the new mocha palette — looks 🔥. mind reviewing tonight?',
      actions:[
        {label:'Reply', icon:'mic'},
        {label:'Open',  icon:'window'},
      ],
    },
    {
      app:'Spotify', appColor:'#1db954', glyph:'♫', ago:'2m',
      title:'Added to Liked Songs',
      body:'Strobe · Deadmau5 — 10:33',
    },
    {
      app:'System', appColor:'#f9e2af', glyph:'⚠', ago:'5m', urgent:true,
      title:'Battery low',
      body:"You're at 15%. Plug in or switch to Eco to extend runtime.",
      actions:[
        {label:'Switch to Eco', icon:'leaf', accent:true},
      ],
    },
  ];
  return (
    <div style={{
      width:360, display:'flex',flexDirection:'column',gap:10,
      color:'var(--text)',fontFamily:'"JetBrains Mono", monospace',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'0 4px 2px'}}>
        <span style={{fontWeight:700,fontSize:12}}>3 notifications</span>
        <div style={{display:'flex',gap:4}}>
          <BarPill icon="dnd" label="DND"/>
          <BarPill label="Clear all"/>
        </div>
      </div>
      {notes.map((n, i) => <Toast key={i} {...n}/>)}
    </div>
  );
}
function BarPill({ icon, label }) {
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,
      padding:'3px 8px',borderRadius:5,
      background:'var(--bg2)',fontSize:10,fontWeight:600,color:'var(--dim)'}}>
      {icon && <Icon name={icon} size={11}/>}{label}
    </span>
  );
}
function Toast({ app, appColor, glyph, ago, title, body, actions, urgent }) {
  return (
    <div style={{
      position:'relative',
      background:'rgba(30,30,46,0.92)',
      backdropFilter:'blur(36px) saturate(160%)',
      WebkitBackdropFilter:'blur(36px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
      borderLeft: urgent ? `3px solid ${appColor}` : '1px solid color-mix(in oklab, var(--text) 8%, transparent)',
      borderRadius:12,
      boxShadow:'0 12px 32px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
      padding:'12px 12px 10px',
      display:'flex',gap:11,
    }}>
      {/* app icon tile */}
      <div style={{
        width:34,height:34,borderRadius:8,flexShrink:0,
        background:`linear-gradient(135deg, ${appColor}, color-mix(in oklab, ${appColor} 60%, #1e1e2e))`,
        display:'inline-flex',alignItems:'center',justifyContent:'center',
        color:'rgba(255,255,255,0.95)',fontSize:15,fontWeight:700,
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 8px -3px rgba(0,0,0,0.4)',
      }}>{glyph}</div>

      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}>
        <div style={{display:'flex',alignItems:'baseline',gap:6}}>
          <span style={{fontSize:9,fontWeight:700,color:appColor,
            letterSpacing:'0.08em',textTransform:'uppercase'}}>{app}</span>
          <span className="dim" style={{fontSize:9}}>· {ago}</span>
          <div style={{flex:1}}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{title}</div>
        <div className="dim" style={{fontSize:11,lineHeight:1.4,textWrap:'pretty'}}>{body}</div>

        {/* action row */}
        <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
          {actions && actions.map((a,i) => (
            <button key={i} style={{
              all:'unset',cursor:'pointer',
              display:'inline-flex',alignItems:'center',gap:5,
              padding:'5px 9px',borderRadius:6,
              background: a.accent
                ? `color-mix(in oklab, ${appColor} 22%, transparent)`
                : 'var(--bg2)',
              border: '1px solid ' + (a.accent
                ? `color-mix(in oklab, ${appColor} 36%, transparent)`
                : 'transparent'),
              fontSize:10.5,fontWeight:600,
              color: a.accent ? appColor : 'var(--text)',
            }}>
              {a.icon && <Icon name={a.icon} size={10}/>}{a.label}
            </button>
          ))}
          {/* snooze */}
          <SnoozeBtn/>
        </div>
      </div>

      {/* dismiss */}
      <button style={{
        all:'unset',cursor:'pointer',position:'absolute',top:6,right:6,
        width:18,height:18,borderRadius:5,
        display:'inline-flex',alignItems:'center',justifyContent:'center',
        color:'var(--dim)',fontSize:13,lineHeight:1,
      }}>×</button>
    </div>
  );
}
function SnoozeBtn() {
  return (
    <div style={{display:'inline-flex',alignItems:'stretch',
      background:'var(--bg2)',borderRadius:6,overflow:'hidden'}}>
      <button style={{
        all:'unset',cursor:'pointer',
        display:'inline-flex',alignItems:'center',gap:5,
        padding:'5px 9px',
        fontSize:10.5,fontWeight:600,color:'var(--dim)',
      }}>
        <span style={{fontSize:12,marginTop:-1}}>z</span>
        <span>Snooze</span>
      </button>
      <div style={{width:1,background:'rgba(255,255,255,0.06)'}}/>
      {['5m','30m','1h'].map((d,i) => (
        <button key={d} style={{
          all:'unset',cursor:'pointer',padding:'5px 7px',
          fontSize:10,fontWeight:600,color:'var(--dim)',
          fontVariantNumeric:'tabular-nums',
          borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
        }}>{d}</button>
      ))}
    </div>
  );
}

// ── CONFIRM banner — AI / system asking for permission ─────────────────────
function ConfirmBanner() {
  return (
    <div style={{
      width:440, position:'relative',
      background:'rgba(30,30,46,0.95)',
      backdropFilter:'blur(40px) saturate(160%)',
      WebkitBackdropFilter:'blur(40px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--mauve) 28%, transparent)',
      borderRadius:14,
      boxShadow:'0 20px 60px -16px rgba(0,0,0,0.7), 0 0 50px -20px color-mix(in oklab, var(--mauve) 40%, transparent)',
      color:'var(--text)',
      fontFamily:'"JetBrains Mono", monospace',
      overflow:'hidden',
    }}>
      {/* halo */}
      <div style={{height:2,background:'linear-gradient(90deg, var(--mauve), var(--blue), var(--teal))'}}/>

      <div style={{padding:'14px 16px 4px',display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{
          width:32,height:32,borderRadius:9,flexShrink:0,
          background:'linear-gradient(135deg, var(--mauve), var(--blue))',
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 18px -4px var(--mauve)',
        }}>
          <Icon name="ai" size={15} style={{color:'var(--bg)'}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.08em',
              background:'linear-gradient(90deg,var(--mauve),var(--blue))',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CACHY::AI</span>
            <span className="dim" style={{fontSize:9}}>· needs permission · now</span>
          </div>
          <div style={{fontSize:13,fontWeight:700,marginTop:3,lineHeight:1.3}}>
            Run system update?
          </div>
          <div className="dim" style={{fontSize:11,lineHeight:1.5,marginTop:3,textWrap:'pretty'}}>
            You asked me to "update everything." This will sync the package database
            and upgrade 23 packages, including the kernel.
          </div>

          {/* command preview */}
          <pre style={{
            margin:'8px 0 0',padding:'8px 10px',
            background:'rgba(17,17,27,0.7)',borderRadius:6,
            fontSize:10.5,color:'var(--green)',
            border:'1px solid color-mix(in oklab, var(--green) 18%, transparent)',
            fontFamily:'"JetBrains Mono", monospace',overflow:'auto',
          }}>
{`$ paru -Syu --noconfirm  # 23 pkgs, ~480 MB`}
          </pre>

          {/* meta strip */}
          <div style={{display:'flex',gap:10,marginTop:8,fontSize:10}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,color:'var(--peach)'}}>
              <Icon name="bolt" size={10}/> kernel update
            </span>
            <span className="dim">· requires sudo</span>
            <span className="dim">· ~3 min</span>
          </div>
        </div>
      </div>

      {/* dismiss × */}
      <button style={{
        all:'unset',cursor:'pointer',position:'absolute',top:10,right:10,
        width:20,height:20,borderRadius:5,
        display:'inline-flex',alignItems:'center',justifyContent:'center',
        color:'var(--dim)',fontSize:14,lineHeight:1,
      }}>×</button>

      {/* footer with actions */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,
        padding:'12px 16px 14px',
        borderTop:'1px solid color-mix(in oklab, var(--text) 5%, transparent)',
        marginTop:8,
      }}>
        {/* trust toggle */}
        <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:10,color:'var(--dim)',cursor:'pointer'}}>
          <span style={{width:13,height:13,borderRadius:3,
            background:'var(--bg2)',border:'1px solid color-mix(in oklab, var(--text) 12%, transparent)',
            display:'inline-flex',alignItems:'center',justifyContent:'center'}}/>
          allow for this session
        </label>
        <div style={{flex:1}}/>
        <button style={{
          all:'unset',cursor:'pointer',
          padding:'7px 14px',borderRadius:7,
          background:'var(--bg2)',
          fontSize:11,fontWeight:600,color:'var(--text)',
        }}>Cancel <kbd style={{marginLeft:4,padding:'1px 4px',borderRadius:3,
          background:'rgba(0,0,0,0.3)',fontSize:9}}>esc</kbd></button>
        <button style={{
          all:'unset',cursor:'pointer',
          padding:'7px 16px',borderRadius:7,
          background:'linear-gradient(135deg, var(--mauve), var(--blue))',
          fontSize:11,fontWeight:700,color:'var(--bg)',
          boxShadow:'0 4px 16px -4px color-mix(in oklab, var(--mauve) 50%, transparent)',
        }}>Accept <kbd style={{marginLeft:4,padding:'1px 4px',borderRadius:3,
          background:'rgba(17,17,27,0.3)',fontSize:9,color:'rgba(17,17,27,0.85)'}}>↵</kbd></button>
      </div>
    </div>
  );
}

Object.assign(window, {
  AIOverlay, NowPlayingPanel, ControlCenter, CalendarPanel, HyprMapPanel, PopoverShell,
  AppLauncher, AppTile, CameraPopover, BatteryDevicesPopover, BatteryRing,
  ScreenshotPopover, ColorPickerPopover, AudioSourcePopover,
  KeyboardLayoutPopover, IdleInhibitorPopover,
  NotificationsPopover, Toast, ConfirmBanner,
});
