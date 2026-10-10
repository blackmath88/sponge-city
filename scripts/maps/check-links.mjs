// Live reachability check of the source and licence URLs in the layer packs. Not part of `make smoke` (network, unstable).
// Usage: node scripts/maps/check-links.mjs > docs/session/research/link-check.md
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../../data/maps/', import.meta.url);
const rows = [];
for (const city of readdirSync(root)) {
  const pack = JSON.parse(readFileSync(new URL(`${city}/layers.json`, root), 'utf8'));
  for (const l of pack.layers) for (const [kind, url] of [['source', l.source_url], ['licence', l.licence_url]]) rows.push({ city, id: l.id, kind, url });
}
const seen = new Map();
const probe = async url => {
  if (seen.has(url)) return seen.get(url);
  let out;
  try { const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'sponge-city-link-check/1' } }); out = `HTTP ${r.status}`; await r.body?.cancel(); }
  catch (e) { out = `error: ${e.cause?.code ?? e.name}`; }
  seen.set(url, out); return out;
};
console.log(`# Source and licence link check\n\nChecked ${new Date().toISOString().slice(0, 10)} with a plain GET (redirects followed). A non-200 status is a reachability fact, not a verdict on the data.\n\n| city | layer | kind | status | url |\n|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.city} | ${r.id} | ${r.kind} | ${await probe(r.url)} | ${r.url} |`);
