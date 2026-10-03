// AdaptiveInterfaceOrchestrator: connects replaceable modules.
//
//   placeProvider.getPlace(selection)        → PlaceModel 0.1          (data / API team; unchanged seam)
//   knowledgeProvider.getKnowledge(place)    → intervention-knowledge  (Basel research team; optional)
//   interventionProvider.getCatalogue()      → intervention-catalog/0.1 (PR #3 executable format; optional)
//     (or getInterventions(place), the name used in ORCHESTRATION.md)
//   catalogues: { surfaces, scenarios }      → state layer data (archetypes, scenarios)
//   renderer.render(viewModel), renderer.connect?(actions)              (frontend team)
//
// Two execution paths, same renderer contract:
//   knowledge path (preferred): PlaceModel → placeToState → StateModel → compiled interventions → effects
//   PR #3 path (compatible):    PlaceModel → executable catalogue → PlaceModel scenario (→ state, if catalogues given)
//
// The orchestrator imports no provider or renderer implementation. All calculations live in runtime/ engines.
import * as defaultEngine from "./scenario-engine.js";
import { validatePlaceModel, validateCatalogue, validateKnowledge } from "./validate.js";
import { clone, freeze } from "./evidence.js";
import { placeToState } from "./place-to-state.js";
import { applyStateOperations } from "./state-model.js";
import { evaluateState, compareEffects, EFFECT_LABELS } from "./effect-engine.js";
import { evaluateKnowledge, compileIntervention } from "./intervention-compiler.js";
import { computeStateGeometry } from "./state-geometry.js";

export class AdaptiveInterfaceOrchestrator {
  constructor({ placeProvider, interventionProvider, knowledgeProvider, catalogues, renderer, scenarioEngine = defaultEngine } = {}) {
    if (typeof placeProvider?.getPlace !== "function") throw new TypeError("placeProvider must implement getPlace(selection)");
    const legacy = interventionProvider && (typeof interventionProvider.getCatalogue === "function" || typeof interventionProvider.getInterventions === "function");
    const knowledge = typeof knowledgeProvider?.getKnowledge === "function";
    if (!legacy && !knowledge) throw new TypeError("Provide knowledgeProvider.getKnowledge(place) or interventionProvider.getCatalogue() / getInterventions(place)");
    if (knowledge && !(catalogues?.surfaces && catalogues?.scenarios)) throw new TypeError("knowledgeProvider needs catalogues: { surfaces, scenarios }");
    if (typeof renderer?.render !== "function") throw new TypeError("renderer must implement render(viewModel)");
    this.placeProvider = placeProvider;
    this.interventionProvider = legacy ? interventionProvider : null;
    this.knowledgeProvider = knowledge ? knowledgeProvider : null;
    this.catalogues = catalogues?.surfaces && catalogues?.scenarios ? catalogues : null;
    this.renderer = renderer;
    this.engine = scenarioEngine;
    this.mode = knowledge ? "knowledge" : "execution-0.1";
    this.state = {
      status: "idle", selection: null, source: null, catalogue: null, knowledge: null,
      corrections: [], applied: [], stateApplied: [], activeIntervention: null,
      scenarioId: this.catalogues?.scenarios.scenarios[0].id || null, errors: []
    };
    this.renderer.connect?.(this.actions());
  }

  // The only way renderers talk back. Plain data in, no access to internals.
  actions() {
    return {
      load: selection => this.load(selection),
      applyIntervention: (interventionId, options) => this.applyIntervention(interventionId, options),
      setScenario: scenarioId => this.setScenario(scenarioId),
      correct: correction => this.correct(correction),
      undoCorrection: correctionId => this.undoCorrection(correctionId),
      resetScenario: () => this.resetScenario(),
      resetAll: () => this.resetAll()
    };
  }

  async load(selection) {
    this.state = { ...this.state, status: "loading", selection, errors: [] };
    this.render();
    const errors = [];
    let source = null;
    let catalogue = null;
    let knowledge = null;
    try {
      source = await this.placeProvider.getPlace(selection);
      errors.push(...validatePlaceModel(source).map(error => `PlaceModel: ${error}`));
    } catch (error) {
      errors.push(`PlaceProvider failed: ${error.message}`);
    }
    if (this.interventionProvider) {
      try {
        catalogue = typeof this.interventionProvider.getCatalogue === "function"
          ? await this.interventionProvider.getCatalogue()
          : await this.interventionProvider.getInterventions(source);
        errors.push(...validateCatalogue(catalogue).map(error => `InterventionCatalogue: ${error}`));
      } catch (error) {
        errors.push(`InterventionProvider failed: ${error.message}`);
      }
    }
    if (this.knowledgeProvider) {
      try {
        knowledge = await this.knowledgeProvider.getKnowledge(source);
        errors.push(...validateKnowledge(knowledge).map(error => `InterventionKnowledge: ${error}`));
      } catch (error) {
        errors.push(`KnowledgeProvider failed: ${error.message}`);
      }
    }
    const usable = source && (catalogue || knowledge) && !errors.length;
    this.state = {
      ...this.state,
      status: usable ? "ready" : "error",
      source: usable ? freeze(clone(source)) : null,
      catalogue: usable && catalogue ? freeze(clone(catalogue)) : null,
      knowledge: usable && knowledge ? freeze(clone(knowledge)) : null,
      corrections: [], applied: [], stateApplied: [], activeIntervention: null, errors
    };
    return this.render();
  }

  // Alias used in ORCHESTRATION.md.
  open(selection) { return this.load(selection); }

  applyIntervention(interventionId, { targetId, params } = {}) {
    if (this.state.status !== "ready") return this.fail("Load a place first.");
    if (this.mode === "knowledge") {
      const record = this.state.knowledge.interventions.find(item => item.id === interventionId);
      if (!record) return this.fail(`Unknown intervention "${interventionId}". Nothing was changed.`);
      const { scenarioState } = this.compute();
      const compiled = compileIntervention(record, scenarioState, targetId, { surfaces: this.catalogues.surfaces });
      if (compiled.error) return this.fail(compiled.error);
      const trial = applyStateOperations(scenarioState, compiled.operations, { surfaces: this.catalogues.surfaces, origin: `intervention:${interventionId}` });
      if (trial.errors.length) return this.fail(trial.errors.join("; "));
      this.state = { ...this.state, stateApplied: [...this.state.stateApplied, { intervention_id: interventionId, target_id: compiled.target_id }], activeIntervention: interventionId, errors: [] };
      return this.render();
    }
    const intervention = this.state.catalogue.interventions.find(item => item.id === interventionId);
    if (!intervention) return this.fail(`Unknown intervention "${interventionId}". Nothing was changed.`);
    const current = this.compute();
    const result = this.engine.applyIntervention(current.scenario, intervention, { targetId, params });
    if (result.error) return this.fail(result.error);
    const step = result.place.applied[result.place.applied.length - 1];
    this.state = { ...this.state, applied: [...this.state.applied, { intervention_id: interventionId, target_id: step.target_id, params }], activeIntervention: interventionId, errors: [] };
    return this.render();
  }

  setScenario(scenarioId) {
    if (!this.catalogues) return this.fail("No scenario catalogue configured.");
    if (!this.catalogues.scenarios.scenarios.some(item => item.id === scenarioId)) return this.fail(`Unknown scenario "${scenarioId}".`);
    this.state = { ...this.state, scenarioId, errors: [] };
    return this.render();
  }

  correct(correction) {
    if (this.state.status !== "ready") return this.fail("Load a place first.");
    const withId = { id: correction.id || `c${this.state.corrections.length + 1}`, ...correction };
    const trial = this.engine.applyCorrections(this.state.source, [...this.state.corrections, withId]);
    if (trial.errors.length) return this.fail(trial.errors.join("; "));
    // Interventions were planned on the old interpretation; corrections restart the scenario.
    this.state = { ...this.state, corrections: [...this.state.corrections, withId], applied: [], stateApplied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  undoCorrection(correctionId) {
    this.state = { ...this.state, corrections: this.state.corrections.filter(item => item.id !== correctionId), applied: [], stateApplied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  resetScenario() {
    this.state = { ...this.state, applied: [], stateApplied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  resetAll() {
    this.state = { ...this.state, corrections: [], applied: [], stateApplied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  fail(message) {
    this.state = { ...this.state, errors: [message] };
    return this.render();
  }

  // source + corrections → baseline (place); baseline + applied → scenario (place);
  // baseline → baselineState; baselineState + compiled knowledge steps → scenarioState. Recomputed, never stored.
  compute() {
    const { source, catalogue, corrections, applied, stateApplied, knowledge } = this.state;
    const empty = { baseline: null, scenario: null, baselineState: null, scenarioState: null, assumptions: [], errors: [] };
    if (!source || !(catalogue || knowledge)) return empty;
    const corrected = this.engine.applyCorrections(source, corrections);
    const baseline = freeze(corrected.place);
    const errors = [...corrected.errors];
    let scenario = baseline;
    if (this.mode === "execution-0.1") {
      const built = this.engine.applyInterventions(baseline, catalogue, applied);
      scenario = freeze(built.place);
      errors.push(...built.errors);
    }
    if (!this.catalogues) return { ...empty, baseline, scenario, errors };
    const surfaces = this.catalogues.surfaces;
    const baselineState = freeze(placeToState(baseline, { surfaces }));
    let scenarioState = this.mode === "knowledge" ? baselineState : freeze(placeToState(scenario, { surfaces }));
    const assumptions = [];
    for (const step of stateApplied) {
      const record = knowledge.interventions.find(item => item.id === step.intervention_id);
      const compiled = compileIntervention(record, scenarioState, step.target_id, { surfaces });
      if (compiled.error) { errors.push(compiled.error); continue; }
      const applied = applyStateOperations(scenarioState, compiled.operations, { surfaces, origin: `intervention:${step.intervention_id}` });
      errors.push(...applied.errors);
      assumptions.push(...compiled.assumptions);
      scenarioState = freeze(applied.state);
    }
    return { baseline, scenario, baselineState, scenarioState, assumptions: [...new Set(assumptions)], errors };
  }

  // The renderer contract (contracts/renderer-contract.md). adaptive-view/0.2 is a superset of 0.1.
  viewModel() {
    const { status, selection, source, catalogue, knowledge, corrections, applied, stateApplied, activeIntervention, scenarioId } = this.state;
    const { baseline, scenario, baselineState, scenarioState, assumptions, errors } = this.compute();
    const ready = Boolean(baseline);
    const scenarioDef = this.catalogues?.scenarios.scenarios.find(item => item.id === scenarioId) || null;
    const baselineEffects = ready && baselineState ? evaluateState(baselineState, scenarioDef) : null;
    const scenarioEffects = ready && scenarioState ? evaluateState(scenarioState, scenarioDef) : null;

    let interventions = [];
    if (ready && this.mode === "knowledge") {
      interventions = knowledge.interventions.map(item => ({
        ...evaluateKnowledge(item, scenarioState),
        kind: "knowledge", label: item.label, summary: item.description, description: item.description, category: item.category,
        mechanisms: item.mechanisms, sources: item.sources, basel_examples: item.basel_examples,
        applied_count: stateApplied.filter(step => step.intervention_id === item.id).length
      }));
    } else if (ready) {
      interventions = catalogue.interventions.map(item => ({
        ...this.engine.evaluateIntervention(scenario, item), kind: "execution-0.1",
        label: item.label, summary: item.summary, mechanisms: item.mechanisms, sources: item.sources,
        applied_count: applied.filter(step => step.intervention_id === item.id).length
      }));
    }

    const geometry = !ready ? [] : this.mode === "knowledge" ? computeStateGeometry(baselineState, scenarioState, assumptions) : this.engine.computeEffects(baseline, scenario);
    const unknowns = !ready ? [] : [
      ...this.engine.collectUnknowns(scenario),
      ...(scenarioEffects ? Object.entries(scenarioEffects.effects).filter(([, value]) => value.state === "unknown").map(([key, value]) => ({ scope: "tendency", key, label: EFFECT_LABELS[key], note: value.reason })) : [])
    ];

    return {
      contract: this.catalogues ? "adaptive-view/0.2" : "adaptive-view/0.1",
      mode: this.mode,
      status,
      selection,
      // PlaceModel layer (0.1, unchanged)
      source,
      baseline,
      scenario,
      place: baseline,
      catalogue,
      // State layer (0.2)
      knowledge,
      baselineState,
      scenarioState,
      scenario_id: scenarioId,
      scenarioDef,
      scenarios: this.catalogues ? this.catalogues.scenarios.scenarios.map(({ id, label, description }) => ({ id, label, description })) : [],
      baselineEffects,
      scenarioEffects,
      effectDelta: baselineEffects && scenarioEffects ? compareEffects(baselineEffects, scenarioEffects) : null,
      // Shared
      interventions,
      applied: this.mode === "knowledge" ? stateApplied : applied,
      activeIntervention,
      corrections,
      effects: geometry,
      unknowns,
      errors: [...this.state.errors, ...errors]
    };
  }

  render() {
    const model = this.viewModel();
    this.renderer.render(model);
    return model;
  }
}

// Name used in ORCHESTRATION.md.
export { AdaptiveInterfaceOrchestrator as AdaptiveInterface };
