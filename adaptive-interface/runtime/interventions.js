// One interface over both intervention catalogue formats, so the orchestrator has one code path.
//
//   intervention-knowledge/0.1 → intervention-compiler.js      (target format)
//   intervention-catalog/0.1   → legacy-catalogue-adapter.js   (PR #3 compatibility)
//
// Both compile to state operations; runtime/state-ops.js applies them.
import { assessKnowledge, compileIntervention } from "./intervention-compiler.js";
import { evaluateIntervention, compileLegacyIntervention } from "./legacy-catalogue-adapter.js";
import { validateCatalogue, validateKnowledge, KNOWLEDGE_SCHEMA_VERSION } from "./validate.js";
import { stateToPlace } from "./place-to-state.js";

export function validateInterventions(catalogue) {
  return catalogue?.schema_version === KNOWLEDGE_SCHEMA_VERSION ? validateKnowledge(catalogue) : validateCatalogue(catalogue);
}

export function createInterventionRuntime(catalogue, { surfaces = null } = {}) {
  const knowledge = catalogue.schema_version === KNOWLEDGE_SCHEMA_VERSION;
  const items = catalogue.interventions;
  return {
    format: knowledge ? "knowledge" : "legacy",
    find: id => items.find(item => item.id === id) || null,
    describe: item => knowledge
      ? { label: item.label, summary: item.description, category: item.category, mechanisms: item.mechanisms, sources: [...(item.sources || []), ...(item.basel_examples || [])] }
      : { label: item.label, summary: item.summary, category: null, mechanisms: item.mechanisms, sources: item.sources },
    assess: (item, state) => knowledge ? assessKnowledge(item, state) : { ...evaluateIntervention(stateToPlace(state), item), executable: true },
    compile: (item, state, { targetId, params } = {}) => knowledge
      ? compileIntervention(item, state, targetId, { params, surfaces })
      : compileLegacyIntervention(item, state, { targetId, params, surfaces }),
    items
  };
}
