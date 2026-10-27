# Tasks

## 1. Read-Only Audit (this change)

- [x] 1.1 Confirm the 2026-10-21 restored nine-skill baseline, symlink targets, experiment §11 and existing worktree changes; do not modify either skill tree.
- [x] 1.2 Review each SKILL.md, validator and referenced agent/playbook/rubric/reference entry point; record line-specific findings, severity, proposals and acceptance in proposal.md.
- [x] 1.3 Compare the three local pev-protocol.md copies by shared *semantics* versus domain-specific clauses; distinguish observed conflicts from potential drift.
- [x] 1.4 Set the change scope to proposal/tasks only; mark skip_specs for this documentation-only change.
- [x] 1.5 Check change status and diff; ensure no files outside this new change were modified by this audit (pre-existing worktree edits remain untouched).
- [x] 1.6 Inspect the pre-optimization `.pev/prd-2026-10-08-2` API state, plan and final verification; distinguish retained artifacts from the earlier change's session-derived time/call counts and unsupported total-token estimate.
- [x] 1.7 Observe the active Nana session read-only: correlate JSONL timestamps, cache-read usage, subagent growth, PM state, iteration artifacts, verification verdicts and post-PASS tool activity; do not send input or terminate the session.
- [x] 1.8 Reconstruct the post-delivery tail: distinguish substantive post-PASS repair/validation from the delayed duplicate subagent handback that arrived after the `下一步` response; record reported subagent usage separately from main-session token totals.

## 2. Proposed Follow-Up (not authorized in this change)

- [ ] 2.1 After approval, reproduce H1 with negative/positive fixtures and clarify design/review redline requirements; fix the fail-open path and retest all four design validators.
- [ ] 2.2 Agree on H2 user-confirmation state and resume semantics across seven design/decompose/tasks/implementation skills; align instructions, schemas and tests in a separate change.
- [ ] 2.3 Define M1 question-frontier behavior per skill, including what waits for the user and where decisions persist; replay ambiguous-input cases.
- [ ] 2.4 Inventory shared and divergent validator blocks (M2/M3), improve actionable error messages, and regression-check outputs without an external runtime `_pev/` dependency.
- [ ] 2.5 Build a nine-skill scenario-by-scenario reference graph (M4/L1/L2); measure actual tool reads, tokens and review quality against restored baseline before changing read instructions.
- [ ] 2.6 Produce a clause-level three-copy protocol matrix (M5) with validator/schema mapping; reconcile only demonstrably conflicting common rules and preserve domain exceptions.
- [ ] 2.7 For any approved skill edit, test nine standalone directories and verify that `~/.claude/skills/` resolves to identical content; report quality regressions or unrun scenarios explicitly.
- [ ] 2.8 Reconstruct the historical API review attempts from the session trace referenced in `improve-pev-skills/proposal.md:17-25`; map each newly raised finding to the prompt wording, upstream facts, subagent reads and elapsed time before assigning root cause to H3.
- [ ] 2.9 Design and replay an API re-review contract for H3: carry forward finding IDs/dispositions, check affected contract surfaces and Cross regressions, and require a justified final full PASS. Compare review quality and tool/token/time costs with the restored baseline; do not claim a total-token reduction without a traceable measurement source.
- [ ] 2.10 Reproduce H4/H5 with a PM fixture that reaches `max_iterations`, has a REVISE followed by PASS, and performs rendering/proofreading; prove that PASS output cannot silently reopen EXECUTING or mutate a verified artifact without an explicit revision record.
- [ ] 2.11 Add a state/verdict consistency matrix for all nine skills: latest verification, state status, iteration, artifact registry, output and iteration-limit behavior; identify which checks belong in each local validator without introducing a shared runtime dependency.
- [ ] 2.12 Re-run Nana with a bounded-session handoff for M6: persist only state, ledger, current artifact and a compact handoff summary; compare cache-read/input size, tool calls, wall-clock time, and output quality against the long-lived session. Treat cache-read as context-volume evidence, not as total token cost.
- [ ] 2.13 Reproduce H6 with a delayed/duplicate handback fixture; enforce an idempotent join barrier so the coordinator consumes the final report before COMPLETE/final reply, and ignores late notifications after completion without a new business turn.
