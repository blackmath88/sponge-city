// Evidence values: every semantic value carries how we know it.
// Shared vocabulary for providers, the scenario engine and renderers. No I/O, no DOM.

export const EVIDENCE_STATES = ["observed", "modelled", "derived", "assumed", "user-corrected", "unknown", "not-applicable"];

export const ELEMENT_TYPES = ["building", "road", "sidewalk", "parking", "tree", "vegetation", "water", "tram", "entrance", "fixed-area", "unknown-area"];

export const SURFACES = ["sealed", "permeable", "planted", "water", "unknown"];

export const MECHANISMS = ["ABSORB", "STORE", "SLOW", "SWEAT", "SHADE", "COOL"];

export const INTERVENTION_STATUSES = ["candidate", "requires-investigation", "excluded", "not-applicable"];

// Build an evidence value. Unknown and not-applicable never carry a value.
export function ev(value, state, extra = {}) {
  if (!EVIDENCE_STATES.includes(state)) throw new Error(`Unknown evidence state: ${state}`);
  const empty = state === "unknown" || state === "not-applicable";
  return { value: empty ? null : value, state, ...extra };
}

export const unknown = (note, extra = {}) => ev(null, "unknown", note ? { note, ...extra } : extra);

export function isKnown(evidence) {
  return Boolean(evidence) && evidence.state !== "unknown" && evidence.state !== "not-applicable" && evidence.value !== null && evidence.value !== undefined;
}

export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// Deep-freeze so accidental mutation of source or baseline fails loudly in strict mode.
export function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) freeze(value[key]);
  }
  return value;
}
