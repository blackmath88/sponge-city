# Sponge City V2 orchestration run

This is an execution/provenance snapshot for Weavr Mission `sponge-city-v2-reconciliation`. It is not the canonical research database and it is not a Task D implementation packet.

## Runtime snapshot

- Orca `1.4.218`: running; desktop runtime and graph reported `ready`.
- Weavr commit: `aafbf0c` on `main`.
- Sponge City branch: `docs/product-v2-orca-orchestration`, based on PR #4 and updating PR #5.
- Weavr runner: not online in the checked shell. `WEAVR_CLOUD_URL`, `WEAVR_API_TOKEN` and `WEAVR_RUNNER_TOKEN` were absent, and setup doctor reported adapter `direct` with `claude` only.
- Expected `WEAVR_EXECUTION_ADAPTER=orca` and `WEAVR_WORKHORSES=claude,codex`: not active in the checked shell.
- `WEAVR_ORCA_ALLOW_RUN_CREATE`: unset, as required. The operator created the live Run explicitly from an Orca coordinator terminal; the Weavr adapter was not permitted to create one implicitly.

## Worker connectivity

| Worker | Classification | Evidence | Consequence |
|---|---|---|---|
| Nebu / Morrow | `CONFIGURED_BUT_UNPROVEN` for the Weavr→Orca path | The governed Morrow service and Qwen3-14B model are healthy, and a direct `compute.analyze` call completed on Intel Arc Pro B60. Orca does not advertise a `morrow` agent ID, so Orca-owned launch is not proven. | Task A evidence is real but the missing Orca launch adapter remains a boundary blocker. |
| Perplexity | `NOT_CONNECTED` | No `perplexity`/`pplx` executable, Orca agent, or Weavr adapter was found. | Task B is `blocked`; no research result was fabricated. |
| Claude | `NOT_CONNECTED` | Claude CLI is installed, but Orca reports an expired OAuth token. | Task C cannot be dispatched even after dependencies settle until authentication is refreshed. |
| Codex | `CONFIGURED_BUT_UNPROVEN` | Codex CLI has working system OAuth. Orca launched Dispatch `ctx_ec9208bd9273` with effective provider `codex` / `gpt-5.6-sol`, but the bounded read-only probe produced no final result and was stopped after repeated waits. | Launch is proven; end-to-end settlement is not. Stage 1 Task E remains gated and undispatched. |

`CONNECTED` here means callable through the intended Orca worker lifecycle. A healthy direct service alone is insufficient.

## Live Orca projection

- Run: `run_79dab8a8e83e`
- Workspace: `d1eb1698-9a68-4997-b8fa-ed6e8fcb034b::/home/achim/Documents/Codex/2026-10-06/files-pasted-by-the-user-you/work/sponge-city`
- Task A / Nebu / `READING`: `task_6241a9d04b30` — Orca Task completed, worker result `partial`.
- Task B / Perplexity / `SCOUTING`: `task_c210d7c4fade` — blocked, adapter missing.
- Task C / Claude / `SPARRING`: `task_a5dec4577a0d` — pending on A+B; Claude auth also stale.
- Task D / Weavr / `WEAVING`: `task_0f0298346df4` — pending on A+B+C.
- Task E / Codex / `BUILDING`: `task_aeb1ba718d61` — pending on D and explicit human acceptance.

The current canonical decision is: **do not dispatch Stage 1 implementation**.

## Visibility boundary

Orca already exposes Run, Task, dependency, Dispatch, effective provider, transcript, worker settlement and terminal lifecycle. The portable task snapshot adds semantic labels, latest evidence summaries, blocked reasons and budget provenance for the Mission view. Weavr owns the canonical decision and evidence promotion. No new dashboard is required.

## Delegation evidence

### Morrow

The live governed call used `compute.analyze`, model `qwen3-14b-q4_k_m`, an 8,192-token context, and produced a 5,234-token request/result total. The normalized result is in `docs/orchestration/results/task-a-nebu.json`; `accepted_by_weavr` is `false`.

### Perplexity

No call was made because no callable adapter exists. Task B records the missing executables and missing Orca agent support as its blocked evidence.

### Claude

No architecture review was dispatched. Task B has not settled successfully and Claude OAuth is stale. Both conditions are visible rather than replaced with a mock review.

### Codex

The connectivity proof was a separate, read-only Orca worker task (`task_850993c932d9`, Dispatch `ctx_ec9208bd9273`). Orca created the Codex terminal, accepted input and observed the exact live worker, but no normalized result or `worker_done` arrived after repeated waits. The operator stopped and released the worker. This proves launch, not end-to-end delegation, and it did not execute Task E or product work.

## What remains

1. Add a credential-safe Perplexity adapter and rerun Task B.
2. Refresh Claude OAuth, then dispatch Task C after A and B complete.
3. Run Weavr synthesis and independent verification for Task D.
4. Ask the human to accept or reject Task D.
5. Only after acceptance, dispatch Task E to Codex.
