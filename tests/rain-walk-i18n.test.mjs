import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DE,EN,resolveLang,KIND_IDS,REVIEW_IDS,RAIN_KEYS,langHref,localizePassport,DEFAULT_PLACE} from '../wrapper/street-workspace/public/rain-walk/i18n.mjs';
import {kinds,reviews,missions,passport,seed} from '../wrapper/street-workspace/public/rain-walk/evidence.mjs';
const dir=join(dirname(fileURLToPath(import.meta.url)),'../wrapper/street-workspace/public/rain-walk');
const read=f=>readFileSync(join(dir,f),'utf8');
test('de and en dictionaries have identical keys and no empty values',()=>{
  assert.deepEqual(Object.keys(DE).sort(),Object.keys(EN).sort());
  for(const d of [DE,EN])for(const [k,v] of Object.entries(d))assert.ok(typeof v==='string'&&v.trim(),k);
});
test('German uses Swiss spelling (no eszett)',()=>{for(const [k,v] of Object.entries(DE))assert.ok(!v.includes('ß'),k);});
test('every referenced key exists in both dictionaries',()=>{
  const keys=new Set();
  for(const f of ['index.html','references.html'])for(const m of read(f).matchAll(/data-i18n(?:-ph|-aria|-title)?="([^"]+)"/g))keys.add(m[1]);
  const app=read('app.mjs');
  for(const m of app.matchAll(/\bt\('([^']+)'\)/g))keys.add(m[1]);
  for(const m of app.matchAll(/setStatus\('\w+','([^']+)'\)/g))keys.add(m[1]);
  for(const m of app.matchAll(/Error\('([a-z]+\.[A-Za-z]+)'\)/g))keys.add(m[1]);
  for(const m of app.matchAll(/'((?:save|obs|p|brief|review|reset|badge|err)\.[A-Za-z.]+)'/g))keys.add(m[1]);
  for(const k of KIND_IDS)for(const s of ['label','support','cannot','check'])keys.add(`kind.${k}.${s}`);
  for(const r of REVIEW_IDS)keys.add('rv.'+r);
  for(const c of ['low','medium','high'])keys.add('conf.'+c);
  for(const r of Object.values(RAIN_KEYS))keys.add('rain.'+r);
  missions.forEach((_,i)=>{keys.add(`mission.${i}.t`);keys.add(`mission.${i}.d`);});
  for(let i=0;i<4;i++)keys.add('unknown.'+i);
  assert.ok(keys.size>100);
  for(const k of keys){assert.ok(k in EN,'en '+k);assert.ok(k in DE,'de '+k);}
  assert.deepEqual(KIND_IDS.sort(),Object.keys(kinds).sort());
  assert.deepEqual(REVIEW_IDS.sort(),Object.keys(reviews).sort());
});
test('every page text node in html is wired to the dictionary',()=>{
  for(const f of ['index.html','references.html']){
    const body=read(f).replace(/<script[\s\S]*?<\/script>/g,'').replace(/<(\w+)([^>]*)>([^<]+)<\/\1>/g,(m,tag,attrs,text)=>{
      if(text.trim()&&!/data-i18n=/.test(attrs)&&!/^<a[^>]*href="http/.test(m)&&!['output','style'].includes(tag))assert.fail(`${f}: untranslated <${tag}> "${text}"`);return '';});
    void body;
  }
});
test('language resolution: URL, then storage, then de; invalid falls back to de',()=>{
  const store=v=>({getItem:()=>v});
  assert.equal(resolveLang('',null),'de');
  assert.equal(resolveLang('?lang=en',null),'en');
  assert.equal(resolveLang('?lang=de',store('en')),'de');
  assert.equal(resolveLang('',store('en')),'en');
  assert.equal(resolveLang('?lang=fr',store('en')),'en');
  assert.equal(resolveLang('?lang=fr',store('xx')),'de');
  assert.equal(resolveLang('?lang=fr',{getItem(){throw Error('blocked');}}),'de');
});
test('lang is kept on navigation links',()=>{
  assert.equal(langHref('references.html','en','?place_id=a&embedded=1'),'references.html?embedded=1&lang=en');
  assert.equal(langHref('./','de',''),'./?lang=de');
});
test('localized passport keeps machine fields and adds language',()=>{
  const p=passport(seed(),DEFAULT_PLACE,null);
  const en=localizePassport(p,'en'),de=localizePassport(p,'de');
  assert.equal(de.language,'de');assert.equal(en.language,'en');
  assert.equal(de.schema,p.schema);assert.deepEqual(de.summary,p.summary);
  assert.deepEqual(de.observations.map(o=>[o.id,o.kind,o.review]),p.observations.map(o=>[o.id,o.kind,o.review]));
  assert.deepEqual(en.nextChecks,p.nextChecks);assert.deepEqual(en.unknowns,p.unknowns);
  assert.notDeepEqual(de.unknowns,p.unknowns);assert.equal(en.boundary,p.boundary);
});
