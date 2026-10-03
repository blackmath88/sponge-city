// Geometry effects on the StateModel (same output shape as PR #3's computeEffects, so renderers keep working).
// Direct, defensible quantities only: sealed / permeable / planted area, parking spaces, trees.
import { isKnown } from "./evidence.js";

const CLASS = el => {
  const sealed = el.surface?.sealed_fraction;
  const veg = el.surface?.vegetation_fraction;
  if (!sealed || sealed.state === "unknown" || !veg || veg.state === "unknown") return null;
  if (["medium", "high"].includes(veg.value)) return "planted";
  if (sealed.value === "high") return "sealed";
  return "permeable";
};

export const STATE_METRICS = [
  { id: "sealed_area_m2", label: "Sealed area", unit: "m²", kind: "area", match: "sealed" },
  { id: "permeable_area_m2", label: "Permeable area", unit: "m²", kind: "area", match: "permeable" },
  { id: "planted_area_m2", label: "Planted area", unit: "m²", kind: "area", match: "planted" },
  { id: "parking_spaces", label: "Parking spaces", unit: "", kind: "count" },
  { id: "tree_count", label: "Trees", unit: "", kind: "tree" }
];

function contribution(el, metric) {
  if (el.presence?.value === false) return { value: 0 };
  const unsure = el.presence?.state === "unknown";
  if (metric.kind === "tree") return el.type !== "tree" ? { value: 0 } : unsure ? { unknown: `presence of ${el.label}` } : { value: 1 };
  if (metric.kind === "count") {
    if (el.type !== "parking") return { value: 0 };
    return unsure ? { unknown: `presence of ${el.label}` } : isKnown(el.count) ? { value: el.count.value } : { unknown: `count of ${el.label}` };
  }
  if (!el.surface || el.area_m2?.state === "not-applicable") return { value: 0 };
  const cls = CLASS(el);
  if (cls === null) return { unknown: `surface of ${el.label}` };
  if (cls !== metric.match) return { value: 0 };
  if (unsure) return { unknown: `presence of ${el.label}` };
  return isKnown(el.area_m2) ? { value: el.area_m2.value } : { unknown: `area of ${el.label}` };
}

function measure(state, metric) {
  let value = 0;
  const unknowns = [];
  for (const el of state.elements) {
    const part = contribution(el, metric);
    if (part.unknown) unknowns.push(part.unknown); else value += part.value;
  }
  return unknowns.length ? { value: null, state: "unknown", known_part: value, note: unknowns.join("; ") } : { value, state: "derived" };
}

export function computeStateGeometry(before, after, assumptions = []) {
  const a = new Map(before.elements.map(el => [el.id, el]));
  const b = new Map(after.elements.map(el => [el.id, el]));
  const touched = [...new Set([...a.keys(), ...b.keys()])].filter(id => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)));
  return STATE_METRICS.map(metric => {
    let delta = 0;
    const unknowns = [];
    for (const id of touched) {
      for (const [el, sign] of [[b.get(id), 1], [a.get(id), -1]]) {
        if (!el) continue;
        const part = contribution(el, metric);
        if (part.unknown) unknowns.push(part.unknown); else delta += sign * part.value;
      }
    }
    const relevant = assumptions.filter(text => metric.kind === "area" ? /m² design area|catalogue/.test(text) : metric.kind === "count" ? /parking bay/.test(text) : /tree/.test(text));
    return {
      id: metric.id, label: metric.label, unit: metric.unit,
      baseline: measure(before, metric), scenario: measure(after, metric),
      change: unknowns.length ? { value: null, state: "unknown", note: unknowns.join("; ") } : { value: delta, state: "derived", assumptions: delta ? relevant : [] }
    };
  });
}
