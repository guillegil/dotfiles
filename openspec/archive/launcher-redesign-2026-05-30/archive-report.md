# Archive Report: launcher-redesign

**What**: Archived completed sdd/launcher-redesign change — Spotlight-class AGS launcher redesign successfully delivered as 2 slices to main, merged main specs, all artifacts moved to archive.

**Why**: Final phase of SDD workflow — change is fully implemented, verified (ARCHIVE-READY), and ready to be closed. Archive preserves full artifact trail and records all spec deviations.

**Where**:
- Archive folder: `openspec/archive/launcher-redesign-2026-05-30/`
- Main spec: `openspec/specs/launcher.md` (new capability spec, merged from delta)

## Artifacts Archived
- proposal.md — scope, risks, affected files, acceptance criteria
- specs.md — full capability requirements (REQ-LR-01..08, REQ-AG-01..04, REQ-CL-01..03, REQ-LH-01..04, REQ-A11Y-LR-01..03) plus accepted deviations
- design.md — architectural decisions (ADR-1 through ADR-10), state model, data flow, constraint compliance, risk mitigations
- tasks.md — 2-slice delivery plan, 10 implementation tasks per slice, smoke-test checklists, workload forecast
- explore.md — feasibility analysis, per-element breakdown, risk inventory, open questions
- apply-progress.md — implementation tracking (slices 1 & 2 complete, both committed to main)
- verify-report.md — ARCHIVE-READY verdict, 0 CRITICAL, 3 WARNING, 4 SUGGESTION, all build constraints passed
- state.yaml — status=archived, all phases complete, notes on deviations

## Accepted Deviations (SPEC AMENDMENTS)
1. **D-LR-1** (permanent): AI pill gradient text → solid `var(--mauve)` (GTK4 4.22 limitation, no background-clip:text)
2. **D-LR-2** (permanent): AI ask mode deferred — footer hint cosmetic only, no ollama in repo
3. **D-LR-3** (POLICY): Grid columns = 5 (spec said 6) — deliberate post-apply polish for width/density
4. **D-LR-4** (POLICY): History cap = 8 entries (spec said "min 10") — design ADR-4 override; visible limit RECENT_LIMIT=5
5. **D-LR-5** (POLICY): Footer hints `> terminal` mode (spec said `⌘↵ terminal`) — new terminal-command mode added; Super+Enter still works

## Merged Main Spec
`openspec/specs/launcher.md` created as new capability spec. Incorporates all launcher-redesign delta specs:
- Inherited constraints from desktop-bar.md (GTK4 CSS limits, atomic write requirement)
- 8 core launcher widget requirements (REQ-LR-01..08)
- 4 app grid requirements (REQ-AG-01..04)
- 3 calc library requirements (REQ-CL-01..03)
- 4 history library requirements (REQ-LH-01..04)
- 3 accessibility requirements (REQ-A11Y-LR-01..03)
- All 5 deviations recorded with rationale and associated change name

## Verification Findings
- CRITICAL: 0 (no blocking issues)
- WARNING: 3 (all policy/spec-reconciliation level, recorded as deviations D-LR-3/4/5)
- SUGGESTION: 4 (terminal `>` mode, animated Ask Cachy:ai, grid frequency sort; calc Enter copies+closes UX; √2 alias)
- Build: clean esbuild, no CSS errors, all constraint gates pass (no eval/Function, no gradient-text, atomic write, motion-off gate, focus rings)

## Learned
- Spec reconciliation at archive is critical: deviations D-LR-3/4/5 were implementation choices during apply that needed formal recording. Future cycles should flag these at apply-progress time.
- GTK4 gradient-text limitation (D-LR-1) is a hard constraint for this stack.
- 2-slice stacked-to-main delivery works well for solo-dev with manual smoke-tests.
- Accepted deviations should be recorded in main spec wording rather than as exceptions, so the spec truth matches shipped code.

## Delivery Status
- Applied: both slices to main, smoke-tested
- Verified: ARCHIVE-READY
- Archived: all artifacts in `openspec/archive/launcher-redesign-2026-05-30/`, main spec merged at `openspec/specs/launcher.md`

**Next Steps**: None — change is archived and closed.
