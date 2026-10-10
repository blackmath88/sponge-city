# Delivery ledger — bilingual evidence session

> **Active limits (current):** integration cutoff **23:10 Europe/Rome**, hard stop **23:55**. Not reset. The deadlines in the session headings below (session 1: 16:26 / 16:56; session 2: 23:15 with the final 45 minutes from 22:30) are **historical and superseded**; they are kept as history only.
>
> **Current state:** pushed/tested head and counts are listed in the PR description and in `docs/session/review/DISPOSITION.md` ("Current state"). Counts quoted in individual entries below (tests, browser checks, SHAs) were true when written and are not current unless stated.

Start **2026-10-10 14:26 CEST**. (Historical, superseded: integration cutoff 16:26, hard stop 16:56.) Not accepted Weavr execution; the gated V2 Mission is untouched.

## Base decision
- Pinned **3aeca87** (PR #4 head, `feat/post-hackathon-consolidation`). `make smoke` passes there.
- Rejected 9efebe7 (PR #5 head, stacked on #4): `make smoke` fails in `tests/weavr-mission.test.mjs` (expects 5 tasks, plan now has `sponge-v2-R`). Pre-existing, inside the gated Mission, not repaired. #5 only adds docs, `.weavr/`, tests; read its guidance via `git show origin/docs/product-v2-orca-orchestration:docs/…`.
- #2 (`feat/sponge-street-explainer`) and #3 (`feat/adaptive-interface-orchestration`) are not ancestors of the base; their content was migrated into #4 by path (`adaptive-interface/`, `wrapper/prototypes/sponge-street`, see docs/OFFBOARDING.md). Open draft PR targets `feat/post-hackathon-consolidation`.

## Preflight (≤15 min)
- `orchestrate-work` skill: not installed. `orca` 1.4.218 runtime ready; 39 historical Orca workers, all settled (succeeded/failed/stopped), none live. Several `weavr-sponge-city-*` worktrees exist (some dirty) — owned by the V2 Mission; not touched.
- Orca enforcing worker timeout/supervisor: not verified (`dispatch --timeout-ms` exists; enforcement unproven). Decision: no Orca workers. Use Agent-tool subagents (routing-mod 0.1.0 enabled, user scope) with tier tags; stop via TaskStop. Effective route verified by asking each worker to report its model ID.
- Max 2 concurrent workers; one implementation worker at a time; no recursive delegation.

## Tasks
| id | task | tier | route | status | commit |
|----|------|------|-------|--------|--------|
| R1 | Berlin city profile (read-only research) | standard | Agent→sonnet (model ID self-reported claude-sonnet-5-5) | done, validated | data/cities/berlin.json |
| R2 | Copenhagen city profile (read-only research) | standard | Agent→sonnet (claude-sonnet-5-5) | done, validated | data/cities/copenhagen.json |
| C1 | Journey shell, i18n, concept/practice/measure/cities/export views, checks | coordinator | direct | done | 7283092, 36148d8 |
| T1 | Street X-Ray de/en + place overlay | standard | Agent→sonnet (claude-sonnet-5-5), worktree bilingual-w1 | done, browser-checked de | cherry-pick of 8ac0883 |
| T2 | Rain Walk de/en | standard | Agent→sonnet, worktree bilingual-w2 | done, browser-checked de | cherry-pick of 1cc5073 |
| T3 | Street Lab de/en | standard | Agent→sonnet, worktree bilingual-w3 | done | cherry-pick of 52f6519 |
| T4 | Data Charter map de/en + charter-de.json | standard | Agent→sonnet, worktree bilingual-w4 | done | cherry-pick of fa02c79 |
| RV | Independent read-only review of 120956d | deep | Agent→opus (claude-opus-5-5) | done: 0 blocker, 2 major, 8 minor; 2 major + 6 minor fixed, rest deferred (see PR) | review-fixes commit |

All workers (R1,R2,T1–T4,RV) completed and settled; none live. No Orca workers used (no verified enforcing timeout). Usage not observable. Session started 14:26; final checks ~15:0x CEST (well inside budget; all accepted scope delivered).


---
# Session 2 — multicity + maps (started 2026-10-10 16:15:48 CEST; historical deadline 23:15, final 45 min from 22:30 — superseded by the active limits above)

**Base decision:** continue PR #6 on the same branch (head 163fb0b, based on #4 3aeca87). #5 head 9efebe7 still fails its own mission test (gated V2, not touched). No other active coordinator: only terminal in this worktree is this session. Existing `weavr-sponge-city-*` worktrees and runs untouched.

**Orca preflight (≈15 min, run_791a78c3c736):**
- CLI: `orca status` ready; `worker-start --agent claude --model <id>` launches `claude --dangerously-skip-permissions --model <id>` (Orca's launch; permission prompts are bypassed inside the worker, so writable-path isolation = separate worktree + instruction, not enforcement).
- Completion probe ctx_11571b5a7c78 (haiku, read-only, current worktree): worker_done received, model self-reported claude-haiku-5-5 and matched `--model haiku`, settled `succeeded`, released (transcript archived).
- Timeout probe ctx_c57ea941100f (`--timeout-ms 60000`, sleeping worker): **not enforcing** — still live after 100 s (timeout is a start-wait only). `worker-stop` settled it as `exited` (positive proof). Supervisor rule for this session: I enforce wall-clock deadlines by checking and calling `worker-stop`.
- Finding: a brand-new worktree shows Claude's *folder-trust* prompt; `worker-start --worktree new-child` then fails at `agent_readiness` (ctx_679c6c42c48d). I accepted trust for that one project-local folder, and retried once (ctx_0a03c844a875). Later worktrees: create worktree + terminal first, accept trust, then `worker-start --terminal`.
- Routing plugin inside the worker: not inspected beyond launch; tier tag is carried in the spec text only (the routing mod acts on Claude Code subagents, not Orca dispatches). Model is chosen with `--model`.

| id | task | owner/route (observed) | writable | status / evidence |
|----|------|------------------------|----------|-------------------|
| Z | Zürich profile + 3 layers | Orca claude sonnet, ctx_0a03c844a875 (retry of failed-at-readiness ctx_679c6c42c48d; terminal trust prompt) | data/cities/zurich.json, data/maps/zurich/**, scripts/maps/zurich.mjs | succeeded; worker_done verified; integrated 8569c81; released |
| M | Layer packs Basel/Berlin/Copenhagen | Orca claude sonnet, ctx_d5999ff450ed | data/maps/{basel,berlin,copenhagen}/**, scripts/maps/* | succeeded; integrated 8569c81 (a partial Basel copy had been taken earlier while the worker was live; replaced by the final tree) |
| B | Basel claim revalidation (16 claims) | Orca claude sonnet, ctx_73f3d2398e83 | data/verification/basel-claims.json, docs/session/research/basel-claims.md | succeeded: 10 confirmed, 2 with difference, 4 source-unreachable; integrated |
| D | Sie harmonisation + Street Lab edit persistence | Orca claude sonnet, ctx_cabe53755d44 | wrapper/street-workspace/** | succeeded; integrated; 28 node tests; browser check added (edits survive DE/EN/reload, no leak between places) |
| T | German translation of claim evidence | Claude Code subagent (general-purpose, sonnet), not Orca | data/verification/basel-claims.de.json | completed; spot-read |
| Z2 | Zürich gap closing | Orca claude sonnet, ctx_1e3d47c65640, wt zurich-gaps | data/cities/zurich.json, data/maps/zurich/** | succeeded: sealing derived (28.6 %), sewer text figures, pluvial window, gaps checked; integrated d195e44 |
| L | Legend label polish (Basel/Berlin/Copenhagen) | Orca claude sonnet, ctx_b8ea5e627327, wt legend-polish | data/maps/{basel,berlin,copenhagen}/layers.json | succeeded; integrated d195e44 |
| R1 | Independent review: code, UX, boundaries, bilingual (read-only, deep) | Orca claude opus, ctx_3ed409308961, wt review-R1 @ cf64561e74cc | report only: `../review-artifacts/R1-code-ux.md` (copy: `docs/session/review/R1-code-ux.md`) | **succeeded**; settled, released (Orca: `succeeded`, stage `settled`); worker_done verified; 0 blocker, 4 major, 10 minor |
| R2 | Independent review: evidence validity (re-fetch sources, licences, matrix) | Orca claude sonnet, ctx_ecf97d456313, wt review-R2 @ cf64561e74cc | report only: `../review-artifacts/R2-evidence.md` (copy: `docs/session/review/R2-evidence.md`) | **succeeded**; settled, released; 0 blocker, 3 major, 16 minor; 86/86 quotes verbatim |
| R3 | Focused re-review of the R1/R2 fixes @ cd8b222 (deep, read-only) | Orca claude opus, ctx_67f2fd8c9955, wt review-R3 | report only: `docs/session/review/R3-focused.md` | **succeeded**; settled, released; 0 blocker, 1 major, 10 minor; fixed afterwards |
| R4 | Review of the post-R3 delta @ d74342a (deep, read-only) | Orca claude opus, ctx_596a79a1f0c5, wt review-R4 | `docs/session/review/R4-post-r3.md` | **succeeded**; settled, released; 0 blocker, 1 major, 6 minor; fixed in 5f6eaee |
| R5 | Independent recomputation of the Zürich 28.6 % sealing share (read-only, pinned WFS download) | Orca claude sonnet, ctx_93e0e9044cd2, wt review-R5 | `docs/session/review/zurich-recompute/` | **succeeded**; settled, released; REPRODUCED (qualified) |
| R6 | Review of the delta d74342a..5f6eaee (deep, read-only) | Orca claude opus, ctx_dc16bf3af5b0, wt review-R6 | `docs/session/review/R6-final-delta.md` | **succeeded**; settled, released; 0 blocker, 0 major, 4 minor; last independent review |
| C | Coordinator (this session): contracts, map step, start page, matrix, briefs, browser suite | foreground Claude Sonnet 5.5 | journey/**, tests/**, scripts/**, docs/** | review fixes applied (see Review section) |

Settlement: ctx_679c6c42c48d (failed at agent_readiness, never received its task; replaced by retry) and ctx_c57ea941100f (timeout probe; stopped by `worker-stop`, liveness exited, released) are settled and not live. Orca terminals of finished workers are `retained` (external terminal) but idle.

**Settlement accounting (checked 22:39 CEST against `orca orchestration worker-list --run run_791a78c3c736`):** 15 dispatches in the run: 13 `succeeded` (11 with an external, retained, idle terminal and liveness `unverifiable`, 2 released: ctx_0a03c844a875, ctx_11571b5a7c78), 2 `failed` (ctx_679c6c42c48d at agent_readiness; ctx_c57ea941100f stopped by `worker-stop`, liveness `exited`, released). None is live; no worker started after session 2. `unverifiable` liveness on retained terminals is absence of evidence, not proof of exit; the agents delivered `worker_done` and settled.

**Map-stack decision (rationale):** the map step draws bounded GeoJSON snapshots as SVG. Reasons: city isolation and provenance per file; no third-party tile service or WebGL (works in headless tests and on low-end devices); every drawn feature is also in an accessible table; deterministic tests. The existing MapLibre Data Charter map (Basel only, live swisstopo/Basel-Stadt WMS) is reused unchanged as the 'Evidence' step. Raster/WMS layers are listed with source links but not embedded.

## Independent review (read-only, on cf64561e74cc)

- R1 (Opus 5.5, code/UX/boundaries/bilingual): 0 blocker, 4 major, 10 minor. Report: `docs/session/review/R1-code-ux.md`.
- R2 (Sonnet, evidence validity; re-fetched 86 quotes, 19 layers, 28 matrix cells, 5 Basel verdicts): 0 blocker, 3 major, 16 minor; 86/86 quotes verbatim. Report: `docs/session/review/R2-evidence.md`.
- Both reviewers ran on a worktree at the exact candidate commit and wrote only to `review-artifacts/`; both settled `succeeded`.
- Disposition: see `docs/session/review/DISPOSITION.md`.

## Session 3 — foreground continuation (21:00 CEST start; integration cutoff 23:10; hard stop 23:55)
- **Route:** direct foreground continuation by the coordinator terminal `term_e9cd5b23-b4e9-455c-bb91-8b2e3e913640` (workspace `d1eb1698-9a68-4997-b8fa-ed6e8fcb034b::…/sponge-city-bilingual-evidence-150m`). No Run, Task, Dispatch, subagent, worktree or worker was created. **Orca writable-path isolation and timeout enforcement were not available**, so nothing here is enforced by the runtime; scope was kept by instruction and by `git diff` review before each commit.
- Input commit `ec38100e098d`. Worker settlement: all earlier dispatches settled `succeeded`/released; none live; none started in this continuation.
- Done: matrix cells link the recorded map gaps (incl. pluvial/Basel) and carry visible check-status flags; Basel claim verification states whether an independent reviewer re-checked each claim (partial / sampled / not re-checked). Checks: `tests/city-data.test.mjs`, `tests/verification.test.mjs`, browser check "evidence-state clarity".
- **Independent review:** none after `5f6eaee`; everything after it (ec38100 and this session's commits) is author-tested only.
- Continuation 2 (same foreground route, binding re-verified at c801bb7; no worker): m16 scope/origin qualification, thin-quote labels, stale counts corrected. Isolation/timeout enforcement still unavailable. Independent review still absent after `5f6eaee`.
- Continuation 3 (same foreground route; binding re-verified at e4b37db; no worker): repository-local reproducibility of the Basel tree count plus recorded gaps for 9,046, area percentages and hot days. 34 browser checks. Isolation/timeout enforcement still unavailable; no independent review after `5f6eaee`.
- Continuation 4: author self-audit (not independent) of 5f6eaee..8b22429; two reproduced defects fixed with mutation-checked tests (see DISPOSITION). Same foreground route; no worker; isolation/timeout enforcement unavailable.
- Continuation 5: rapid-transition audit (author-only): cache race found and fixed, new concurrent-transitions browser check, three mutations detected. 36 browser checks, 73 node tests, smoke passes. Same foreground route; no worker; isolation/timeout enforcement unavailable; no independent review after `5f6eaee`.
- Continuation 6: mobile table equivalence, export state and bilingual parity audited (author-only); no defect found; 3 new checks with mutation proof; 77 node tests, 38 browser checks. Same foreground route; no worker; isolation/timeout enforcement unavailable; no independent review after `5f6eaee`.

## Accounting notes (added in the final pre-cutoff pass)
- **No enforced controls:** Orca writable-path isolation and timeout enforcement were never available (`--timeout-ms` is a start-wait; workers launch with permissions bypassed). Scope was held by separate worktrees, written instructions, supervisor-side `worker-stop` and `git diff` review, not by enforcement. Same-model reviewers (Claude Opus/Sonnet) reviewed Claude-authored work.
- **Observable usage:** the Orca CLI exposed no quota or usage reading. The Claude TUI displayed **82 % weekly usage at 21:18 CEST**: provider-level and timestamped, separate from per-call usage, which was not observable (one Claude Code subagent reported 55,183 tokens for the claim-evidence translation; Orca workers reported none).
- **Other repositories (operator accounting, not verified by this session's Sponge work):** a crossed Weavr terminal was released only after its clean scratch clone, no child-agent rows and no OS descendants were verified; Weavr trial 0002 was never started. **Weavr2 (superseded earlier statement that PR #25 stays at `0179d2e`):** an independent, already-existing corrected-workspace run `run_634f7cb37f8d` later advanced `blackmath88/weavr2` PR #25 to `ddcd1c29f60539b1029a45551852442fa6c18368`, isolated from Sponge, with `npm run check` 114/114 and the demo at zero deviations; its implementation dispatch `ctx_3eb018b770c4` succeeded and was released, but its review dispatch `ctx_b7b110562f60` exited **failed** and remains external-retained, so **there is no passing independent review of that PR**. That work is not Sponge work and was not edited, reviewed or verified here (operator accounting). No Weavr or Weavr2 repository was touched by the Sponge changes.
- **Review status:** the last independent review covered `5f6eaee` (R6). Everything after it is author-tested only, including the two author self-audits and the rapid-transition, mobile, export and bilingual checks.
- **Unresolved evidence flags (unchanged):** Basel area percentages, the 9,046 paved-polygon count and the hot-day counts are not reproduced from repository data (recorded gaps); the four unreachable Basel sources; no-public-evidence searches not independently repeated; Zürich canopy raster not computed; Zürich sealing is this project's own computation; thin quotes (Copenhagen listing facet text, Zürich terms reference); R2 m15 remainder.
