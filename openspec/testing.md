---
source: engram
topic_key: sdd/dotfiles/testing-capabilities
exported_at: 2026-05-27
notes: |
  Mirrored from engram for hybrid persistence so a clean clone of the repo
  has the full SDD context without needing the local engram database. To
  refresh this file, re-export from engram via mem_get_observation on the
  topic above. The engram copy remains authoritative for in-session evolution.
---

## Testing Capabilities — dotfiles

**Strict TDD Mode**: disabled
**Detected**: 2026-05-26

### Test Runner

- Command: — (none)
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
| Type checker | Yes | `tsc --noEmit` (tsconfig.json in config/ags/) |
| Formatter | Yes | `prettier` (semi: false, tabWidth: 2 — in config/ags/package.json) |

### Notes

This is a dotfiles repository. No automated test suite exists or is expected. Validation is manual: run `./install.sh`, verify configs symlink correctly, launch Hyprland, confirm desktop session works.

strict_tdd: false
