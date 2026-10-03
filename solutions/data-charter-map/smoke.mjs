import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = await readFile(join(root, "site", "data-charter-map.html"), "utf8");
const charter = JSON.parse(await readFile(join(root, "data", "data-charter.json"), "utf8"));
const snapshot = JSON.parse(await readFile(join(root, "data", "charter-map.json"), "utf8"));
const doc = await readFile(join(root, "docs", "DATA-CHARTER.md"), "utf8");
const fail = message => { throw new Error(`data-charter-map: ${message}`); };

const match = html.match(/<script id="map-logic">\s*([\s\S]*?)\s*<\/script>/);
if (!match) fail("map logic script not found");
const context = vm.createContext({ console });
vm.runInContext(`${match[1]}\nthis.api = { CHARTER, SNAPSHOT, LAYERS, EVIDENCE, TREES, PERMITS, SCORE, scorecard, decodeTrees, decodePermits, depthColour };`, context);
const api = context.api;

// Embedded data is current
if (api.SNAPSHOT.fetched_at !== snapshot.fetched_at) fail("page does not embed the current snapshot. Run make build.");
if (api.CHARTER.indicators.length !== charter.indicators.length) fail("page does not embed the current charter.");

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

console.log(`data-charter-map smoke test passed: ${charter.indicators.length} indicators, ${api.LAYERS.length} layers, ${api.TREES.length} trees.`);
