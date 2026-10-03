// AdaptiveInterfaceOrchestrator: connects three replaceable modules.
//
//   placeProvider.getPlace(selection)        → PlaceModel              (data / API team)
//   interventionProvider.getCatalogue()      → InterventionCatalogue   (Basel research team)
//     (or getInterventions(place), the name used in ORCHESTRATION.md; it receives the source place)
//   renderer.render(viewModel)                                          (frontend team)
//   renderer.connect?(actions)               ← user actions back into the orchestrator
//
// The orchestrator imports no provider or renderer implementation. It owns state, validation
// and the order of operations; all calculations live in the scenario engine.
import * as defaultEngine from "./scenario-engine.js";
import { validatePlaceModel, validateCatalogue } from "./validate.js";
import { clone, freeze } from "./evidence.js";

export class AdaptiveInterfaceOrchestrator {
  constructor({ placeProvider, interventionProvider, renderer, scenarioEngine = defaultEngine } = {}) {
    if (typeof placeProvider?.getPlace !== "function") throw new TypeError("placeProvider must implement getPlace(selection)");
    if (typeof interventionProvider?.getCatalogue !== "function" && typeof interventionProvider?.getInterventions !== "function") throw new TypeError("interventionProvider must implement getCatalogue() or getInterventions(place)");
    if (typeof renderer?.render !== "function") throw new TypeError("renderer must implement render(viewModel)");
    this.placeProvider = placeProvider;
    this.interventionProvider = interventionProvider;
    this.renderer = renderer;
    this.engine = scenarioEngine;
    this.state = { status: "idle", selection: null, source: null, catalogue: null, corrections: [], applied: [], activeIntervention: null, errors: [] };
    this.renderer.connect?.(this.actions());
  }

  // The only way renderers talk back. Plain data in, no access to internals.
  actions() {
    return {
      load: selection => this.load(selection),
      applyIntervention: (interventionId, options) => this.applyIntervention(interventionId, options),
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
      errors.push(...validateCatalogue(catalogue).map(error => `InterventionCatalogue: ${error}`));
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
    return this.render();
  }

  // Alias used in ORCHESTRATION.md.
  open(selection) { return this.load(selection); }

  applyIntervention(interventionId, { targetId, params } = {}) {
    if (this.state.status !== "ready") return this.fail("Load a place first.");
    const intervention = this.state.catalogue.interventions.find(item => item.id === interventionId);
    if (!intervention) return this.fail(`Unknown intervention "${interventionId}". Nothing was changed.`);
    const current = this.compute();
    const result = this.engine.applyIntervention(current.scenario, intervention, { targetId, params });
    if (result.error) return this.fail(result.error);
    const step = result.place.applied[result.place.applied.length - 1];
    this.state = { ...this.state, applied: [...this.state.applied, { intervention_id: interventionId, target_id: step.target_id, params }], activeIntervention: interventionId, errors: [] };
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
    if (!source || !catalogue) return { baseline: null, scenario: null, errors: [] };
    const corrected = this.engine.applyCorrections(source, corrections);
    const baseline = freeze(corrected.place);
    const built = this.engine.applyInterventions(baseline, catalogue, applied);
    return { baseline, scenario: freeze(built.place), errors: [...corrected.errors, ...built.errors] };
  }

  // The renderer contract (see contracts/renderer-contract.md). Pure data, Basel-agnostic.
  viewModel() {
    const { status, selection, source, catalogue, corrections, applied, activeIntervention } = this.state;
    const { baseline, scenario, errors } = this.compute();
    const ready = Boolean(baseline);
    return {
      contract: "adaptive-view/0.1",
      status,
      selection,
      source,
      baseline,
      scenario,
      catalogue,
      interventions: ready ? catalogue.interventions.map(item => ({
        ...this.engine.evaluateIntervention(scenario, item),
        label: item.label, summary: item.summary, mechanisms: item.mechanisms, sources: item.sources,
        applied_count: applied.filter(step => step.intervention_id === item.id).length
      })) : [],
      applied,
      activeIntervention,
      corrections,
      effects: ready ? this.engine.computeEffects(baseline, scenario) : [],
      unknowns: ready ? this.engine.collectUnknowns(scenario) : [],
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
