import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(join(root, "dist", "index.html"), "utf8");
const charter = JSON.parse(await readFile(join(root, "data", "data-charter.json"), "utf8"));
const snapshot = JSON.parse(await readFile(join(root, "data", "charter-map.json"), "utf8"));
const charterDe = JSON.parse(await readFile(join(root, "data", "charter-de.json"), "utf8"));
const measurements = JSON.parse(await readFile(join(root, "..", "..", "journey", "content", "measurements.json"), "utf8"));
const doc = await readFile(join(root, "docs", "DATA-CHARTER.md"), "utf8");
const fail = message => { throw new Error(`data-charter-map: ${message}`); };

const match = html.match(/<script id="map-logic">\s*([\s\S]*?)\s*<\/script>/);
if (!match) fail("map logic script not found");
const context = vm.createContext({ console });
vm.runInContext(`${match[1]}\nthis.api = { CHARTER, SNAPSHOT, LAYERS, EVIDENCE, TREES, PERMITS, SCORE, scorecard, decodeTrees, decodePermits, depthColour, CLAIMS, claimSummary, setLangCode, t, normLang, CHARTER_DE };`, context);
const api = context.api;
api.setLangCode("en");

// Embedded data is current
if (api.SNAPSHOT.fetched_at !== snapshot.fetched_at) fail("page does not embed the current snapshot. Run make build.");
if (api.CHARTER.indicators.length !== charter.indicators.length) fail("page does not embed the current charter.");
if (!html.includes("not a score of Basel's sponge-city performance")) fail("publication coverage boundary is missing");
if (JSON.stringify(snapshot.trees.inferred).includes("sealed land cover")) fail("tree planting context is overstated as sealed land cover");

// Charter contract
const groups = new Set(charter.groups.map(g => g.id));
const refs = new Set(charter.references.map(r => r.id));
const layerIds = new Set(api.LAYERS.map(l => l.id));
const ids = new Set();
for (const ind of charter.indicators) {
  if (ids.has(ind.id)) fail(`duplicate indicator ${ind.id}`);
  ids.add(ind.id);
  if (!groups.has(ind.group)) fail(`${ind.id}: unknown group`);
  if (!(ind.basel.status in charter.real_status)) fail(`${ind.id}: unknown real status ${ind.basel.status}`);
  if (ind.fill && !(ind.fill.status in charter.fill_status)) fail(`${ind.id}: unknown fill status`);
  for (const ref of ind.refs) if (!refs.has(ref)) fail(`${ind.id}: unknown reference ${ref}`);
  for (const id of ind.layers) if (!layerIds.has(id)) fail(`${ind.id}: layer ${id} not on the map`);
  for (const source of ind.basel.sources) if (!/^https:\/\//.test(source.url)) fail(`${ind.id}: source without https URL`);
  if (["open", "partial"].includes(ind.basel.status) && !ind.basel.sources.length) fail(`${ind.id}: real data claimed without a source`);
  if (["missing", "restricted"].includes(ind.basel.status) && !ind.layers.includes(`m-${ind.id}`)) fail(`${ind.id}: missing data must be shown as missing`);
  // Real vs inferred: an inferred layer may only belong to an indicator whose fill was actually run.
  const inferred = ind.layers.filter(id => api.LAYERS.find(l => l.id === id).evidence === "inferred");
  if (inferred.length && ind.fill?.status !== "run") fail(`${ind.id}: inferred layer shown but fill not run`);
  if (ind.fill?.status === "run" && !inferred.length) fail(`${ind.id}: fill run but no inferred layer on the map`);
  // The readable charter lists every indicator with the same status
  const row = doc.split("\n").find(line => line.includes(`\`${ind.id}\``));
  if (!row) fail(`docs/DATA-CHARTER.md does not list ${ind.id}`);
  if (!row.includes(ind.basel.status)) fail(`docs/DATA-CHARTER.md status for ${ind.id} differs from the JSON (${ind.basel.status})`);
}
for (const layer of api.LAYERS) {
  if (!api.EVIDENCE.includes(layer.evidence)) fail(`${layer.id}: unknown evidence class`);
  const prefix = { real: "r-", official: "r-", inferred: "i-", missing: "m-" }[layer.evidence];
  if (!layer.id.startsWith(prefix)) fail(`${layer.id}: id prefix does not match evidence ${layer.evidence}`);
  if (layer.evidence === "inferred" && !layer.title.startsWith("≈")) fail(`${layer.id}: inferred layer title must start with ≈`);
}

// Typed inference claims (ADR 0006/0007)
const classes = Object.keys(charter.evidence_classes || {});
const uses = Object.keys(charter.permitted_uses || {});
for (const required of ["observed", "derived", "modelled", "assumed", "unknown"]) if (!classes.includes(required)) fail(`evidence class ${required} not defined`);
for (const required of ["explain", "screen", "prioritise", "design"]) if (!uses.includes(required)) fail(`permitted use ${required} not defined`);
const claimed = new Set();
for (const claim of charter.claims) {
  const layer = api.LAYERS.find(l => l.id === claim.layer);
  if (!layer || layer.evidence !== "inferred") fail(`${claim.id}: claim must belong to an inferred layer`);
  if (claimed.has(claim.layer)) fail(`${claim.layer}: more than one claim`);
  claimed.add(claim.layer);
  if (!charter.indicators.some(i => i.id === claim.indicator && i.layers.includes(claim.layer))) fail(`${claim.id}: indicator does not show this layer`);
  for (const field of ["statement", "method", "spatial_resolution", "temporal_resolution", "validation"]) if (!claim[field]) fail(`${claim.id}: missing ${field}`);
  if (!["derived", "modelled"].includes(claim.evidence_class)) fail(`${claim.id}: an inference must be derived or modelled, never ${claim.evidence_class}`);
  if (!claim.inputs?.length || claim.inputs.some(input => !/^https:\/\//.test(input.url))) fail(`${claim.id}: inputs need https sources`);
  if (!claim.limitations?.length) fail(`${claim.id}: limitations missing`);
  if (!claim.permitted_use?.length || claim.permitted_use.some(use => !uses.includes(use))) fail(`${claim.id}: unknown permitted use`);
  if (claim.validation === "not validated" && claim.permitted_use.some(use => ["prioritise", "design"].includes(use))) fail(`${claim.id}: unvalidated claims may only explain or screen`);
  if (!api.claimSummary(api.CLAIMS[claim.layer]).includes(claim.validation)) fail(`${claim.id}: map label does not show validation`);
}
for (const layer of api.LAYERS.filter(l => l.evidence === "inferred")) if (!claimed.has(layer.id)) fail(`${layer.id}: inferred layer without a typed claim`);

// Missing means "not found in the reviewed sources", never "does not exist"
if (!charter.real_status.missing.includes("reviewed Basel and federal sources")) fail("missing status must say 'in the reviewed sources'");
if (!html.includes("no open data found in the reviewed Basel and federal sources")) fail("map must say 'no open data found in the reviewed Basel and federal sources'");
if (/dig window/i.test(html) || /no open real data/i.test(html) || /real data exists but is not public/i.test(html)) fail("overstated gap wording on the map");
for (const ind of charter.indicators.filter(i => i.basel.status === "restricted")) if (!/^Assumed:/.test(ind.basel.existence_basis || "")) fail(`${ind.id}: restricted needs an assumed existence basis`);

// Scorecard adds up
const s = api.SCORE;
if (Object.values(s.real).reduce((a, b) => a + b, 0) !== s.total) fail("scorecard real counts do not add up");

// Snapshot: real fields and inferred fields are separate
if (api.TREES.length !== snapshot.trees.rows.length || api.TREES.length < 10000) fail("street trees not decoded");
if (!api.TREES.every(t => t.lon > 7.5 && t.lon < 7.75 && t.lat > 47.5 && t.lat < 47.62)) fail("a tree lies outside Basel");
if (!api.TREES.every(t => t.pit === 0 ? t.strip === null : t.strip > 0)) fail("pit class and strip area disagree");
for (const station of snapshot.groundwater) {
  if (!station.real || !station.inferred || "depth_min_m" in station.real) fail(`station ${station.id}: real and inferred must be separate`);
  const expected = +(station.real.terrain_masl - station.real.level_10y_max_masl).toFixed(1);
  if (Math.abs(expected - station.inferred.depth_min_m) > 0.05) fail(`station ${station.id}: depth does not follow from its real values`);
}
if (!snapshot.permits.rows.length || !api.PERMITS.every(p => snapshot.permits.categories.includes(p.category))) fail("permit categories not decoded");
if (api.depthColour(1) === api.depthColour(18)) fail("depth colours do not separate shallow from deep");
if (snapshot.boundary?.geometry?.type !== "MultiPolygon" && snapshot.boundary?.geometry?.type !== "Polygon") fail("canton boundary missing");

// Language layer (de default, en optional)
if (api.normLang("xx") !== "de" || api.normLang(undefined) !== "de" || api.normLang("en") !== "en") fail("language normalisation: invalid must fall back to de");
for (const marker of ['type === "sponge-lang"', "sponge.lang", "embedded", "data-lang"]) if (!html.includes(marker)) fail(`language layer: ${marker} missing`);
if (/\/\*__[A-Z_]+__\*\/ null/.test(html)) fail("unfilled data marker in built page");
const indIds = new Set(charter.indicators.map(i => i.id));
for (const id of indIds) {
  const e = charterDe.indicators?.[id];
  if (!e?.name?.trim() || !e?.north_star?.trim() || !e?.basel?.detail?.trim()) fail(`charter-de.json: ${id} needs name, north_star and basel.detail`);
  const ind = charter.indicators.find(i => i.id === id);
  if (ind.fill && (!e.fill?.method?.trim() || !e.fill?.confidence?.trim())) fail(`charter-de.json: ${id} needs fill.method and fill.confidence`);
  if (ind.ask && !e.ask?.trim()) fail(`charter-de.json: ${id} needs ask`);
  if (ind.basel.existence_basis && !e.basel.existence_basis?.trim()) fail(`charter-de.json: ${id} needs basel.existence_basis`);
}
for (const id of Object.keys(charterDe.indicators)) if (!indIds.has(id)) fail(`charter-de.json: unknown indicator ${id}`);
for (const g of charter.groups) if (!charterDe.groups?.[g.id]) fail(`charter-de.json: group ${g.id} missing`);
for (const key of Object.keys(charter.real_status)) if (!charterDe.real_status?.[key]) fail(`charter-de.json: real_status ${key} missing`);
for (const key of Object.keys(charter.fill_status)) if (!charterDe.fill_status?.[key]) fail(`charter-de.json: fill_status ${key} missing`);
for (const key of Object.keys(charter.evidence_classes)) if (!charterDe.evidence_classes?.[key]) fail(`charter-de.json: evidence_classes ${key} missing`);
for (const key of Object.keys(charter.permitted_uses)) if (!charterDe.permitted_uses?.[key]) fail(`charter-de.json: permitted_uses ${key} missing`);
if (!charterDe.title || !charterDe.purpose) fail("charter-de.json: title and purpose missing");
for (const claim of charter.claims) if (charterDe.claims?.[claim.id]?.limitations?.length !== claim.limitations.length) fail(`charter-de.json: claim ${claim.id} limitations differ in count`);
if (JSON.stringify(charterDe).includes("ß")) fail("charter-de.json must use Swiss 'ss', never 'ß'");
const reused = ["land-cover", "sealing-fraction", "infiltration", "sewer-network", "rainfall", "tree-pits", "soil-moisture", "measures-registry"];
for (const id of reused) {
  const m = measurements.indicators.find(i => i.id === id);
  const e = charterDe.indicators[id];
  if (e.north_star !== m.desirable.de) fail(`${id}: north_star differs from measurements.json`);
  if (e.basel.detail !== m.actual.de) fail(`${id}: basel.detail differs from measurements.json`);
  if ((e.fill?.method ?? null) !== (m.proxy?.de ?? null)) fail(`${id}: fill.method differs from measurements.json`);
  if ((e.ask ?? null) !== (m.ask?.de ?? null)) fail(`${id}: ask differs from measurements.json`);
}
// German rendering helpers
api.setLangCode("de");
const claimDe = api.claimSummary(api.CLAIMS["i-pits"]);
if (!claimDe.includes("nicht validiert") || /not validated/.test(claimDe)) fail("German claim summary is not localised");
if (api.t("status.open") !== "offen") fail("German status label missing");
api.setLangCode("en");

console.log(`data-charter-map smoke test passed: ${charter.indicators.length} indicators, ${api.LAYERS.length} layers, ${api.TREES.length} trees.`);
