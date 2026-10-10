# Delivery ledger — bilingual evidence session

Start **2026-10-10 14:26 CEST**. Integration cutoff 16:26, hard stop 16:56. Not accepted Weavr execution; the gated V2 Mission is untouched.

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
# Session 2 — multicity + maps (started 2026-10-10 16:15:48 CEST; deadline 23:15; final 45 min from 22:30)

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
| R1 | Independent review: code, UX, boundaries, bilingual (read-only, deep) | Orca claude opus, ctx_3ed409308961, wt review-R1 @ cf64561e74cc | report only: ../review-artifacts/R1-code-ux.md | running |
| R2 | Independent review: evidence validity (re-fetch sources, licences, matrix) | Orca claude sonnet, ctx_ecf97d456313, wt review-R2 @ cf64561e74cc | report only: ../review-artifacts/R2-evidence.md | running |
| C | Coordinator (this session): contracts, map step, start page, matrix, briefs, browser suite | foreground Claude Sonnet 5.5 | journey/**, tests/**, scripts/**, docs/** | in progress |

Settlement: ctx_679c6c42c48d (failed at agent_readiness, never received its task; replaced by retry) and ctx_c57ea941100f (timeout probe; stopped by `worker-stop`, liveness exited, released) are settled and not live. Orca terminals of finished workers are `retained` (external terminal) but idle.

**Map-stack decision (rationale):** the map step draws bounded GeoJSON snapshots as SVG. Reasons: city isolation and provenance per file; no third-party tile service or WebGL (works in headless tests and on low-end devices); every drawn feature is also in an accessible table; deterministic tests. The existing MapLibre Data Charter map (Basel only, live swisstopo/Basel-Stadt WMS) is reused unchanged as the 'Evidence' step. Raster/WMS layers are listed with source links but not embedded.
