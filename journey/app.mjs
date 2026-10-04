import {moduleUrl,investigationRecord} from './context.mjs';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try {
  const load = async path => {const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error(`Could not load ${path}`);return r.json();};
  const [manifest,data] = await Promise.all([load('modules.json'),load('places.json')]);
  const params = new URLSearchParams(location.search);
  let place = data.places.find(p=>p.key===params.get('place')) || data.places.find(p=>p.key===manifest.default_place);
  let stage = manifest.modules.find(m=>m.id===params.get('stage')) || manifest.modules[0];
  $('places').innerHTML=data.places.map(p=>`<button class="place-button" data-place="${esc(p.key)}"><strong>${esc(p.profile.site.name)}</strong><small>${p.key==='kanonengasse'?'Computed from open-data snapshots':'Illustrative study segment'}</small></button>`).join('');
  $('steps').innerHTML=manifest.modules.map((m,i)=>`<button data-stage="${esc(m.id)}"><span>0${i+1}</span>${esc(m.label)}</button>`).join('');
  $('references').innerHTML=manifest.references.map(r=>`<a href="${esc(r.path)}">${esc(r.label)} ↗</a>`).join('');
  const renderDecision = () => {
    const record=investigationRecord(place);
    $('decision').innerHTML=`<h2>Investigate before design.</h2><p>${esc(record.next_decision)}</p><button class="download" id="export">Export investigation record</button>${record.unresolved.map(g=>`<article><h3>${esc(g.question)}</h3><dl><dt>Evidence</dt><dd>Unknown · ${esc(g.access_state)}</dd><dt>Who can help</dt><dd>${esc(g.gatekeeper)}</dd><dt>Next action</dt><dd>${esc(g.next_action)}</dd><dt>Blocks</dt><dd>${esc(g.blocks)}</dd></dl></article>`).join('')}<p>Public influence and commissioning routes are documented in the evidence atlas. Nothing is submitted by this tool.</p>`;
    $('export').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=`${place.key}-investigation.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };
  const render = () => {
    for(const b of document.querySelectorAll('[data-place]'))b.setAttribute('aria-pressed',String(b.dataset.place===place.key));
    for(const b of document.querySelectorAll('[data-stage]'))b.setAttribute('aria-current',b.dataset.stage===stage.id?'step':'false');
    $('place-title').textContent=place.profile.site.name;
    $('identity').textContent=place.profile.site.identity_status;
    $('place-boundary').textContent=place.profile.site.boundary;
    $('coordinates').textContent=place.profile.site.coordinates.join(' / ');
    $('map-link').href=`situation-map.html#v=${place.profile.site.coordinates.join(',')},17,0,0&lens=${place.profile.site.coordinates.join(',')}`;
    $('stage-question').textContent=stage.question;
    $('stage-boundary').textContent=stage.boundary;
    const url=moduleUrl(stage,place);
    $('module-frame').hidden=!url;$('decision').hidden=!!url;$('open-module').hidden=!url;
    if(url){const embedded=new URL(url,location.href);if(stage.context==='street-profile')embedded.searchParams.set('embedded','1');$('module-frame').src=embedded.href;$('open-module').href=url;$('module-frame').title=`${stage.label} · ${place.profile.site.name}`;}
    else{$('module-frame').removeAttribute('src');renderDecision();}
  };
  const update = () => {const next=new URL(location.href);next.searchParams.set('place',place.key);next.searchParams.set('stage',stage.id);history.replaceState(null,'',next);render();};
  for(const b of document.querySelectorAll('[data-place]'))b.onclick=()=>{place=data.places.find(p=>p.key===b.dataset.place);update();};
  for(const b of document.querySelectorAll('[data-stage]'))b.onclick=()=>{stage=manifest.modules.find(m=>m.id===b.dataset.stage);update();};
  render();
} catch(error) {
  $('places').textContent=error.message;
  $('stage-boundary').textContent='The investigation could not load. Open the evidence atlas or Street X-Ray directly.';
  $('stage-boundary').classList.add('error');
}
