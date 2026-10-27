# ADR 0003: Use React/SVG for the MVP renderer

- Status: Accepted
- Date: 2026-10-03

## Context

The Phaser prototype proved that animated weather and an explorable street can be engaging. The product, however, is an explanatory interface with text, evidence, controls, comparison and accessible interaction—not a game loop. Phaser added a large runtime and encouraged scene-owned logic, while the street itself is mostly structured geometry and labelled flows.

## Decision

Use React and SVG/HTML for the MVP renderer. The component receives `StreetScenario` and `SimulationSnapshot` and projects them into labelled zones, assets and water connections. Animation is progressive enhancement through CSS.

Phaser is retained as prior exploration in repository history, not as the MVP runtime architecture.

## Consequences

- Visual elements remain inspectable DOM nodes and work with keyboard and reduced-motion preferences.
- Evidence panels, controls and diagrams share one React composition model.
- The production bundle loses the Phaser runtime.
- Complex particle systems, physics and free camera movement are harder; they are not required by the MVP.
- A richer renderer may be added later behind the same input contract if it earns its complexity.
