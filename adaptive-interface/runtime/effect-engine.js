// Effect engine V0: qualitative rules over StateModel + Scenario. Pure functions only.
//
//   Effect(state, scenario) → adaptive-effects/0.1
//
// Outputs are low / medium / high / unknown / not-applicable, each with drivers and the rule used.
// Unknown inputs are carried as intervals: the engine evaluates the best and worst case; if both land in
// the same category the result is derived, otherwise it is unknown and says what it depends on.
// No rainfall depths, runoff percentages, infiltration rates or temperatures are produced.
import { connectionsTo, downstreamPaths, elementById, RECEIVER_TYPES } from "./state-model.js";
import { isKnown } from "./evidence.js";

export const EFFECT_SCHEMA_VERSION = "adaptive-effects/0.1";
export const EFFECT_KEYS = ["runoff_tendency", "sewer_load_tendency", "storage_potential", "infiltration_potential", "soil_water_availability", "shade", "evapotranspiration_potential", "surface_heating_tendency"];
const OUT = ["low", "low", "medium", "high"];
const LEVEL = { none: 0, low: 1, "medium-low": 1, medium: 2, "medium-high": 2, high: 3 };

// Category thresholds of the V0 rules. Prototype assumptions, visible and testable; not calibrated.
export const RULES = {
  runoff_tendency: { thresholds: [0.3, 0.6], text: "Area share of runoff-generating surfaces (sealed high = 1, medium = 0.5). ≥ 30 % medium, ≥ 60 % high." },
  sewer_load_tendency: { thresholds: [0.3, 0.6], text: "Runoff-generating share whose routing reaches the sewer; via a receiver it counts 0.5 (storage medium) or 0.25 (storage high)." },
  storage_potential: { thresholds: [0.03, 0.1], text: "Area share with storage capacity (high = 1, medium = 0.5). ≥ 3 % medium, ≥ 10 % high." },
  infiltration_potential: { thresholds: [0.1, 0.3], text: "Area share that is permeable AND has known infiltration capacity. Unknown infiltration keeps the result unknown." },
  soil_water_availability: { text: "Scenario soil moisture (rain normal → medium, heat normal → medium, drought → low); one level up where runoff is routed into vegetation." },
  shade: { thresholds: [2, 5], text: "Tree canopy points (low 1, medium 2, high 3) per 1000 m² of open ground. < 2 low, < 5 medium, ≥ 5 high." },
  evapotranspiration_potential: { thresholds: [0.05, 0.15], text: "min(vegetation level, soil-water level). Vegetation level is the higher of planted area share (≥ 5 % medium, ≥ 15 % high) and canopy level." },
  surface_heating_tendency: { thresholds: [0.3, 0.6], text: "Sealed area share (as runoff), one level lower if shade is high, one lower if evapotranspiration is high." }
};

// ---------- intervals of numbers
const I = (lo, hi = lo) => ({ lo, hi });
const add = (a, b) => I(a.lo + b.lo, a.hi + b.hi);
const scale = (a, k) => I(a.lo * k, a.hi * k);
const mul = (a, b) => I(Math.min(a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi), Math.max(a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi));
const UNKNOWN_UNIT = I(0, 1);

function level(evidence, weights) {
  if (!evidence || evidence.state === "unknown" || evidence.value === null || evidence.value === undefined) return null;
  return weights[evidence.value] ?? null;
}
function weightInterval(evidence, weights, reasons, path) {
  const w = level(evidence, weights);
  if (w === null) { reasons.push(path); return UNKNOWN_UNIT; }
  return I(w);
}

function categorise(share, [t1, t2]) {
  return share >= t2 ? 3 : share >= t1 ? 2 : 1;
}
function result(levelInterval, { drivers, reasons, rule, unknownNote }) {
  const uniq = list => [...new Set(list)];
  if (levelInterval.lo === levelInterval.hi) return { value: OUT[levelInterval.lo], state: "derived", drivers: uniq(drivers), rule };
  return { value: null, state: "unknown", drivers: uniq(drivers), rule, reason: unknownNote || `Depends on unknown: ${uniq(reasons).join(", ")}` };
}
const notApplicable = reason => ({ value: null, state: "not-applicable", drivers: [], reason });

// ---------- state views
const present = el => el.presence?.value === true ? 1 : el.presence?.state === "unknown" ? null : 0;
const surfaceElements = state => state.elements.filter(el => el.surface && present(el) !== 0);
const isRoof = el => el.type === "building";

// Weighted share of known-area surfaces, as an interval. weightOf returns an interval in [0,1].
function weightedShare(state, weightOf, { exclude = () => false } = {}) {
  let total = 0;
  let part = I(0);
  const drivers = [];
  const reasons = [];
  for (const el of surfaceElements(state)) {
    if (exclude(el)) continue;
    if (el.area_m2?.state === "not-applicable") continue;
    if (!isKnown(el.area_m2)) { reasons.push(`${el.id}.area_m2`); continue; }
    const area = el.area_m2.value;
    let w = weightOf(el, reasons, drivers);
    if (present(el) === null) { reasons.push(`${el.id}.presence`); w = I(0, w.hi); }
    total += area;
    part = add(part, scale(w, area));
  }
  if (!total) return { share: I(0), drivers, reasons, total };
  const missingArea = reasons.some(r => r.endsWith(".area_m2"));
  return { share: missingArea ? I(0, 1) : scale(part, 1 / total), drivers, reasons, total };
}
const levelOf = (share, thresholds) => I(categorise(share.lo, thresholds), categorise(share.hi, thresholds));

const SEALED_W = { none: 0, low: 0, medium: 0.5, high: 1 };
const STORAGE_W = { low: 0, medium: 0.5, high: 1 };
const PERM_W = { low: 0, medium: 0.5, high: 1 };
const VEG_W = { none: 0, low: 0.25, medium: 0.5, high: 1 };
const CANOPY_P = { none: 0, low: 1, medium: 2, high: 3 };

function generation(el, reasons, drivers) {
  const w = weightInterval(el.surface.sealed_fraction, SEALED_W, reasons, `${el.id}.surface.sealed_fraction`);
  if (w.hi > 0) drivers.push(`${el.id}.surface.sealed_fraction`);
  return w;
}

// Fraction of an element's runoff that reaches the sewer without passing a receiver.
function sewerFraction(state, el, reasons, drivers) {
  const paths = downstreamPaths(state, el.id).filter(path => path.some(edge => ["surface-runoff", "roof-runoff", "pipe", "overflow"].includes(edge.mode)));
  if (!paths.length) {
    if (!state.connections.some(edge => edge.from === el.id)) { reasons.push(`${el.id}.routing`); return UNKNOWN_UNIT; }
    return I(0);
  }
  let best = null;
  for (const path of paths) {
    if (path.at(-1).to !== "sewer") continue;
    if (path.some(edge => edge.state === "unknown")) { reasons.push(`connection:${path.find(edge => edge.state === "unknown").id}`); return UNKNOWN_UNIT; }
    let f = I(1);
    for (const edge of path) {
      const node = elementById(state, edge.to);
      if (node && RECEIVER_TYPES.includes(node.type)) {
        const s = level(node.subsurface?.storage_capacity, { low: 1, medium: 0.5, high: 0.25 });
        f = s === null ? (reasons.push(`${node.id}.subsurface.storage_capacity`), I(0.25, 1)) : I(s);
        drivers.push(`${node.id}.subsurface.storage_capacity`);
        break;
      }
    }
    path.forEach(edge => drivers.push(`connection:${edge.id}`));
    best = best ? I(Math.max(best.lo, f.lo), Math.max(best.hi, f.hi)) : f;
  }
  return best || I(0);
}

// ---------- the eight effects

function runoff(state, scenario) {
  if (!scenario.rain) return notApplicable("No rain in this scenario.");
  const { share, drivers, reasons } = weightedShare(state, generation);
  return result(levelOf(share, RULES.runoff_tendency.thresholds), { drivers, reasons, rule: RULES.runoff_tendency.text });
}

function sewerLoad(state, scenario) {
  if (!scenario.rain) return notApplicable("No rain in this scenario.");
  const { share, drivers, reasons } = weightedShare(state, (el, r, d) => {
    const g = generation(el, r, d);
    return g.hi === 0 ? g : mul(g, sewerFraction(state, el, r, d));
  });
  return result(levelOf(share, RULES.sewer_load_tendency.thresholds), { drivers, reasons, rule: RULES.sewer_load_tendency.text });
}

function storage(state, scenario) {
  if (!scenario.rain) return notApplicable("No rain in this scenario.");
  const { share, drivers, reasons } = weightedShare(state, (el, r, d) => {
    const w = weightInterval(el.subsurface?.storage_capacity, STORAGE_W, r, `${el.id}.subsurface.storage_capacity`);
    if (w.hi > 0) d.push(`${el.id}.subsurface.storage_capacity`);
    return w;
  });
  return result(levelOf(share, RULES.storage_potential.thresholds), { drivers, reasons, rule: RULES.storage_potential.text });
}

function infiltration(state, scenario) {
  if (!scenario.rain) return notApplicable("No rain in this scenario.");
  const { share, drivers, reasons } = weightedShare(state, (el, r, d) => {
    const p = weightInterval(el.surface.permeability, PERM_W, r, `${el.id}.surface.permeability`);
    if (p.hi === 0) return p;
    d.push(`${el.id}.surface.permeability`);
    const capacity = weightInterval(el.subsurface?.infiltration_capacity, { low: 0, medium: 0.5, high: 1 }, r, `${el.id}.subsurface.infiltration_capacity`);
    d.push(`${el.id}.subsurface.infiltration_capacity`);
    return mul(p, capacity);
  }, { exclude: isRoof });
  return result(levelOf(share, RULES.infiltration_potential.thresholds), { drivers, reasons, rule: RULES.infiltration_potential.text });
}

const vegetated = state => state.elements.filter(el => el.vegetation && present(el) !== 0 && (el.type === "tree" || (level(el.surface?.vegetation_fraction, VEG_W) ?? 0) > 0));

function soilWaterLevel(state, scenario) {
  const veg = vegetated(state);
  if (!veg.length) return { na: true };
  const drivers = [`scenario:${scenario.id}`];
  let base;
  if (scenario.rain) base = scenario.rain.antecedent_moisture === "high" ? 3 : scenario.rain.antecedent_moisture === "low" ? 1 : 2;
  else base = scenario.heat?.drought_stress === "high" ? 1 : 2;
  const fed = veg.filter(el => connectionsTo(state, el.id).some(edge => ["surface-runoff", "roof-runoff", "pipe"].includes(edge.mode)));
  fed.forEach(el => connectionsTo(state, el.id).forEach(edge => drivers.push(`connection:${edge.id}`)));
  return { interval: I(Math.min(3, base + (fed.length ? 1 : 0))), drivers };
}

function soilWater(state, scenario) {
  const s = soilWaterLevel(state, scenario);
  if (s.na) return notApplicable("No vegetation in this place.");
  const out = result(s.interval, { drivers: s.drivers, reasons: [], rule: RULES.soil_water_availability.text });
  return { ...out, note: "Scenario tendency; no soil water is measured in Basel." };
}

function canopyLevel(state) {
  let points = I(0);
  const drivers = [];
  const reasons = [];
  for (const tree of state.elements.filter(el => el.type === "tree" && present(el) !== 0)) {
    let p = weightInterval(tree.vegetation?.canopy, CANOPY_P, reasons, `${tree.id}.vegetation.canopy`);
    if (tree.vegetation?.canopy?.state === "unknown") p = I(0, 3);
    if (present(tree) === null) { reasons.push(`${tree.id}.presence`); p = I(0, p.hi); }
    if (p.hi > 0) drivers.push(`${tree.id}.vegetation.canopy`);
    points = add(points, p);
  }
  const open = surfaceElements(state).filter(el => !isRoof(el) && el.area_m2?.value).reduce((sum, el) => sum + el.area_m2.value, 0);
  const density = open ? scale(points, 1000 / open) : I(0);
  return { interval: levelOf(density, RULES.shade.thresholds), drivers, reasons };
}

function shade(state, scenario) {
  if (!scenario.heat) return notApplicable("Shade matters in the heat scenarios.");
  const c = canopyLevel(state);
  return result(c.interval, { ...c, rule: RULES.shade.text });
}

function evapotranspiration(state, scenario) {
  if (!scenario.heat) return notApplicable("Evapotranspiration is evaluated in the heat scenarios.");
  const planted = weightedShare(state, (el, r, d) => {
    const w = weightInterval(el.surface.vegetation_fraction, VEG_W, r, `${el.id}.surface.vegetation_fraction`);
    if (w.hi > 0) d.push(`${el.id}.surface.vegetation_fraction`);
    return w;
  }, { exclude: isRoof });
  const plantedLevel = I(planted.share.hi === 0 ? 1 : categorise(planted.share.lo, RULES.evapotranspiration_potential.thresholds), planted.share.hi === 0 ? 1 : categorise(planted.share.hi, RULES.evapotranspiration_potential.thresholds));
  const roofs = state.elements.filter(el => isRoof(el) && (level(el.surface?.vegetation_fraction, VEG_W) ?? 0) > 0);
  const canopy = canopyLevel(state);
  const veg = I(Math.max(plantedLevel.lo, canopy.interval.lo, roofs.length ? 2 : 1), Math.max(plantedLevel.hi, canopy.interval.hi, roofs.length ? 2 : 1));
  const water = soilWaterLevel(state, scenario);
  if (water.na) return { value: "low", state: "derived", drivers: [], rule: RULES.evapotranspiration_potential.text, note: "No vegetation." };
  const et = I(Math.min(veg.lo, water.interval.lo), Math.min(veg.hi, water.interval.hi));
  return result(et, {
    drivers: [...planted.drivers, ...canopy.drivers, ...roofs.map(el => `${el.id}.surface.vegetation_fraction`), ...water.drivers],
    reasons: [...planted.reasons, ...canopy.reasons], rule: RULES.evapotranspiration_potential.text
  });
}

function surfaceHeating(state, scenario, effects) {
  if (!scenario.heat) return notApplicable("Surface heating is evaluated in the heat scenarios.");
  const { share, drivers, reasons } = weightedShare(state, generation);
  let lv = levelOf(share, RULES.surface_heating_tendency.thresholds);
  const shadeHigh = effects.shade.value === "high";
  const etHigh = effects.evapotranspiration_potential.value === "high";
  const down = (shadeHigh ? 1 : 0) + (etHigh ? 1 : 0);
  if (effects.shade.state === "unknown" || effects.evapotranspiration_potential.state === "unknown") lv = I(Math.max(1, lv.lo - 2), lv.hi);
  else lv = I(Math.max(1, lv.lo - down), Math.max(1, lv.hi - down));
  return result(lv, { drivers: [...drivers, ...(shadeHigh ? ["effect:shade"] : []), ...(etHigh ? ["effect:evapotranspiration_potential"] : [])], reasons, rule: RULES.surface_heating_tendency.text });
}

export function evaluateState(state, scenario) {
  const effects = {
    runoff_tendency: runoff(state, scenario),
    sewer_load_tendency: sewerLoad(state, scenario),
    storage_potential: storage(state, scenario),
    infiltration_potential: infiltration(state, scenario),
    soil_water_availability: soilWater(state, scenario),
    shade: shade(state, scenario),
    evapotranspiration_potential: evapotranspiration(state, scenario)
  };
  effects.surface_heating_tendency = surfaceHeating(state, scenario, effects);
  return { schema_version: EFFECT_SCHEMA_VERSION, scenario_id: scenario.id, effects };
}

const RANK = { low: 1, medium: 2, high: 3 };
export function compareEffects(before, after) {
  const changes = {};
  for (const key of EFFECT_KEYS) {
    const a = before.effects[key];
    const b = after.effects[key];
    let direction;
    if (a.state === "not-applicable" && b.state === "not-applicable") direction = "not-applicable";
    else if (a.state === "unknown" || b.state === "unknown") direction = "unknown";
    else direction = RANK[b.value] > RANK[a.value] ? "up" : RANK[b.value] < RANK[a.value] ? "down" : "same";
    changes[key] = { before: a.value, after: b.value, direction, before_state: a.state, after_state: b.state };
  }
  return { scenario_id: after.scenario_id, changes };
}

// Labels for renderers; explanatory only.
export const EFFECT_LABELS = {
  runoff_tendency: "Runoff", sewer_load_tendency: "Sewer load", storage_potential: "Storage", infiltration_potential: "Infiltration",
  soil_water_availability: "Soil water", shade: "Shade", evapotranspiration_potential: "Evapotranspiration", surface_heating_tendency: "Surface heating"
};
