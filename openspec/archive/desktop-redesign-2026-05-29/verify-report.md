---
source: engram
topic_key: sdd/desktop-redesign/verify-report
exported_at: 2026-05-29
notes: |
  Mirrored from engram for hybrid persistence. The engram copy is authoritative
  for in-session evolution; this file gives a clean clone the full SDD context.
---

# Verify Report: desktop-redesign — Cachy Bar Phase 1

**Verdict: ARCHIVE-READY** — 0 CRITICAL, 2 WARNING, 3 SUGGESTION, 3 PENDING-MANUAL.

Mode: hybrid. **Standard Mode** — there is NO automated test suite for the AGS/GTK4
TSX widgets. Verification = (a) static spec-vs-code reading, (b) confirming each
task's claimed file/behavior exists in code, (c) listing the manual smoke checks that
remain. Per-slice runtime smoke ALREADY PASSED on bare-metal (state.yaml notes) and is
treated as PASS-CONFIRMED.

---

## 1. Verdict line

**ARCHIVE-READY.** No CRITICAL issues block archive. One real spec gap (Latte theme,
REQ-TT-06) and one literal deviation (REQ-MG-02 `!important`) should be recorded as
deferred/accepted in the archive delta. Three manual a11y checks remain for the human.

## 2. Findings

### CRITICAL (0)
None.

### WARNING (2)

- **W1 — REQ-TT-06 Latte theme NOT implemented.**
  `config/ags/style/_tokens.scss:80-84` emits Mocha tokens on the `*` selector only.
  No `[data-theme="latte"]` block exists (GTK4 CSS has no attribute selectors; source
  comment defers theme switching to a future slice). Latte raw values + 2 build-time
  helpers are defined (`_tokens.scss:33-59,77-78`) but never emitted as a switchable
  theme. The spec mandates REQ-TT-06. Phase-1 scope is dark-only and DESIGN.md /
  state.yaml both flag Latte as future work — recommend recording REQ-TT-06 as
  **DEFERRED** in the archive delta rather than treating it as a blocker.

- **W2 — REQ-MG-02 omits `!important`.**
  `config/ags/style/_motion.scss:6-11` uses bare `transition-duration: 0.01ms` /
  `animation-duration: 0.01ms` (no `!important`). The spec text specifies `!important`.
  It was dropped deliberately in Slice A post-apply fix #4 because the GTK4 CSS subset
  rejected `!important`. Motion is still suppressed (`.motion-off *` wins on
  specificity). Accepted deviation — note in archive.

### SUGGESTION (3)

- **S1 — LauncherPill hit target ~28px.** `_widgets.scss:428-437` (comment acknowledges
  it is under the 44px ideal, constrained by bar height). REQ-LP-02 / REQ-A11Y-01 want
  ≥44px. Mouse-driven, low risk. A transparent pad wrapper (like `.ws-target`) would
  close the gap.
- **S2 — ActiveWindow accessible-name set once.** `ActiveWindow.tsx:34-37` sets the a11y
  LABEL from `title.get()` inside `$` without re-subscribing, so the accessible name
  goes stale on focus change while the visible label is reactive. Minor a11y polish.
- **S3 — Network SSID binds to the build-time wifi object.** `Network.tsx:39,63`. Icon
  and color stay reactive via the top-level binding; only the SSID text may lag until
  AGS reloads. Documented limitation (accepted deviation #5).

## 3. PENDING-MANUAL (human runs; not statically verifiable)

- **task 1.22** — `gsettings set org.gnome.desktop.interface enable-animations false`,
  then confirm `.motion-off` is on the AGS root and workspace switch is instant.
- **task 3.5** — a11y audit: every interactive widget has a non-empty accessible-name +
  role + ≥44px hit target + a `:focus-visible` ring. (Static check: roles and names are
  present in code; LauncherPill ~28px is the known exception — see S1.)
- **task 3.6** — contrast ≥4.5:1: sample `--text` (#cdd6f4) over the rendered `--bg`
  rgba(30,30,46,0.82) chip background.

## 4. Per-requirement coverage table

| REQ | Status | Evidence |
|-----|--------|----------|
| REQ-TT-01 palette vars | satisfied | `_tokens.scss:85-124`; compiled `--bg: rgba(30,30,46,0.82)` |
| REQ-TT-02 color.mix precompute | satisfied | build-time `color.mix` → rgba in output; 5 remaining color-mix are intentional runtime (dev#4) |
| REQ-TT-03 shape/spacing/motion | satisfied | `_tokens.scss:126-136` |
| REQ-TT-04 hybrid font | satisfied | `_typography.scss:6-8`; calendar uses `--font-sans` (`_widgets.scss:463-466`) |
| REQ-TT-05 tabular-nums | satisfied | `.tabular` `_typography.scss:16-18`; used by clock/volume/battery/notif-time |
| REQ-TT-06 Latte theme | **GAP (deferred)** | W1 — no `[data-theme="latte"]` emitted |
| REQ-BS-01 pillbox edge-to-edge | satisfied (dev: height) | `BarShell.tsx` TOP\|LEFT\|RIGHT EXCLUSIVE; 44px hit zone overrides ≤30px (dev#3) |
| REQ-BS-02 glass shell | satisfied | `_glass.scss:12-16` rgba bg, tinted border, no radius/shadow/backdrop-filter |
| REQ-BS-03 blur layerrule | satisfied | `hyprland.lua:57-58`, Slice A commit |
| REQ-BS-04 multi-monitor mirror | satisfied | `app.ts:24` `app.get_monitors().map(Bar)` |
| REQ-BS-05 section spacing | satisfied | `Bar.tsx` centerbox + `spacing={4}`; `.bar-inner` padding |
| REQ-WS-01..04 workspaces | satisfied | `Workspaces.tsx` binding, dot/pill morph, click+scroll, 44px `.ws-target`, a11y labels |
| REQ-AW-01..03 active window | satisfied (S2) | `ActiveWindow.tsx` binding, Pango ellipsize maxWidthChars=28, `visible` empty-state |
| REQ-LP-01..02 launcher pill | satisfied (S1) | `LauncherPill.tsx` toggle_window + a11y; hit target ~28px |
| REQ-CL-01..04 clock+calendar | satisfied | `Clock.tsx` poll, date sub-label, CalendarPopover Esc-close, a11y dialog |
| REQ-VO-01..04 volume | satisfied | `Volume.tsx` Wp binding, scroll ±5% clamp, mute, icon swap, a11y w/ % |
| REQ-BA-01..04 battery | satisfied | `Battery.tsx` thresholds green/yellow/red, `visible=isBattery`, a11y status |
| REQ-NW-01..03 network | satisfied (S3) | `Network.tsx` icon swap wifi/wired/offline, SSID wifi-only trunc, a11y |
| REQ-MC-01..03 mic | satisfied | `Mic.tsx` token colors, logic unchanged, semantic icon shapes |
| REQ-LR-01..03 launcher restyle | satisfied | `Launcher.tsx` cssClasses tokens, radius-hero/inner, logic intact |
| REQ-NT-01 swaync removal | satisfied | `hyprland.lua:47` removed; swaync installed but NOT running |
| REQ-NT-02 notifd binding | satisfied | `NotificationsPanel.tsx`/`NotificationsBell.tsx` `Notifd.get_default()` |
| REQ-NT-03 bell widget | satisfied (dev: dot) | `NotificationsBell.tsx`; presence dot instead of count (dev#2) |
| REQ-NT-04 panel popover | satisfied | header count+DND+Clear all, scrolled list, urgent left border, Esc via Popover |
| REQ-NT-05 DND | satisfied (dev) | `dontDisturb` switch + `.dnd` bell class; indicator = dot (dev#2) |
| REQ-NT-06 a11y | satisfied | bell/panel/dismiss accessible labels + roles |
| REQ-A11Y-01 44px hit | satisfied (S1) | `.ws-target` 44px; LauncherPill ~28px exception |
| REQ-A11Y-02 focus ring | satisfied | `_widgets.scss:26-29` `*:focus-visible` outline accent |
| REQ-A11Y-03 accessible-name | satisfied (S2) | every interactive widget sets LABEL |
| REQ-A11Y-04 contrast | pending-manual | task 3.6 |
| REQ-MG-01 class toggle | satisfied | `motion.ts` Gtk.Settings + window-added |
| REQ-MG-02 CSS suppression | partial (W2) | `_motion.scss` works but no `!important` |
| REQ-MG-03 reactive update | satisfied | `motion.ts:24` `notify::gtk-enable-animations` |

## 5. Accepted deviations (not defects)

1. Monospace everywhere — DESIGN.md §1.2 user decision.
2. REQ-NT-05 count badge → red presence dot (`NotificationsBell.tsx:43-50`).
3. Bar height: 44px a11y hit zone overrides ≤30px REQ-BS-01 (`_glass.scss:10-11`).
4. Runtime `color-mix()` (5 calls) + `transform` — verified on GTK 4.22.4
   (docs/gtk_css_reference_overview.md). Compiled CSS: 0 backdrop-filter, build-time
   color.mix resolved to rgba.
5. Network SSID build-time bind (S3).
6. swaync killed by hand once at cutover; autostart removed so it stays dead.

## 6. Static verification evidence

- `sass config/ags/style.scss` → OK. Compiled: 0 backdrop-filter, 0 display:flex /
  align-items / justify-content, 0 `!important`, build-time color.mix → rgba.
- 5 `color-mix()` remain in output = intentional runtime calls (dev#4).
- Hex literals outside `_tokens.scss`: 0 (`_widgets.scss` + all widget `.tsx` clean).
- `hyprland.lua`: 2 active `hl.layer_rule` for `^ags$` (blur + ignore_alpha) lines
  57-58; swaync autostart removed line 47; volume keys append `ags request volume-osd`
  lines 305-307.
- All slices A0-D committed (8711eaa apply complete).
- Tooling: ags 3.1.0, sass present.

## 7. Next recommended phase

`sdd-archive` — record REQ-TT-06 as deferred and REQ-MG-02 as accepted deviation in the
spec delta; close the cycle. No CRITICAL blockers.
