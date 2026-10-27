# Research method

This repository contains fast hackathon research, including AI-assisted research. Treat it as an evidence pipeline, not as a pile of authoritative prose.

## Status labels

Use one of these when a distinction matters:

- **VERIFIED** — checked against a primary/official source during the research pass.
- **INTERPRETATION** — our framing or architectural reading.
- **SPECULATIVE** — plausible direction worth testing.
- **VERIFY** — useful lead whose details still need confirmation.

## Promotion rule

Before a research note becomes a product claim, implementation constraint or pitch claim:

1. identify the source;
2. check freshness / date;
3. check whether the source is primary;
4. verify licence / reuse constraints where relevant;
5. check spatial and temporal scope;
6. distinguish measurement, model, forecast and derived value;
7. record what the evidence does **not** establish.

## Repositories / prior art

Before copying code or adopting a library, verify:

```text
repository
licence
last meaningful maintenance
runtime / dependencies
security posture
exact reusable module
whether reuse is actually faster than reimplementation
```

Do not copy from a repository merely because an AI research pass mentioned it.

## AI-assisted research

AI is useful for:

- discovering adjacent domains;
- proposing search terms;
- mapping similar technical patterns;
- summarising documentation;
- proposing intermediate representations;
- finding possible joins.

AI should not silently promote:

- an unverified licence;
- a guessed repository path;
- a causal connection;
- a planning/engineering rule from another city into a Basel requirement;
- an aggregate statistic into a person-level conclusion.

## Cross-source consistency checks

When multiple sources expose related facts, compare them. Disagreement is information.

Example from the Rhine research: BAFU and Port of Switzerland expose related Basel gauge information, and the relationship itself can be checked. This is more useful than simply choosing one source.

## Negative results belong in the repo

Record:

- datasets that cannot support the intended claim;
- missing causal links;
- incompatible time periods;
- absent identifiers;
- unavailable licences;
- failed joins;
- rejected assumptions.

A hackathon result can improve when a tempting but unsupported conclusion is removed.
