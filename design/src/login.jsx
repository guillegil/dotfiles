// SDDM-style login screens. Three variations matching the Cachy Bar
// aesthetic: Aurora (glass card), Atlas (split modules), Terminal (brutalist).
//
// Sits in a 16:9 frame; wallpaper full bleed, modules float on top.

function LoginFrame({ children, wallpaper = 'mocha-a', accent = MOCHA.mauve }) {
  const vars = {
    '--bg':       'rgba(30,30,46,0.78)',
    '--bg2':      'rgba(69,71,90,0.55)',
    '--bg3':      'rgba(88,91,112,0.70)',
    '--mantle':   'rgba(24,24,37,0.88)',
    '--text':     MOCHA.text, '--dim': MOCHA.subtext0,
    '--accent':   accent,
    '--mauve':    MOCHA.mauve, '--blue': MOCHA.blue, '--peach': MOCHA.peach,
    '--green':    MOCHA.green, '--red':  MOCHA.red,  '--yellow': MOCHA.yellow,
    '--pink':     MOCHA.pink,  '--sky':  MOCHA.sky,  '--teal':   MOCHA.teal,
    '--lavender': MOCHA.lavender, '--sapphire': MOCHA.sapphire, '--maroon': MOCHA.maroon,
    '--radius':   '14px',
    color: MOCHA.text,
    fontFamily: '"JetBrains Mono", monospace',
  };
  return (
    <div style={{...vars, position:'relative', width:'100%', height:'100%', overflow:'hidden'}}>
      <Wallpaper variant={wallpaper} style={{position:'absolute',inset:0}}/>
      {/* darken overlay for legibility */}
      <div style={{position:'absolute',inset:0,
        background:'radial-gradient(ellipse at center, rgba(17,17,27,0.0) 0%, rgba(17,17,27,0.45) 100%)'}}/>
      {children}
    </div>
  );
}

// ─── 1. AURORA LOGIN — centered glass card + bottom status bar ─────────────
function LoginAurora() {
  return (
    <LoginFrame wallpaper="mocha-d" accent={MOCHA.mauve}>
      {/* top right: tiny status row */}
      <div style={{position:'absolute',top:24,right:24,display:'flex',gap:6}}>
        <FloatChip><Icon name="wifi" size={13} style={{color:'var(--sky)'}}/><span>mocha-5G</span></FloatChip>
        <FloatChip><Icon name="battery" size={13} style={{color:'var(--green)'}}/><span>78%</span></FloatChip>
      </div>

      {/* big clock anchored top-left */}
      <div style={{position:'absolute',top:48,left:64,display:'flex',flexDirection:'column',
        textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>
        <div style={{fontSize:88,fontWeight:700,lineHeight:0.95,fontVariantNumeric:'tabular-nums',
          letterSpacing:'-0.02em',background:'linear-gradient(180deg, #cdd6f4, #bac2de)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          14:32
        </div>
        <div style={{fontSize:18,fontWeight:500,marginTop:6,color:'var(--dim)'}}>
          Monday, May 25
        </div>
      </div>

      {/* centered login card */}
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-44%)',
        width:420}}>
        <div style={{
          background:'var(--mantle)',
          backdropFilter:'blur(40px) saturate(160%)',WebkitBackdropFilter:'blur(40px) saturate(160%)',
          border:'1px solid color-mix(in oklab, var(--text) 10%, transparent)',
          borderRadius:18,padding:'32px 28px 24px',
          boxShadow:'0 30px 80px -20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* avatar */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,marginBottom:22}}>
            <div style={{
              width:72,height:72,borderRadius:'50%',
              background:'linear-gradient(135deg, var(--mauve), var(--blue))',
              display:'inline-flex',alignItems:'center',justifyContent:'center',
              fontSize:30,fontWeight:700,color:'rgba(17,17,27,0.85)',
              boxShadow:'0 8px 28px -6px color-mix(in oklab, var(--mauve) 60%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>S</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:17,fontWeight:700}}>sam</div>
              <div className="dim" style={{fontSize:11,marginTop:2,opacity:0.7}}>sam@cachy-ws</div>
            </div>
          </div>

          {/* password input */}
          <div style={{
            display:'flex',alignItems:'center',gap:10,
            padding:'12px 14px',borderRadius:10,
            background:'rgba(17,17,27,0.5)',
            border:'1px solid color-mix(in oklab, var(--accent) 28%, transparent)',
            boxShadow:'0 0 0 4px color-mix(in oklab, var(--accent) 12%, transparent)',
            marginBottom:14,
          }}>
            <Icon name="shield" size={14} style={{color:'var(--dim)'}}/>
            <span style={{flex:1,fontSize:14,letterSpacing:'0.35em',
              fontFamily:'"JetBrains Mono", monospace'}}>•••••••</span>
            <span style={{display:'inline-block',width:2,height:16,background:'var(--accent)',
              animation:'blink 1s steps(2) infinite'}}/>
            <Icon name="user" size={13} style={{color:'var(--dim)'}}/>
          </div>

          {/* unlock button */}
          <button style={{
            all:'unset',cursor:'pointer',width:'100%',
            padding:'12px',borderRadius:10,
            background:'linear-gradient(135deg, var(--mauve), var(--blue))',
            color:'rgba(17,17,27,0.9)',
            fontSize:13,fontWeight:700,textAlign:'center',letterSpacing:'0.04em',
            boxShadow:'0 8px 24px -6px color-mix(in oklab, var(--mauve) 60%, transparent)',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            Unlock <span style={{padding:'2px 6px',borderRadius:4,
              background:'rgba(17,17,27,0.25)',fontSize:10}}>↵</span>
          </button>

          {/* sub link row */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:14,fontSize:10.5}}>
            <span className="dim" style={{cursor:'pointer'}}>← Switch user</span>
            <span className="dim" style={{cursor:'pointer'}}>Forgot password?</span>
          </div>
        </div>

        {/* session pill below card */}
        <div style={{display:'flex',justifyContent:'center',marginTop:14}}>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:8,
            padding:'6px 12px',borderRadius:8,
            background:'var(--bg2)',
            backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
            border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
            fontSize:11,fontWeight:600,
          }}>
            <Icon name="hypr" size={13} style={{color:'var(--teal)'}}/>
            <span>Hyprland</span>
            <span className="dim">· Wayland</span>
            <Icon name="chevron" size={10} style={{color:'var(--dim)',transform:'rotate(90deg)'}}/>
          </div>
        </div>
      </div>

      {/* bottom status bar */}
      <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',
        display:'flex',gap:6}}>
        <FloatChip><Icon name="keyboard" size={13} style={{color:'var(--dim)'}}/>
          <span style={{fontWeight:700,letterSpacing:'0.06em'}}>US</span></FloatChip>
        <FloatChip><Icon name="volume" size={13} style={{color:'var(--text)'}}/>
          <span>65%</span></FloatChip>
        <FloatChip><Icon name="brightness" size={13} style={{color:'var(--yellow)'}}/>
          <span>80%</span></FloatChip>
        <FloatChip warn><Icon name="power" size={13} style={{color:'var(--red)'}}/></FloatChip>
        <FloatChip><Icon name="spark" size={13} style={{color:'var(--peach)'}}/></FloatChip>
        <FloatChip><Icon name="user" size={13} style={{color:'var(--blue)'}}/></FloatChip>
      </div>

      {/* tiny hostname watermark bottom-left */}
      <div style={{position:'absolute',bottom:28,left:32,
        fontSize:10,color:'var(--dim)',opacity:0.5,
        fontFamily:'"JetBrains Mono", monospace',letterSpacing:'0.04em'}}>
        cachy-ws · CachyOS 6.9.3-2-cachyos · Hyprland 0.42.0
      </div>
    </LoginFrame>
  );
}
function FloatChip({ children, warn }) {
  return (
    <div style={{
      display:'inline-flex',alignItems:'center',gap:6,
      padding:'6px 10px',borderRadius:8,
      background: warn ? 'color-mix(in oklab, var(--red) 16%, rgba(30,30,46,0.7))' : 'rgba(30,30,46,0.7)',
      backdropFilter:'blur(24px) saturate(160%)',WebkitBackdropFilter:'blur(24px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--text) 7%, transparent)',
      fontSize:11,fontWeight:500,
      fontFamily:'"JetBrains Mono", monospace',
      fontVariantNumeric:'tabular-nums',
    }}>{children}</div>
  );
}

// ─── 2. ATLAS LOGIN — split floating modules ───────────────────────────────
function LoginAtlas() {
  return (
    <LoginFrame wallpaper="mocha-f" accent={MOCHA.teal}>
      {/* top-left: greeting / system */}
      <div style={{position:'absolute',top:36,left:36,maxWidth:340}}>
        <FloatPanel>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <Icon name="hypr" size={16} style={{color:'var(--teal)'}}/>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',color:'var(--teal)'}}>SYSTEM</span>
          </div>
          <Row label="host" value="cachy-ws"/>
          <Row label="kernel" value="6.9.3-2-cachyos"/>
          <Row label="uptime" value="4d 12h 38m"/>
          <Row label="updates" value="23 pending" color="var(--sky)"/>
          <Row label="last login" value="May 24 · 23:14"/>
        </FloatPanel>
      </div>

      {/* top-right: clock + weather + calendar */}
      <div style={{position:'absolute',top:36,right:36,display:'flex',flexDirection:'column',gap:10,alignItems:'flex-end'}}>
        <FloatPanel>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
            <div style={{fontSize:56,fontWeight:700,lineHeight:1,fontVariantNumeric:'tabular-nums',
              letterSpacing:'-0.02em',color:'var(--text)'}}>14:32</div>
            <div className="dim" style={{fontSize:12,marginTop:4}}>Monday · May 25, 2026</div>
          </div>
        </FloatPanel>
        <FloatPanel>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Icon name="cloud" size={28} style={{color:'var(--sapphire)'}}/>
            <div>
              <div style={{fontSize:22,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>19°</div>
              <div className="dim" style={{fontSize:10,marginTop:1}}>cloudy · Berlin</div>
            </div>
            <div style={{width:1,height:32,background:'var(--text)',opacity:0.1,margin:'0 4px'}}/>
            <div>
              <div style={{fontSize:11,fontWeight:600}}>3:30p</div>
              <div className="dim" style={{fontSize:10,marginTop:1}}>Design review</div>
            </div>
          </div>
        </FloatPanel>
      </div>

      {/* center: compact login */}
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-40%)'}}>
        <FloatPanel pad={20}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
            <div style={{
              width:44,height:44,borderRadius:'50%',
              background:'linear-gradient(135deg, var(--teal), var(--blue))',
              display:'inline-flex',alignItems:'center',justifyContent:'center',
              fontSize:18,fontWeight:700,color:'rgba(17,17,27,0.85)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>S</div>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>Welcome back, sam</div>
              <div className="dim" style={{fontSize:10.5,marginTop:1}}>enter password to continue</div>
            </div>
          </div>
          <div style={{
            display:'flex',alignItems:'center',gap:10,width:340,
            padding:'11px 14px',borderRadius:9,
            background:'rgba(17,17,27,0.55)',
            border:'1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
            boxShadow:'0 0 0 4px color-mix(in oklab, var(--accent) 12%, transparent)',
          }}>
            <span style={{color:'var(--accent)',fontWeight:700}}>❯</span>
            <span style={{flex:1,fontSize:13,letterSpacing:'0.32em'}}>•••••••</span>
            <span style={{display:'inline-block',width:2,height:14,background:'var(--accent)',
              animation:'blink 1s steps(2) infinite'}}/>
            <kbd style={{fontSize:9,padding:'2px 6px',borderRadius:3,background:'var(--bg2)',
              fontFamily:'"JetBrains Mono", monospace',color:'var(--dim)'}}>↵</kbd>
          </div>
        </FloatPanel>
      </div>

      {/* bottom-left: power */}
      <div style={{position:'absolute',bottom:36,left:36}}>
        <FloatPanel>
          <div style={{display:'flex',gap:4}}>
            <PowerIconBtn icon="power" color="var(--red)" label="Off"/>
            <PowerIconBtn icon="spark" color="var(--peach)" label="Reboot"/>
            <PowerIconBtn icon="moon"  color="var(--yellow)" label="Sleep"/>
            <PowerIconBtn icon="user"  color="var(--blue)" label="Switch"/>
          </div>
        </FloatPanel>
      </div>

      {/* bottom-right: session + keyboard */}
      <div style={{position:'absolute',bottom:36,right:36,display:'flex',gap:10}}>
        <FloatPanel>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600}}>
            <Icon name="keyboard" size={13} style={{color:'var(--dim)'}}/>
            <span>US</span>
            <span className="dim">qwerty</span>
          </div>
        </FloatPanel>
        <FloatPanel>
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,fontWeight:600}}>
            <Icon name="hypr" size={13} style={{color:'var(--teal)'}}/>
            <span>Hyprland</span>
            <span className="dim">· Wayland</span>
            <Icon name="chevron" size={10} style={{color:'var(--dim)',transform:'rotate(90deg)'}}/>
          </div>
        </FloatPanel>
      </div>
    </LoginFrame>
  );
}

function FloatPanel({ children, pad = 14 }) {
  return (
    <div style={{
      background:'var(--mantle)',
      backdropFilter:'blur(28px) saturate(160%)',WebkitBackdropFilter:'blur(28px) saturate(160%)',
      border:'1px solid color-mix(in oklab, var(--text) 8%, transparent)',
      borderRadius:14,padding:pad,
      boxShadow:'0 20px 60px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>{children}</div>
  );
}
function Row({ label, value, color }) {
  return (
    <div style={{display:'flex',padding:'3px 0',gap:12,fontSize:11.5,fontFamily:'"JetBrains Mono", monospace'}}>
      <span className="dim" style={{minWidth:78,letterSpacing:'0.02em'}}>{label}</span>
      <span style={{color:color||'var(--text)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{value}</span>
    </div>
  );
}
function PowerIconBtn({ icon, color, label }) {
  return (
    <div title={label} style={{
      width:34,height:34,borderRadius:8,
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      background:'transparent',
      transition:'background .12s',cursor:'pointer',
    }}
    onMouseEnter={e=>e.currentTarget.style.background=`color-mix(in oklab, ${color} 18%, transparent)`}
    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <Icon name={icon} size={15} style={{color}}/>
    </div>
  );
}

// ─── 3. TERMINAL LOGIN — brutalist TTY-style ───────────────────────────────
function LoginTerminal() {
  return (
    <LoginFrame wallpaper="mocha-e" accent={MOCHA.green}>
      <div style={{position:'absolute',inset:0,
        background:'rgba(17,17,27,0.55)'}}/>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        width:640,
        background:'rgba(17,17,27,0.92)',
        border:'1px solid color-mix(in oklab, var(--green) 22%, transparent)',
        borderRadius:6,
        boxShadow:'0 0 0 1px rgba(166,227,161,0.08), 0 0 80px -20px rgba(166,227,161,0.25), 0 20px 60px -16px rgba(0,0,0,0.7)',
        overflow:'hidden',
      }}>
        {/* title bar */}
        <div style={{display:'flex',alignItems:'center',padding:'8px 12px',
          background:'rgba(30,30,46,0.6)',
          borderBottom:'1px solid color-mix(in oklab, var(--green) 12%, transparent)',
          gap:8}}>
          <span style={{width:10,height:10,borderRadius:'50%',background:'#585b70'}}/>
          <span style={{width:10,height:10,borderRadius:'50%',background:'#585b70'}}/>
          <span style={{width:10,height:10,borderRadius:'50%',background:'#585b70'}}/>
          <span style={{marginLeft:8,fontSize:10,color:'var(--dim)'}}>tty1 · /dev/tty1 · 80×24</span>
          <div style={{flex:1}}/>
          <span style={{fontSize:10,color:'var(--green)',letterSpacing:'0.06em'}}>● LOCKED</span>
        </div>
        {/* body */}
        <div style={{padding:'22px 28px 26px',fontFamily:'"JetBrains Mono", monospace',
          fontSize:13,lineHeight:1.6,color:'var(--text)'}}>
          {/* arch ASCII */}
          <pre style={{margin:0,color:'var(--sky)',fontSize:11,lineHeight:1.15,opacity:0.9}}>
{`                   -\`
                  .o+\`
                 \`ooo/
                \`+oooo:
               \`+oooooo:
               -+oooooo+:
             \`/:-:++oooo+:
            \`/++++/+++++++:
           \`/++++++++++++++:
          \`/+++ooooooooooooo/\`
         ./ooosssso++osssssso+\`
        .oossssso-\`\`\`\`/ossssss+\`
       -osssssso.      :ssssssso.
      :osssssss/        osssso+++.
     /ossssssss/        +ssssooo/-
   \`/ossssso+/:-        -:/+osssso+-
  \`+sso+:-\`                 \`.-/+oso:
 \`++:.                           \`-/+/
 .\`                                 \`/`}
          </pre>
          <div style={{marginTop:14,color:'var(--dim)',fontSize:11}}>
            CachyOS 6.9.3-2-cachyos · tty1
          </div>
          <div style={{color:'var(--dim)',fontSize:11,marginBottom:14}}>
            cachy-ws login: <span style={{color:'var(--text)',fontWeight:600}}>sam</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{color:'var(--green)'}}>Password:</span>
            <span style={{flex:1,letterSpacing:'0.3em',fontWeight:600,color:'var(--text)'}}>•••••••</span>
            <span style={{display:'inline-block',width:8,height:14,background:'var(--green)',
              animation:'blink 1s steps(2) infinite'}}/>
          </div>
          {/* status line */}
          <div style={{
            marginTop:22,paddingTop:12,
            borderTop:'1px dashed color-mix(in oklab, var(--green) 18%, transparent)',
            display:'flex',justifyContent:'space-between',
            fontSize:10.5,color:'var(--dim)'}}>
            <span><span style={{color:'var(--peach)'}}>F1</span> session: <span style={{color:'var(--text)'}}>hyprland</span></span>
            <span><span style={{color:'var(--peach)'}}>F2</span> kb: <span style={{color:'var(--text)'}}>us</span></span>
            <span><span style={{color:'var(--peach)'}}>F12</span> power</span>
            <span>14:32 · 78%🔋</span>
          </div>
        </div>
        {/* scanlines */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(0deg, rgba(166,227,161,0.025) 0 1px, transparent 1px 3px)',
          mixBlendMode:'overlay'}}/>
      </div>
    </LoginFrame>
  );
}

Object.assign(window, { LoginAurora, LoginAtlas, LoginTerminal, LoginFrame });
