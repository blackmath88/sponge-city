// Repository-local recomputation of the Basel street-tree counts from the pinned Data Charter snapshot.
// Input: wrapper/data-charter-map/data/charter-map.json (trees.rows; fetched_at in the file). No network.
// This reproduces the "no mapped planted polygon at the tree point" count (inferred_pit = 0). It does NOT reproduce the
// "tree inside a paved (befestigt) polygon" count: the full Bodenbedeckung geometry is not in this repository (see
// data/verification/reproducibility.json). Author-run; not an independent review.
//   node scripts/recompute-basel-trees.mjs          print the result
//   node scripts/recompute-basel-trees.mjs --check  fail if data/verification/reproducibility.json disagrees
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const snap = read('wrapper/data-charter-map/data/charter-map.json');
const col = Object.fromEntries(snap.trees.columns.map((c, i) => [c, i]));
const rows = snap.trees.rows;
const quantile = (sorted, q) => { const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); };

export function recompute() {
  const total = rows.length;
  const planted = rows.filter(r => r[col.inferred_pit] === 1);
  const unplanted = rows.filter(r => r[col.inferred_pit] === 0);
  const areas = planted.map(r => r[col.inferred_strip_m2]).filter(Number.isFinite).sort((a, b) => a - b);
  const ids = new Set(rows.map(r => r[col.id]));
  return {
    snapshot: { file: 'wrapper/data-charter-map/data/charter-map.json', fetched_at: snap.fetched_at, dataset: '100052', unique_ids: ids.size },
    total, in_mapped_planted_polygon: planted.length, without_mapped_planted_polygon: unplanted.length,
    without_share_percent: Math.round(10000 * unplanted.length / total) / 100,
    planted_polygon_area_m2: { n: areas.length, q1: Math.round(quantile(areas, 0.25)), median: Math.round(quantile(areas, 0.5)), q3: Math.round(quantile(areas, 0.75)) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = recompute();
  console.log(JSON.stringify(r, null, 2));
  if (process.argv.includes('--check')) {
    const rec = read('data/verification/reproducibility.json').reproduced.find(x => x.id === 'trees-without-mapped-planted-polygon');
    const same = rec && rec.result.total === r.total && rec.result.without_mapped_planted_polygon === r.without_mapped_planted_polygon && rec.result.without_share_percent === r.without_share_percent && JSON.stringify(rec.result.planted_polygon_area_m2) === JSON.stringify(r.planted_polygon_area_m2);
    if (!same) { console.error('reproducibility.json is out of date or missing'); process.exit(1); }
    console.log('reproducibility record current');
  }
}
