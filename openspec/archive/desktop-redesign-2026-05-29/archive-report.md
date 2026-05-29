# Archive Report: desktop-redesign

**Date archived**: 2026-05-29
**Final status**: complete

---

## Summary

The desktop-redesign change implemented Cachy Bar Phase 1 — a reactive, token-driven
AGS/Astal status bar for CachyOS/Hyprland, replacing the previous placeholder Bar.tsx
with a fully-themed Pillbox edge-to-edge bar. The change spanned 5 apply slices
(A0, A, B, C, D), all shipped directly to `main` (solo-dev workflow, no PRs).
Verify: ARCHIVE-READY — 0 CRITICAL. Two accepted deviations (Latte theme deferred,
!important omitted) and three pending-manual checks resolved by the orchestrator.

---

## Final Status

| Dimension | Result |
|-----------|--------|
| Apply slices | A0, A, B, C, D — all complete |
| Delivery | commit-straight-to-main (solo-dev) |
| Verify verdict | ARCHIVE-READY — 0 CRITICAL, 2 WARNING, 3 SUGGESTION |
| Capability spec | `openspec/specs/desktop-bar.md` (created this archive) |
| Archive date | 2026-05-29 |

---

## Engram Observation IDs (traceability)

| Artifact | Engram ID | Topic Key |
|----------|-----------|-----------|
| explore | (file-only) | sdd/desktop-redesign/explore |
| proposal | (file-only) | sdd/desktop-redesign/proposal |
| spec | (file-only) | sdd/desktop-redesign/spec |
| design | (file-only) | sdd/desktop-redesign/design |
| tasks | (file-only) | sdd/desktop-redesign/tasks |
| apply-progress | #9 | sdd/desktop-redesign/apply-progress |
| verify-report | #35 | sdd/desktop-redesign/verify-report |
| archive-report | (this file) | sdd/desktop-redesign/archive-report |

---

## Commits (representative — change spans many commits on main)

These commits are on `main` from the uwsm-adoption release through 2026-05-29.
They are unpushed at archive time; the user pushes manually.

| Hash | Description |
|------|-------------|
| pre-A | Slice A0: service/hyprland.ts |
| `996960f` | feat(ags): Pillbox bar foundation — token system, shell, Workspaces (Slice A) |
| `5b36822` | feat(ags): Slice B info widgets — Clock, ActiveWindow, LauncherPill, Mic+Launcher restyle |
| `35961f7` | fix(ags): Network icon from sub-object (Slice C) |
| `4958bc2` | feat(ags): Volume redesign — icon-only chip + OSD popover |
| `52d5768` | feat(ags): macOS-style volume OSD via ags request |
| `90d1fc4` | feat(ags): notifications bell with symbolic icons (Slice D) |
| `2105693` | feat(ags): notifications design pass |
| `a345449` | fix(ags): Clear all grays out when empty |
| `8711eaa` | chore(sdd): apply complete — all slices A0-D |
| `4d26eba` | feat(gtk): force dark theme via settings.ini (prefer-dark) |

---

## Accepted Deviations (permanent — not defects)

| ID | REQ | Deviation | Rationale |
|----|-----|-----------|-----------|
| D1 | REQ-BS-01 ≤30px height | Bar effective height 44px (workspace .ws-target a11y zone) | ≤30px conflicts with REQ-A11Y-01 ≥44px; a11y wins |
| D2 | REQ-NT-05 count badge | Red presence dot instead of numeric count | User decision; cleaner visual |
| D3 | — | Monospace font everywhere | User decision; DESIGN.md §1.2 bar identity |
| D4 | REQ-TT-02 no runtime color-mix | 5 color-mix() calls in compiled CSS | GTK 4.22.4 supports it; intentional runtime calls |
| D5 | REQ-NW-03 SSID reactive | SSID binds at AGS init; may lag | icon/color remain reactive; accepted limitation |
| D6 | REQ-MG-02 !important | !important omitted from _motion.scss | GTK4 CSS subset rejects it; specificity wins |

---

## Deferred to Phase 2

| REQ | Topic | Action |
|-----|-------|--------|
| REQ-TT-06 | Latte (light) theme | GTK4 has no attribute selectors (`[data-theme="latte"]` unsupported). Latte raw values defined in `_tokens.scss` but not emitted. Implement in Phase 2 via separate CSS file swap + body class mechanism. |

---

## Pending-Manual Checks (resolved by orchestrator 2026-05-29)

| Task | Resolution |
|------|------------|
| task 1.22 gsettings animations gate | Premise clarified: AGS motion gate only gates AGS CSS transitions, NOT Hyprland's own workspace animations (those are controlled by Hyprland animation config). REQ-MG is fully satisfied at the AGS level. |
| task 3.5 a11y audit | PASS — roles/names present on all interactive widgets. LauncherPill ~28px is the documented exception (S1, mouse-driven, low risk). |
| task 3.6 contrast | PASS — `--text` (#cdd6f4) over `--bg` rgba(30,30,46,0.82) ≈ 11:1, well above ≥4.5:1. |

---

## Scope Delivered Beyond the Original Spec

These additive enhancements were delivered during apply and are reflected in
`openspec/specs/desktop-bar.md`:

| Enhancement | Details |
|-------------|---------|
| 4K HiDPI scaling | `config/hypr/hyprland.lua` `scale = 1.5` for 4K display |
| Launcher "Claude design" Phase 1 | `view-app-grid-symbolic` icon, click-outside scrim |
| Volume OSD redesign | Icon-only chip + transient scroll OSD popover + centered macOS-style key-driven OSD (`ags request volume-osd`) |
| Full notifd cutover | AGS notifd fully replaces swaync. swaync removed from packages (not just autostart — D-Bus-activation discovery). Bell with urgency dot + panel with DND switch, Clear all, expandable rows, transient arrival toasts (hover-pause, expand, urgent 10s, click-dismiss) |
| GTK dark theme | `config/gtk-4.0/settings.ini` + `config/gtk-3.0/settings.ini` force `gtk-application-prefer-dark-theme=1` (after libadwaita removal left GTK defaulting to light) |

---

## Known Cosmetic Issue Carried Forward (not a blocker)

**Notification toast first-expand contract-then-expand flicker** — a gtk4-layer-shell
first-resize-after-map artifact. 9 resolution attempts documented in
`docs/toast-expand-flicker.md` and `docs/sol.md`. Persistent-window fix regressed and
was reverted. Open follow-up for Phase 2.

---

## Key GTK4/AGS Discoveries (preserved for future work)

| Discovery | Impact |
|-----------|--------|
| GTK 4.22 supports `:root`, `color-mix()`, `transform: translateY` | Future phases can use these freely; earlier constraints were overcautious (attribute selectors remain unsupported) |
| gnim JSX intrinsics: no `<calendar>` or `<progressbar>` | Build Gtk.Calendar/GtkProgressBar imperatively via `box.$={...}` |
| Hyprland Lua: `hl.dsp.focus({workspace=N})` not `hyprctl dispatch workspace N` | Critical for workspace switching from AGS context |
| `AstalNetwork.Network` has no `icon-name` | Derive icon from `network.wifi` or `network.wired` sub-objects |
| swaync is D-Bus-activated | Autostart removal alone insufficient; must uninstall the package to transfer `org.freedesktop.Notifications` bus |

---

## Spec Migrated To

`openspec/specs/desktop-bar.md` — new capability spec. All delta requirements from
`openspec/changes/desktop-redesign/specs.md` have been merged into the canonical form,
with deviations, deferred items, architectural discoveries, and additive enhancements
included. The delta spec (this change's `specs.md`) is preserved in this archive folder.

---

## SDD Cycle Complete

desktop-redesign has been fully planned, implemented, verified, and archived.
The AGS bar is live on `main`. Ready for Phase 2 changes.

**Suggested follow-on changes:**
1. `latte-theme` — implement REQ-TT-06 Latte theme switching (deferred from Phase 1)
2. `toast-flicker-fix` — resolve gtk4-layer-shell notification toast expand flicker
3. `bar-phase-2` — NowPlaying (MPRIS), CPU/RAM chips, launcher full redesign, per-monitor workspace filtering
