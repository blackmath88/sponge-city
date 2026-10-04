# Architecture decision records

ADRs capture decisions that should survive the hackathon conversation and explain why the code has its current shape.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-build-one-vertical-slice-first.md) | Build one end-to-end vertical slice first | Accepted |
| [0002](0002-separate-evidence-domain-simulation-and-renderer.md) | Separate evidence, domain, simulation and rendering | Accepted |
| [0003](0003-use-react-svg-for-the-mvp-renderer.md) | Use React/SVG rather than Phaser for the MVP renderer | Accepted |
| [0004](0004-use-versioned-provenance-bearing-handoffs.md) | Use versioned, provenance-bearing handoffs | Accepted |
| [0005](0005-treat-routing-as-evidence.md) | Treat routing as evidence and preserve unknowns | Accepted |
| [0006](0006-bound-computational-gap-filling.md) | Bound computational gap filling by evidence class and permitted use | Accepted |
| [0007](0007-data-charter-inferences-are-typed-claims.md) | Data Charter inferences are typed claims; the site handoff stays closed to them | Accepted |
| [0008](0008-street-xray-is-an-evidence-gate.md) | Street X-Ray is an evidence gate, not a recommendation engine | Accepted |
| [0009](0009-computed-street-profile-and-assessment-engine.md) | Computed street profile and deterministic assessment engine for Street X-Ray | Accepted |

Create a new ADR when a decision changes system boundaries, data authority, claim level, runtime topology or a major technology choice. Supersede old decisions instead of rewriting their history.
