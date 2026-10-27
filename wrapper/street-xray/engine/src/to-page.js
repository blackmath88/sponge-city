// Adapter: computed-street-profile/0.1 → the Street X-Ray page's street-evidence-profile/0.1 shape.
// The page then shows the computed street beside its illustrative fixture (ADR 0009).
import { OUTCOMES } from "./profile.js";

const PAGE_ACCESS = { "site-check": "site-check-required" };
const KNOWN = ["heat_area", "traffic_suitability", "street_trees", "protection_zone", "groundwater_nearest", "works_near"];
const DERIVED = ["sealed_corridor_m2", "planted_corridor_m2", "tree_planting_context"];
const CHECKS = ["utilities", "utility_depth", "overflow_route", "infiltration"];
const ORIGIN = { observed: "official-record", derived: "computed", unknown: "gatekeeper" };

export function toPageProfile(profile, street, catalogue) {
  const byKey = Object.fromEntries(profile.fields.map((f) => [f.key, f]));
  // The page shows values in a narrow column; long readings move into the method line.
  const SHORT = {
    traffic_suitability: [street.segment.suitability, `${street.segment.dtv_class} vehicles/day`],
    tree_planting_context: [`${street.trees.no_mapped_planted_polygon} of ${street.trees.count}`, "trees without a mapped planted polygon"],
    groundwater_nearest: [`${street.groundwater_station.depth_min_m} m`, `derived minimum depth at ${street.groundwater_station.name}, ${street.groundwater_station.distance_m} m away`],
    works_near: [String(street.permits_near.count), `active or upcoming permits within ${street.permits_near.radius_m} m`],
  };
  const claim = (f, layer) => {
    const c = {
      id: f.key.replaceAll("_", "-"), layer, title: f.question,
      value: f.value === null ? (f.access === "site-check" ? "site check" : "gated") : SHORT[f.key]?.[0] ?? String(f.value),
      unit: SHORT[f.key]?.[1] ?? f.unit ?? (f.evidence === "unknown" ? "decision input" : ""),
      evidence_class: f.evidence,
      origin: f.access === "site-check" ? "field-survey" : ORIGIN[f.evidence],
      access_state: PAGE_ACCESS[f.access] ?? f.access,
      validation: f.evidence === "observed" ? "as-published" : f.evidence === "unknown" ? (f.access === "site-check" ? "not-measured" : "not-available") : "not-validated",
      permitted_use: f.evidence === "unknown" ? [] : f.permitted_use ?? ["explain", "screen"],
      source: f.sources?.[0] ? sourceLabel(f.sources[0]) : (f.gatekeepers ?? []).map((g) => catalogue.gatekeepers[g].name).join(" + "),
      source_url: f.sources?.[0] ?? "",
      method: [f.method ?? (f.evidence === "observed" ? "Read from the published layer at the street." : ""), SHORT[f.key] ? `Reading: ${f.value}.` : ""].filter(Boolean).join(" "),
      limitation: (f.limitations ?? []).join(". ") || (f.evidence === "unknown" ? "Not in the open data reviewed." : "A published layer read at the street; it says nothing about what lies under it."),
    };
    if (f.evidence === "unknown") Object.assign(c, {
      gatekeeper: f.gatekeepers.map((g) => catalogue.gatekeepers[g].name).join(" + "),
      unlock_action: f.next_action, decision_blocked: f.blocks,
    });
    return c;
  };
  const A = profile.assumptions;
  const runoff = profile.scenarios.find((s) => s.key === "runoff_m3");
  const storage = profile.scenarios.find((s) => s.key === "storage_m3");
  const claims = [
    ...KNOWN.map((k) => claim(byKey[k], "known")),
    ...DERIVED.map((k) => claim(byKey[k], "derived")),
    { id: "runoff-range", layer: "derived", title: `${A.rainfall_mm.value} mm rain on the corridor's sealed ground`, value: runoff.value.join("–"), unit: "m³ runoff range", evidence_class: "derived", origin: "computed", access_state: "open", validation: "not-validated", permitted_use: runoff.permitted_use, source: "Street X-Ray engine", source_url: "", method: `${runoff.method}; C ${A.runoff_coefficient.value.join("–")} assumed`, limitation: runoff.cannot.join(". ") },
    { id: "storage-range", layer: "derived", title: `One ${A.intervention_area_m2.value} m² sponge element could hold`, value: storage.value.join("–"), unit: "m³ storage range", evidence_class: "assumed", origin: "scenario", access_state: "unknown", validation: "not-validated", permitted_use: ["explain"], source: "Street X-Ray engine", source_url: "", method: `${storage.method}; depth ${A.active_depth_m.value.join("–")} m, voids ${A.void_fraction.value.join("–")} assumed`, limitation: storage.cannot.join(". ") },
    ...profile.fields.filter((f) => f.evidence === "unknown").map((f) => claim(f, "ask")),
  ];
  return {
    schema_version: "street-evidence-profile/0.1",
    updated: street.permits_near.snapshot.slice(0, 10),
    generated_by: "engine/scripts/build-profile.mjs from engine/data/profile.json",
    site: {
      id: profile.place.id.toUpperCase(), name: profile.place.name, district: "Basel-Stadt",
      coordinates: street.segment.middle_vertex.map((x) => Math.round(x * 1e6) / 1e6),
      length_m: Math.round(profile.place.length_m),
      identity_status: "computed street, picked by rule",
      boundary: `${profile.place.selection_rule} The street and its numbers are computed from open data; the drawing is a generic schematic, not this street's geometry.`,
    },
    snapshot: {
      source: "wrapper/data-charter-map/data/charter-map.json", fetched_at: street.permits_near.snapshot,
      tree_scope: `in the ${street.corridor.half_width_m} m corridor`, tree_count: street.trees.count,
      nearest_groundwater_station: { name: street.groundwater_station.name, distance_m: street.groundwater_station.distance_m, derived_depth_min_m: street.groundwater_station.depth_min_m },
    },
    layers: [
      { id: "known", label: "Known now", short_label: "Known", question: "What can we responsibly say before a site visit?", summary: "Open records and their reproducible readings at this street. They do not describe what lies under it.", tone: "green" },
      { id: "derived", label: "Derived carefully", short_label: "Derived", question: "What hypotheses can computation make visible?", summary: "Corridor surfaces and ranges from declared assumptions. Unvalidated; for explaining and screening.", tone: "blue" },
      { id: "ask", label: "Must ask or measure", short_label: "Must ask", question: "What stops this becoming a recommendation?", summary: "Seven facts are gated or need a site check. Each names who holds it and the next action.", tone: "amber" },
    ],
    claims,
    intervention: {
      id: "tree-trench-or-rain-garden", name: "Tree trench or rain garden in the corridor", status: "requires-investigation",
      why: `The street is opened anyway (${street.permits_near.count} utility permits nearby). A sponge element could ride on those works.`,
      scenario: { footprint_m2: A.intervention_area_m2.value, rainfall_mm: A.rainfall_mm.value, rain_on_footprint_m3: Math.round(A.intervention_area_m2.value * A.rainfall_mm.value) / 1000, classification: "assumed", note: "Rainfall depth × assumed element footprint only. It is not retained volume, flood reduction or design performance." },
      supporting_claims: ["street-trees", "groundwater-nearest", "works-near"],
      hypothesis_claims: ["sealed-corridor-m2", "runoff-range", "storage-range"],
      blocking_claims: CHECKS.map((k) => k.replaceAll("_", "-")),
    },
    engine: engineBlock(["tree-trench", "infiltrating-rain-garden"], { protection_zone: byKey.protection_zone.value }, Object.fromEntries(CHECKS.map((k) => [k.replaceAll("_", "-"), k]))),
  };
}

// The block the page reads to call assessFacts(): which interventions the pill tracks, known facts, and check → fact.
export function engineBlock(interventions, facts, checks) {
  return { interventions, facts, checks: Object.fromEntries(Object.entries(checks).map(([id, fact]) => [id, { fact, options: OUTCOMES[fact] }])) };
}

function sourceLabel(url) {
  const m = url.match(/dataset\/(\d+)/) || url.match(/collections\/(\w+)/);
  return m ? (url.includes("data.bs.ch") ? `data.bs.ch ${m[1]}` : `geo.bs.ch ${m[1]}`) : url;
}
