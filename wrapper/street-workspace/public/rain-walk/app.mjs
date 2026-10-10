import {kinds,reviews,missions,seed,reviewObservation,passport,validState} from './evidence.mjs';
import {observationContext,storageKey,initialObservations} from './context.mjs';
import {initLang,localizePassport,DEFAULT_PLACE,SEED_NOTE,RAIN_KEYS} from './i18n.mjs';
const context=observationContext(location.search);
const $=id=>document.getElementById(id), key=storageKey(context);
let L,curMission=0;
const t=k=>L.t(k);
const initial=()=>({version:1,place:context?.name || DEFAULT_PLACE,observations:initialObservations(context,seed)});
let state=initial();
const status={save:'',capture:''};
function setStatus(id,k){status[id]=k;$(id==='save'?'save-status':'capture-status').textContent=k?t(k):'';}
try {const saved=JSON.parse(localStorage.getItem(key));if(validState(saved))state=saved;else if(saved)status.save='save.unreadable';}catch{status.save='save.unavailable';}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const placeText=()=>state.place===DEFAULT_PLACE?t('place.default'):state.place;
const noteText=o=>o.source==='demo'&&o.note===SEED_NOTE?t('seed.note'):o.note;
function save(){try{localStorage.setItem(key,JSON.stringify(state));setStatus('save','save.ok');}catch{setStatus('save','save.fail');}}
function tab(name){for(const id of ['walk','review','passport'])$(id).hidden=id!==name;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===name)));render();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
function mission(i){curMission=i;$('mission-prompt').textContent=t(`mission.${i}.d`);document.querySelectorAll('[data-mission]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mission)===i)));}
function drawMissions(){
 $('missions').innerHTML=missions.map((m,i)=>`<button type="button" data-mission="${i}" aria-pressed="${i===curMission}"><strong>${escape(t(`mission.${i}.t`))}</strong><span>${escape(t(`mission.${i}.d`))}</span></button>`).join('');
 document.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>mission(Number(b.dataset.mission)));mission(curMission);
}
function drawKinds(){const cur=$('kind').value;$('kind').innerHTML=Object.keys(kinds).map(k=>`<option value="${k}">${escape(t(`kind.${k}.label`))}</option>`).join('');if(cur)$('kind').value=cur;}
$('place').onchange=()=>{const v=$('place').value.trim();state.place=(!v||v===t('place.default'))?DEFAULT_PLACE:v;save();};
$('observed').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
$('position').oninput=()=>{$('distance').textContent=$('position').value;};
$('capture').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{
 const file=$('photo').files[0];let photo;
 if(file){if(file.size>1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('err.photo');photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('err.photoRead'));reader.readAsDataURL(file);});}
 const time=new Date($('observed').value);if(!Number.isFinite(time.getTime()))throw Error('err.time');
 const note=$('note').value.trim();if(!note)throw Error('err.note');
 state.observations.push({id:crypto.randomUUID(),kind:$('kind').value,positionM:Number($('position').value),source:'community',confidence:$('confidence').value,observedAt:time.toISOString(),rain:$('rain').value,note,photo,review:'pending',history:[]});
 save();$('note').value='';$('photo').value='';setStatus('capture','obs.added');tab('review');
 }catch(error){setStatus('capture',error.message);}finally{button.disabled=false;}};
$('filter').onchange=render;
function render(){
 $('street').innerHTML=state.observations.map((o,i)=>`<button type="button" data-observation="${escape(o.id)}" title="${escape(t(`kind.${o.kind}.label`))}">${i+1} · ${o.positionM}m</button>`).join('');
 document.querySelectorAll('[data-observation]').forEach(b=>b.onclick=()=>{$('filter').value='all';tab('review');document.getElementById(b.dataset.observation)?.scrollIntoView({behavior:'smooth'});});
 const visible=state.observations.filter(o=>$('filter').value==='all'||o.review===$('filter').value);
 $('queue').innerHTML=visible.map(o=>`<article class="card" id="${escape(o.id)}"><span class="badge">${o.source==='demo'?t('badge.demo'):t('badge.community')} · ${escape(t('rv.'+o.review))}</span><h3>${escape(t(`kind.${o.kind}.label`))} · ${o.positionM} m</h3><p>${escape(noteText(o))}</p>${typeof o.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(o.photo)?`<img src="${escape(o.photo)}" alt="${escape(t('obs.photoAlt'))}">`:`<p class="muted">${escape(t('obs.noPhoto'))}</p>`}<dl><dt>${t('obs.observed')}</dt><dd>${o.observedAt?escape(o.observedAt):escape(t('obs.noObs'))}</dd><dt>${t('obs.confidence')}</dt><dd>${escape(t('conf.'+o.confidence))} · ${escape(t('obs.appearance'))}</dd><dt>${t('obs.rain')}</dt><dd>${escape(RAIN_KEYS[o.rain]?t('rain.'+RAIN_KEYS[o.rain]):o.rain)}</dd><dt>${t('obs.support')}</dt><dd>${escape(t(`kind.${o.kind}.support`))}</dd><dt>${t('obs.cannot')}</dt><dd>${escape(t(`kind.${o.kind}.cannot`))}</dd></dl><form data-review="${escape(o.id)}"><label><span>${t('review.outcome')}</span><select name="outcome">${Object.keys(reviews).filter(k=>k!=='pending').map(k=>`<option value="${k}" ${o.review===k?'selected':''}>${escape(t('rv.'+k))}</option>`).join('')}</select></label><label><span>${t('review.reason')}</span><input name="reason" required maxlength="600" placeholder="${escape(t('review.reason.ph'))}"></label><button type="submit">${t('review.record')}</button></form><details><summary>${t('review.history')} (${o.history.length})</summary><ul>${o.history.map(h=>`<li>${escape(h.at)} · ${escape(h.to)} · ${escape(h.note)}</li>`).join('')}</ul></details></article>`).join('')||`<p>${t('queue.empty')}</p>`;
 document.querySelectorAll('[data-review]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const data=new FormData(form);const note=String(data.get('reason')).trim();if(!note)return;state.observations=state.observations.map(o=>o.id===form.dataset.review?reviewObservation(o,String(data.get('outcome')),note):o);save();render();});
 const p=passport(state.observations,state.place,context);
 $('passport-content').innerHTML=`<h3>${escape(placeText())}</h3><p>${t('p.location')}</p><div class="missions"><article><strong class="metric">${p.summary.acceptedCommunity}</strong>${t('p.m.community')}</article><article><strong class="metric">${p.summary.acceptedDemo}</strong>${t('p.m.demo')}</article><article><strong class="metric">${p.summary.pending}</strong>${t('p.m.pending')}</article><article><strong class="metric">${p.summary.rejected}</strong>${t('p.m.rejected')}</article></div><div class="columns"><section><h3>${t('p.see')}</h3><ul>${state.observations.filter(o=>o.review==='accepted').map(o=>`<li>${escape(t(`kind.${o.kind}.label`))} ${t('p.see.at')} ${o.positionM} m — ${o.source==='demo'?t('p.see.demo'):t('p.see.community')}, ${t('p.see.suffix')}</li>`).join('')||`<li>${t('p.see.none')}</li>`}</ul><h3>${t('p.compute')}</h3><p>${t('p.compute.body')}</p></section><section><h3>${t('p.ask')}</h3><ul>${[0,1,2,3].map(i=>`<li>${escape(t('unknown.'+i))}</li>`).join('')}</ul><h3>${t('p.next')}</h3><ul>${[...new Set(state.observations.filter(o=>o.review!=='rejected').map(o=>t(`kind.${o.kind}.check`)))].map(s=>`<li>${escape(s)}</li>`).join('')}</ul></section></div>`;
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const exportPassport=()=>localizePassport(passport(state.observations,state.place,context),L.lang);
$('export-json').onclick=()=>download('street-evidence-passport.json',JSON.stringify(exportPassport(),null,2),'application/json');
$('export-brief').onclick=()=>{const p=exportPassport();download('street-field-check-brief.txt',`${t('brief.title')}\n${p.place} (${t('brief.unverified')})\n${p.exportedAt}\n\n${p.boundary}\n\n${t('brief.community')}: ${p.summary.acceptedCommunity}\n${t('brief.demo')}: ${p.summary.acceptedDemo}\n${t('brief.pending')}: ${p.summary.pending}\n${t('brief.rejected')}: ${p.summary.rejected}\n\n${t('brief.next')}\n${p.nextChecks.map(x=>'- '+x).join('\n')}\n\n${t('brief.unknown')}\n${p.unknowns.map(x=>'- '+x).join('\n')}\n\n${t('brief.footer')}\n`,'text/plain');};
$('reset').onclick=()=>{if(!confirm(t('reset.confirm')))return;state=initial();$('place').value=placeText();save();render();};
function renderAll(){
 drawMissions();drawKinds();$('place').value=placeText();
 if(context){document.querySelector('.notice').textContent=context.name+' · '+t('ctx.boundary');$('reset').textContent=t('reset.ctx');}
 for(const id of ['save','capture'])if(status[id])setStatus(id,status[id]);
 render();
}
L=initLang({onChange:renderAll});
renderAll();
