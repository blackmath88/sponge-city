# TODO: data gap to decision

Status: narrow Street X-Ray slice implemented; broader automation remains future work.

## Narrow slice now implemented

`wrapper/street-xray/` now proves the core interaction for one illustrative
Klybeck study segment: known context, bounded hypotheses, explicit blockers, a
verification rehearsal and a printable Evidence Passport. It deliberately does
not implement imagery extraction, automated gap investigation, a city-wide
pipeline or a new cross-team handoff contract. Those broader tasks remain on
this list.

## Product thesis

For a selected Basel street, show:

1. what is observed;
2. what can be responsibly derived or estimated;
3. what remains unknown;
4. which unknowns require a lawful data source or site visit;
5. how resolving a gap could change an intervention's assessment.

The resulting experience should connect the Data Charter, site scoping and
Street Lab without presenting an illustrative scenario as an engineering
recommendation.

## Proposed future contract

Introduce a versioned `StreetEvidenceProfile` between `CandidateArea` and
`StreetScenarioSeed`. Each decision-relevant value should carry:

- value and unit, with `unknown` as a valid state;
- geometry or spatial reference;
- observation time or scenario year;
- source and licence;
- method: observed, derived, image-inferred, modelled, assumed or unknown;
- confidence and validation status;
- spatial and temporal resolution;
- limitations;
- permitted use: explain, screen, prioritise or design.

## Three decision questions

| Dimension | Question | Boundary |
| --- | --- | --- |
| Need | Why investigate this street? | A screening signal is not a risk rating. |
| Possibility | What might physically fit? | Visible space is not buildable space until utilities, ownership, access and ground conditions are checked. |
| Potential effect | What mechanism could change? | A directional scenario is not calibrated performance. |

## Intervention assessment

An intervention should expose one of four states:

- `candidate`;
- `requires-investigation`;
- `excluded`;
- `not-applicable`.

The assessment must list supporting evidence, conflicting evidence, unresolved
checks and the decision that the current evidence is permitted to support.

## Gap investigator

A future AI-supported gap investigator may:

- identify the missing fact currently blocking a decision;
- point to a lawful source or reproducible derivation;
- propose a field check when remote evidence is insufficient;
- explain how the result could change the intervention state;
- surface disagreements between mapped and image-inferred observations as
  review tasks.

It must not invent geometry, underground conditions, feasibility or quantified
benefits.

## Imagery boundary

Street imagery can support visible-surface observations such as a paved verge,
planted strip, tree pit, curb, visible drain or obstruction. It cannot establish
utility clearance, drainage connections, soil permeability, contamination or
groundwater clearance.

Before retaining frames or running extraction, document the source's licence
and permitted use. Preserve source, capture date, method and confidence with
every image-derived observation.

## Bounded next slice

When the team chooses to work on this topic:

1. select one real Basel street segment;
2. formalise `street-evidence-profile/v0`;
3. populate only defensible fields and preserve unknowns;
4. map it into an explicitly illustrative `StreetScenarioSeed`;
5. show at least one candidate intervention and its unresolved checks;
6. add tests proving that unknown does not silently become zero, safe or
   suitable.

Do not build a new score, computer-vision pipeline or recommendation engine
before this contract is proven end to end.
