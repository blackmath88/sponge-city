import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const checks=[
  ['Facts catalogue','.', ['scripts/facts-doc.mjs','--check']],
  ['Place/state/effect invariants','.', ['--test',...readdirSync(join(root,'adaptive-interface/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'adaptive-interface/tests/'+f)]],
  ['Street Lab and Rain Walk','wrapper/street-workspace',['--experimental-strip-types','--no-warnings','--test','--test-isolation=none',...readdirSync(join(root,'wrapper/street-workspace/test')).filter(f=>f.endsWith('.test.ts')).map(f=>'test/'+f)]],
  ['Data Charter','wrapper/data-charter-map',['scripts/smoke.mjs']],
  ['Sponge catalogue','wrapper/sponge-catalogue',['scripts/build-doc.mjs','--check']],
  ['Street X-Ray','wrapper/street-xray',['smoke.mjs']],
  ['Street profile reproducibility','wrapper/street-xray/engine',['scripts/build-profile.mjs','--check']],
  ['Street assessment engine','wrapper/street-xray/engine',['--test','test/profile.test.mjs']],
  ['Street explainer','wrapper/prototypes/sponge-street',['smoke.mjs']],
  ['Connected case','wrapper/achim/connected-case',['--experimental-strip-types','--no-warnings','--test','tests/connected-case.test.mjs']],
  ['Basel profile current','.',['scripts/build-basel-profile.mjs','--check']],
  ['Bilingual journey, city profiles, exports','.',['--test','tests/journey-bilingual.test.mjs']],
  ['Map layers, share state, map view','.',['--test','tests/map.test.mjs']],
  ['Claim verification','.',['--test','tests/verification.test.mjs']],
  ['Map investigation brief','.',['--test','tests/map-brief.test.mjs']],
  ['City data and layer packs','.',['--test','tests/city-data.test.mjs']],
  ['Rain Walk language','.',['--test','tests/rain-walk-i18n.test.mjs']],
  ['Orchestration boundaries','.', ['--experimental-strip-types','--no-warnings','--test','tests/orchestration.test.mjs']]
];
const failed=[];
for(const [label,cwd,args] of checks){console.log(`\n${label}`);const r=spawnSync(process.execPath,args,{cwd:join(root,cwd),stdio:'inherit'});if(r.status!==0)failed.push(label);}
if(failed.length){console.error('Failed: '+failed.join(', '));process.exit(1);}
console.log('\nAll consolidated module checks passed.');
