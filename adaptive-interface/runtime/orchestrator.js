// AdaptiveInterfaceOrchestrator: connects three replaceable modules.
//
//   placeProvider.getPlace(selection)        → PlaceModel 0.1          (data / API team)
//   interventionProvider.getCatalogue()      → intervention catalogue  (Basel research team)
//     (or getInterventions(place), the name used in ORCHESTRATION.md; it receives the source place)
//     Either intervention-knowledge/0.1 (target) or intervention-catalog/0.1 (PR #3 compatibility).
//   renderer.render(viewModel)                                          (frontend team)
//   renderer.connect?(actions)               ← user actions back into the orchestrator
//
// Internally everything runs on State:
//
//   PlaceModel ─corrections─▶ PlaceModel ─placeToState─▶ baselineState
//   baselineState ─(compile each applied intervention → applyStateOperations)─▶ scenarioState
//   evaluateState(baselineState, scenario) vs evaluateState(scenarioState, scenario) ─▶ effectDelta
//
// Optional state catalogues (passed by the composition root): surfaces, scenarios, routingAssumptions.
// Without them the 0.1 behaviour is unchanged and the state/effect payload is partial.
import * as legacyEngine from "./scenario-engine.js";
import { validatePlaceModel } from "./validate.js";
import { clone, freeze } from "./evidence.js";
import { placeToState, stateToPlace } from "./place-to-state.js";
import { applyExecutable } from "./state-ops.js";
import { evaluateState, compareEffects, effectUnknowns } from "./effect-engine.js";
import { createInterventionRuntime, validateInterventions } from "./interventions.js";

export class AdaptiveInterfaceOrchestrator {
  constructor({ placeProvider, interventionProvider, renderer, scenarioEngine = legacyEngine, surfaces = null, scenarios = null, routingAssumptions = null, scenarioId = null } = {}) {
    if (typeof placeProvider?.getPlace !== "function") throw new TypeError("placeProvider must implement getPlace(selection)");
    if (typeof interventionProvider?.getCatalogue !== "function" && typeof interventionProvider?.getInterventions !== "function") throw new TypeError("interventionProvider must implement getCatalogue() or getInterventions(place)");
    if (typeof renderer?.render !== "function") throw new TypeError("renderer must implement render(viewModel)");
    this.placeProvider = placeProvider;
    this.interventionProvider = interventionProvider;
    this.renderer = renderer;
    this.engine = scenarioEngine;
    this.catalogues = { surfaces, scenarios: scenarios?.scenarios || [], routingAssumptions };
    this.state = {
      status: "idle", selection: null, source: null, catalogue: null, corrections: [], applied: [], activeIntervention: null, errors: [],
      scenarioId: scenarioId || this.catalogues.scenarios[0]?.id || null
    };
    this.renderer.connect?.(this.actions());
  }

  // The only way renderers talk back. Plain data in, no access to internals.
  actions() {
    return {
      load: selection => this.load(selection),
      applyIntervention: (interventionId, options) => this.applyIntervention(interventionId, options),
      correct: correction => this.correct(correction),
      undoCorrection: correctionId => this.undoCorrection(correctionId),
      setScenario: scenarioId => this.setScenario(scenarioId),
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
    try {
      source = await this.placeProvider.getPlace(selection);
      errors.push(...validatePlaceModel(source).map(error => `PlaceModel: ${error}`));
    } catch (error) {
      errors.push(`PlaceProvider failed: ${error.message}`);
    }
    try {
      catalogue = typeof this.interventionProvider.getCatalogue === "function"
        ? await this.interventionProvider.getCatalogue()
        : await this.interventionProvider.getInterventions(source);
      errors.push(...validateInterventions(catalogue).map(error => `InterventionCatalogue: ${error}`));
    } catch (error) {
      errors.push(`InterventionProvider failed: ${error.message}`);
    }
    const usable = source && catalogue && !errors.length;
    this.state = {
      ...this.state,
      status: usable ? "ready" : "error",
      source: usable ? freeze(clone(source)) : null,
      catalogue: usable ? freeze(clone(catalogue)) : null,
      corrections: [], applied: [], activeIntervention: null, errors
    };
    this.runtime = usable ? createInterventionRuntime(this.state.catalogue, { surfaces: this.catalogues.surfaces }) : null;
    return this.render();
  }

  // Alias used in ORCHESTRATION.md.
  open(selection) { return this.load(selection); }

  applyIntervention(interventionId, { targetId, params } = {}) {
    if (this.state.status !== "ready") return this.fail("Load a place first.");
    const item = this.runtime.find(interventionId);
    if (!item) return this.fail(`Unknown intervention "${interventionId}". Nothing was changed.`);
    const executable = this.runtime.compile(item, this.compute().scenarioState, { targetId, params });
    if (executable.error) return this.fail(executable.error);
    this.state = { ...this.state, applied: [...this.state.applied, { intervention_id: interventionId, target_id: executable.applied.target_id, params }], activeIntervention: interventionId, errors: [] };
    return this.render();
  }

  correct(correction) {
    if (this.state.status !== "ready") return this.fail("Load a place first.");
    const withId = { id: correction.id || `c${this.state.corrections.length + 1}`, ...correction };
    const trial = this.engine.applyCorrections(this.state.source, [...this.state.corrections, withId]);
    if (trial.errors.length) return this.fail(trial.errors.join("; "));
    // Interventions were planned on the old interpretation; corrections restart the scenario.
    this.state = { ...this.state, corrections: [...this.state.corrections, withId], applied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  undoCorrection(correctionId) {
    this.state = { ...this.state, corrections: this.state.corrections.filter(item => item.id !== correctionId), applied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  // Switching the external scenario (rain / heat) keeps the place and the interventions.
  setScenario(scenarioId) {
    if (!this.catalogues.scenarios.some(item => item.id === scenarioId)) return this.fail(`Unknown scenario "${scenarioId}".`);
    this.state = { ...this.state, scenarioId, errors: [] };
    return this.render();
  }

  resetScenario() {
    this.state = { ...this.state, applied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  resetAll() {
    this.state = { ...this.state, corrections: [], applied: [], activeIntervention: null, errors: [] };
    return this.render();
  }

  fail(message) {
    this.state = { ...this.state, errors: [message] };
    return this.render();
  }

  // source + corrections → baseline; baseline + applied → scenario. Recomputed, never stored mutably.
  compute() {
    const { source, catalogue, corrections, applied } = this.state;
    if (!source || !catalogue) return { baseline: null, scenario: null, baselineState: null, scenarioState: null, errors: [] };
    const corrected = this.engine.applyCorrections(source, corrections);
    const baselineState = freeze(placeToState(corrected.place, { surfaces: this.catalogues.surfaces, routingAssumptions: this.catalogues.routingAssumptions }));
    let state = baselineState;
    const errors = [...corrected.errors];
    for (const step of applied) {
      const item = this.runtime.find(step.intervention_id);
      if (!item) { errors.push(`Unknown intervention "${step.intervention_id}"`); continue; }
      const executable = this.runtime.compile(item, state, { targetId: step.target_id, params: step.params });
      if (executable.error) { errors.push(executable.error); continue; }
      state = applyExecutable(state, executable);
    }
    const scenarioState = freeze(state);
    return { baselineState, scenarioState, baseline: freeze(stateToPlace(baselineState)), scenario: freeze(stateToPlace(scenarioState)), errors };
  }

  // The renderer contract (see contracts/renderer-contract.md). Pure data, Basel-agnostic.
  viewModel() {
    const { status, selection, source, catalogue, corrections, applied, activeIntervention } = this.state;
    const { baseline, scenario, baselineState, scenarioState, errors } = this.compute();
    const ready = Boolean(baseline);
    const interventions = ready ? this.runtime.items.map(item => ({
      ...this.runtime.assess(item, scenarioState),
      ...this.runtime.describe(item),
      applied_count: applied.filter(step => step.intervention_id === item.id).length
    })) : [];
    const unknowns = ready ? this.engine.collectUnknowns(scenario) : [];
    const allErrors = [...this.state.errors, ...errors];
    return {
      contract: "adaptive-view/0.2",
      status,
      selection,
      source,
      baseline,
      scenario,
      catalogue,
      interventions,
      applied,
      activeIntervention,
      corrections,
      effects: ready ? this.engine.computeEffects(baseline, scenario) : [],
      unknowns,
      errors: allErrors,
      adaptive: ready ? this.adaptivePayload({ baseline, baselineState, scenarioState, interventions, unknowns, errors: allErrors }) : null
    };
  }

  // adaptive-view/0.2 payload: state + scenario + effects, computed here, never in the renderer.
  adaptivePayload({ baseline, baselineState, scenarioState, interventions, unknowns, errors }) {
    const scenario = this.catalogues.scenarios.find(item => item.id === this.state.scenarioId) || null;
    const baselineEffects = scenario ? evaluateState(baselineState, scenario) : null;
    const scenarioEffects = scenario ? evaluateState(scenarioState, scenario) : null;
    const routing = scenarioState.routing.state === "unknown" ? [{ scope: "routing", key: "routing", label: "Where water goes (drainage connections)", note: scenarioState.routing.note }] : [];
    return {
      place: baseline,
      baselineState,
      scenarioState,
      scenario,
      scenarios: this.catalogues.scenarios.map(item => ({ id: item.id, label: item.label })),
      baselineEffects,
      scenarioEffects,
      effectDelta: scenario ? compareEffects(baselineEffects, scenarioEffects) : null,
      interventions,
      unknowns: [...unknowns, ...routing, ...effectUnknowns(scenarioEffects)],
      errors
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
