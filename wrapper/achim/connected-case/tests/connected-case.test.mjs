// Contract and evidence-safety tests for the connected case.
//   npm test   (from wrapper/achim/connected-case)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paths, loadSources, buildCase, enforceRules, validateSchema, generate, serialise } from '../scripts/build-case.mjs';

const schema = JSON.parse(readFileSync(paths.schema, 'utf8'));
const input = JSON.parse(readFileSync(paths.input, 'utf8'));
const committed = readFileSync(paths.output, 'utf8');
const sources = await loadSources();
const fresh = () => JSON.parse(committed);
const violations = (c) => [...validateSchema(schema, c), ...enforceRules(c)];
const claim = (c, id) => c.claims.find((x) => x.id === id);
const gap = (c, id) => c.gaps.find((x) => x.id === id);
const stage = (c, key) => c.stages.find((s) => s.key === key);
const rejects = (mutate, pattern) => {
  const c = fresh();
  mutate(c);
  const found = violations(c);
  assert.ok(found.length > 0, 'expected a contract violation');
  if (pattern) assert.ok(found.some((v) => pattern.test(v)), `no violation matched ${pattern}:\n${found.join('\n')}`);
};
// Rebuild with a modified copy of one source module, leaving the files untouched.
const withSource = (key, mutate) => {
  const copy = structuredClone(sources[key].data);
  mutate(copy);
  return { ...sources, [key]: { ...sources[key], data: copy } };
};

test('generated case is valid against the schema and the rules', () => {
  const c = fresh();
  assert.deepEqual(validateSchema(schema, c), []);
  assert.deepEqual(enforceRules(c), []);
});

test('generated file is deterministic and current', async () => {
  const a = await generate();
  const b = await generate();
  assert.equal(a, b, 'two builds differ');
  assert.equal(a, committed, 'generated/klybeck-edge.case.json is stale; run npm run build');
  assert.equal(serialise(JSON.parse(a)), a);
  assert.doesNotMatch(committed, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'no build timestamps');
});

test('missing provenance is rejected', () => {
  rejects((c) => { delete claim(c, 'claim:tree-context').provenance.method; }, /provenance\.method/);
  rejects((c) => { delete claim(c, 'claim:tree-context').provenance; }, /provenance/);
  rejects((c) => { claim(c, 'claim:assumed-footprint').limitations = []; }, /limitations/);
  rejects((c) => { claim(c, 'claim:tree-context').provenance.source_id = 'source:nowhere'; }, /unresolved source/);
  rejects((c) => { delete claim(c, 'claim:infiltration').validation; }, /validation/);
});

test('an unknown value is never converted to numeric zero', () => {
  rejects((c) => { claim(c, 'claim:utility-clearance').value = { kind: 'number', amount: 0, unit: 'm' }; }, /unknown|zero/);
  rejects((c) => { claim(c, 'claim:infiltration').value.amount = 0; }, /zero|amount: null/);
  rejects((c) => { claim(c, 'claim:drainage-routing').value = { kind: 'text', text: 'clear' }; }, /unknown/);
  rejects((c) => { claim(c, 'claim:tree-context').value.amount = 0; }, /zero/);
  // A gate placeholder of "0" in a source stays unknown; a measured zero stops the build.
  const gated = buildCase(input, withSource('street-xray', (x) => { x.claims.find((k) => k.id === 'utility-clearance').value = '0'; }));
  assert.deepEqual(claim(gated, 'claim:utility-clearance').value.amount, null);
  assert.throws(() => buildCase(input, withSource('street-xray', (x) => { x.claims.find((k) => k.id === 'tree-context').value = '0'; })), /not a positive quantity/);
});

test('missing or restricted evidence never becomes usable, safe or suitable', () => {
  rejects((c) => { claim(c, 'claim:infiltration').permitted_use = ['design']; }, /permitted use|design/);
  rejects((c) => { claim(c, 'claim:utility-clearance').state = 'established-context'; });
  rejects((c) => { claim(c, 'claim:utility-clearance').gap_id = null; }, /gap/);
  rejects((c) => { c.summary.known.push('claim:assumed-footprint'); }, /summary\.known/);
  rejects((c) => { c.summary.why_investigate.push('claim:infiltration'); }, /why_investigate/);
  rejects((c) => { claim(c, 'claim:assumed-footprint').permitted_use = ['explain', 'design']; }, /design|explain or screen/);
});

test('the scenario volume is never labelled as retained capacity', () => {
  rejects((c) => { stage(c, 'illustrative-scenario').scenario.label = 'Retained volume of the rain garden'; }, /label/);
  rejects((c) => { claim(c, 'claim:scenario-rain-on-footprint').statement = 'The rain garden retains 7.68 m³.'; }, /retained capacity/);
  rejects((c) => { claim(c, 'claim:scenario-rain-on-footprint').value.unit = 'm³ storage capacity'; }, /retained capacity/);
  rejects((c) => { stage(c, 'illustrative-scenario').scenario.quantity = 'retained-volume'; });
  rejects((c) => { claim(c, 'claim:scenario-rain-on-footprint').evidence_state = 'known'; });
  rejects((c) => { stage(c, 'illustrative-scenario').scenario.street_lab.use = 'engineering-validation'; }, /Street Lab/);
});

test('every blocker has a gatekeeper and a next action', () => {
  rejects((c) => { gap(c, 'gap:utility-clearance').gatekeeper_ids = []; }, /gatekeeper/);
  rejects((c) => { gap(c, 'gap:drainage-routing').next_action_ids = []; }, /next action/);
  rejects((c) => { gap(c, 'gap:infiltration').gatekeeper_ids = ['gatekeeper:nobody']; }, /unresolved gatekeeper/);
  rejects((c) => { gap(c, 'gap:infiltration').next_action_ids = ['action:rain-walk']; }, /no next action resolves/);
  rejects((c) => { c.decision.blocked_by_gap_ids.push('gap:unknown'); }, /unresolved gap/);
  for (const g of fresh().gaps) {
    assert.ok(g.gatekeeper_ids.length > 0 && g.next_action_ids.length > 0, g.id);
  }
});

test('the decision cannot become recommended or approved', () => {
  for (const state of ['recommended', 'approved', 'suitable', 'safe', 'feasible']) {
    rejects((c) => { c.decision.state = state; }, /decision\.state|unsupported state/);
  }
  rejects((c) => { stage(c, 'intervention-candidate').intervention.status = 'recommended'; }, /unsupported state|requires-investigation/);
  rejects((c) => { c.actions[0].status = 'approved'; }, /unsupported state/);
  rejects((c) => { c.boundary.engineering_recommendation = true; }, /engineering_recommendation/);
  rejects((c) => { c.decision.not_a_recommendation = false; });
});

test('Rain Walk contributes a plan, never fabricated observations', () => {
  const plan = stage(fresh(), 'field-observation-plan').observation_plan;
  assert.equal(plan.status, 'planned-not-collected');
  assert.deepEqual(plan.collected_observations, []);
  assert.equal(claim(fresh(), 'claim:field-observations').evidence_state, 'missing');
  rejects((c) => { stage(c, 'field-observation-plan').observation_plan.collected_observations.push({ kind: 'ponding', review: 'accepted' }); }, /collected observations|allows/);
});

test('Klybeck distinctions are preserved', () => {
  const c = fresh();
  assert.deepEqual(c.subject.coordinates, [7.588, 47.573]);
  assert.equal(c.subject.coordinate_use, 'identity-context-only');
  assert.deepEqual(claim(c, 'claim:candidate-identity').permitted_use, ['identity']);
  // Illustrative candidate scores are not carried as values.
  assert.doesNotMatch(committed, /"(heat|nightCooling|canopyDeficit|sealedSurface|runoff|coolingOpportunity|evidenceQuality)"/);
  for (const [id, amount] of [['claim:study-segment-length', 160], ['claim:edge-strip-width', 2.4], ['claim:assumed-footprint', 384], ['claim:scenario-rainfall-depth', 20], ['claim:scenario-rain-on-footprint', 7.68]]) {
    const x = claim(c, id);
    assert.equal(x.evidence_state, 'assumed', id);
    assert.equal(x.value.amount, amount, id);
    assert.ok(x.permitted_use.every((u) => u === 'explain' || u === 'screen'), id);
  }
  assert.equal(Math.round(20 * 384 / 10) / 100, claim(c, 'claim:scenario-rain-on-footprint').value.amount);
  assert.match(claim(c, 'claim:scenario-rain-on-footprint').value.unit, /falling on the assumed footprint/);

  const util = gap(c, 'gap:utility-clearance');
  assert.equal(util.evidence_state, 'restricted');
  assert.deepEqual(util.gatekeeper_ids, ['gatekeeper:leitungskataster', 'gatekeeper:operators']);
  const drain = gap(c, 'gap:drainage-routing');
  assert.equal(drain.evidence_state, 'restricted');
  assert.deepEqual(drain.gatekeeper_ids, ['gatekeeper:tba-aue']);
  const infil = gap(c, 'gap:infiltration');
  assert.equal(infil.access_state, 'site-check');
  assert.deepEqual(infil.next_action_ids.map((id) => c.actions.find((a) => a.id === id).kind), ['site-test', 'specialist-review']);

  assert.equal(stage(c, 'intervention-candidate').intervention.id, 'kerbside-rain-garden');
  assert.equal(c.decision.state, 'requires-investigation');
  assert.deepEqual(c.stages.map((s) => s.order), [1, 2, 3, 4, 5, 6, 7]);
});

test('source drift that breaks the arithmetic stops the build', () => {
  assert.throws(() => buildCase(input, withSource('street-xray', (x) => { x.intervention.scenario.rain_on_footprint_m3 = 9; })), /≠/);
  assert.throws(() => buildCase(input, withSource('street-xray', (x) => { x.intervention.status = 'recommended'; })), /status/);
});

test('the built-in validator refuses keywords it does not implement', () => {
  assert.throws(() => validateSchema({ type: 'object', dependentRequired: {} }, {}), /not supported/);
});
