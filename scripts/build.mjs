import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'site');
const run = (args, cwd = root, env = process.env) => {
  const result = spawnSync(process.execPath, args, {cwd, env, stdio:'inherit'});
  if (result.status !== 0) throw Error(`Build failed: ${args.join(' ')}`);
};
const copy = (source, target) => cpSync(join(root,source),join(output,target),{
  recursive:true, filter:p => !p.split('/').some(s => ['node_modules','dist','.git'].includes(s))
});
run(['scripts/build-evidence.mjs']);
run(['--experimental-strip-types','--no-warnings','scripts/build-case.mjs'],join(root,'wrapper/achim/connected-case'));
run(['scripts/build.mjs'],join(root,'wrapper/data-charter-map'));
const lab = join(root,'wrapper/street-workspace');
if (!existsSync(join(lab,'node_modules/vite'))) {
  const result = spawnSync('npm',['ci','--no-audit','--no-fund'],{cwd:lab,stdio:'inherit'});
  if (result.status !== 0) throw Error('Street Lab dependency installation failed');
}
run(['node_modules/typescript/bin/tsc','--noEmit'],lab);
run([join(root,'scripts/vite-build.mjs'),join(output,'wrapper/street-workspace'),'--no-treeshake'],lab,
  {...process.env,VITE_SCOPING_TOOL_URL:'../../index.html'});
for (const path of ['wrapper/street-xray','wrapper/sponge-catalogue','wrapper/achim/connected-case','adaptive-interface','shared']) {
  rmSync(join(output,path),{recursive:true,force:true}); copy(path,path);
}
rmSync(join(output,'wrapper/data-charter-map'),{recursive:true,force:true});
cpSync(join(root,'wrapper/data-charter-map/dist'),join(output,'wrapper/data-charter-map'),{recursive:true});
mkdirSync(join(output,'assets'),{recursive:true});
for (const file of ['app.mjs','context.mjs','style.css','modules.json']) copy('journey/'+file,'assets/'+file);
copy('journey/page.html','index.html');
copy('README.md','README.md');
const profiles = [
  ['kanonengasse','wrapper/street-xray/engine/data/kanonengasse.page.json'],
  ['klybeck','wrapper/street-xray/data/street-evidence-profile.v0.json']
].map(([key,source]) => {
  const bytes = readFileSync(join(root,source));
  return {key,source,sha256:createHash('sha256').update(bytes).digest('hex'),profile:JSON.parse(bytes)};
});
const connectedCase = JSON.parse(readFileSync(join(root,'wrapper/achim/connected-case/generated/klybeck-edge.case.json'),'utf8'));
writeFileSync(join(output,'assets/places.json'),JSON.stringify({schema_version:'sponge-places/1',places:profiles,connected_case:connectedCase},null,2)+'\n');
const catalogue = JSON.parse(readFileSync(join(root,'wrapper/sponge-catalogue/data/catalogue.json'),'utf8'));
const esc = s => String(s || '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Render the existing knowledge records, without adding a second data source.
writeFileSync(join(output,'catalogue.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sponge interventions</title><link rel="stylesheet" href="assets/style.css"><body><header><a href="index.html">Sponge City Basel</a></header><main class="catalogue"><p class="eyebrow">Mechanisms and evidence</p><h1>What could change?</h1><p>Intervention knowledge explains mechanisms. Feasibility depends on the selected place and its unresolved checks.</p>${catalogue.actions.map(a => `<article><p class="eyebrow">${esc(a.mechanisms.join(' / '))}</p><h2>${esc(a.name)}</h2><p>${esc(a.what)}</p>${(a.basel || []).map(b=>`<p><strong>Basel · ${esc(catalogue.basel_status[b.status] || b.status)}</strong> — ${esc(b.text)}</p>${(b.sources || []).map(id=>`<a href="${esc(catalogue.sources[id].url)}" target="_blank" rel="noreferrer">${esc(catalogue.sources[id].title || catalogue.sources[id].name || id)} ↗</a>`).join(' · ')}`).join('')}<h3>Before design</h3><ul>${(a.gaps || []).map(g=>`<li><strong>${esc(g.question)}</strong> · ${esc(g.access)}<br>${esc(g.blocks)}</li>`).join('')}</ul></article>`).join('')}<p><a href="wrapper/sponge-catalogue/data/catalogue.json">Complete source catalogue</a></p></main></body></html>`);
writeFileSync(join(output,'.nojekyll'),'');
console.log('Sponge City journey ready in site/.');
