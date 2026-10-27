import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateHandoff,moduleUrl,investigationRecord} from '../journey/context.mjs';
import {parseSiteHandoff} from '../wrapper/street-workspace/src/site-context.ts';
import {observationContext,storageKey,initialObservations} from '../wrapper/street-workspace/public/rain-walk/context.mjs';
import {passport,seed} from '../wrapper/street-workspace/public/rain-walk/evidence.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(root,'journey/modules.json')));
const data=JSON.parse(readFileSync(join(root,'site/assets/places.json')));
test('Selected place passes through the real Street Lab handoff validator without geometry or scores',()=>{
  for(const place of data.places){
    const url=moduleUrl(manifest.modules.find(m=>m.context==='candidate'),place);
    const parsed=parseSiteHandoff(new URL(url,'https://example.test/sponge-city/').search);
    assert.equal(parsed.site.id,place.profile.site.id);
    assert.deepEqual(parsed.site.coordinates,place.profile.site.coordinates);
    const payload=candidateHandoff(place.profile);
    assert.equal(payload.provenance.classification,'illustrative');
    assert.equal(payload.site.geometry,undefined);
    assert.deepEqual(Object.keys(payload.site.indicators).sort(),['missingData','sources']);
  }
});
test('Decision exports carry source fingerprints and retain every unknown as an unresolved gate',()=>{
  for(const place of data.places){const record=investigationRecord(place);assert.equal(record.status,'requires-investigation');assert.equal(record.engineering_recommendation,false);assert.match(record.evidence_sha256,/^[a-f0-9]{64}$/);assert.equal(record.unresolved.length,place.profile.claims.filter(c=>c.evidence_class==='unknown').length);assert.ok(record.unresolved.every(g=>g.next_action&&g.blocks));}
});
test('Rain Walk separates places and preserves the generic demo without inventing field observations',()=>{
  const contexts=data.places.map(p=>observationContext(new URL(moduleUrl(manifest.modules.find(m=>m.context==='observation'),p),'https://example.test/').search));
  assert.notEqual(storageKey(contexts[0]),storageKey(contexts[1]));
  assert.notEqual(storageKey(contexts[0]),storageKey(null));
  assert.deepEqual(initialObservations(contexts[0],seed),[]);
  assert.equal(initialObservations(null,seed).length,10);
  const p=passport([],contexts[0].name,contexts[0]);assert.equal(p.investigationContext.geometry,'not-surveyed');assert.equal(p.summary.acceptedCommunity,0);
  assert.equal(observationContext('?place_id=../../wrong&place=Invalid'),null);
});
test('Published module routes and references exist under a GitHub Pages subpath',()=>{
  for(const place of data.places)for(const module of manifest.modules){const url=moduleUrl(module,place);if(url)assert.ok(existsSync(join(root,'site',new URL(url,'https://example.test/sponge-city/').pathname.replace('/sponge-city/',''))),url);}
  for(const ref of manifest.references)assert.ok(existsSync(join(root,'site',ref.path)),ref.path);
  const html=readFileSync(join(root,'site/index.html'),'utf8');assert.ok(!/frontend\/v1|explainer-videos|presentation-story/.test(html));
});
