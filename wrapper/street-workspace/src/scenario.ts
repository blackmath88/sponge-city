import type { CandidateSiteContext, StreetScenario, Zone } from "./types.ts";

export function createDemoStreet(site?: CandidateSiteContext): StreetScenario {
  const bands: [Zone["kind"], string, number][] = [
    ["building", "Roof catchment", 8],
    ["sidewalk", "North sidewalk", 3],
    ["parking", "Three parking spaces", 2],
    ["road", "Street", 10],
    ["parking", "South parking", 2],
    ["sidewalk", "South sidewalk", 5],
  ];
  let y = 0;
  const zones: Zone[] = bands.map(([kind, label, height], i) => {
    const zone: Zone = {
      id: `zone-${i}`,
      kind,
      label,
      rect: { x: 0, y, width: 60, height },
      ownership: "unknown",
      parkingSpaces: kind === "parking" ? 3 : 0,
    };
    y += height;
    return zone;
  });
  return {
    id: "demo-street",
    label: "A street, connected",
    evidence: {
      classification: "illustrative",
      routing: {
        state: "assumed",
        note: "No open Basel sewer or gully network was found. Demo runoff routes are assumptions, never inferred from the selected candidate.",
      },
      site: site ? structuredClone(site) : undefined,
      assumptions: [
        "Synthetic 60 × 30 m schematic, not a surveyed Basel street.",
        "All baseline catchments are sealed; rainfall is uniform, with no evaporation or travel delay.",
        "The garden replaces one 120 m² parking strip: 12 m³ storage and 4 m³/h infiltration.",
        "Three displaced parking spaces are a scenario assumption. Ownership and feasibility are unknown.",
        "Sewer is an unlimited sink. This model does not estimate flooding, heat or engineering suitability.",
      ],
    },
    zones,
    surfaces: zones.map((z) => ({
      id: `surface-${z.id}`,
      zoneId: z.id,
      material:
        z.kind === "building"
          ? "roof"
          : z.kind === "sidewalk"
            ? "paving"
            : "asphalt",
    })),
    assets: [
      {
        id: "downpipe",
        kind: "downpipe",
        zoneId: "zone-0",
        position: { x: 43, y: 6 },
        nodeId: "downpipe",
      },
      {
        id: "drain",
        kind: "drain",
        zoneId: "zone-3",
        position: { x: 51, y: 20 },
        nodeId: "drain",
      },
    ],
    nodes: [
      ...zones.map((z) => ({
        id: `catchment-${z.id}`,
        kind: "catchment" as const,
        label: z.label,
        surfaceId: `surface-${z.id}`,
        areaM2: z.rect.width * z.rect.height,
        position: { x: 15, y: z.rect.y + z.rect.height / 2 },
      })),
      {
        id: "downpipe",
        kind: "conveyance",
        label: "Downpipe",
        position: { x: 43, y: 6 },
      },
      {
        id: "runoff",
        kind: "conveyance",
        label: "Surface runoff",
        position: { x: 35, y: 18 },
      },
      {
        id: "drain",
        kind: "conveyance",
        label: "Drain",
        position: { x: 51, y: 20 },
      },
      {
        id: "sewer",
        kind: "sewer",
        label: "Sewer",
        position: { x: 57, y: 28 },
      },
      { id: "soil", kind: "soil", label: "Soil", position: { x: 57, y: 12 } },
    ],
    connections: [
      ...zones.map((z) => ({
        id: `rain-${z.id}`,
        from: `catchment-${z.id}`,
        to: z.kind === "building" ? "downpipe" : "runoff",
        kind: "flow" as const,
      })),
      { id: "roof-outlet", from: "downpipe", to: "runoff", kind: "flow" },
      { id: "runoff-outlet", from: "runoff", to: "drain", kind: "flow" },
      { id: "drain-outlet", from: "drain", to: "sewer", kind: "flow" },
    ],
  };
}
