import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const profile = JSON.parse(await readFile(join(root, 'data/street-evidence-profile.v0.json'), 'utf8'));
const snapshot = JSON.parse(await readFile(join(root, '../data-charter-map/data/charter-map.json'), 'utf8'));
const page = await readFile(join(root, 'index.html'), 'utf8');
const allowedClasses = new Set(['observed', 'derived', 'modelled', 'assumed', 'unknown']);
const allowedUses = new Set(['explain', 'screen', 'prioritise', 'design']);
const center = profile.site.coordinates;

function distanceMetres([lon1, lat1], [lon2, lat2]) {
  const rad = value => value * Math.PI / 180;
  const radius = 6_371_000;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(profile.schema_version === 'street-evidence-profile/0.1', 'Unexpected profile version');
assert(profile.layers.length === 3, 'The interface must keep three evidence layers');
assert(profile.claims.length >= 7, 'Evidence profile is missing claims');
assert(profile.intervention.status === 'requires-investigation', 'The default intervention must not be presented as ready');

for (const claim of profile.claims) {
  assert(allowedClasses.has(claim.evidence_class), `Invalid evidence class: ${claim.id}`);
  assert(claim.permitted_use.every(use => allowedUses.has(use)), `Invalid permitted use: ${claim.id}`);
  if (['modelled', 'assumed'].includes(claim.evidence_class)) {
    assert(claim.validation === 'not-validated', `${claim.id} must remain explicitly unvalidated`);
    assert(!claim.permitted_use.includes('design'), `${claim.id} cannot support design`);
  }
  if (claim.evidence_class === 'unknown') {
    assert(claim.permitted_use.length === 0, `${claim.id} cannot carry a permitted decision use`);
    assert(claim.unlock_action && claim.decision_blocked, `${claim.id} needs an unlock action and blocked decision`);
  }
}

const treeCount = snapshot.trees.rows.filter(row =>
  distanceMetres(center, [row[1], row[2]]) <= profile.snapshot.tree_radius_m
).length;
assert(treeCount === profile.snapshot.tree_count, `Tree count drifted: profile ${profile.snapshot.tree_count}, snapshot ${treeCount}`);

const nearest = snapshot.groundwater
  .map(station => ({ station, distance: distanceMetres(center, [station.lon, station.lat]) }))
  .sort((left, right) => left.distance - right.distance)[0];
assert(nearest.station.id === profile.snapshot.nearest_groundwater_station.id, 'Nearest groundwater station drifted');
assert(Math.round(nearest.distance) === profile.snapshot.nearest_groundwater_station.distance_m, 'Groundwater distance drifted');
assert(nearest.station.inferred.depth_min_m === profile.snapshot.nearest_groundwater_station.derived_depth_min_m, 'Groundwater depth drifted');

for (const marker of ['Print passport', 'Open illustrative Street Lab']) {
  assert(page.includes(marker), `Page is missing: ${marker}`);
}
for (const label of ['Known now', 'Derived carefully', 'Must ask or measure']) {
  assert(profile.layers.some(layer => layer.label === label), `Profile is missing layer: ${label}`);
}
assert(page.includes('@media print'), 'Evidence Passport needs a print view');
assert(page.includes('prefers-reduced-motion'), 'Reduced-motion support is missing');
assert(!page.includes('AI detected'), 'Unverified observations must not be called AI detections');

// Engine wiring (ADR 0009): every check maps to a declared engine outcome, for both streets.
const { OUTCOMES, assessFacts } = await import('./engine/src/profile.js');
const computed = JSON.parse(await readFile(join(root, 'engine/data/kanonengasse.page.json'), 'utf8'));
for (const street of [profile, computed]) {
  assert(street.engine, `${street.site.name}: missing engine block`);
  for (const id of street.intervention.blocking_claims) {
    const check = street.engine.checks[id];
    assert(check && OUTCOMES[check.fact], `${street.site.name}: check ${id} has no engine fact`);
  }
  const states = assessFacts(street.engine.facts).filter(result => street.engine.interventions.includes(result.id));
  assert(states.every(result => result.state === 'requires-investigation'), `${street.site.name}: unanswered checks must keep the intervention under investigation`);
}
assert(page.includes("from './engine/src/profile.js'"), 'Page must take its decision rules from the engine');
assert(!page.includes('unlocked.size'), 'The old count-based decision must not return');


// Bilingual contract (de default, en alternative): overlay covers both profiles, page has no hard-coded English UI text.
const overlay = JSON.parse(await readFile(join(root, '../../journey/content/place-de.json'), 'utf8'));
assert(overlay.schema_version === 'place-de/1', 'Unexpected overlay version');
for (const [key, street] of [['klybeck', profile], ['kanonengasse', computed]]) {
  const place = overlay.places[key];
  assert(place, `Overlay is missing place: ${key}`);
  for (const claim of street.claims) assert(place.claims?.[claim.id]?.title, `Overlay ${key} lacks claim ${claim.id}`);
  for (const id of Object.keys(place.claims)) assert(street.claims.some(claim => claim.id === id), `Overlay ${key} has unknown claim ${id}`);
  for (const layer of street.layers) assert(place.layers?.some(item => item.id === layer.id && item.label && item.short_label && item.question && item.summary), `Overlay ${key} lacks layer ${layer.id}`);
  assert(place.site?.boundary && place.site?.identity_status, `Overlay ${key} lacks site text`);
  assert(place.intervention?.name && place.intervention?.why, `Overlay ${key} lacks intervention text`);
}
(function walk(value, path) {
  if (typeof value === 'string') {
    assert(value.trim() !== '', `Empty overlay string at ${path}`);
    assert(!value.includes('\u00df'), `Overlay uses eszett at ${path}`);
  } else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, `${path}/${k}`);
})(overlay, '');
const pageStripped = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<title>[\s\S]*?<\/title>/g, '');
const pageText = pageStripped.replace(/<[^>]+>/g, ' ');
assert(!/\b(the|and|of|is|this|for|not|to|what|how)\b/i.test(pageText), 'Page body contains hard-coded English text outside the dictionary');
assert(!/aria-label="/.test(pageStripped), 'aria-label must come from the dictionary');
assert(!page.includes('\u00df'), 'Page must not use eszett');
assert(page.includes('<html lang="de">') && page.includes("from '../../shared/lang.js'"), 'Page must default to German via shared/lang.js');
assert(page.includes("'sponge-lang'"), 'Page must listen for sponge-lang messages');
const { resolveLang } = await import('../../shared/lang.js');
const mem = value => ({ getItem: () => value });
assert(resolveLang('', mem(null)) === 'de' && resolveLang('?lang=en', mem('de')) === 'en' && resolveLang('?lang=xx', mem('en')) === 'en' && resolveLang('?lang=xx', mem('zz')) === 'de', 'resolveLang contract broken');

console.log(`Street X-Ray smoke passed: ${profile.claims.length} claims, ${treeCount} trees, station ${nearest.station.id}.`);
