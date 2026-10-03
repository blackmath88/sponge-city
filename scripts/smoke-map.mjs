import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(join(root, "prototype", "basel-map.html"), "utf8");
const snapshot = JSON.parse(await readFile(join(root, "data", "basel-map.json"), "utf8"));
const match = html.match(/<script id="map-logic">\s*([\s\S]*?)\s*<\/script>/);
if (!match) throw new Error("Map logic script not found.");

const context = vm.createContext({ console });
vm.runInContext(`${match[1]}\nthis.api = { TREES, MODES, SOIL_WATER, STORIES, ageClass, legendCounts, nearestStation, search, recordById, SNAPSHOT };`, context, { filename: "basel-map.html" });
const api = context.api;
const fail = message => { throw new Error(message); };

if (api.SNAPSHOT.fetched_at !== snapshot.fetched_at) fail("Map HTML does not embed the current snapshot. Run make build.");
if (api.TREES.length !== snapshot.trees.rows.length) fail(`Decoded ${api.TREES.length} trees, expected ${snapshot.trees.rows.length}.`);
if (api.TREES.some(tree => !(tree.lon > 7.4 && tree.lon < 7.8 && tree.lat > 47.5 && tree.lat < 47.65))) fail("A tree lies outside the Basel bounding box.");

const ages = [[null, "unknown"], [0, "a0"], [9, "a0"], [10, "a1"], [99, "a3"], [100, "a4"], [400, "a4"], [401, "check"]];
for (const [age, expected] of ages) if (api.ageClass(age) !== expected) fail(`ageClass(${age}) = ${api.ageClass(age)}, expected ${expected}.`);

if (api.MODES.genus.classes.length !== 5) fail("Genus legend should hold four genera plus Other.");
for (const mode of Object.keys(api.MODES)) {
  const all = api.legendCounts(api.TREES, mode, { streetOnly: false, municipality: "" });
  const sum = Object.values(all.counts).reduce((a, b) => a + b, 0);
  if (sum !== api.TREES.length || all.total !== api.TREES.length) fail(`Legend counts for ${mode} do not add up.`);
}
const street = api.legendCounts(api.TREES, "group", { streetOnly: true, municipality: "" });
if (street.total !== street.counts.street || street.total === 0) fail("Street-only filter leaks other settings.");

const sample = api.TREES[0];
const byId = api.search(api.TREES, sample.id.toLowerCase());
if (byId[0]?.type !== "tree" || byId[0].trees[0].id !== sample.id) fail("Tree-number search failed.");
const streetName = sample.street;
const byStreet = api.search(api.TREES, streetName.slice(0, 6));
if (!byStreet.some(result => result.label === streetName)) fail(`Street search did not find ${streetName}.`);

if (snapshot.stations.length) {
  const hit = api.nearestStation(7.5886, 47.5596, snapshot.stations);
  if (!hit || hit.distance > 3000) fail("No climate station within 3 km of the city centre.");
}
if (!snapshot.perimeters.features.length) fail("VoltaNord development-plan perimeter missing.");

const cited = [...api.SOIL_WATER.record_ids, ...api.STORIES.flatMap(story => story.record_ids), "fact-voltanord-plan-perimeter", "fact-monitoring-scope"];
for (const id of cited) if (!api.recordById(id)) fail(`Map cites missing atlas record ${id}.`);
if (api.SOIL_WATER.status !== "unknown") fail("Soil-water status must stay unknown until Basel data exist.");

console.log(`Map logic smoke test passed: ${api.TREES.length} trees, ${snapshot.stations.length} stations.`);
