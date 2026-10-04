# Technical patterns & prior art

Research inventory for reusable technical primitives. These are **not architecture decisions**.

Some repository details below came from exploratory research and still require live verification before adoption.

## 1. Typed rules / policy-as-code

Useful when a challenge has explicit conditions and a bounded action set.

Candidates:

| Project | Potential use | Status |
|---|---|---|
| Open Policy Agent (OPA) | policy evaluation / validated rules | VERIFY fit |
| Cedar | schema-checked policy language | VERIFY fit |
| CEL | typed, restricted expressions | VERIFY fit |
| GoRules ZEN | decision tables / JSON decision models | VERIFY fit |
| Soufflé | compiled Datalog | probably heavy for hackathon |
| Cozo | graph store + Datalog | VERIFY maintenance/fit |

General pattern:

```text
human / institutional prose
→ AI proposes typed rule
→ schema / vocabulary validation
→ human reviews diff
→ deterministic evaluator
→ trace
```

The model should not be in the evaluation path.

---

## 2. Dependency graphs & constraint solving

Useful for prerequisites, capabilities, capacity or intervention combinations.

Candidates:

| Project | Primitive |
|---|---|
| NetworkX | dependency graph, topological order, blockers |
| OR-Tools | CP-SAT / routing / set-cover |
| Z3 | SMT constraints + unsat cores |
| clingo | answer-set programming |
| MiniZinc | solver-neutral modelling |
| HiGHS / SciPy MILP | linear / mixed-integer optimisation |

Important distinction:

- simple prerequisite logic may only need a graph;
- capacity/allocation needs a solver;
- explanation can benefit from conflict/unsat information.

---

## 3. Provenance & evidence

Candidates:

| Project / standard | Primitive |
|---|---|
| W3C PROV | Entity / Activity / Agent provenance model |
| `prov` Python package | PROV-JSON / PROV-N / RDF |
| RDFLib | RDF graph + SPARQL |
| pySHACL | graph/shape validation |
| OpenLineage | datasets/jobs/runs lineage shape |
| in-toto attestation | subject + predicate envelope |
| RO-Crate | packaged research/data provenance |

Useful rule:

> Provenance records where a claim came from. It does not prove the claim is true.

For AI-extracted claims, preserve:

- source document/span;
- model/tool identity;
- extraction timestamp/version;
- verification status;
- human/deterministic attestation when available.

---

## 4. Spatial evidence: STAC / OGC / geometry

Candidates:

| Project / standard | Primitive |
|---|---|
| STAC | catalogue envelope for spatial/temporal assets |
| PySTAC | create / validate STAC objects |
| pygeoapi | OGC APIs |
| Shapely | deterministic geometry predicates / overlays |
| DuckDB Spatial | SQL-style spatial joins and analytics |
| OWSLib | WMS/WFS clients |

Important boundary:

> STAC describes and locates evidence. It does not reason about whether two layers support a decision.

Spatial compute should remain a specialised engine underneath the shared evidence contract.

---

## 5. Historical replay / backtesting

Useful for Rhine and potentially heat-warning scenarios.

A minimal engine needs:

```text
ordered events
+ point-in-time / knowledge-time semantics
+ injected clock
+ versioned rules
+ decision log
```

The hard problem is **hindsight leakage**: a decision at time T may only use information that was available at T.

Candidate primitives:

| Project / primitive | Potential use |
|---|---|
| DuckDB `ASOF JOIN` | point-in-time joins |
| pandas `merge_asof` | small replay engine |
| SimPy | discrete-event simulation |
| NautilusTrader / Zipline | reference architecture for point-in-time backtests |
| XTDB | bitemporal concepts, probably too heavy |
| Temporal | deterministic workflow replay concepts, too heavy for direct adoption |

Research conclusion: for a 48h hack, a transparent custom replay loop may be better than adopting a full financial backtesting framework.

---

## 6. Open-world vs closed-world semantics

This is a cross-cutting design issue.

Example:

```text
"No cool room appears in the dataset"
```

can mean:

- **open world:** we do not know whether one exists;
- **closed world:** the catalogue is complete, therefore none exists.

The system must not silently switch between those meanings.

This is the same family of problem as:

> unknown ≠ clean

A missing value should only become negative evidence when completeness has been explicitly established.

---

## 7. Shared contract, specialised engines

A useful envelope discovered in research:

```text
FACT
RULE
CONSTRAINT
DECISION
TRACE
```

A FACT may carry:

- predicate;
- subject;
- value + unit;
- place/geometry;
- valid time;
- known-at time;
- evidence/provenance;
- open/closed-world status.

This does **not** imply one universal engine.

Likely engines remain separate:

- rule evaluator;
- graph;
- optimiser;
- spatial overlay;
- replay engine.

The contract can unify evidence and explanation without pretending the computations are the same.
