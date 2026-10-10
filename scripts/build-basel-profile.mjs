// Builds data/cities/basel.json from repository evidence only (sponge-facts, Data Charter, practice translations).
// Source pages were not re-fetched here; quotes are the repository's own recorded statements. `--check` verifies the file is current.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const facts = read('data/sponge-facts.json');
const charter = read('wrapper/data-charter-map/data/data-charter.json');
const practice = read('journey/content/practice.json');
const measurements = read('journey/content/measurements.json');
const byFact = new Map(facts.context.map(f => [f.id, f]));
for (const i of facts.interventions) for (const f of i.facts) byFact.set(f.id, f);
const ind = new Map(charter.indicators.map(i => [i.id, i]));
const mDe = new Map(measurements.indicators.map(i => [i.id, i]));
const dePractice = new Map(practice.cases.map(c => [c.fact, c.claim_de]));
const retrieved = facts.updated;
const factSource = id => { const f = byFact.get(id); return [{ title: f.source.label, url: f.source.url, publisher: f.source.label, retrieved, quote: f.claim, quote_lang: 'en', quote_basis: 'repository-statement', ...(SOURCE_QUOTES[id] ?? {}) }]; };
// Verbatim source sentences verified on 2026-10-10 (data/verification/basel-claims.json) replace the repository statement as the entry's quote.
const SOURCE_QUOTES = { engelgasse: { quote: 'Zum Abschluss der Bauarbeiten wird die Stadtgärtnerei in den fünfzig neuen und grosszügigen Baumrabatten je einen Jungbaum anpflanzen.', quote_lang: 'de', quote_basis: 'source-verbatim' } };
const entries = [];
const fact = (id, dimension, origin, scope, de, measure = null) => entries.push({ id: `basel.${dimension}.${id}`, dimension, text: { de: de ?? dePractice.get(id), en: byFact.get(id).claim }, origin, scope, evidence_state: 'found', measure, sources: factSource(id) });
const charterEntry = (indId, dimension, state, origin, scope, textDe, textEn) => {
  const i = ind.get(indId);
  entries.push({ id: `basel.${dimension}.${indId}`, dimension, text: { de: textDe, en: textEn ?? i.basel.detail }, origin, scope, evidence_state: state, measure: null,
    sources: i.basel.sources.length ? i.basel.sources.map(s => ({ title: s.label, url: s.url, publisher: s.label, retrieved: charter.updated, quote: i.basel.detail, quote_lang: 'en', quote_basis: 'repository-statement' })) : [] });
};
fact('basel-sealed', 'context', 'derived', 'city-wide', null, { topic: 'sealing', quantity: 'sealed share of ground area', unit: '%', method: 'area of cadastral land-cover polygons by class', spatial_scale: 'Canton Basel-Stadt (36.6 km²)', period: 'land cover updated 2026-08-20' });
fact('basel-hot-days', 'context', 'derived', 'city-wide', null);
fact('basel-canopy', 'context', 'observed', 'city-wide', 'Baumkronen decken rund 25 % des Kantons (LiDAR-Auswertung 2021). Der Anteil hat sich in den letzten zehn Jahren nur wenig verändert.', { topic: 'canopy', quantity: 'tree canopy cover share', unit: '%', method: 'LiDAR evaluation', spatial_scale: 'Canton Basel-Stadt', period: '2021' });
fact('bpg-72', 'interventions', 'observed', 'city-wide', 'In Basel-Stadt müssen Flachdächer ab 10 m² bei Neubau oder Sanierung begrünt werden (§ 72 BPG), mit mindestens 15 cm regionalem Substrat und 20 cm auf einem Drittel des Dachs.');
fact('fernwaerme-30', 'interventions', 'observed', 'programme', 'Basel nutzt den Fernwärmeausbau (rund 60 km mehr bis 2037), um Strassen klimafreundlicher zu gestalten: Hitzeschutz auf rund 30 Strassen bisher, mit neuen Bäumen, Grünflächen und Entsiegelung.');
fact('sevogel', 'interventions', 'observed', 'project', null);
fact('engelgasse', 'interventions', 'observed', 'project', null);
fact('voltanord-pilot', 'measurement', 'observed', 'project', 'Basel testet Schwammstadt-Elemente in den neuen Strassen im VoltaNord und überwacht sie fünf Jahre lang wissenschaftlich (CHF 280 000 bewilligt). Ergebnisse sind in dieser Quelle nicht enthalten.');
charterEntry('rainfall', 'measurement', 'found', 'observed', 'city-wide', mDe.get('rainfall').actual.de);
charterEntry('street-temperature', 'measurement', 'found', 'observed', 'city-wide', 'Rund 200 städtische Sensoren liefern stündliche Lufttemperatur, offen, aber als Rohdaten (nicht qualitätsgeprüft).');
charterEntry('land-cover', 'access', 'found', 'observed', 'city-wide', mDe.get('land-cover').actual.de);
charterEntry('canopy', 'access', 'found', 'observed', 'city-wide', 'LiDAR-Baumkronenbedeckung für 2012, 2021 und 2024 (0,5 m, GeoTIFF).');
charterEntry('sewer-network', 'access', 'found', 'observed', 'city-wide', mDe.get('sewer-network').actual.de);
charterEntry('infiltration', 'access', 'no_public_evidence_found', 'unknown', 'unspecified', mDe.get('infiltration').actual.de);
charterEntry('soil-moisture', 'access', 'no_public_evidence_found', 'unknown', 'unspecified', mDe.get('soil-moisture').actual.de);
charterEntry('measures-registry', 'outcomes', 'no_public_evidence_found', 'unknown', 'unspecified', 'Es wurde kein offenes Verzeichnis gebauter Schwamm-Massnahmen und ihrer gemessenen Wirkung gefunden; nur 64 Bewilligungstexte erwähnen Entsiegelung oder Versickerung. Das heisst nicht, dass nichts gemessen wird.',
  'No open registry of built sponge measures and their measured effect was found; only 64 permit texts mention unsealing or infiltration. This does not mean nothing is measured.');
const tr = (id, de, en) => entries.push({ id: `basel.transfer.${id}`, dimension: 'transfer', text: { de, en }, origin: 'assumed', scope: 'unspecified', evidence_state: 'unknown', measure: null, sources: [] });
tr('groundwater', 'Wo das Grundwasser nahe an die Oberfläche reicht, muss Versickerung vorsichtig geplant werden; Beispiele aus anderen Städten sind dort nur eingeschränkt übertragbar.', 'Where groundwater comes close to the surface, infiltration needs care; examples from other cities transfer only with limits there.');
tr('dig-once', 'Die laufenden Leitungsbauten in Basel bieten Gelegenheiten, Massnahmen mitzubauen. Ob andere Städte ihre Praxis damit vergleichbar organisieren, ist offen.', 'Basel’s ongoing utility works offer windows to build measures along. Whether other cities organise this in a comparable way is open.');
const profile = {
  schema_version: 'sponge-city-profile/1', id: 'basel', role: 'home', name: { de: 'Basel', en: 'Basel' }, country: 'CH',
  provenance: { basis: 'repository evidence (data/sponge-facts.json, Data Charter)', refetched_in_this_session: false, snapshot: retrieved },
  selection: { rationale: { de: 'Ausgangsstadt dieses Werkzeugs; das Profil stützt sich auf bereits im Repository geprüfte Belege.', en: 'Home city of this tool; the profile rests on evidence already checked in the repository.' }, contrast: { de: '', en: '' } },
  entries
};
const text = JSON.stringify(profile, null, 1) + '\n';
const target = join(root, 'data/cities/basel.json');
if (process.argv.includes('--check')) { if (readFileSync(target, 'utf8') !== text) { console.error('data/cities/basel.json is out of date. Run scripts/build-basel-profile.mjs.'); process.exit(1); } console.log('Basel profile current.'); }
else { writeFileSync(target, text); console.log(`Wrote ${entries.length} Basel entries.`); }
