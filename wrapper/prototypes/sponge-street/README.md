# Sponge Street

## Question

How does an old European street become a connected sponge, one intervention at a time?

## Prototype role

This standalone explainer turns sponge-city infrastructure into a lived city section: roof, downpipe, sidewalk, tree, parking bay, road, storage and sewer. It is an interaction and visual-language prototype for the SpongeSquad project, not the production application.

Users can:

- follow a suggested twelve-state transformation;
- switch interventions independently;
- see which measures depend on one another;
- compare steady rain, heavy rain and cloudburst conditions;
- inspect trade-offs and source links.

The water shares and heat indicator are explanatory scenario values. They demonstrate direction and system relationships, not the measured performance of a Basel street. Site-level decisions still require soil, groundwater, utility, ownership, maintenance and hydraulic evidence.

## Files

- `index.html` — standalone prototype; open it directly in a browser
- `smoke.mjs` — deterministic tests for the state ladder and illustrative model

## Check

```sh
node prototypes/sponge-street/smoke.mjs
```

## Architecture

See [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the relationship between site scoping, the street-world model, interventions, simulation, rendering and the decision pathway.
