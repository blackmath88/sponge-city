// Effect engine V0: qualitative, rule-based, pure.
//
//   evaluateState(state, scenario) → EffectResult (adaptive-effects/0.1)
//   compareEffects(before, after)  → EffectDelta
//
// Effects are not properties of interventions: they emerge from STATE under a SCENARIO.
// Values are low / medium / high, or state "unknown" / "not-applicable" with value null.
// No Sponge Score, no °C, no runoff %, no infiltration rates. Every result lists its drivers
// (state property paths, routing edges, scenario conditions) and a per-element breakdown, so local
// effects can be exposed later without changing the model.
import { isKnown } from "./evidence.js";
import { connectionsFrom, connectionsTo, edgeLabel } from "./state-graph.js";

export const EFFECT_SCHEMA_VERSION = "adaptive-effects/0.1";
export const LEVELS = ["low", "medium", "high"];

export const EFFECTS = [
  { id: "runoff_tendency", label: "Runoff tendency", needs: "rain", desirable: "lower" },
  { id: "sewer_load_tendency", label: "Sewer load tendency", needs: "rain", desirable: "lower" },
  { id: "storage_potential", label: "Storage potential", needs: "rain", desirable: "higher" },
  { id: "infiltration_potential", label: "Infiltration potential", needs: "rain", desirable: "higher" },
  { id: "soil_water_availability", label: "Soil water for plants", needs: "heat", desirable: "higher" },
  { id: "shade", label: "Shade", needs: "heat", desirable: "higher" },
  { id: "evapotranspiration_potential", label: "Evapotranspiration potential", needs: "heat", desirable: "higher" },
  { id: "surface_heating_tendency", label: "Surface heating tendency", needs: "heat", desirable: "lower" }
];

// ---------- Small qualitative algebra

const SCORE = { none: 0, low: 1, "medium-low": 1.5, medium: 2, "medium-high": 2.5, high: 3 };
const level = value => (SCORE[value] ?? 0) <= 1 ? "low" : SCORE[value] < 2.5 ? "medium" : "high";
const bucket = score => score < 1.67 ? "low" : score < 2.34 ? "medium" : "high";
const lower = (value, steps = 1) => LEVELS[Math.max(0, LEVELS.indexOf(value) - steps)];
const raise = (value, steps = 1) => LEVELS[Math.min(2, LEVELS.indexOf(value) + steps)];
const minLevel = (a, b) => LEVELS[Math.min(LEVELS.indexOf(a), LEVELS.indexOf(b))];
// Scenario soil moisture and surface albedo are read through explicit tables, not arithmetic.
const MOISTURE = { low: "low", normal: "medium", high: "high" };
const HEATING_BY_ALBEDO = { low: "high", "medium-low": "high", medium: "medium", "medium-high": "low", high: "low" };

const derived = (value, drivers, extra = {}) => ({ value, state: "derived", drivers: [...new Set(drivers)], ...extra });
const unknownResult = (reason, drivers = []) => ({ value: null, state: "unknown", drivers: [...new Set(drivers)], reason });
const notApplicable = reason => ({ value: null, state: "not-applicable", drivers: [], reason });

const read = (element, path) => {
  const [group, key] = path.split(".");
  return { evidence: element[group]?.[key], driver: `${element.id}.${path}` };
};

const isPresent = element => element.presence?.value === true || element.presence?.state === "unknown";
const vegetated = element => element.type === "tree" || ["low", "medium", "high"].includes(element.surface?.vegetation_fraction?.value);

// ---------- Per-element rules

function runoff(element) {
  const sealed = read(element, "surface.sealed_fraction");
  if (!isKnown(sealed.evidence)) return unknownResult(`surface of ${element.label} unknown`, [sealed.driver]);
  if (sealed.evidence.value === "high") return derived("high", [sealed.driver]);
  if (sealed.evidence.value === "medium") return derived("medium", [sealed.driver]);
  const permeability = read(element, "surface.permeability");
  if (!isKnown(permeability.evidence)) return unknownResult(`permeability of ${element.label} unknown`, [sealed.driver, permeability.driver]);
  return derived(permeability.evidence.value === "low" && element.surface.material?.value !== "water" ? "medium" : "low", [sealed.driver, permeability.driver]);
}

function storage(element) {
  const pond = read(element, "surface.depression_storage");
  const below = read(element, "subsurface.storage_capacity");
  const known = [pond, below].filter(item => isKnown(item.evidence));
  if (known.length < 2) {
    if (known.some(item => item.evidence.value === "high")) return derived("high", known.map(item => item.driver));
    return unknownResult(`storage of ${element.label} unknown`, [pond.driver, below.driver]);
  }
  return derived(level(SCORE[pond.evidence.value] >= SCORE[below.evidence.value] ? pond.evidence.value : below.evidence.value), [pond.driver, below.driver]);
}

function infiltration(element) {
  const capacity = read(element, "subsurface.infiltration_capacity");
  if (capacity.evidence?.state === "not-applicable") return notApplicable(`${element.label} is not on the ground`);
  const permeability = read(element, "surface.permeability");
  if (!isKnown(permeability.evidence)) return unknownResult(`permeability of ${element.label} unknown`, [permeability.driver]);
  if (permeability.evidence.value === "low") return derived("low", [permeability.driver]);
  if (!isKnown(capacity.evidence)) return unknownResult(`infiltration capacity of the ground under ${element.label} unknown`, [permeability.driver, capacity.driver]);
  return derived(minLevel(level(permeability.evidence.value), level(capacity.evidence.value)), [permeability.driver, capacity.driver]);
}

// Follow routing edges from an element to the sewer. Storage elements on the way attenuate.
function sewerPath(state, id, ctx, seen = new Set()) {
  if (seen.has(id)) return { reach: "unknown", drivers: [], reason: "routing loop" };
  seen.add(id);
  const edges = connectionsFrom(state, id);
  const element = state.elements.find(item => item.id === id);
  if (!edges.length) return { reach: "unknown", drivers: [], reason: `where water from ${element?.label || id} goes is unknown` };
  const branches = edges.map(edge => {
    const to = state.elements.find(item => item.id === edge.to);
    const drivers = [edgeLabel(edge)];
    if (!to) return { reach: "unknown", drivers, reason: `unknown routing target ${edge.to}` };
    if (to.type === "sewer") return { reach: 0, drivers };
    let steps = 0;
    if (to.kind === "area") {
      const held = ctx.memo("storage_potential", to);
      if (held.state !== "derived") return { reach: "unknown", drivers: [...drivers, ...held.drivers], reason: held.reason };
      steps = held.value === "low" ? 0 : 1;
      drivers.push(...held.drivers);
    }
    const next = sewerPath(state, to.id, ctx, new Set(seen));
    if (next.reach === "none") return { reach: "none", drivers: [...drivers, ...next.drivers] };
    if (next.reach === "unknown") return { reach: "unknown", drivers: [...drivers, ...next.drivers], reason: next.reason };
    return { reach: next.reach + steps, drivers: [...drivers, ...next.drivers] };
  });
  const known = branches.filter(item => item.reach !== "unknown");
  const unknowns = branches.filter(item => item.reach === "unknown");
  const worst = known.length ? Math.min(...known.map(item => item.reach)) : null;
  const drivers = branches.flatMap(item => item.drivers);
  if (unknowns.length && worst !== 0) return { reach: "unknown", drivers, reason: unknowns[0].reason };
  return { reach: worst, drivers };
}

function sewerLoad(element, ctx) {
  const own = ctx.memo("runoff_tendency", element);
  if (own.state !== "derived") return unknownResult(own.reason, own.drivers);
  if (own.value === "low") return derived("low", own.drivers, { note: "little runoff, routing does not matter" });
  const path = sewerPath(ctx.state, element.id, ctx);
  if (path.reach === "unknown") return unknownResult(path.reason, [...own.drivers, ...path.drivers]);
  return derived(lower(own.value, path.reach), [...own.drivers, ...path.drivers]);
}

function soilWater(element, ctx) {
  if (!vegetated(element)) return notApplicable(`${element.label} has no vegetation`);
  if (element.type === "tree" && element.vegetation?.rooted_in) {
    const bed = ctx.state.elements.find(item => item.id === element.vegetation.rooted_in);
    if (bed) return ctx.memo("soil_water_availability", bed);
  }
  const drivers = [`scenario:${ctx.scenario.id}.heat.soil_moisture`];
  const base = MOISTURE[ctx.scenario.heat.soil_moisture];
  if (!base) return unknownResult(`scenario soil moisture "${ctx.scenario.heat.soil_moisture}" not understood`, drivers);
  const inflow = connectionsTo(ctx.state, element.id).filter(edge => edge.mode !== "overflow");
  if (inflow.length) return derived(raise(base), [...drivers, ...inflow.map(edgeLabel)]);
  if (element.type === "tree") return derived(base, drivers, { note: "tree pit size not known" });
  const held = read(element, "subsurface.storage_capacity");
  if (!isKnown(held.evidence)) return base === "high" ? derived(base, drivers) : unknownResult(`storage below ${element.label} unknown`, [...drivers, held.driver]);
  return derived(held.evidence.value === "high" ? raise(base) : base, [...drivers, held.driver]);
}

function evapotranspiration(element, ctx) {
  const plant = element.type === "tree" ? read(element, "vegetation.canopy_area") : read(element, "surface.vegetation_fraction");
  if (!isKnown(plant.evidence)) return unknownResult(`vegetation of ${element.label} unknown`, [plant.driver]);
  if (plant.evidence.value === "none") return derived("low", [plant.driver]);
  const water = ctx.memo("soil_water_availability", element);
  if (water.state !== "derived") return unknownResult(water.reason, [plant.driver, ...water.drivers]);
  return derived(minLevel(level(plant.evidence.value), water.value), [plant.driver, ...water.drivers]);
}

function surfaceHeating(element, ctx) {
  if (element.surface.material?.value === "water") return derived("low", [`${element.id}.surface.material`]);
  if (vegetated(element) && element.surface.vegetation_fraction?.value !== "low") {
    const et = ctx.memo("evapotranspiration_potential", element);
    if (et.state !== "derived") return unknownResult(et.reason, et.drivers);
    return derived(et.value === "low" ? "medium" : "low", et.drivers);
  }
  const albedo = read(element, "surface.albedo");
  if (!isKnown(albedo.evidence)) return unknownResult(`surface of ${element.label} unknown`, [albedo.driver]);
  return derived(HEATING_BY_ALBEDO[albedo.evidence.value] || "medium", [albedo.driver, `scenario:${ctx.scenario.id}.heat.solar_exposure`]);
}

function canopy(element) {
  const value = read(element, "vegetation.canopy_area");
  if (!isKnown(value.evidence)) return unknownResult(`canopy of ${element.label} unknown`, [value.driver]);
  return derived(level(value.evidence.value), [value.driver]);
}

const ELEMENT_RULES = {
  runoff_tendency: { applies: element => element.kind === "area", rule: runoff },
  storage_potential: { applies: element => element.kind === "area", rule: storage },
  infiltration_potential: { applies: element => element.kind === "area", rule: infiltration },
  sewer_load_tendency: { applies: element => element.kind === "area", rule: sewerLoad },
  soil_water_availability: { applies: element => element.kind === "area" || element.type === "tree", rule: soilWater },
  evapotranspiration_potential: { applies: element => element.kind === "area" || element.type === "tree", rule: evapotranspiration },
  surface_heating_tendency: { applies: element => element.kind === "area", rule: surfaceHeating },
  shade: { applies: element => element.type === "tree", rule: canopy }
};

// ---------- Place-level aggregation

// Area-weighted over area elements. Unknown inputs are bracketed (as low and as high); if both
// brackets land in the same level the result is derived, otherwise it stays unknown.
function aggregateByArea(entries) {
  const items = entries.filter(({ element, result }) => element.kind === "area" && result.state !== "not-applicable");
  if (!items.length) return notApplicable("no element this applies to");
  const knownAreas = items.map(({ element }) => element.area_m2).filter(isKnown).map(area => area.value);
  const maxArea = knownAreas.reduce((sum, value) => sum + value, 0) || 1;
  const uncertain = [];
  const rows = items.map(({ element, result }) => {
    const area = isKnown(element.area_m2) ? element.area_m2.value : null;
    const weights = area === null ? [0, maxArea] : element.presence?.state === "unknown" ? [0, area] : [area, area];
    const scores = result.state === "derived" ? [SCORE[result.value], SCORE[result.value]] : [1, 3];
    if (area === null || weights[0] !== weights[1] || scores[0] !== scores[1]) uncertain.push(element.id);
    return { weights, scores };
  });
  const mean = (scoreIndex, weightIndex) => {
    const total = rows.reduce((sum, row) => sum + row.weights[weightIndex], 0);
    return total ? rows.reduce((sum, row) => sum + row.weights[weightIndex] * row.scores[scoreIndex], 0) / total : null;
  };
  const lows = [mean(0, 0), mean(0, 1)].filter(value => value !== null);
  const highs = [mean(1, 0), mean(1, 1)].filter(value => value !== null);
  const drivers = items.flatMap(({ result }) => result.drivers);
  if (!lows.length) return unknownResult("no element with a known area", drivers);
  const low = bucket(Math.min(...lows));
  const high = bucket(Math.max(...highs));
  if (low !== high) {
    const reasons = items.filter(({ result }) => result.state === "unknown").map(({ result }) => result.reason);
    return { ...unknownResult(`depends on unknown inputs: ${[...new Set(reasons.length ? reasons : uncertain)].join("; ")}`, drivers), unknown_inputs: uncertain };
  }
  return derived(low, drivers, uncertain.length ? { unknown_inputs: uncertain, note: "unknown inputs could not change the level" } : {});
}

// Shade: V0 counts canopy classes of present trees (low 1, medium 2, high 3).
// Thresholds are prototype placeholders: 0–1 low, 2–5 medium, 6+ high. No geometry is used.
function aggregateCanopy(entries, scenario) {
  const items = entries.filter(({ result }) => result.state !== "not-applicable");
  const drivers = [...items.flatMap(({ result }) => result.drivers), `scenario:${scenario.id}.heat.solar_exposure`];
  let low = 0;
  let high = 0;
  const uncertain = [];
  for (const { element, result } of items) {
    const score = result.state === "derived" ? SCORE[result.value] : null;
    if (element.presence?.state === "unknown" || score === null) {
      uncertain.push(element.id);
      high += score ?? 3;
    } else { low += score; high += score; }
  }
  const toLevel = sum => sum <= 1 ? "low" : sum < 6 ? "medium" : "high";
  if (toLevel(low) !== toLevel(high)) return { ...unknownResult(`depends on trees whose presence or canopy is unknown: ${uncertain.join(", ")}`, drivers), unknown_inputs: uncertain };
  return derived(toLevel(low), drivers, uncertain.length ? { unknown_inputs: uncertain } : {});
}

// ---------- Entry points

export function evaluateState(state, scenario) {
  const cache = new Map();
  const ctx = { state, scenario };
  ctx.memo = (effectId, element) => {
    const key = `${effectId}:${element.id}`;
    if (!cache.has(key)) {
      cache.set(key, unknownResult("circular dependency"));
      const spec = ELEMENT_RULES[effectId];
      cache.set(key, spec.applies(element) ? spec.rule(element, ctx) : notApplicable("does not apply"));
    }
    return cache.get(key);
  };
  const effects = {};
  for (const def of EFFECTS) {
    if (!scenario?.[def.needs]) {
      effects[def.id] = { ...notApplicable(`not relevant under ${scenario?.label || "this scenario"}`), by_element: {} };
      continue;
    }
    const spec = ELEMENT_RULES[def.id];
    const entries = state.elements.filter(element => isPresent(element) && spec.applies(element)).map(element => ({ element, result: ctx.memo(def.id, element) }));
    const place = def.id === "shade" ? aggregateCanopy(entries, scenario) : aggregateByArea(entries);
    effects[def.id] = { ...place, by_element: Object.fromEntries(entries.map(({ element, result }) => [element.id, result])) };
  }
  return { schema_version: EFFECT_SCHEMA_VERSION, scenario_id: scenario?.id ?? null, place_id: state.place_id, effects };
}

export function compareEffects(before, after) {
  if (before.scenario_id !== after.scenario_id) throw new Error("compareEffects needs two results under the same scenario");
  const changes = {};
  for (const def of EFFECTS) {
    const b = before.effects[def.id];
    const a = after.effects[def.id];
    let direction = "unknown";
    if (b.state === "not-applicable" && a.state === "not-applicable") direction = "not-applicable";
    else if (b.state === "derived" && a.state === "derived") direction = SCORE[a.value] > SCORE[b.value] ? "up" : SCORE[a.value] < SCORE[b.value] ? "down" : "same";
    const good = def.desirable === "lower" ? "down" : "up";
    const assessment = direction === "same" || direction === "unknown" || direction === "not-applicable" ? direction : direction === good ? "improves" : "worsens";
    const ids = [...new Set([...Object.keys(b.by_element || {}), ...Object.keys(a.by_element || {})])];
    const local = ids.map(id => ({ element_id: id, before: pick(b.by_element?.[id]), after: pick(a.by_element?.[id]) }))
      .filter(item => item.before.value !== item.after.value || item.before.state !== item.after.state);
    changes[def.id] = { label: def.label, desirable: def.desirable, before: pick(b), after: pick(a), direction, assessment, local };
  }
  return { schema_version: "adaptive-effect-delta/0.1", scenario_id: after.scenario_id, changes };
}

const pick = result => result ? { value: result.value, state: result.state } : { value: null, state: "not-applicable" };

export const effectUnknowns = result => Object.entries(result?.effects || {})
  .filter(([, effect]) => effect.state === "unknown")
  .map(([id, effect]) => ({ scope: "effect-result", key: id, label: EFFECTS.find(def => def.id === id).label, note: effect.reason }));
