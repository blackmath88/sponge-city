# Research backlog

Questions that are still open enough to materially change what the team could build.

This is intentionally not prioritised by product idea.

## Cross-cutting

- Verify licences, maintenance and exact reusable modules for prior-art repositories before copying code.
- Check whether the Hack am Rhein judging criteria reward working interaction, evidence quality, novelty, or concept equally.
- Inspect the Open Data Basel-Stadt GitHub organisation for reusable ingestion/API patterns.
- Decide where open-world vs closed-world assumptions can actually be justified from source completeness.
- Identify which research claims need a primary-source check before appearing in a demo or pitch.

## Life Sciences

- Which named ecosystem resources expose structured APIs or stable HTML?
- Do Zefix, Basel registers and ecosystem directories share identifiers?
- Can eligibility requirements be represented as typed records without over-simplifying them?
- Which capability dependencies are genuinely shared across startups versus merely common anecdotes?
- How fresh are funding/programme deadline details?

## Sponge City

- Find Basel-specific planning/approval guidance for unsealing, infiltration, tree pits, retention and green roofs.
- Find data on planned roadworks, district heating, sewer work, tram works or public-space renewal.
- Test whether these planned-works layers can be spatially joined with heat/runoff/canopy need.
- Identify a small intervention library with sourced effect ranges.
- Decide which intervention effects can be simulated defensibly:
  - runoff / retention;
  - sealed surface;
  - canopy / shade;
  - heat;
  - biodiversity;
  - cost / complexity.
- Avoid one universal score unless the objective function is explicit.
- Check temporal compatibility of Basel-Stadt / Basel-Landschaft climate layers.

## Basel at 38°

- Confirm spatial resolution and privacy constraints for age/population data.
- Check completeness and opening-hours quality of cool-room/cool-place data.
- Check if shade/canopy data can support route-level decisions.
- Verify licences and code quality of shade-routing prior art.
- Explore "coverage gap" metrics that do not imply person-level risk.
- Determine what a care team can actually act on at 08:00.

## Rhine

- Find a sourced relationship between Basel/Upper Rhine gauge values and actual shipping constraints.
- Determine whether the challenge's factory supply route is meaningfully exposed to those constraints.
- Identify historical disruption labels, if any.
- Build point-in-time data semantics before any replay/backtest.
- Check whether BAFU historical percentiles are sufficient for anomaly detection without a predictive model.
- Verify operational SOP / cold-chain rules before compiling them into decision logic.
- Separate independent disruption pathways (river, road traffic, weather) instead of collapsing them into one score.

## Technical patterns to verify

- GoRules ZEN for transparent decision tables.
- CEL as a restricted typed expression layer.
- OPA / Cedar where policy-as-code is genuinely useful.
- Z3 unsat cores for explanation of conflicting constraints.
- W3C PROV / `prov` for claim and transformation provenance.
- PySTAC / STAC as a spatial evidence catalogue pattern.
- DuckDB Spatial for deterministic overlays.
- DuckDB `ASOF JOIN` / pandas `merge_asof` for point-in-time replay.
- SimPy only if discrete-event simulation actually adds value.

## Research anti-goals

Do not spend hackathon time proving an abstraction is universal.

Do not add an engine because it is intellectually attractive.

Do not promote another city's engineering rule into a Basel requirement without checking it.

Do not confuse a missing record with evidence of absence unless completeness is explicit.
