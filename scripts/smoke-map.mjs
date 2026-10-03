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
vm.runInContext(`${match[1]}\nthis.api = { TREES, GENERA, LAYERS, KINDS, GROUPS, SOIL_WATER, STORIES, ATLAS, SNAPSHOT, modeClasses, ageClass, legendCounts, nearestStation, treesNear, search, recordById, perimetersAt, matchRunoffColour, tilePixel, buildPlaceProfile, encodeState, decodeState, darkColour, darkStyle };`, context, { filename: "basel-map.html" });
const api = context.api;
const fail = message => { throw new Error(message); };

// Snapshot and decoding
if (api.SNAPSHOT.fetched_at !== snapshot.fetched_at) fail("Map HTML does not embed the current snapshot. Run make build.");
if (api.TREES.length !== snapshot.trees.rows.length) fail(`Decoded ${api.TREES.length} trees, expected ${snapshot.trees.rows.length}.`);
if (api.TREES.some(tree => !(tree.lon > 7.4 && tree.lon < 7.8 && tree.lat > 47.5 && tree.lat < 47.65))) fail("A tree lies outside the Basel bounding box.");

// Tree classes and legend counts
const ages = [[null, "unknown"], [0, "a0"], [9, "a0"], [10, "a1"], [99, "a3"], [100, "a4"], [400, "a4"], [401, "check"]];
for (const [age, expected] of ages) if (api.ageClass(age) !== expected) fail(`ageClass(${age}) = ${api.ageClass(age)}, expected ${expected}.`);
for (const theme of ["light", "dark"]) {
  for (const mode of ["age", "group", "genus"]) {
    const classes = api.modeClasses(mode, theme);
    if (new Set(classes.map(item => item.color)).size !== classes.length) fail(`Duplicate colours in ${mode}/${theme}.`);
    const ids = api.modeClasses(mode, "light").map(item => item.id).join();
    if (classes.map(item => item.id).join() !== ids) fail(`Class order differs between themes for ${mode}.`);
  }
}
for (const mode of ["age", "group", "genus"]) {
  const all = api.legendCounts(api.TREES, mode, { streetOnly: false, municipality: "" });
  const sum = Object.values(all.counts).reduce((a, b) => a + b, 0);
  if (sum !== api.TREES.length || all.total !== api.TREES.length) fail(`Legend counts for ${mode} do not add up.`);
}
const street = api.legendCounts(api.TREES, "group", { streetOnly: true, municipality: "" });
if (street.total !== street.counts.street || street.total === 0) fail("Street-only filter leaks other settings.");

// Search and spatial queries
const sample = api.TREES[0];
if (api.search(api.TREES, sample.id.toLowerCase())[0]?.trees[0].id !== sample.id) fail("Tree-number search failed.");
if (!api.search(api.TREES, sample.street.slice(0, 6)).some(result => result.label === sample.street)) fail(`Street search did not find ${sample.street}.`);
const near = api.treesNear(sample.lon, sample.lat, api.TREES, 25);
if (!near.some(tree => tree.id === sample.id)) fail("treesNear misses the tree at the query point.");
if (snapshot.stations.length && api.nearestStation(7.5886, 47.5596, snapshot.stations).distance > 3000) fail("No climate station within 3 km of the city centre.");
if (!snapshot.perimeters.features.length) fail("VoltaNord development-plan perimeter missing.");
const ring = snapshot.perimeters.features[0].geometry.coordinates[0][0] ? snapshot.perimeters.features[0].geometry.coordinates[0] : snapshot.perimeters.features[0].geometry.coordinates;
const centroid = ring.reduce((acc, [x, y]) => [acc[0] + x / ring.length, acc[1] + y / ring.length], [0, 0]);
if (!api.perimetersAt(centroid[0], centroid[1], snapshot.perimeters).length) fail("Point-in-polygon misses the VoltaNord perimeter centroid.");
if (api.perimetersAt(7.5886, 47.5596, snapshot.perimeters).length) fail("City centre wrongly falls inside VoltaNord.");

// Runoff colour reading uses the official legend colours
const runoff = [[[255, 189, 255, 255], "low"], [[223, 115, 255, 255], "medium"], [[132, 0, 168, 255], "high"], [[0, 166, 255, 255], "water"], [[0, 0, 0, 0], "none"], [[40, 200, 40, 255], "unclear"]];
for (const [rgba, expected] of runoff) if (api.matchRunoffColour(rgba).id !== expected) fail(`Runoff colour ${rgba} read as ${api.matchRunoffColour(rgba).id}, expected ${expected}.`);
const tile = api.tilePixel(7.5886, 47.5596, 14);
if (tile.x !== 8537 || tile.y !== 5725 || tile.px !== 93 || tile.py !== 36) fail(`tilePixel wrong: ${JSON.stringify(tile)}.`);

// Layer registry: every layer declares an allowed kind and group; runoff respects the 1:12,500 limit
for (const layer of api.LAYERS) {
  if (!api.KINDS.includes(layer.kind)) fail(`Layer ${layer.id} has invalid kind ${layer.kind}.`);
  if (!api.GROUPS.some(group => group.id === layer.group)) fail(`Layer ${layer.id} has invalid group.`);
  if (layer.type === "raster" && !layer.credit) fail(`Raster layer ${layer.id} has no credit line.`);
}
if (!(api.LAYERS.find(layer => layer.id === "runoff").maxzoom <= 15.6)) fail("Runoff layer must stop at 1:12,500 (zoom ≤ 15.6).");
if (api.LAYERS.filter(layer => layer.group === "unknown").some(layer => layer.type !== "none")) fail("Unknown layers must not render data.");

// Place Profile: unknown stays unknown, never zero
const profile = api.buildPlaceProfile({ lon: sample.lon, lat: sample.lat, radius: 25, generatedAt: "2026-10-03T00:00:00Z", treesNearby: near, station: null, perimeters: [], heatFocus: null, heatFocusError: "offline", runoff: null, runoffError: "offline" });
const slots = [...Object.values(profile.need), ...Object.values(profile.possibility), ...Object.values(profile.context)];
for (const slot of slots) {
  if (slot.status === "unknown" && slot.value !== null) fail("An unknown slot carries a value.");
  if (!["observed", "modelled", "derived", "planning", "unknown"].includes(slot.status)) fail(`Invalid slot status ${slot.status}.`);
}
if (profile.possibility.soil_water.status !== "unknown" || profile.possibility.infiltration.status !== "unknown") fail("Soil water and infiltration must stay unknown.");
if (profile.possibility.existing_tree_count.value !== near.length) fail("Tree count in profile does not match.");
const knownIds = new Set([...api.ATLAS.sources.map(source => source.id), ...api.ATLAS.records.map(record => record.id)]);
for (const slot of slots) for (const id of slot.evidence_ids) if (!knownIds.has(id) && !/^data-bs-\d+$/.test(id)) fail(`Profile cites unknown evidence id ${id}.`);

// URL state round-trip
const encoded = api.encodeState({ lon: 7.57412, lat: 47.57351, zoom: 15.6, pitch: 58, bearing: -20, layers: ["trees", "runoff", "nonsense"], mode: "genus", theme: "dark", basemap: "grey", tree: "BS004993", lens: null });
const decoded = api.decodeState(encoded);
if (decoded.lon !== 7.57412 || decoded.pitch !== 58 || decoded.mode !== "genus" || decoded.theme !== "dark" || decoded.basemap !== "grey" || decoded.tree !== "BS004993") fail(`URL state round-trip failed: ${encoded}`);
if (decoded.layers.join() !== "trees,runoff") fail("URL state must drop unknown layer ids.");

// Dark basemap transform flips lightness and keeps expressions intact
if (!/hsla\(0, 0%, 7\.0%/.test(api.darkColour("#ffffff"))) fail(`darkColour(#ffffff) = ${api.darkColour("#ffffff")}.`);
const styled = api.darkStyle({ layers: [{ id: "x", paint: { "fill-color": ["match", ["get", "c"], "a", "#ffffff", "rgb(0,0,0)"], "fill-opacity": 0.5 } }] });
if (styled.layers[0].paint["fill-opacity"] !== 0.5 || styled.layers[0].paint["fill-color"][1][1] !== "c" || styled.layers[0].paint["fill-color"][2] !== "a") fail("darkStyle altered non-colour values.");

// Atlas citations
const cited = [...api.SOIL_WATER.record_ids, ...api.STORIES.flatMap(story => story.record_ids)];
for (const id of cited) if (!api.recordById(id)) fail(`Map cites missing atlas record ${id}.`);

console.log(`Map logic smoke test passed: ${api.TREES.length} trees, ${snapshot.stations.length} stations, ${api.LAYERS.length} registered layers.`);
