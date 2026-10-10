import type { InterventionPlan, MechanismClaim, StreetScenario } from "./types.ts";
import { translate, type Lang } from "./i18n.ts";

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
  lang: Lang = "en",
): MechanismClaim[] {
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const routingState = scenario.evidence.routing.state === "observed" ? "supported" : "illustrative";
  return [
    {
      id: "store",
      label: t("mech.store.label"),
      active: plan.rainGarden,
      state: "illustrative",
      explanation: plan.rainGarden
        ? t("mech.store.on")
        : t("mech.store.off"),
      drivers: plan.rainGarden ? ["garden.capacityM3"] : ["sealed baseline"],
    },
    {
      id: "absorb",
      label: t("mech.absorb.label"),
      active: plan.rainGarden,
      state: "illustrative",
      explanation: plan.rainGarden
        ? t("mech.absorb.on")
        : t("mech.absorb.off"),
      drivers: plan.rainGarden ? ["garden.infiltrationM3PerHour", "garden-soil"] : ["sealed baseline"],
    },
    {
      id: "slow",
      label: t("mech.slow.label"),
      active: plan.connected,
      state: routingState,
      explanation: plan.connected
        ? t("mech.slow.connected")
        : plan.rainGarden
          ? t("mech.slow.isolated")
          : t("mech.slow.off"),
      drivers: plan.connected ? ["runoff-outlet → garden", "garden-overflow → drain"] : ["runoff-outlet → drain"],
    },
  ];
}
