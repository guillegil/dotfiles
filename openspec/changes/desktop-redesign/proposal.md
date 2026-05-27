---
source: engram
topic_key: sdd/desktop-redesign/proposal
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# Proposal: desktop-redesign — Cachy Bar implementation on AGS

## Intent

Translate the `design/` package (Cachy Bar — Catppuccin Mocha glass UI) into a working AGS v2 / GTK4 desktop shell, replacing the current placeholder `Bar.tsx` / `Launcher.tsx`. Goal: a daily-usable, themed, multi-widget Hyprland status bar with a redesigned launcher and a token-driven SCSS system. Personal single-user setup — optimize for shipping iterative slices over exhaustive widget coverage.

## Scope

### In Scope (Phase 1 — this change)
- SCSS token system: Catppuccin Mocha palette, radii, spacing, motion, typography vars compiled with `dart-sass` (precomputed `color.mix()`).
- `Bar.tsx` rewrite to **Aurora** layout (3 floating BarShell modules: left/center/right).
- Hyprland Lua additions: `hl.layerrule("blur", "ags")` + `hl.layerrule("ignorezero", "ags")` for compositor blur.
- Reduced-motion gate: read `gtk-enable-animations`, toggle `.motion-off` root class.
- Phase 1 widget cut (8): Workspaces, ActiveWindow, Launcher pill, Clock+Calendar popover, Volume, Battery, Network, Mic (restyled).
- Typography: **JetBrains Mono** for bar chips/numerals + **IBM Plex Sans** for popover prose (hybrid; see Approach).
- Iconography: **Material Symbols Rounded** via Nerd Font (font-rendered, no SVG plumbing).
- A11y baseline: 44px hit targets, `:focus-visible` rings, `accessible-name` on every interactive widget, contrast ≥4.5:1.
- Launcher.tsx kept functionally as-is, restyled to tokens (no calculator/grid yet).

### Out of Scope (deferred)
- Plugins phase (AILauncher, Pomodoro, GitHub, Updates, HyprMap, NowPlaying-MPRIS, CPU/RAM/Temp chips, SystemTray, PowerMenu).
- Full Launcher redesign (calculator, 6-col grid, AI footer).
- All popovers except Calendar.
- Notifications panel rewrite — `swaync` stays as-is for Phase 1; AGS adds only a bell widget that toggles swaync.
- Tweaks panel (runtime accent/radius sliders).
- SDDM login screen theme — separate change.
- Independent multi-monitor state — Phase 1 mirrors bar across monitors.

## Capabilities

### New Capabilities
- `theme-tokens`: Catppuccin Mocha token system in SCSS, dart-sass build pipeline, motion gate.
- `bar-shell`: Aurora 3-module floating bar surface, glass styling, Hyprland blur wiring.
- `core-widgets`: 8 widgets listed above, each with state binding + a11y attrs.
- `clock-calendar-popover`: First popover surface (reference implementation for future popovers).
- `notifications-bell`: Trigger widget that opens swaync via `swaync-client -t`.

### Modified Capabilities
- None (no prior specs exist for the current placeholder widgets).

## Approach

**Strategy**: phased delivery (Approach B from explore). This proposal covers Phase 1 only; Phases 2–3 sketched in Delivery Plan.

**Three systematic GTK4 workarounds, applied consistently:**
1. **Blur** → Hyprland `layerrule` (compositor-level), NOT CSS `backdrop-filter`. Background alpha (`rgba(30,30,46,0.82)`) approximates the saturation overlay.
2. **`color-mix()`** → precomputed at build time via `@use sass:color; color.mix(...)`. No `color-mix()` strings reach GTK4's CSS parser.
3. **Audio viz / `transform: scaleY`** → state-driven `min-height` animation via GLib tick callback (deferred to Phase 2 — no viz widgets in Phase 1 cut).

**Typography decision — Hybrid (Plex Sans + JetBrains Mono)**: Mono everywhere hurts readability of popover prose (calendar dates, notification body, future settings). Hybrid keeps the "terminal identity" on the bar (chips, numerals, data) while making longer text scannable. Cost if wrong: one extra font in the install, trivial revert.

**Motion budget**: max 1–2 simultaneous animations per view. Easing `cubic-bezier(0.16, 1, 0.3, 1)`. Durations 150–200ms micro, ≤300ms complex. All animations wrapped in `.motion-on` class toggled by `gtk-enable-animations`.

**Glass composition target** (per UX guideline): bg-alpha 0.15–0.30, border `1px rgba(255,255,255,0.08)`, shadow `0 8px 32px rgba(0,0,0,0.25)`, radius 14px outer / 10px inner / 6px pill.

**Icon library — Material Symbols Rounded (font)**: simplest GTK4 path (Pango renders font glyphs natively, no SVG file management). Reduces Phase 1 surface area significantly. Cost if wrong: swap font-family + glyph refs in Phase 2 — mechanical.

**Notifications strategy — keep swaync, add bell trigger only**: avoids rewriting notification daemon logic in Phase 1. Bell widget calls `swaync-client -t -sw` on click. Migrating to AGS notifd is a Phase 3 candidate when value justifies effort.

**Multi-monitor — mirror in Phase 1**: each `gdkmonitor` gets the same bar. Independent per-monitor state (workspaces filtered by monitor, etc.) deferred — current Bar.tsx already iterates monitors, just mirror state.

**Hyprland version**: needs verification before apply (CachyOS ships rolling Hyprland). Check via `pacman -Qi hyprland`; layerrule + ignorezero exist since Hyprland 0.30+ (very old), so risk is low but must verify in sdd-design or sdd-apply preflight.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `config/ags/style.scss` | Modified | Becomes thin entry; imports new `style/` partials |
| `config/ags/style/` | New | `_tokens.scss`, `_motion.scss`, `_typography.scss`, `_glass.scss`, widget partials |
| `config/ags/widget/Bar.tsx` | Modified | Rewrite to Aurora 3-module layout |
| `config/ags/widget/BarShell.tsx` | New | Floating glass shell wrapper |
| `config/ags/widget/Workspaces.tsx` | New | Hyprland workspaces (dot/pill morph via `min-width` transition) |
| `config/ags/widget/ActiveWindow.tsx` | New | Reactive active window title |
| `config/ags/widget/LauncherPill.tsx` | New | Triggers existing Launcher |
| `config/ags/widget/Clock.tsx` | New | Time + Calendar popover (replaces inline clock) |
| `config/ags/widget/Volume.tsx` | New | WirePlumber binding |
| `config/ags/widget/Battery.tsx` | New | upower / AstalBattery binding |
| `config/ags/widget/Network.tsx` | New | AstalNetwork binding |
| `config/ags/widget/NotificationsBell.tsx` | New | Toggles swaync panel |
| `config/ags/widget/Mic.tsx` | Modified | Restyle to tokens; keep logic |
| `config/ags/widget/Launcher.tsx` | Modified | Restyle to tokens; defer feature redesign |
| `config/ags/lib/motion.ts` | New | Reduced-motion gate helper |
| `config/ags/lib/a11y.ts` | New | A11y attr helpers |
| `config/hypr/hyprland.lua` | Modified | Add `hl.layerrule("blur", "ags")` + `hl.layerrule("ignorezero", "ags")` |
| `packages/aur.txt` or `packages/pacman.txt` | Modified | Add `ttf-jetbrains-mono-nerd`, `ttf-ibm-plex`, `ttf-material-symbols-variable-git` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hyprland layerrule blur fails on current Hyprland version | Low | Verify version in design/apply preflight; layerrule has existed since 0.30 |
| GTK4 CssProvider rejects a token (e.g., letter-spacing em) | Medium | SCSS converts em→px at build; smoke-test compiled CSS via `gjs`/AGS reload |
| Reduced-motion class not propagating | Low | Toggle on `:root` selector; verified once in Phase 1, reused across widgets |
| Material Symbols glyphs don't render until session restart | Low | Document `fc-cache -f` post-install in install.sh |
| Multi-monitor mirror feels wrong on dual-monitor laptops | Medium | Accept Phase 1 cost; revisit in Phase 2 if user reports |
| swaync visual mismatch with AGS theme | High | Accepted Phase 1 cost; full notif rewrite is Phase 3 |
| PR exceeds 400-line budget | High | Chained PR plan below (3 slices) |

## Rollback Plan

- All changes are confined to `config/ags/` + 2 lines in `config/hypr/hyprland.lua` + `packages/*.txt` additions.
- Rollback: `git revert` the change commits; `install.sh` re-symlinks original tree.
- New font packages are additive — leaving them installed does no harm.
- Hyprland layerrules are no-ops if no matching namespace exists, but should still be reverted to keep config clean.
- AGS auto-reloads on file change; rollback is observable in <2 seconds.

## Dependencies

- `dart-sass` (already in AGS toolchain via `ags` package).
- Fonts: `ttf-jetbrains-mono-nerd`, `ttf-ibm-plex`, `ttf-material-symbols-variable-git` (AUR).
- AGS libraries: `libastal-battery`, `libastal-network`, `libastal-wireplumber`, `libastal-hyprland`, `libastal-mpris` (Phase 2). Verify against `packages/aur.txt`.
- Hyprland ≥0.30 (verify in apply preflight).
- `swaync` already running (no change for Phase 1).

## Success Criteria

- [ ] `ags run` produces a 3-module Aurora bar styled per design tokens on the daily-driver monitor.
- [ ] All 8 Phase 1 widgets render and update reactively (workspaces switch, clock ticks, volume reflects PipeWire, battery updates, etc.).
- [ ] Hyprland compositor blur visible behind bar shells.
- [ ] Disabling `gtk-enable-animations` removes all animations within one AGS reload.
- [ ] Every interactive widget has `accessible-name` and ≥44px hit target.
- [ ] Contrast spot-check: bar chip text ≥4.5:1 on actual rendered bar.
- [ ] Phase 1 PR diff is ≤400 changed lines OR delivered as chained slices per Delivery Plan.
- [ ] No regression: launcher still opens via existing keybind; mic still toggles mute.

## Delivery Plan (chained PRs likely)

**Phase 1 — this change — 3 chained slices**:
1. **Slice A — token system + bar shell + Workspaces** (thinnest end-to-end proving the architecture): `style/` partials, `BarShell.tsx`, `Bar.tsx` Aurora skeleton, `Workspaces.tsx`, Hyprland layerrule additions, font package additions. Target: ≤400 lines.
2. **Slice B — info widgets**: Clock+Calendar popover, ActiveWindow, LauncherPill, Mic restyle, Launcher restyle. Target: ≤400 lines.
3. **Slice C — system widgets**: Volume, Battery, Network, NotificationsBell, a11y helpers, motion gate finalization. Target: ≤400 lines.

**Phase 2 (future change)**: Launcher full redesign (calculator + grid + AI hint), NowPlaying (MPRIS), CPU/RAM/Temp chips, viz bars via tick callback, plugins.

**Phase 3 (future change)**: Popover system generalization, AGS-native notifications replacing swaync, Tweaks panel, SDDM theme, per-monitor independent state.

Sketch only — Phases 2 and 3 will get their own `/sdd-new` cycles.
