# Product consolidation — 27 October 2026

## Decision and authority

The repository owner explicitly requested merging sensible work into main and a README overview of current state and direction. This integration consolidates existing product work; it does not dispatch a mission, accept V2 research, waive scientific evidence requirements or deploy a website.

No Observatory setup or agent instruction file was present in the inspected product line. The canonical Weavr operating contract was read from `blackmath88/weavr/docs/CHATGPT-OPERATING-CONTRACT.md`. No live Weavr/Orca read tool was exposed in this session. The V2 branch's portable mission and run report are repository evidence only, not a verified current runtime projection. Their Task D acceptance and Stage 1 implementation gate remain untouched.

## Reviewed inputs and disposition

| Branch / PR | Pinned head | Disposition |
| --- | --- | --- |
| `main` | `110c6b9607468f71490a0234db4a676a716ba70b` | Preserve history and public repository header; replace obsolete product overview |
| `feat/post-hackathon-consolidation` / #4 | `3aeca877df20cb94bec98a1c6c9145769f4e51cd` | Integrate product foundation, attribution and original archives |
| `blackmath88/sponge-city-bilingual-evidence-150m` / #6 | `8b5b05be08427cf21ce24d081288c9591a87fa9a` | Integrate DE/EN four-city product, map, source flags and exports |
| `blackmath88/studio-1a-state` / #12 | `9d2bb32364fc42ecfb79f8bebafed5c166059cdb` | Integrate isolated state-only foundation; no editor or completed Studio claim |
| `docs/product-v2-orca-orchestration` / #5 | `9efebe7d98627f9a54170a0bfe19e596cee4d557` | Retain separately as draft architecture/orchestration proposal; do not merge or dispatch |
| `feat/adaptive-interface-orchestration` / #3 | `ab4fe3ca689108eb4a1c3b6477fc125e1022345e` | Superseded: adaptive implementation already preserved in #4; current demo adds evidence boundary and corrected paths |
| `feat/sponge-street-explainer` / #2 | `3200bb273e7923823f6e1bf6b2bfcd3181ab5dd9` | Superseded: explainer HTML preserved byte-for-byte in `wrapper/prototypes/sponge-street/index.html` |
| `feat/data-charter-map` | `99ee7f669f49cf834bdd533afcc39c5057d1f5e0` | Superseded: migrated to `wrapper/data-charter-map/`, with subsequently qualified source/missingness claims |
| `feat/sponge-facts` | `4a0ff1ca0be583da1c00538395ed9f09cae58c64` | Superseded: fact catalogue retained and subsequently corrected/qualified |
| `claude/lucid-bell-0m6sdz` | `5f05ded82c13a49568f9c3a7e56fe590e08d4275` | Historical state-engine attempt already incorporated into #3 and preserved in the original archive |
| `ccr-c43cde30-2iw2xj` / merged #1 | `450a4eeebf1cdcc109079431d915926aa7909fc7` | Already in main history |

Retired branches above are not alternative product baselines. Use main. Their refs have not been deleted: the available GitHub connector exposes no delete-ref operation and the local shell has no GitHub push credentials. Ref removal is pending, not reported as completed. Keep the V2 branch until a separate architecture decision. Original pre-offboarding source snapshots and hashes remain under `archive/`.

## Integration review

- Reviewed dependency graph: #6 and #12 both derive from #4, independently of #5.
- The only conflict with current main is README content; preserve its public header and replace old instructions/status with a current overview.
- Studio additions are confined to `wrapper/street-workspace/src/studio/**` and six test files. They do not modify current product UI, canonical evidence or either effects engine.
- Studio state is explicitly illustrative, fixed schematic slots without surveyed geometry, immutable baseline, independent A/B proposals, guarded persistence and untrusted-input parsing. No new numeric benefit/scoring model is introduced.
- Existing place-scoping, export fingerprints, bilingual parity, provenance and illustrative-model boundaries remain covered by the consolidated suites. No scientific claim is promoted by this merge.
- Future Opportunity Explorer and rainfall composition remain planned. The broader integration gate #11 remains open; the Studio UI/feature-wide acceptance is not implied by accepting state logic.

## Verification

Executed on the combined local product tree (current main history + #6 + #12):

```sh
make smoke
```

**Pass:** static build, TypeScript no-emit check, 258 Node tests across consolidated suites, evidence/catalogue/profile/module checks and exact Basel pinned-tree recomputation. The original README was then rewritten and this decision record added; a final smoke pass verifies the deliverable tree.

Fresh browser attempt used the existing acceptance script with the installed Playwright package. **Blocked before launch:** no Chromium executable is installed. Playwright's browser installer returned a truncated/non-ZIP download and failed. No fresh layout, keyboard, reduced-motion or browser-language result is claimed. PR #6 records historical 38/38 Chromium checks on its product code. Existing screenshots and review disposition are retained, not relabelled as fresh review.

No Safari, Firefox, screen-reader or physical-device verification was performed. Scientific caveats in `data/verification/` and `docs/session/review/DISPOSITION.md` remain open, including missing inputs for several Basel claims. The final combined tree has deterministic integration review by this assistant, not a new independent browser/scientific review.

## Recommended next slice

Finish one visible Studio path (DE/EN, keyboard-accessible schematic editor, A/B comparison and proposal export), then ground one Basel place through Opportunity Explorer, then opt into the existing rainfall-learning engine through a typed assumption-carrying adapter. These are recommendations, not dispatched missions or accepted V2 implementation.
