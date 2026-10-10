import {moduleUrl} from './context.mjs';
import {resolveLang,persistLang,pick,LANGS} from './i18n.mjs';
import {conceptView,practiceView,measureView,citiesView,exportView,esc} from './views.mjs';
import {startView} from './startview.mjs';
import {mapBriefRecord,mapBriefMarkdown} from './mapbrief.mjs';
import {mapView,inspectRecord,inspectPanel} from './mapview.mjs';
import {parseMapState,writeMapState} from './map.mjs';
import {exportJson,exportMarkdown,localizeRecord,referenceGaps} from './export.mjs';
const $ = id => document.getElementById(id);
const store = (() => { try { return window.localStorage; } catch { return null; } })();
let lang = resolveLang(location.search, store);
const load = async path => {const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error(`Could not load ${path}`);return r.json();};
let ui = key => key;
try {
  const names = ['ui','concept','practice','measurements'];
  const [matrix,manifest,data,dict,concept,practice,measurements,charter,facts,basel,berlin,copenhagen,overlay] = await Promise.all([
    load('content/indicator-matrix.json'),load('modules.json'),load('places.json'),load('content/ui.json'),load('content/concept.json'),load('content/practice.json'),load('content/measurements.json'),
    load('content/charter.json'),load('content/sponge-facts.json'),load('content/cities/basel.json'),load('content/cities/berlin.json'),load('content/cities/copenhagen.json'),
    load('content/place-de.json').catch(()=>null)]);
  const checks = await load('content/verification/basel-claims.json').catch(()=>null); const checksDe = await load('content/verification/basel-claims.de.json').catch(()=>null);
  const extraCities = (await Promise.all(['zurich'].map(id=>load(`content/cities/${id}.json`).catch(()=>null)))).filter(Boolean);
  const packs = {};
  for (const profile of [basel,berlin,copenhagen,...extraCities]) {
    const pack = await load(`content/maps/${profile.id}/layers.json`).catch(()=>null);
    if (pack) packs[profile.id] = {...pack, city: profile.id, name: profile.name, context: profile.selection.rationale};
  }
  void names;
  const content = {checks,checksDe,matrix,packs,concept,practice,measurements,charter,facts,cities:[basel,berlin,copenhagen,...extraCities],citiesNote:null,indicatorNames:{}};
  ui = key => dict[lang]?.[key] ?? `[${lang}:${key}]`;
  const params = new URLSearchParams(location.search);
  let place = data.places.find(p=>p.key===params.get('place')) || data.places.find(p=>p.key===manifest.default_place);
  let stage = manifest.modules.find(m=>m.id===params.get('stage')) || manifest.modules[0];
  const applyStatic = () => {
    document.documentElement.lang = lang;
    for (const el of document.querySelectorAll('[data-i18n]')) el.innerHTML = ui(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', ui(el.dataset.i18nLabel));
    document.title = `${manifest.title} · ${ui('tagline')}`;
    $('lang-switch').innerHTML = LANGS.map(l=>`<button data-lang="${l}" lang="${l}" aria-pressed="${l===lang}">${esc(dict[l]['lang_'+l])}</button>`).join('');
    for (const b of document.querySelectorAll('[data-lang]')) b.onclick = () => setLang(b.dataset.lang);
    $('references').innerHTML = manifest.references.map(r=>`<a href="${esc(r.path)}">${esc(pick(r.label,lang))} ↗</a>`).join('');
  };
  const renderSteps = () => {
    let lastGroup = null; let html = '';
    manifest.modules.forEach((m,i)=>{
      if (m.group !== lastGroup) { html += `${lastGroup?'</div>':''}<div class="step-group"><span class="group-label">${esc(pick(manifest.groups[m.group],lang))}</span>`; lastGroup = m.group; }
      html += `<button data-stage="${esc(m.id)}" aria-current="${m.id===stage.id?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span>${esc(pick(m.label,lang))}</button>`;
    });
    $('steps').innerHTML = html + '</div>';
    for(const b of document.querySelectorAll('[data-stage]'))b.onclick=()=>{stage=manifest.modules.find(m=>m.id===b.dataset.stage);update();};
  };
  const renderPlaces = () => {
    $('places').innerHTML=data.places.map(p=>`<button class="place-button" data-place="${esc(p.key)}" aria-pressed="${p.key===place.key}"><strong>${esc(lang==='de'?(overlay?.places?.[p.key]?.site?.name??p.profile.site.name):p.profile.site.name)}</strong><small>${esc(ui(p.key==='kanonengasse'?'place_kanon':'place_klybeck'))}</small></button>`).join('');
    for(const b of document.querySelectorAll('[data-place]'))b.onclick=()=>{place=data.places.find(p=>p.key===b.dataset.place);update();};
  };
  const bindView = () => {
    for (const b of document.querySelectorAll('[data-situation]')) b.onclick = () => {content.conceptSituation=b.dataset.situation;render();};
    for (const b of document.querySelectorAll('[data-mech]')) b.onclick = () => {content.mechFocus=content.mechFocus===b.dataset.mech?null:b.dataset.mech;render();};
    for (const b of document.querySelectorAll('[data-clear-focus]')) b.onclick = () => {content.conceptFocus=null;render();};
    for (const b of document.querySelectorAll('[data-filter]')) b.onclick = () => {content.practiceFilter=b.dataset.filter;render();};
    for (const b of document.querySelectorAll('[data-indicator]')) b.onclick = () => {content.measureSel=b.dataset.indicator;render();};
    for (const b of document.querySelectorAll('[data-dim]')) b.onclick = () => {content.cityDim=b.dataset.dim;render();};
    for (const a of document.querySelectorAll('[data-map-layer]')) a.onclick = e => { e.preventDefault(); const [city,id]=a.dataset.mapLayer.split(/:(.+)/); mapState = parseMapState(`?city=${city}&layers=${id}`,packs); viewBoxes.a=viewBoxes.b=null; stage = manifest.modules.find(m=>m.id==='map'); update(); syncUrl(); };
    const download = (name,type,text) => {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    if ($('export-json')) $('export-json').onclick = () => download(`${place.key}-investigation.${lang}.json`,'application/json',JSON.stringify(exportJson(place,lang,content,overlay),null,2)+'\n');
    if ($('export-md')) $('export-md').onclick = () => download(`${place.key}-investigation.${lang}.md`,'text/markdown',exportMarkdown(place,lang,content,ui,overlay));
  };
  const render = () => {
    applyStatic(); renderSteps(); renderPlaces();
    const site = lang==='de' ? {...place.profile.site,...(overlay?.places?.[place.key]?.site??{})} : place.profile.site;
    $('place-panel').hidden = !stage.needs_place;
    $('workspace').classList.toggle('no-place', !stage.needs_place);
    $('identity').textContent=site.identity_status;
    $('place-boundary').textContent=site.boundary;
    $('coordinates').textContent=place.profile.site.coordinates.join(' / ');
    $('map-link').href=`situation-map.html#v=${place.profile.site.coordinates.join(',')},17,0,0&lens=${place.profile.site.coordinates.join(',')}`;
    $('place-title').textContent = stage.needs_place ? site.name : pick(manifest.groups[stage.group],lang);
    $('stage-question').textContent=pick(stage.question,lang);
    $('stage-boundary').textContent=pick(stage.boundary,lang);
    const url=stage.kind==='map'?null:moduleUrl(stage,place,lang,overlay);
    const view = $('view');
    $('module-frame').hidden=!url; $('open-module').hidden=!url; view.hidden=!!url;
    if (url) {
      const embedded=new URL(url,location.href);embedded.searchParams.set('embedded','1');
      // The frame is reloaded only when something other than the language changes; a language switch is a message, so unsaved in-frame state survives.
      const identity = new URL(embedded.href); identity.searchParams.delete('lang');
      if ($('module-frame').dataset.src !== identity.href) {$('module-frame').dataset.src=identity.href;$('module-frame').src=embedded.href;}
      else try { $('module-frame').contentWindow.postMessage({type:'sponge-lang',lang},location.origin); } catch {}
      $('open-module').href=url; $('open-module').textContent=ui('open_tool');
      $('module-frame').title=`${pick(stage.label,lang)} · ${site.name}`; view.innerHTML='';
    } else {
      $('module-frame').removeAttribute('src'); delete $('module-frame').dataset.src;
      const ctx = {lang,ui,content};
      if (stage.kind==='map') { renderMap(); return; }
      if (stage.kind==='start') { view.innerHTML = startView({lang,ui,content,packs}); bindStart(); return; }
      const html = stage.id==='concept'?conceptView(ctx):stage.id==='practice'?practiceView(ctx):stage.id==='measure'?measureView(ctx):stage.id==='cities'?citiesView(ctx)
        : exportView({lang,ui,place,record:{unresolved:localizeRecord(place,lang,overlay).unresolved},refGaps:referenceGaps(content,lang)});
      view.innerHTML = html; bindView();
    }
  };

  // ---- map step ---------------------------------------------------------------------------
  let mapState = parseMapState(location.search, packs); let mapMode = new URLSearchParams(location.search).get('mapview')==='table'?'table':'map';
  const geoCache = new Map(); const viewBoxes = {a:null,b:null}; let mapToken = 0;
  const layerOf = id => Object.values(packs).flatMap(p=>p.layers).find(l=>l.id===id);
  const loadGeo = async (city,id) => {
    if (geoCache.has(id)) return;
    const layer = packs[city]?.layers.find(l=>l.id===id);
    if (!layer || layer.kind!=='geojson-snapshot') return;
    try { geoCache.set(id, await load(`content/maps/${city}/${layer.file}`)); } catch { geoCache.set(id, null); }
  };
  const selRecord = () => {
    const sel = mapState.sel; if (!sel) return null;
    const layer = layerOf(sel.layer), geo = geoCache.get(sel.layer), feature = geo?.features?.[sel.index];
    return layer && feature ? inspectRecord(layer, feature, lang) : null;
  };
  const measureIds = () => content.measurements.indicators.map(i=>i.id);
  const syncUrl = () => { const u = writeMapState(location.href, mapState); mapMode==='table'?u.searchParams.set('mapview','table'):u.searchParams.delete('mapview'); history.replaceState(null,'',u); };
  async function renderMap() {
    const token = ++mapToken; const st = mapState;
    $('view').innerHTML = `<p class="muted" role="status">${esc(ui('loading'))}</p>`;
    const need = [...st.layers.map(id=>[st.city,id]), ...(st.compare?(st.layersCompare??[]).map(id=>[st.compare,id]):[]), ...(st.sel?[[Object.keys(packs).find(c=>packs[c].layers.some(l=>l.id===st.sel.layer)),st.sel.layer]]:[])];
    await Promise.all(need.map(([c,id])=>loadGeo(c,id)));
    if (token !== mapToken || stage.kind!=='map') return;
    $('view').innerHTML = mapView({lang,ui,packs,geoById:geoCache,state:st,mode:mapMode,measureIds:measureIds(),record:selRecord()});
    bindMap(); markSelected();
  }
  const markSelected = () => { for (const el of document.querySelectorAll('.mapsvg .sel')) el.classList.remove('sel'); const s=mapState.sel; if (s) document.querySelector(`.mapsvg [data-layer="${CSS.escape(s.layer)}"][data-f="${s.index}"]`)?.classList.add('sel'); };
  const showInspect = () => { $('inspect').outerHTML = inspectPanel({lang,ui,record:selRecord(),measureIds:measureIds()}); markSelected(); bindGoto(); syncUrl(); };
  const pickFeature = (layer,index) => { mapState = {...mapState, sel:{layer,index}}; showInspect(); };
  const briefArgs = () => { const sel = mapState.sel; if (!sel) return null; const city = Object.keys(packs).find(c=>packs[c].layers.some(l=>l.id===sel.layer)); const layer = packs[city].layers.find(l=>l.id===sel.layer); const feature = geoCache.get(sel.layer)?.features?.[sel.index]; const profile = content.cities.find(c=>c.id===city); return feature ? {pack:packs[city],profile,layer,index:sel.index,feature,lang,matrix:content.matrix,measurements:content.measurements} : null; };
  const bindBrief = () => { const dl = (name,type,text)=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    if ($('brief-json')) $('brief-json').onclick = () => { const a=briefArgs(); if(a) dl(`${a.pack.city}-map-brief.${lang}.json`,'application/json',JSON.stringify(mapBriefRecord(a),null,2)+'\n'); };
    if ($('brief-md')) $('brief-md').onclick = () => { const a=briefArgs(); if(a) dl(`${a.pack.city}-map-brief.${lang}.md`,'text/markdown',mapBriefMarkdown({...a,ui})); }; };
  const bindGoto = () => { bindBrief(); for (const a of document.querySelectorAll('[data-goto]')) a.onclick = e => { e.preventDefault(); if (a.dataset.indicatorGo) content.measureSel = a.dataset.indicatorGo; stage = manifest.modules.find(m=>m.id===a.dataset.goto); update(); }; };
  function bindMap() {
    for (const b of document.querySelectorAll('[data-map-city]')) b.onclick = () => { const city=b.dataset.mapCity; mapState = parseMapState(`?city=${city}${mapState.compare&&mapState.compare!==city?'&compare='+mapState.compare:''}`,packs); viewBoxes.a=viewBoxes.b=null; syncUrl(); renderMap(); };
    if ($('map-compare')) $('map-compare').onchange = e => { const c=e.target.value; mapState = parseMapState(`?city=${mapState.city}&layers=${mapState.layers.join(',')}${c?'&compare='+c:''}`,packs); viewBoxes.b=null; syncUrl(); renderMap(); };
    for (const b of document.querySelectorAll('[data-map-mode]')) b.onclick = () => { mapMode=b.dataset.mapMode; syncUrl(); renderMap(); };
    for (const c of document.querySelectorAll('[data-layer-toggle]')) c.onchange = () => {
      const key = c.dataset.side==='b'?'layersCompare':'layers'; const set = new Set(mapState[key]??[]); c.checked?set.add(c.dataset.layerToggle):set.delete(c.dataset.layerToggle);
      mapState = {...mapState,[key]:[...set]}; syncUrl(); renderMap();
    };
    if ($('map-share')) $('map-share').onclick = async () => { const note=$('map-share-note'); try { await navigator.clipboard.writeText(location.href); note.textContent=ui('map_shared'); } catch { note.textContent=ui('map_share_fail'); } };
    for (const b of document.querySelectorAll('[data-pick]')) b.onclick = () => { const [l,i]=b.dataset.pick.split(/:(\d+)$/); pickFeature(l,Number(i)); document.getElementById('inspect')?.scrollIntoView({block:'nearest'}); };
    for (const svg of document.querySelectorAll('.mapsvg')) bindSvg(svg);
    bindGoto();
  }
  function bindSvg(svg) {
    const side = svg.closest('.mappanel').dataset.side; const W=+svg.dataset.w, H=+svg.dataset.h;
    const fit = svg.dataset.fit ? svg.dataset.fit.split(' ').map(Number) : null; let vb = viewBoxes[side] ?? fit ?? [0,0,W,H]; const apply = () => { viewBoxes[side]=vb; svg.setAttribute('viewBox',vb.join(' ')); svg.style.setProperty('--z',String(W/vb[2])); };
    const zoom = (f,cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2) => { const w=Math.min(W,Math.max(W/40,vb[2]*f)), h=w*H/W; vb=[Math.min(W-w,Math.max(0,cx-(cx-vb[0])*(w/vb[2]))),Math.min(H-h,Math.max(0,cy-(cy-vb[1])*(h/vb[3]))),w,h]; apply(); };
    const pan = (dx,dy) => { vb=[Math.min(W-vb[2],Math.max(0,vb[0]+dx)),Math.min(H-vb[3],Math.max(0,vb[1]+dy)),vb[2],vb[3]]; apply(); };
    apply();
    const frame = svg.closest('.mapframe');
    for (const b of frame.querySelectorAll('[data-zoom]')) b.onclick = () => b.dataset.zoom==='reset'?(vb=[0,0,W,H],apply()):zoom(b.dataset.zoom==='in'?0.6:1/0.6);
    svg.onkeydown = e => { const k=e.key; const step=vb[2]*0.15; if(k==='+'||k==='=')zoom(0.7); else if(k==='-')zoom(1/0.7); else if(k==='0')(vb=[0,0,W,H],apply()); else if(k==='ArrowLeft')pan(-step,0); else if(k==='ArrowRight')pan(step,0); else if(k==='ArrowUp')pan(0,-step); else if(k==='ArrowDown')pan(0,step); else return; e.preventDefault(); };
    svg.addEventListener('wheel', e => { if(!e.ctrlKey&&!e.metaKey)return; e.preventDefault(); const r=svg.getBoundingClientRect(); zoom(e.deltaY<0?0.8:1.25, vb[0]+(e.clientX-r.left)/r.width*vb[2], vb[1]+(e.clientY-r.top)/r.height*vb[3]); },{passive:false});
    let drag=null, moved=false;
    svg.onpointerdown = e => { drag={x:e.clientX,y:e.clientY}; moved=false; };
    svg.onpointermove = e => { if(!drag)return; const r=svg.getBoundingClientRect(); const dx=(e.clientX-drag.x), dy=(e.clientY-drag.y); if(Math.abs(dx)+Math.abs(dy)>4){moved=true; pan(-dx/r.width*vb[2],-dy/r.height*vb[3]); drag={x:e.clientX,y:e.clientY};} };
    svg.onpointerup = svg.onpointerleave = () => { drag=null; };
    svg.onclick = e => { if (moved) { moved=false; return; } const t=e.target.closest('[data-f]'); if (t) pickFeature(t.dataset.layer,Number(t.dataset.f)); };
  }
  function bindStart() {
    const go = id => { stage = manifest.modules.find(m=>m.id===id); update(); };
    for (const b of document.querySelectorAll('[data-go-city]')) b.onclick = () => { mapState = parseMapState(`?city=${b.dataset.goCity}`,packs); viewBoxes.a=viewBoxes.b=null; go('map'); syncUrl(); };
    for (const b of document.querySelectorAll('[data-go-stage]')) b.onclick = () => go(b.dataset.goStage);
    for (const b of document.querySelectorAll('[data-go-intervention]')) b.onclick = () => { content.conceptFocus = b.dataset.goIntervention; content.conceptSituation = b.dataset.sit; go('concept'); };
  }
  function setLang(next) { lang = next; persistLang(lang,store); const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u); render(); }
  function update() {const next=new URL(location.href);next.searchParams.set('place',place.key);next.searchParams.set('stage',stage.id);next.searchParams.set('lang',lang);history.replaceState(null,'',next);render();}
  render();
} catch(error) {
  document.documentElement.lang = lang;
  $('places').textContent=error.message;
  $('stage-boundary').textContent=lang==='de'?'Die Untersuchung konnte nicht geladen werden. Öffnen Sie den Belegatlas oder die Strassenansicht direkt.':'The investigation could not load. Open the evidence atlas or Street X-Ray directly.';
  $('stage-boundary').classList.add('error');
}
