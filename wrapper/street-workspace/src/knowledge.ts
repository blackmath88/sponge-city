import type { InterventionPlan, MechanismClaim, StreetScenario } from "./types.ts";

export const DATA_READINESS = [
  {
    label: "Street surfaces",
    state: "available",
    detail: "Basel cadastral land cover · dataset 100477",
    href: "https://data.bs.ch/explore/dataset/100477/",
  },
  {
    label: "Trees",
    state: "available",
    detail: "Basel tree cadastre · dataset 100052",
    href: "https://data.bs.ch/explore/dataset/100052/",
  },
  {
    label: "Groundwater protection",
    state: "available",
    detail: "Protection zones · dataset 100292",
    href: "https://data.bs.ch/explore/dataset/100292/",
  },
  {
    label: "Sewer & gullies",
    state: "gap",
    detail: "Not available as open street-scale data",
  },
] as const;

export const DESIGN_SOURCES = [
  {
    label: "NACTO · bioretention inlet design",
    geography: "International guidance",
    href: "https://nacto.org/publication/urban-street-stormwater-guide/stormwater-elements/bioretention-design-considerations/inlet-design",
  },
  {
    label: "STEP · curb-cut inlet guidance",
    geography: "Ontario guidance · not Swiss",
    href: "https://wiki.sustainabletechnologies.ca/wiki/Inlets",
  },
] as const;

export function explainMechanisms(
  plan: InterventionPlan,
  scenario: StreetScenario,
): MechanismClaim[] {
  const routingState = scenario.evidence.routing.state === "observed" ? "supported" : "illustrative";
  return [
    {
      id: "store",
      label: "STORE",
      active: plan.rainGarden,
      state: "illustrative",
      explanation: plan.rainGarden
        ? "The garden holds water until its illustrative 12 m³ storage is full."
        : "There is no surface storage in the sealed baseline.",
      drivers: plan.rainGarden ? ["garden.capacityM3"] : ["sealed baseline"],
    },
    {
      id: "absorb",
      label: "ABSORB",
      active: plan.rainGarden,
      state: "illustrative",
      explanation: plan.rainGarden
        ? "Stored water enters the soil at the demo infiltration rate."
        : "Sealed surfaces provide no infiltration path in this model.",
      drivers: plan.rainGarden ? ["garden.infiltrationM3PerHour", "garden-soil"] : ["sealed baseline"],
    },
    {
      id: "slow",
      label: "SLOW",
      active: plan.connected,
      state: routingState,
      explanation: plan.connected
        ? "The kerb opening redirects upstream runoff through the garden before overflow reaches the drain."
        : plan.rainGarden
          ? "The garden is isolated, so street runoff still bypasses it."
          : "Runoff follows the assumed direct route to the drain.",
      drivers: plan.connected ? ["runoff-outlet → garden", "garden-overflow → drain"] : ["runoff-outlet → drain"],
    },
  ];
}
