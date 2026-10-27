// computed-street-profile/0.1: one rule-picked street, every decision-relevant fact typed.
// Engine for Street X-Ray (ADR 0008, 0009); the page's own fixture is ../data/street-evidence-profile.v0.json.
// Pure functions only: buildProfile, validateProfile, assess.

export const SCHEMA = "computed-street-profile/0.1";
export const EVIDENCE = ["observed", "derived", "modelled", "assumed", "unknown"];
export const USES = ["explain", "screen", "prioritise", "design"];
export const STATES = ["candidate", "requires-investigation", "excluded", "not-applicable"];

// Discrete outcomes a gatekeeper or site test can return. Anything else is rejected.
export const OUTCOMES = {
  utilities: ["clear", "conflict"],
  utility_depth: ["deep", "shallow"],
  infiltration: ["ok", "poor"],
  overflow_route: ["allowed", "not-allowed"],
};

// Intervention families from the X-Ray concept; each lists the facts it depends on.
export const INTERVENTIONS = [
  { id: "tree-trench", family: "space-below", needs: ["dig_deep", "overflow_route"] },
  { id: "infiltrating-rain-garden", family: "space-below", needs: ["dig_shallow", "infiltration", "protection_zone"] },
  { id: "lined-bioretention", family: "shallow", needs: ["dig_shallow", "overflow_route"] },
  { id: "unseal-and-plant", family: "shallow", needs: ["dig_shallow"] },
  { id: "no-dig-cooling", family: "no-dig", needs: [] },
];

const S = "https://data.bs.ch/explore/dataset/";
const field = (key, question, value, evidence, rest = {}) => ({ key, question, value, evidence, ...rest });
const unknown = (key, question, access, gatekeepers, next_action, blocks) =>
  field(key, question, null, "unknown", { access, gatekeepers, next_action, blocks });
const derived = (key, question, value, rest) =>
  field(key, question, value, "derived", { access: "open", validation: "not validated", permitted_use: ["explain", "screen"], ...rest });

export function buildProfile(street, assumptions = DEFAULT_ASSUMPTIONS) {
  const a = street.corridor.area_m2;
  const sealed = (a.road ?? 0) + (a["paved-other"] ?? 0);
  const corridorLimits = [
    `Corridor of ${street.corridor.half_width_m} m either side of the line: includes both pavements and building edges`,
    "Land-cover classes say what the surface is, not how it is built or where it drains",
  ];
  const fields = [
    field("heat_area", "Is the street in a heat focus area?", street.segment.heat_area, "observed", { access: "open", sources: ["https://api.geo.bs.ch/stac/v1/collections/FGSK"] }),
    field("traffic_suitability", "Does the canton rate it sponge-suitable by traffic?", `${street.segment.suitability} (${street.segment.dtv_class} vehicles/day)`, "observed", { access: "open", sources: ["https://api.geo.bs.ch/stac/v1/collections/SETV"] }),
    derived("sealed_corridor_m2", "How much sealed ground is in the corridor?", sealed, { unit: "m²", method: street.corridor.method + "; road plus other paving", sources: [street.corridor.source], limitations: corridorLimits }),
    derived("planted_corridor_m2", "How much planted ground is in the corridor?", a.planted ?? 0, { unit: "m²", method: street.corridor.method, sources: [street.corridor.source], limitations: corridorLimits }),
    field("street_trees", "How many cadastre trees stand in the corridor?", street.trees.count, "observed", { access: "open", sources: [S + "100052/"] }),
    derived("tree_planting_context", "Do those trees stand in mapped planted ground?", `${street.trees.no_mapped_planted_polygon} of ${street.trees.count} have no mapped planted polygon at the point`, { claim: "tree-planting-context", method: "Tree point in a planted land-cover polygon", sources: [S + "100052/", S + "100477/"], limitations: ["Does not mean sealed paving", "Does not reveal pit size"] }),
    derived("works_near", "Will the street be opened soon anyway?", `${street.permits_near.count} active or upcoming permits within ${street.permits_near.radius_m} m (${Object.entries(street.permits_near.by_category).map(([k, v]) => `${v} ${k}`).join(", ")}), ending ${street.permits_near.ends.join(", ")}`, { claim: "active-or-upcoming-works", method: "Permit points within the radius of the line; category by keyword", sources: [S + "100018/"], limitations: ["Permits are not a coordinated works plan", `Snapshot ${street.permits_near.snapshot}`] }),
    derived("groundwater_nearest", "How deep is groundwater nearby?", `${street.groundwater_station.depth_min_m} m below ground at its shallowest (${street.groundwater_station.name}, ${street.groundwater_station.distance_m} m away)`, { claim: "groundwater-depth-at-stations", method: "Terrain height minus 10-year maximum level", sources: [S + "100180/"], limitations: ["A station is a point, not a depth map", "Infiltration needs a site test"] }),
    field("protection_zone", "Is the street in a groundwater protection zone?", street.protection_zone.zones.length ? street.protection_zone.zones.join(", ") : "none", "observed", { access: "open", sources: [street.protection_zone.source], limitations: ["Tested at the middle vertex only"] }),
    unknown("drainage_system", "Which drainage system serves this area?", "open", ["tba-aue"], "Digitise the published 2012 GEP drainage-system map (1:20,000) at this street", "Whether to infiltrate, retain or connect an overflow"),
    unknown("utilities", "Is there a line under the footprint?", "restricted", ["leitungskataster", "operators"], "Order a Leitungskataster extract for the footprint plus 5 m, stated as early planning", "Whether digging here can go to detailed design"),
    unknown("utility_depth", "How deep are the lines?", "operator-held", ["operators"], "Ask the operators named on the extract for depths in the footprint", "How deep a trench or pit may go"),
    unknown("infiltration", "Does water soak away here?", "site-check", ["field"], "Commission an infiltration test at the footprint", "Whether infiltration is a credible mechanism"),
    unknown("overflow_route", "Where may overflow water go?", "restricted", ["tba-aue"], "Ask Tiefbauamt where overflow from the footprint may discharge", "Whether the design may rely on an overflow connection"),
    unknown("pavement_buildup", "What lies under the asphalt?", "site-check", ["field"], "Core the pavement while the street is open for the permitted works", "Excavation cost and the depth of new soil"),
    unknown("gullies", "Where are the gullies and kerb inlets?", "restricted", ["leitungskataster", "public"], "Mark visible inlets on the orthophoto; check the Leitungskataster extract", "Where road water can be led into green"),
  ];
  const profile = {
    schema_version: SCHEMA,
    place: { id: `basel-${slug(street.segment.street)}`, name: street.segment.street, length_m: street.segment.length_m, geometry: street.segment.geometry, selection_rule: street.selection_rule },
    fields,
    assumptions,
  };
  profile.scenarios = scenarios(profile);
  return profile;
}

export const DEFAULT_ASSUMPTIONS = {
  rainfall_mm: { value: 30, evidence: "assumed", label: "Design rain for the scenario" },
  runoff_coefficient: { value: [0.7, 0.95], evidence: "assumed", label: "Share of rain that runs off sealed ground" },
  intervention_area_m2: { value: 20, evidence: "assumed", label: "Footprint of one sponge element" },
  active_depth_m: { value: [0.25, 0.45], evidence: "assumed", label: "Depth of storing substrate" },
  void_fraction: { value: [0.2, 0.35], evidence: "assumed", label: "Share of substrate volume that holds water" },
};

// Ranges only, and only from declared inputs. An unknown input gives an unknown result.
export function scenarios(profile) {
  const v = (k) => profile.fields.find((f) => f.key === k)?.value ?? null;
  const A = profile.assumptions;
  const sealed = v("sealed_corridor_m2");
  const runoff = sealed === null ? null : A.runoff_coefficient.value.map((c) => round1(sealed * (A.rainfall_mm.value / 1000) * c));
  const storage = [0, 1].map((i) => round1(A.intervention_area_m2.value * A.active_depth_m.value[i] * A.void_fraction.value[i]));
  const common = { validation: "not validated", permitted_use: ["explain", "screen"] };
  return [
    { key: "runoff_m3", value: runoff, unit: "m³", evidence: runoff ? "derived" : "unknown", method: "P × A_sealed × C", inputs: ["rainfall_mm", "sealed_corridor_m2", "runoff_coefficient"], cannot: ["Where the water goes", "Flood-risk reduction"], ...common },
    { key: "storage_m3", value: storage, unit: "m³", evidence: "derived", method: "A × d × n for one element", inputs: ["intervention_area_m2", "active_depth_m", "void_fraction"], cannot: ["Infiltration", "Hydraulic performance", "Whether the element can be built"], ...common },
  ];
}

export function validateProfile(p) {
  const errors = [];
  const fail = (k, m) => errors.push(`${k}: ${m}`);
  if (p.schema_version !== SCHEMA) fail("profile", "wrong schema_version");
  const keys = new Set();
  for (const f of p.fields) {
    if (keys.has(f.key)) fail(f.key, "duplicate key");
    keys.add(f.key);
    if (!EVIDENCE.includes(f.evidence)) fail(f.key, `unknown evidence '${f.evidence}'`);
    if (!f.access) fail(f.key, "missing access state");
    if (f.evidence === "unknown") {
      if (f.value !== null) fail(f.key, "unknown must have value null, never a stand-in");
      if (!f.next_action || !f.blocks) fail(f.key, "unknown needs a next action and the decision it blocks");
    } else if (f.value === null || f.value === undefined) fail(f.key, "missing value must be typed unknown");
    if (["observed", "derived", "modelled"].includes(f.evidence) && !f.sources?.length) fail(f.key, `${f.evidence} needs sources`);
    if (["derived", "modelled"].includes(f.evidence)) {
      if (!f.method || !f.limitations?.length || !f.validation) fail(f.key, "derived needs method, limitations and validation");
      if (!f.permitted_use?.length || f.permitted_use.some((u) => !USES.includes(u))) fail(f.key, "bad permitted_use");
      if (f.validation === "not validated" && f.permitted_use.some((u) => u === "prioritise" || u === "design")) fail(f.key, "unvalidated evidence may only explain or screen");
    }
  }
  for (const [k, a] of Object.entries(p.assumptions)) if (a.evidence !== "assumed" || a.value === null) fail(k, "assumption must be typed assumed with a value");
  for (const s of p.scenarios) {
    if ((s.value === null) !== (s.evidence === "unknown")) fail(s.key, "scenario value and evidence disagree");
    if (Array.isArray(s.value) && s.value.length !== 2) fail(s.key, "scenario must be a range");
  }
  return errors;
}

// Facts the rules read: known values, overridden by hypothetical gatekeeper answers.
function facts(values, answers) {
  for (const [k, v] of Object.entries(answers)) {
    if (!OUTCOMES[k]?.includes(v)) throw new Error(`Unknown answer ${k}=${v}`);
  }
  const val = (k) => answers[k] ?? values[k] ?? null;
  const u = val("utilities"), d = val("utility_depth");
  const zone = val("protection_zone");
  return {
    dig_shallow: u === "clear" || d === "deep" ? "yes" : u === "conflict" && d === "shallow" ? "no" : null,
    dig_deep: u === "clear" ? "yes" : u === "conflict" ? "no" : null,
    infiltration: { ok: "yes", poor: "no" }[val("infiltration")] ?? null,
    overflow_route: { allowed: "yes", "not-allowed": "no" }[val("overflow_route")] ?? null,
    protection_zone: zone === null ? null : /S1|S2/.test(zone) ? "no" : "yes",
  };
}

// A fact that says no excludes; an unknown fact keeps the intervention under investigation.
export function assess(profile, answers = {}) {
  return assessFacts(Object.fromEntries(profile.fields.map((f) => [f.key, f.value])), answers);
}

// Same rules from plain values ({ protection_zone: "none", ... }); used by the page.
export function assessFacts(values, answers = {}) {
  const f = facts(values, answers);
  return INTERVENTIONS.map(({ id, family, needs }) => {
    const blocking = needs.filter((n) => f[n] === "no");
    const unresolved = needs.filter((n) => f[n] === null);
    const state = blocking.length ? "excluded" : unresolved.length ? "requires-investigation" : "candidate";
    return { id, family, state, blocking, unresolved, permitted_decision: state === "candidate" ? "screen for pre-design" : state === "excluded" ? "set aside under this answer" : "investigate before any design" };
  });
}

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
const round1 = (x) => Math.round(x * 10) / 10;
