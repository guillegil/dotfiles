---
source: engram
topic_key: sdd-init/dotfiles
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

# SDD Init — dotfiles

**Detected**: 2026-05-26 (refreshed: 2026-05-26)
**Persistence mode**: engram
**Artifact store**: engram only

## Project

- **Name**: dotfiles
- **Root**: /home/guille/dotfiles
- **VCS**: git (branch: main)
- **Purpose**: Personal Hyprland + AGS desktop environment dotfiles for CachyOS (Arch-based)
- **Target hardware**: Lenovo Yoga Pro 9 16IAH10 (Intel + NVIDIA RTX 5060 Blackwell) and QEMU/KVM VM

## Stack

| Layer | Technology |
| --- | --- |
| OS / distro | CachyOS (Arch-based), Wayland |
| Window manager | Hyprland (Wayland compositor; config: `config/hypr/hyprland.conf` + `hyprland.lua`) |
| Shell / bar | AGS v2 / Astal (Aylurs GTK Shell) — TypeScript + SCSS, GTK4 |
| TypeScript | strict mode, ES2022/ES2020 target, moduleResolution=Bundler, jsx=react-jsx (ags/gtk4) |
| Formatter | Prettier (semi: false, tabWidth: 2) — defined in config/ags/package.json |
| Package manager | pacman (official) + paru/yay (AUR) |
| Display manager | SDDM |
| Terminal | Kitty |
| Notifications | swaync |
| Audio | PipeWire + WirePulse + WirePlumber |
| Screenshotting | grim + slurp |
| Clipboard | wl-clipboard + cliphist |

## File Structure

```
dotfiles/
├── install.sh              # bootstrap: symlinks config/ → ~/.config/, installs packages
├── packages/
│   ├── pacman.txt          # official Arch/CachyOS package list
│   └── aur.txt             # AUR packages (via paru/yay): ags, libastal-* libs
├── config/
│   ├── hypr/
│   │   ├── hyprland.conf   # main Hyprland config (bootstrap + keybinds + autostart)
│   │   └── hyprland.lua    # extended Hyprland Lua config
│   └── ags/
│       ├── app.ts          # AGS entrypoint — mounts Bar (per monitor) + Launcher
│       ├── style.scss      # global SCSS styles
│       ├── env.d.ts        # ambient type declarations
│       ├── package.json    # ags + gnim deps, prettier config
│       ├── tsconfig.json   # strict TS, Bundler resolution, react-jsx for ags/gtk4
│       └── widget/
│           ├── Bar.tsx     # taskbar widget
│           ├── Launcher.tsx # app launcher (toggled via `ags toggle launcher`)
│           └── Mic.tsx     # microphone status widget
├── docs/
│   └── SETUP.md            # system-level setup (drivers, services, groups, NVIDIA)
└── .atl/
    └── skill-registry.md   # SDD skill index (user-level + external capabilities)
```

## Conventions

- Config files are symlinked from repo `config/` into `~/.config/` via `install.sh`
- Secrets (API tokens, SSH keys) are NEVER committed — stored outside repo
- AGS TypeScript: strict mode, no semicolons (Prettier), 2-space indent
- Hyprland config split: `hyprland.conf` (main config + bootstrap) + `hyprland.lua` (Lua extensions)
- AUR packages installed via `paru` (preferred) or `yay`
- NVIDIA env vars go in `~/.config/uwsm/env`, NOT in hyprland.lua

## User Preferences (MANDATORY — must be applied by all agents every session)

### 1. Documentation lookup via context7 (ALWAYS REQUIRED)

ALWAYS use the `context7` MCP server to fetch the latest documentation for any library or tool used in this project BEFORE making technical recommendations or writing code. This applies to: AGS/Astal, Hyprland, CachyOS, SDDM, GTK4, GJS, TypeScript, and all related tools.

**Reason**: Training data may be stale. Documentation from context7 is authoritative.

**How**: Call `resolve-library-id` then `get-library-docs` on the context7 MCP server.

### 2. UI/UX work via ui-ux-pro-max-skill (ALWAYS REQUIRED)

ALWAYS invoke the `ui-ux-pro-max-skill` skill when executing any design, layout, styling, or widget work — especially for GTK4 and AGS components. This includes the top bar, launcher, any new widget, and SCSS work.

**How**: Invoke via the built-in `Skill` tool before starting any UI/UX implementation.

### 3. GTK4 design feasibility constraint (CRITICAL)

There may be incompatibilities between proposed designs (e.g. from design tools or Claude design exports) and what GTK4 can actually render. ALWAYS evaluate GTK4 feasibility before implementing or recommending a design. Propose the best GTK4-compatible solution. Never implement a design without confirming GTK4 supports the required rendering properties.

## Testing Capabilities

**Strict TDD Mode**: disabled (no test runner detected)

### Test Runner

- Command: — (none detected)
- Framework: — (none)

### Test Layers

| Layer | Available | Tool |
| --- | --- | --- |
| Unit | No | — |
| Integration | No | — |
| E2E | No | — |

### Coverage

- Available: No
- Command: —

### Quality Tools

| Tool | Available | Command |
| --- | --- | --- |
| Linter | No | — (no eslint/biome config found) |
| Type checker | Yes | `tsc --noEmit` (tsconfig present in config/ags/) |
| Formatter | Yes | `prettier` (configured in package.json) |

**strict_tdd**: false
**Reason**: No test runner present. Dotfiles repos have no automated tests — changes are validated manually by running install.sh and verifying the desktop session.

## Skill Registry

Registry path: /home/guille/dotfiles/.atl/skill-registry.md

### External capabilities (MCP/tool-based)

| Capability | Scope |
| --- | --- |
| `context7` | Documentation lookup — AGS/Astal, Hyprland, GTK4, SDDM, CachyOS, any library |
| `ui-ux-pro-max-skill` | UI/UX design work — GTK4, AGS widgets, bar, launcher, SCSS |

### File-based user skills

branch-pr, chained-pr, cognitive-doc-design, comment-writer, go-testing, issue-creation, judgment-day, skill-creator, skill-improver, work-unit-commits

Project-level skills: none found
