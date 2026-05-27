# openspec/

Spec-Driven Development (SDD) artifacts for this dotfiles repo, committed alongside code so a
clean clone has full planning context without needing the local engram database.

## Persistence model

This project uses **hybrid** persistence:

- **engram** (primary): live artifacts evolve in the local engram database during active sessions.
  Agents read and write here while implementing.
- **openspec/** (mirror): a point-in-time export committed to git. Gives any agent (or human) a
  cold-start read of what was planned without requiring engram access.

The engram copy is authoritative for in-session evolution. Re-export to refresh these files.

## File layout

```
openspec/
├── README.md                              # this file
├── project.md                             # sdd-init output: stack, conventions, user prefs
├── testing.md                             # test runner detection (strict_tdd: false here)
└── changes/
    └── desktop-redesign/
        ├── state.yaml                     # DAG phase status — current progress at a glance
        ├── explore.md                     # codebase exploration + GTK4 feasibility matrix
        ├── proposal.md                    # intent, scope, approach, risks
        ├── specs.md                       # requirements + BDD scenarios (delta spec)
        ├── design.md                      # architecture decisions (ADRs), data flow, file tree
        ├── tasks.md                       # implementation checklist with slice boundaries
        └── apply-progress.md             # completed tasks + deferred work + implementation notes
```

## How to read a change

Read in this order to build context progressively:

1. `state.yaml` — which phase is active, which slices are done
2. `proposal.md` — why this change exists and what it covers
3. `specs.md` — what the system must do (requirements + scenarios)
4. `design.md` — how it is structured (ADRs, file tree, data flow)
5. `tasks.md` — what to implement next (checklist, slice boundaries, PR plan)
6. `apply-progress.md` — what has been done and what is deferred

## Continuing the SDD workflow on a fresh clone

1. Run `/sdd-init` first — re-detects the stack and registers skills for the session.
2. Search engram for existing artifacts: `mem_search(query: "sdd/desktop-redesign", project: "dotfiles")`.
   If engram has a newer version of any artifact, prefer it over the files here.
3. If engram is empty (e.g., new machine), these files are the fallback source of truth.
   Load them by reading the relevant `.md` file before starting an apply or verify phase.
4. After re-loading context, continue with `/sdd-continue desktop-redesign` or
   `/sdd-apply desktop-redesign` targeting the next pending slice from `state.yaml`.

## Active change summary

**desktop-redesign** — Cachy Bar implementation on AGS v2 / GTK4
- Replaces placeholder `Bar.tsx` / `Launcher.tsx` with a full Catppuccin Mocha glass UI
- Aurora 3-module floating bar: Workspaces, Clock, Volume, Battery, Network, Notifications, Mic
- 4 chained PRs (Slices A → D), stacked to main
- Current status: Slice A0 complete (hyprland.ts service); rest of Slice A pending
