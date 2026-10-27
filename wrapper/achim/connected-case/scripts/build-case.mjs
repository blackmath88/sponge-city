// Builds the connected case: reads independent SpongeSquad modules (read-only),
// maps their claims into one shared vocabulary, enforces the evidence-safety
// rules and validates the result against contracts/connected-case.v1.schema.json.
//
//   node --experimental-strip-types --no-warnings scripts/build-case.mjs          write generated/
//   node --experimental-strip-types --no-warnings scripts/build-case.mjs --check  fail if generated/ is stale
//
// The flag is needed because the Site Scoping candidate list is a TypeScript module.
// This script never calculates site values. It reads what source modules publish
// and re-checks their arithmetic; a mismatch stops the build.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const caseRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(caseRoot, '../../..');
export const paths = {
  schema: join(caseRoot, 'contracts/connected-case.v1.schema.json'),
  input: join(caseRoot, 'data/klybeck-edge.input.json'),
  output: join(caseRoot, 'generated/klybeck-edge.case.json'),
};

// Source modules, in output order. Paths are repository-relative and read-only.
const SOURCE_DEFS = [
  { key: 'site-scoping-areas', module: 'Basel Site Scoping Tool · candidate areas', path: 'wrapper/site/basel-site-scoping-tool/src/data/areas.ts', role: 'identify', load: 'module' },
  { key: 'candidate-site-contract', module: 'Candidate site handoff contract', path: 'wrapper/site/integration/contracts/candidate-site-context.v1.schema.json', role: 'identify', load: 'json' },
  { key: 'data-charter', module: 'Data Charter', path: 'wrapper/data-charter-map/data/data-charter.json', role: 'classify', load: 'json' },
  { key: 'street-xray', module: 'Street X-Ray · street evidence profile', path: 'wrapper/street-xray/data/street-evidence-profile.v0.json', role: 'constrain', load: 'json' },
  { key: 'sponge-catalogue', module: 'Sponge Catalogue', path: 'wrapper/sponge-catalogue/data/catalogue.json', role: 'constrain', load: 'json' },
  { key: 'rain-walk', module: 'Rain Walk · observation model', path: 'wrapper/street-workspace/public/rain-walk/evidence.mjs', role: 'observe', load: 'module' },
  { key: 'street-lab', module: 'Street Lab · illustrative water model', path: 'wrapper/street-workspace/README.md', role: 'explain', load: 'text' },
];
const sid = (key) => `source:${key}`;

// Data Charter evidence classes (+ access state for unknowns) → connected-case evidence states.
const EVIDENCE_MAPPING = [
  { source_class: 'observed', source_access_state: null, evidence_state: 'known' },
  { source_class: 'derived', source_access_state: null, evidence_state: 'derived' },
  { source_class: 'assumed', source_access_state: null, evidence_state: 'assumed' },
  { source_class: 'modelled', source_access_state: null, evidence_state: 'modelled' },
  { source_class: 'unknown', source_access_state: 'restricted', evidence_state: 'restricted' },
  { source_class: 'unknown', source_access_state: 'site-check-required', evidence_state: 'missing' },
  { source_class: 'unknown', source_access_state: 'unknown', evidence_state: 'missing' },
];
// Street X-Ray spells one access state differently from the catalogue vocabulary.
const ACCESS_ALIASES = { 'site-check-required': 'site-check' };
const STATE_BY_EVIDENCE = { known: 'established-context', derived: 'established-context', assumed: 'illustrative', modelled: 'hypothesis', restricted: 'blocked', missing: 'open-gap' };
export const FORBIDDEN_STATES = ['recommended', 'approved', 'suitable', 'safe', 'feasible', 'validated', 'ready-to-build', 'accepted'];
export const PERFORMANCE_WORDS = /retain|retention|capacity|stor(ed|age)|performance|reduc|absorb/i;
const GAP_STATES = new Set(['restricted', 'missing']);

const fail = (message) => { throw new Error(`connected-case: ${message}`); };

// The website build stages wrapper/site/* at the staging root and other modules
// under wrapper/, so the same tests also run from wrapper/.site-workspace.
function resolveSource(path) {
  const candidates = [join(repoRoot, path)];
  if (path.startsWith('wrapper/site/')) candidates.push(join(repoRoot, path.slice('wrapper/site/'.length)));
  return candidates.find((file) => existsSync(file)) ?? fail(`source ${path} not found`);
}

export async function loadSources() {
  const sources = {};
  for (const def of SOURCE_DEFS) {
    const file = resolveSource(def.path);
    const text = readFileSync(file, 'utf8');
    let data = text;
    if (def.load === 'json') data = JSON.parse(text);
    if (def.load === 'module') {
      try { data = await import(pathToFileURL(file).href); }
      catch (error) { fail(`cannot import ${def.path} (${error.message}). Run Node with --experimental-strip-types.`); }
    }
    sources[def.key] = { ...def, sha256: createHash('sha256').update(text).digest('hex'), data };
  }
  return sources;
}

function sourceVersion(key, data) {
  if (data && typeof data === 'object' && data.schema_version) return `${data.schema_version} (${data.updated})`;
  if (key === 'candidate-site-contract') return data.title;
  return 'unversioned; pinned by sha256';
}

function evidenceState(sourceClass, accessState) {
  const row = EVIDENCE_MAPPING.find((m) => m.source_class === sourceClass && (m.source_access_state === null || m.source_access_state === accessState));
  if (!row) fail(`no evidence-state mapping for class "${sourceClass}" with access "${accessState}"`);
  return row.evidence_state;
}

function accessState(value, vocabulary) {
  const mapped = ACCESS_ALIASES[value] ?? value;
  if (!Object.hasOwn(vocabulary, mapped)) fail(`unknown access state "${value}"`);
  return mapped;
}

// A source value becomes a number only when it is a finite, positive quantity.
// A zero is refused rather than trusted: the contract has no way to tell a real
// zero from an unknown that was filled in.
function sourceValue(raw, unit, state, reason) {
  if (GAP_STATES.has(state)) return { kind: 'unknown', amount: null, reason };
  const n = typeof raw === 'number' ? raw : (/^-?\d+(\.\d+)?$/.test(String(raw).trim()) ? Number(raw) : NaN);
  if (Number.isFinite(n)) {
    if (n <= 0) fail(`source value ${raw} (${unit}) is not a positive quantity; record it as unknown or text`);
    return { kind: 'number', amount: n, unit };
  }
  return { kind: 'text', text: `"${raw}" (${unit})` };
}

const byId = (list, id, what) => list.find((x) => x.id === id) ?? fail(`${what} "${id}" not found`);

function buildClaim(spec, ctx) {
  const { src, input, vocab } = ctx;
  const xray = src['street-xray'].data;
  const area = ctx.area;
  const gapInput = spec.gap_id ? byId(input.gaps, spec.gap_id, 'gap') : null;
  const base = { id: spec.id, gap_id: spec.gap_id ?? null };
  let claim;
  switch (spec.adapter) {
    case 'xray.claim': {
      const c = byId(xray.claims, spec.claim, 'Street X-Ray claim');
      const state = evidenceState(c.evidence_class, c.access_state);
      claim = {
        statement: spec.statement ?? c.title,
        evidence_state: state,
        value: sourceValue(c.value, c.unit, state, `Street X-Ray records "${c.value}" (${c.unit}) for an open gate; no quantity exists.`),
        provenance: { source_id: sid('street-xray'), locator: `claims[id=${c.id}]`, original_source: c.source, source_url: c.source_url || null, method: c.method ?? `Not determinable from open data. Unlock: ${c.unlock_action}` },
        validation: { status: c.validation, note: `Validation status recorded by Street X-Ray for "${c.id}".` },
        permitted_use: [...c.permitted_use],
        limitations: [c.limitation, ...(spec.limitations ?? [])],
        access_state: accessState(c.access_state, vocab.access_states),
      };
      break;
    }
    case 'xray.site-length': {
      claim = {
        statement: spec.statement,
        evidence_state: 'assumed',
        value: sourceValue(xray.site.length_m, 'm segment length', 'assumed'),
        provenance: { source_id: sid('street-xray'), locator: 'site.length_m', original_source: 'SpongeSquad demo fixture', source_url: null, method: `Street X-Ray identity status: ${xray.site.identity_status}.` },
        validation: { status: 'not-validated', note: 'No survey defines the segment.' },
        permitted_use: ['explain'],
        limitations: [xray.site.boundary],
        access_state: 'unknown',
      };
      break;
    }
    case 'xray.method-number': {
      const c = byId(xray.claims, spec.claim, 'Street X-Ray claim');
      if (!c.method.includes(`${spec.number} m`)) fail(`"${spec.number} m" not stated in Street X-Ray ${c.id}.method`);
      claim = {
        statement: spec.statement,
        evidence_state: evidenceState(c.evidence_class, c.access_state),
        value: { kind: 'number', amount: spec.number, unit: spec.unit },
        provenance: { source_id: sid('street-xray'), locator: `claims[id=${c.id}].method`, original_source: c.source, source_url: c.source_url || null, method: c.method },
        validation: { status: c.validation, note: 'The width is stated in Street X-Ray’s method text and checked to be present there.' },
        permitted_use: [...c.permitted_use],
        limitations: [c.limitation],
        access_state: accessState(c.access_state, vocab.access_states),
      };
      break;
    }
    case 'xray.scenario': {
      const s = xray.intervention.scenario;
      if (s.classification !== 'assumed') fail('Street X-Ray scenario is no longer classified as assumed');
      const isResult = spec.field === 'rain_on_footprint_m3';
      claim = {
        statement: spec.statement,
        evidence_state: 'assumed',
        value: sourceValue(s[spec.field], spec.unit, 'assumed'),
        provenance: {
          source_id: sid('street-xray'), locator: `intervention.scenario.${spec.field}`, original_source: 'SpongeSquad scenario', source_url: null,
          method: isResult ? 'Rainfall depth × assumed footprint, published by Street X-Ray and re-checked arithmetically by this build.' : 'Scenario input declared by Street X-Ray.',
        },
        validation: isResult ? { status: 'arithmetic-checked', note: 'footprint_m2 × rainfall_mm ÷ 1000 equals the published value.' } : { status: 'not-validated', note: 'A chosen scenario depth, not a design storm.' },
        permitted_use: ['explain'],
        limitations: [s.note],
        access_state: 'unknown',
      };
      break;
    }
    case 'xray.engine-fact': {
      const value = xray.engine.facts[spec.fact];
      if (value !== spec.expect) fail(`Street X-Ray engine fact ${spec.fact} is "${value}", expected "${spec.expect}"`);
      const recorded = xray.engine.fact_sources[spec.fact];
      claim = {
        statement: spec.statement,
        evidence_state: 'known',
        value: { kind: 'text', text: `${value} (${spec.fact.replace('_', ' ')})` },
        provenance: { source_id: sid('street-xray'), locator: `engine.facts.${spec.fact}`, original_source: recorded.split(':')[0], source_url: spec.source_url, method: recorded },
        validation: { status: 'source-recorded', note: 'Query result recorded by the Street X-Ray engine.' },
        permitted_use: ['explain', 'screen'],
        limitations: spec.limitations,
        access_state: 'open',
      };
      break;
    }
    case 'areas.identity': {
      claim = {
        statement: spec.statement,
        evidence_state: 'known',
        value: { kind: 'coordinates', lon: area.coordinates[0], lat: area.coordinates[1], crs: 'WGS84' },
        provenance: { source_id: sid('site-scoping-areas'), locator: `areas[id=${area.id}]`, original_source: 'Basel Site Scoping Tool candidate list', source_url: null, method: `Candidate record selected by id ${area.id}.` },
        validation: { status: 'source-recorded', note: 'Identity read from the scoping tool; coordinates are identity context only.' },
        permitted_use: ['identity'],
        limitations: spec.limitations,
        access_state: 'open',
      };
      break;
    }
    case 'areas.profile': {
      claim = {
        statement: spec.statement,
        evidence_state: 'assumed',
        value: { kind: 'text', text: area.profile },
        provenance: { source_id: sid('site-scoping-areas'), locator: `areas[id=${area.id}].profile`, original_source: 'Basel Site Scoping Tool candidate list', source_url: null, method: 'Screening narrative written by the site-scoping workstream.' },
        validation: { status: 'not-validated', note: 'Not yet tested against official layers.' },
        permitted_use: ['explain', 'screen'],
        limitations: [...spec.limitations, `Evidence leads named by the source, not yet checked: ${area.indicators.sources.join('; ')}.`],
        access_state: 'unknown',
      };
      break;
    }
    case 'areas.missing': {
      for (const item of spec.items) if (!area.indicators.missingData.includes(item)) fail(`"${item}" is not listed in ${area.id}.indicators.missingData`);
      claim = {
        statement: spec.statement,
        evidence_state: 'missing',
        value: { kind: 'unknown', amount: null, reason: `Listed as missing data by the scoping tool: ${spec.items.join('; ')}.` },
        provenance: { source_id: sid('site-scoping-areas'), locator: `areas[id=${area.id}].indicators.missingData`, original_source: 'Basel Site Scoping Tool candidate list', source_url: null, method: 'Copied from the candidate’s missing-data list.' },
        validation: { status: 'not-available', note: 'No value exists to validate.' },
        permitted_use: [],
        limitations: ['Absence of data is not evidence of absence of a problem, nor of suitability.'],
        access_state: gapInput.access_state,
      };
      break;
    }
    case 'rain-walk.none-collected': {
      const seeds = src['rain-walk'].data.seed();
      if (!seeds.every((o) => o.source === 'demo' && o.observedAt === null)) fail('Rain Walk bundles non-demo observations; attach a reviewed export instead');
      claim = {
        statement: spec.statement,
        evidence_state: 'missing',
        value: { kind: 'unknown', amount: null, reason: 'Rain Walk ships only synthetic practice clues; no reviewed export for this segment is attached.' },
        provenance: { source_id: sid('rain-walk'), locator: 'seed()', original_source: 'Rain Walk (Street Lab workspace)', source_url: null, method: 'Checked that every bundled observation is a synthetic demo seed (source=demo, observedAt=null).' },
        validation: { status: 'not-measured', note: 'No field visit has taken place for this case.' },
        permitted_use: [],
        limitations: ['Synthetic demo clues are practice material and never count as field evidence.'],
        access_state: gapInput.access_state,
      };
      break;
    }
    case 'catalogue.basel': {
      const catalogue = src['sponge-catalogue'].data;
      const action = byId(catalogue.actions, spec.action, 'catalogue action');
      const entry = action.basel.find((b) => b.status === spec.status && b.sources.includes(spec.source_key)) ?? fail(`no ${spec.status} Basel entry citing ${spec.source_key} for ${spec.action}`);
      const ref = catalogue.sources[spec.source_key];
      claim = {
        statement: spec.statement,
        evidence_state: 'known',
        value: { kind: 'text', text: `${entry.text} (status: ${entry.status})` },
        provenance: { source_id: sid('sponge-catalogue'), locator: `actions[id=${action.id}].basel`, original_source: ref.label, source_url: ref.url, method: 'Listed in the Sponge Catalogue’s Basel status for this action.' },
        validation: { status: 'source-recorded', note: 'Recorded from a public media release; not inspected on site.' },
        permitted_use: ['explain'],
        limitations: spec.limitations,
        access_state: 'open',
      };
      break;
    }
    default: fail(`unknown adapter "${spec.adapter}" for ${spec.id}`);
  }
  const state = spec.adapter === 'areas.identity' ? 'identity-context' : STATE_BY_EVIDENCE[claim.evidence_state];
  return { id: base.id, ...claim, state, gap_id: base.gap_id };
}

// Cross-module arithmetic consistency. These are checks, not new results.
function checkScenarioArithmetic(xray) {
  const footprint = Number(byId(xray.claims, 'candidate-footprint', 'Street X-Ray claim').value);
  const s = xray.intervention.scenario;
  if (s.footprint_m2 !== footprint) fail(`scenario footprint ${s.footprint_m2} ≠ candidate-footprint ${footprint}`);
  const width = Number(/(\d+(\.\d+)?) m edge strip/.exec(byId(xray.claims, 'candidate-footprint', 'Street X-Ray claim').method)?.[1]);
  if (Math.abs(xray.site.length_m * width - footprint) > 1e-9) fail(`segment ${xray.site.length_m} m × strip ${width} m ≠ footprint ${footprint} m²`);
  if (Math.abs(Math.round(s.footprint_m2 * s.rainfall_mm / 10) / 100 - s.rain_on_footprint_m3) > 1e-9) fail(`${s.rainfall_mm} mm × ${s.footprint_m2} m² ≠ ${s.rain_on_footprint_m3} m³`);
}

export function buildCase(input, src) {
  const xray = src['street-xray'].data;
  const catalogue = src['sponge-catalogue'].data;
  const charter = src['data-charter'].data;
  const rainWalk = src['rain-walk'].data;
  const area = src['site-scoping-areas'].data.areas.find((a) => a.id === input.candidate_id) ?? fail(`candidate ${input.candidate_id} not found`);
  checkScenarioArithmetic(xray);
  for (const cls of Object.keys(charter.evidence_classes)) if (!EVIDENCE_MAPPING.some((m) => m.source_class === cls)) fail(`Data Charter class "${cls}" has no mapping`);

  const vocabulary = {
    evidence_states: input.evidence_states,
    source_evidence_class_mapping: EVIDENCE_MAPPING,
    access_states: catalogue.access_states,
    permitted_uses: { ...input.extra_permitted_uses, ...charter.permitted_uses },
  };
  const ctx = { src, input, vocab: vocabulary, area };
  const claims = input.claims.map((spec) => buildClaim(spec, ctx));

  const gatekeepers = input.gatekeepers.map((g) => {
    if (g.catalogue_id) {
      const k = catalogue.gatekeepers[g.catalogue_id] ?? fail(`catalogue gatekeeper ${g.catalogue_id} not found`);
      return { id: g.id, name: k.name, role: k.role, provenance: { source_id: sid('sponge-catalogue'), locator: `gatekeepers.${g.catalogue_id}` } };
    }
    return { id: g.id, name: g.name, role: g.role, provenance: { source_id: sid(g.provenance.source), locator: g.provenance.locator } };
  });

  const gaps = input.gaps.map((g) => {
    const first = byId(claims, g.claim_ids[0], 'claim');
    const xrayClaim = input.claims.find((c) => c.id === first.id && c.adapter === 'xray.claim');
    const blocks = g.blocks ?? (xrayClaim ? byId(xray.claims, xrayClaim.claim, 'Street X-Ray claim').decision_blocked : fail(`${g.id} needs "blocks"`));
    return { id: g.id, question: g.question, claim_ids: g.claim_ids, evidence_state: first.evidence_state, access_state: g.access_state ?? first.access_state, gatekeeper_ids: g.gatekeeper_ids, next_action_ids: g.next_action_ids, blocks, state: 'open' };
  });

  const actions = input.actions.map((a) => ({ id: a.id, kind: a.kind, title: a.title, gatekeeper_ids: a.gatekeeper_ids, resolves_gap_ids: a.resolves_gap_ids, would_establish: a.would_establish, cannot_establish: a.cannot_establish, status: 'proposed' }));

  const intervention = (() => {
    const x = xray.intervention;
    if (x.id !== input.intervention.id) fail(`Street X-Ray intervention is "${x.id}", expected "${input.intervention.id}"`);
    if (x.status !== 'requires-investigation') fail(`Street X-Ray intervention status is "${x.status}"`);
    const action = byId(catalogue.actions, input.intervention.catalogue_action_id, 'catalogue action');
    return { id: x.id, name: x.name, catalogue_action_id: action.id, status: x.status, mechanisms_claimed_by_catalogue: [...action.mechanisms], why_considered: x.why };
  })();

  const observationPlan = {
    status: 'planned-not-collected',
    targets: input.observation_plan.targets.map((t) => {
      const k = rainWalk.kinds[t.kind] ?? fail(`Rain Walk kind "${t.kind}" not found`);
      return { kind: t.kind, label: k[0], can_support: k[1], cannot_establish: k[2], follow_up: k[3], informs_gap_ids: t.informs_gap_ids };
    }),
    review_states: { ...rainWalk.reviews },
    collected_observations: [],
    boundary: input.observation_plan.boundary,
  };

  const scenario = {
    id: input.scenario.id,
    quantity: 'rain-falling-on-assumed-footprint',
    label: input.scenario.label,
    result_claim_id: input.scenario.result_claim_id,
    input_claim_ids: input.scenario.input_claim_ids,
    street_lab: { source_id: sid('street-lab'), use: 'illustration-only', site: 'synthetic-street-not-klybeck', may_explain: input.scenario.street_lab.may_explain, must_not_be_used_for: input.scenario.street_lab.must_not_be_used_for },
  };

  const stages = input.stages.map((s, i) => {
    const stage = { id: `stage:${i + 1}-${s.key}`, order: i + 1, key: s.key, title: s.title, question: s.question, module: { name: s.sources.map((k) => src[k]?.module ?? fail(`source ${k} not found`)).join(' + '), source_ids: s.sources.map(sid) }, role: s.role, claim_ids: s.claim_ids, gap_ids: s.gap_ids, action_ids: s.action_ids, can_show: s.can_show, cannot_show: s.cannot_show };
    if (s.key === 'field-observation-plan') stage.observation_plan = observationPlan;
    if (s.key === 'intervention-candidate') stage.intervention = intervention;
    if (s.key === 'illustrative-scenario') stage.scenario = scenario;
    return stage;
  });

  const decision = { id: input.decision.id, state: 'requires-investigation', question: input.decision.question, bounded_next_decision: input.decision.bounded_next_decision, not_a_recommendation: true, unsupported_states: input.decision.unsupported_states, blocked_by_gap_ids: input.decision.blocked_by_gap_ids, next_action_ids: input.decision.next_action_ids, reopen_when: input.decision.reopen_when };
  const scenarioStage = stages.find((s) => s.key === 'illustrative-scenario');

  return {
    contract: 'connected-case/v1',
    case_id: input.case_id,
    title: input.title,
    boundary: input.boundary,
    rules: input.rules,
    vocabulary,
    sources: SOURCE_DEFS.map((d) => ({ id: sid(d.key), module: d.module, path: d.path, version: sourceVersion(d.key, src[d.key].data), sha256: src[d.key].sha256, role: d.role, read_only: true })),
    subject: { candidate_id: area.id, name: area.name, district: area.district, coordinates: [area.coordinates[0], area.coordinates[1]], coordinate_use: 'identity-context-only', claim_ids: ['claim:candidate-identity'] },
    claims,
    gatekeepers,
    gaps,
    actions,
    stages,
    decision,
    summary: {
      why_investigate: input.summary.why_investigate,
      known: claims.filter((c) => c.evidence_state === 'known' || c.evidence_state === 'derived').map((c) => c.id),
      assumed: claims.filter((c) => c.evidence_state === 'assumed' || c.evidence_state === 'modelled').map((c) => c.id),
      missing_or_restricted: gaps.map((g) => g.id),
      field_observation_could_establish: observationPlan.targets.map((t) => `${t.label}: ${t.can_support.toLowerCase()} (cannot establish: ${t.cannot_establish.toLowerCase()})`),
      scenario_can_show: scenarioStage.can_show,
      scenario_cannot_show: scenarioStage.cannot_show,
      next_bounded_decision: decision.id,
    },
  };
}

// Rules a schema cannot express (cross-references, global scans). Returns violations.
export function enforceRules(c) {
  const v = [];
  const index = new Map();
  for (const [kind, list] of [['source', c.sources], ['claim', c.claims], ['gatekeeper', c.gatekeepers], ['gap', c.gaps], ['action', c.actions], ['stage', c.stages], ['rule', c.rules]]) {
    for (const item of list ?? []) {
      if (index.has(item.id)) v.push(`duplicate id ${item.id}`);
      index.set(item.id, { kind, item });
    }
  }
  if (c.decision?.id) index.set(c.decision.id, { kind: 'decision', item: c.decision });
  const ref = (id, kind, where) => { const hit = index.get(id); if (!hit || hit.kind !== kind) v.push(`${where}: unresolved ${kind} reference ${id}`); return hit?.item; };

  // Global scans: no numeric zero, no approval-like state anywhere.
  (function walk(node, path) {
    if (typeof node === 'number' && node === 0) v.push(`${path}: numeric zero (unknown must stay unknown)`);
    if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (node && typeof node === 'object') for (const [k, x] of Object.entries(node)) {
      if ((k === 'state' || k === 'status') && typeof x === 'string' && FORBIDDEN_STATES.includes(x)) v.push(`${path}.${k}: unsupported state "${x}"`);
      walk(x, `${path}.${k}`);
    }
  })(c, '$');

  if (c.boundary?.engineering_recommendation !== false) v.push('boundary.engineering_recommendation must be false');
  if (c.decision?.state !== 'requires-investigation') v.push(`decision.state is "${c.decision?.state}", must stay "requires-investigation"`);
  if (c.decision?.not_a_recommendation !== true) v.push('decision.not_a_recommendation must be true');

  for (const claim of c.claims ?? []) {
    const where = claim.id;
    const p = claim.provenance ?? {};
    for (const field of ['source_id', 'locator', 'original_source', 'method']) if (!p[field]) v.push(`${where}: provenance.${field} missing`);
    if (p.source_id) ref(p.source_id, 'source', where);
    if (!claim.validation?.status) v.push(`${where}: validation missing`);
    if (!Array.isArray(claim.limitations) || claim.limitations.length === 0) v.push(`${where}: limitations missing`);
    if (/\brecommend/i.test(claim.statement ?? '')) v.push(`${where}: statement makes a recommendation`);
    if ((claim.permitted_use ?? []).some((u) => u === 'design' || u === 'prioritise')) v.push(`${where}: no v1 claim is validated for design or prioritisation`);
    if (GAP_STATES.has(claim.evidence_state)) {
      if (claim.value?.kind !== 'unknown' || claim.value?.amount !== null) v.push(`${where}: ${claim.evidence_state} value must be {kind: unknown, amount: null}`);
      if ((claim.permitted_use ?? []).length) v.push(`${where}: ${claim.evidence_state} evidence cannot have a permitted use`);
      const gap = claim.gap_id && ref(claim.gap_id, 'gap', where);
      if (!gap) v.push(`${where}: ${claim.evidence_state} claim has no gap`);
      else if (!gap.claim_ids.includes(claim.id)) v.push(`${where}: gap ${gap.id} does not list this claim`);
    } else {
      if (claim.gap_id !== null) v.push(`${where}: only restricted or missing claims open a gap`);
      if (claim.value?.kind === 'unknown') v.push(`${where}: ${claim.evidence_state} claim carries an unknown value`);
      if (['assumed', 'modelled'].includes(claim.evidence_state) && (claim.permitted_use ?? []).some((u) => !['explain', 'screen'].includes(u))) v.push(`${where}: assumptions may only explain or screen`);
    }
  }

  for (const gap of c.gaps ?? []) {
    if (!gap.gatekeeper_ids?.length) v.push(`${gap.id}: no gatekeeper`);
    if (!gap.next_action_ids?.length) v.push(`${gap.id}: no next action`);
    for (const id of gap.gatekeeper_ids ?? []) ref(id, 'gatekeeper', gap.id);
    const actions = (gap.next_action_ids ?? []).map((id) => ref(id, 'action', gap.id)).filter(Boolean);
    if (actions.length && !actions.some((a) => a.resolves_gap_ids.includes(gap.id))) v.push(`${gap.id}: no next action resolves it`);
    for (const id of gap.claim_ids ?? []) {
      const claim = ref(id, 'claim', gap.id);
      if (claim && !GAP_STATES.has(claim.evidence_state)) v.push(`${gap.id}: ${id} is ${claim.evidence_state}, not a gap`);
    }
  }
  for (const action of c.actions ?? []) {
    if (!action.gatekeeper_ids?.length) v.push(`${action.id}: no gatekeeper`);
    for (const id of action.gatekeeper_ids ?? []) ref(id, 'gatekeeper', action.id);
    for (const id of action.resolves_gap_ids ?? []) ref(id, 'gap', action.id);
    if (/\brecommend/i.test(action.title ?? '')) v.push(`${action.id}: title makes a recommendation`);
  }
  for (const g of c.gatekeepers ?? []) ref(g.provenance?.source_id, 'source', g.id);

  const keys = ['candidate-signal', 'evidence-classification', 'evidence-gate', 'field-observation-plan', 'intervention-candidate', 'illustrative-scenario', 'bounded-decision'];
  (c.stages ?? []).forEach((s, i) => {
    if (s.order !== i + 1 || s.key !== keys[i]) v.push(`${s.id}: stage ${i + 1} must be ${keys[i]}`);
    for (const id of s.module?.source_ids ?? []) ref(id, 'source', s.id);
    for (const id of s.claim_ids ?? []) ref(id, 'claim', s.id);
    for (const id of s.gap_ids ?? []) ref(id, 'gap', s.id);
    for (const id of s.action_ids ?? []) ref(id, 'action', s.id);
    if (s.observation_plan) {
      if (s.observation_plan.collected_observations?.length) v.push(`${s.id}: v1 must not carry collected observations`);
      for (const t of s.observation_plan.targets ?? []) for (const id of t.informs_gap_ids ?? []) ref(id, 'gap', s.id);
    }
    if (s.intervention && s.intervention.status !== 'requires-investigation') v.push(`${s.id}: intervention status must stay requires-investigation`);
    if (s.scenario) {
      const sc = s.scenario;
      if (sc.quantity !== 'rain-falling-on-assumed-footprint') v.push(`${s.id}: scenario quantity must be rain-falling-on-assumed-footprint`);
      if (PERFORMANCE_WORDS.test(sc.label ?? '')) v.push(`${s.id}: scenario label reads as retained capacity or performance`);
      const result = ref(sc.result_claim_id, 'claim', s.id);
      if (result) {
        if (result.evidence_state !== 'assumed') v.push(`${result.id}: scenario result must stay assumed`);
        if (PERFORMANCE_WORDS.test(result.statement) || PERFORMANCE_WORDS.test(result.value?.unit ?? '')) v.push(`${result.id}: scenario volume is labelled as retained capacity or performance`);
      }
      for (const id of sc.input_claim_ids ?? []) { const claim = ref(id, 'claim', s.id); if (claim && claim.evidence_state !== 'assumed') v.push(`${id}: scenario input must be assumed`); }
      if (sc.street_lab?.use !== 'illustration-only') v.push(`${s.id}: Street Lab may only illustrate`);
      ref(sc.street_lab?.source_id, 'source', s.id);
    }
  });

  const d = c.decision ?? {};
  for (const id of d.blocked_by_gap_ids ?? []) ref(id, 'gap', d.id);
  for (const id of d.next_action_ids ?? []) ref(id, 'action', d.id);
  for (const s of FORBIDDEN_STATES.slice(0, 5)) if (!(d.unsupported_states ?? []).includes(s)) v.push(`decision.unsupported_states must list "${s}"`);

  const sm = c.summary ?? {};
  for (const id of sm.known ?? []) { const claim = ref(id, 'claim', 'summary.known'); if (claim && !['known', 'derived'].includes(claim.evidence_state)) v.push(`summary.known lists ${claim.evidence_state} claim ${id}`); }
  for (const id of sm.assumed ?? []) { const claim = ref(id, 'claim', 'summary.assumed'); if (claim && !['assumed', 'modelled'].includes(claim.evidence_state)) v.push(`summary.assumed lists ${claim.evidence_state} claim ${id}`); }
  for (const id of sm.why_investigate ?? []) { const claim = ref(id, 'claim', 'summary.why_investigate'); if (claim && GAP_STATES.has(claim.evidence_state)) v.push(`summary.why_investigate cannot rest on ${claim.evidence_state} claim ${id}`); }
  for (const id of sm.missing_or_restricted ?? []) ref(id, 'gap', 'summary.missing_or_restricted');
  for (const id of c.subject?.claim_ids ?? []) ref(id, 'claim', 'subject');
  return v;
}

// Minimal JSON Schema (2020-12) validator for the keywords this repository's
// contracts use. Unsupported keywords throw, so nothing is silently skipped.
const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$comment', '$defs', 'examples']);
export function validateSchema(schema, data, root = schema, path = '$') {
  const errors = [];
  const type = (x) => (x === null ? 'null' : Array.isArray(x) ? 'array' : Number.isInteger(x) ? 'integer' : typeof x);
  const typeOk = (t, x) => t === type(x) || (t === 'number' && type(x) === 'integer');
  const sub = (s, x, p) => validateSchema(s, x, root, p);
  if (schema === false) return [`${path}: not allowed`];
  if (schema === true) return [];
  for (const [kw, val] of Object.entries(schema)) {
    if (ANNOTATIONS.has(kw)) continue;
    switch (kw) {
      case '$ref': {
        const m = /^#\/\$defs\/(.+)$/.exec(val) ?? fail(`unsupported $ref ${val}`);
        errors.push(...sub(root.$defs[m[1]] ?? fail(`missing $def ${m[1]}`), data, path));
        break;
      }
      case 'type': if (![].concat(val).some((t) => typeOk(t, data))) errors.push(`${path}: expected ${[].concat(val).join('|')}, got ${type(data)}`); break;
      case 'const': if (JSON.stringify(data) !== JSON.stringify(val)) errors.push(`${path}: must equal ${JSON.stringify(val)}`); break;
      case 'enum': if (!val.some((e) => JSON.stringify(e) === JSON.stringify(data))) errors.push(`${path}: "${data}" not in ${JSON.stringify(val)}`); break;
      case 'required': if (type(data) === 'object') for (const k of val) if (!Object.hasOwn(data, k)) errors.push(`${path}: missing ${k}`); break;
      case 'properties': if (type(data) === 'object') for (const [k, s] of Object.entries(val)) if (Object.hasOwn(data, k)) errors.push(...sub(s, data[k], `${path}.${k}`)); break;
      case 'additionalProperties': if (type(data) === 'object') for (const k of Object.keys(data)) if (!Object.hasOwn(schema.properties ?? {}, k)) errors.push(...(val === false ? [`${path}: unexpected property ${k}`] : sub(val, data[k], `${path}.${k}`))); break;
      case 'minProperties': if (type(data) === 'object' && Object.keys(data).length < val) errors.push(`${path}: needs ≥${val} properties`); break;
      case 'prefixItems': if (Array.isArray(data)) val.forEach((s, i) => { if (i < data.length) errors.push(...sub(s, data[i], `${path}[${i}]`)); }); break;
      case 'items': if (Array.isArray(data)) data.forEach((x, i) => { if (i >= (schema.prefixItems?.length ?? 0)) errors.push(...sub(val, x, `${path}[${i}]`)); }); break;
      case 'minItems': if (Array.isArray(data) && data.length < val) errors.push(`${path}: needs ≥${val} items`); break;
      case 'maxItems': if (Array.isArray(data) && data.length > val) errors.push(`${path}: allows ≤${val} items`); break;
      case 'uniqueItems': if (val && Array.isArray(data) && new Set(data.map((x) => JSON.stringify(x))).size !== data.length) errors.push(`${path}: items not unique`); break;
      case 'minLength': if (typeof data === 'string' && [...data].length < val) errors.push(`${path}: shorter than ${val}`); break;
      case 'maxLength': if (typeof data === 'string' && [...data].length > val) errors.push(`${path}: longer than ${val}`); break;
      case 'pattern': if (typeof data === 'string' && !new RegExp(val, 'u').test(data)) errors.push(`${path}: does not match ${val}`); break;
      case 'minimum': if (typeof data === 'number' && data < val) errors.push(`${path}: < ${val}`); break;
      case 'maximum': if (typeof data === 'number' && data > val) errors.push(`${path}: > ${val}`); break;
      case 'exclusiveMinimum': if (typeof data === 'number' && data <= val) errors.push(`${path}: must be > ${val}`); break;
      case 'allOf': for (const s of val) errors.push(...sub(s, data, path)); break;
      case 'anyOf': if (!val.some((s) => sub(s, data, path).length === 0)) errors.push(`${path}: matches no anyOf branch`); break;
      case 'oneOf': { const n = val.filter((s) => sub(s, data, path).length === 0).length; if (n !== 1) errors.push(`${path}: matches ${n} oneOf branches, expected 1`); break; }
      case 'not': if (sub(val, data, path).length === 0) errors.push(`${path}: matches a forbidden schema`); break;
      case 'if': {
        const branch = sub(val, data, path).length === 0 ? schema.then : schema.else;
        if (branch) errors.push(...sub(branch, data, path));
        break;
      }
      case 'then': case 'else': break;
      default: fail(`schema keyword "${kw}" is not supported by the built-in validator`);
    }
  }
  return errors;
}

export const serialise = (value) => `${JSON.stringify(value, null, 2)}\n`;

export async function generate() {
  const input = JSON.parse(readFileSync(paths.input, 'utf8'));
  const schema = JSON.parse(readFileSync(paths.schema, 'utf8'));
  const built = buildCase(input, await loadSources());
  const problems = [...validateSchema(schema, built), ...enforceRules(built)];
  if (problems.length) fail(`generated case violates the contract:\n  ${problems.join('\n  ')}`);
  return serialise(built);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const text = await generate();
    if (process.argv.includes('--check')) {
      let current = '';
      try { current = readFileSync(paths.output, 'utf8'); } catch { /* missing counts as stale */ }
      if (current !== text) { console.error('connected-case: generated/klybeck-edge.case.json is stale. Run npm run build in wrapper/achim/connected-case.'); process.exit(1); }
      console.log('connected-case: generated case is current and valid.');
    } else {
      mkdirSync(dirname(paths.output), { recursive: true });
      writeFileSync(paths.output, text);
      console.log('connected-case: wrote generated/klybeck-edge.case.json');
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
