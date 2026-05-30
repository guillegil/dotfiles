# Verify Report: launcher-redesign

## Verdict: ARCHIVE-READY (with documented spec deviations)

Standard Mode (no automated test suite). Verification = static spec-vs-code review
+ clean esbuild build (`ags run`, confirmed by user on latest reload)
+ bare-metal smoke confirmation.

**Totals: CRITICAL 0 · WARNING 3 · SUGGESTION 4**

## Build / Constraint Gates (all PASS)

- No `eval()` / `new Function` in `lib/calc.ts` (only the prohibition comment, line 15).
  Hand-rolled recursive-descent parser. PASS REQ-CL-01 constraint.
- No `background-clip:text` / `-webkit-text-fill-color` anywhere. AI pill = gradient bg
  + solid `var(--mauve)` text. PASS D-LR-1.
- Atomic history write: `replace_contents(tmp)` then `tmpFile.move(dest, OVERWRITE)`
  (write-temp-then-rename). PASS REQ-LH-03.
- Motion gate: `_motion.scss` `.motion-off *` collapses ALL transitions + animations
  globally (grid-tile transition, ai-pill keyframes covered). PASS REQ-A11Y-LR-03.
- Focus ring: `*:focus-visible` → outline 2px var(--accent) offset 2px. PASS REQ-A11Y-LR-02.
- `ags run` builds clean (esbuild), no CSS errors — confirmed by user.

## Requirement Coverage

**PASS** — REQ-LR-01..08, REQ-AG-01/03/04, REQ-CL-01/02/03, REQ-LH-02/03/04,
REQ-A11Y-LR-01/02/03.
**PASS w/ deviation** — REQ-AG-02 (5 cols vs 6), REQ-LH-01 (cap 8 vs "min 10"),
REQ-LR-07 (footer "> terminal" vs "⌘↵ terminal").

## Findings

### WARNING-1 — REQ-AG-02 grid column count: spec mandates 6, code uses 5
spec/design ADR-6/task 2.2 all say 6; code uses `set_max/min_children_per_line(5)` and
`GRID_COLS=5` (Launcher.tsx:171,586-587). Deliberate post-apply polish. Functionally
correct, nav consistent. NOT recorded as accepted deviation. Action: record as D-LR-3 at
archive, or restore 6. Non-blocking.

### WARNING-2 — REQ-LH-01 cap: spec says "min 10 entries", code caps at 8
`MAX_ENTRIES=8` (launcher-history.ts:23). design ADR-4 overrode to 8; spec text never
reconciled. dedupe/unshift/slice logic correct. Action: reconcile spec wording or bump to
10. Non-blocking (surfaced limit is RECENT_LIMIT=5).

### WARNING-3 — REQ-LR-07 footer hint drift: "⌘↵ terminal" replaced by "> terminal"
A new `>` terminal-command mode was added (termMode/runTerminal/term-banner); the footer
now advertises `>` instead of `⌘↵`. Super+Enter terminal-launch (REQ-LR-02) still works but
is no longer hinted. 5 segments + order otherwise intact. Action: record `>` terminal mode +
footer change as a spec amendment at archive. Non-blocking.

## Suggestions

1. Scope ADDITIONS beyond spec (terminal `>` mode, green/term accent, Arch icon pill,
   animated Ask Cachy:ai glyph, RECENT_LIMIT=5 + ellipsized chips, rounded footer corners) —
   clean, break no REQ. Amend spec/design at archive so the trail matches reality.
2. Calc Enter copies AND closes (Launcher.tsx:263-268); REQ-LR-05 only requires writing to
   clipboard. Reasonable UX; note in spec.
3. REQ-CL-02 lists `√2` as a usable name; code only has key `sqrt2` (no `√2` alias; `√` not
   in ident regex). Add alias or trim spec.
4. gridApps sorted by AstalApps.frequency desc (Launcher.tsx:89-91) — sensible "most-used
   first" default not in spec; harmless, document it.

## Tasks status

All implementation tasks 1.1-1.9 and 2.1-2.3 satisfied in code. Smoke-test tasks 1.10 / 2.4
are user-run manual steps (apply-progress marks pending; bare-metal smoke already done per
task context). No unsatisfied implementation tasks.

## Next

`sdd-archive` — record at archive: D-LR-3 (grid=5), history cap=8, `>` terminal mode +
footer change, calc close-on-copy, frequency sort — as spec amendments before closing.
