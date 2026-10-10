import {moduleUrl} from './context.mjs';
import {resolveLang,persistLang,pick,LANGS} from './i18n.mjs';
import {conceptView,practiceView,measureView,citiesView,exportView,esc} from './views.mjs';
import {exportJson,exportMarkdown,localizeRecord,referenceGaps} from './export.mjs';
const $ = id => document.getElementById(id);
const store = (() => { try { return window.localStorage; } catch { return null; } })();
let lang = resolveLang(location.search, store);
const load = async path => {const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error(`Could not load ${path}`);return r.json();};
let ui = key => key;
try {
  const names = ['ui','concept','practice','measurements'];
  const [manifest,data,dict,concept,practice,measurements,charter,facts,basel,berlin,copenhagen,overlay] = await Promise.all([
    load('modules.json'),load('places.json'),load('content/ui.json'),load('content/concept.json'),load('content/practice.json'),load('content/measurements.json'),
    load('content/charter.json'),load('content/sponge-facts.json'),load('content/cities/basel.json'),load('content/cities/berlin.json'),load('content/cities/copenhagen.json'),
    load('content/place-de.json').catch(()=>null)]);
  void names;
  const content = {concept,practice,measurements,charter,facts,cities:[basel,berlin,copenhagen],citiesNote:null,indicatorNames:{}};
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
    for (const b of document.querySelectorAll('[data-filter]')) b.onclick = () => {content.practiceFilter=b.dataset.filter;render();};
    for (const b of document.querySelectorAll('[data-indicator]')) b.onclick = () => {content.measureSel=b.dataset.indicator;render();};
    for (const b of document.querySelectorAll('[data-dim]')) b.onclick = () => {content.cityDim=b.dataset.dim;render();};
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
    const url=moduleUrl(stage,place,lang,overlay);
    const view = $('view');
    $('module-frame').hidden=!url; $('open-module').hidden=!url; view.hidden=!!url;
    if (url) {
      const embedded=new URL(url,location.href);embedded.searchParams.set('embedded','1');
      if ($('module-frame').dataset.src !== embedded.href) {$('module-frame').dataset.src=embedded.href;$('module-frame').src=embedded.href;}
      else try { $('module-frame').contentWindow.postMessage({type:'sponge-lang',lang},location.origin); } catch {}
      $('open-module').href=url; $('open-module').textContent=ui('open_tool');
      $('module-frame').title=`${pick(stage.label,lang)} · ${site.name}`; view.innerHTML='';
    } else {
      $('module-frame').removeAttribute('src'); delete $('module-frame').dataset.src;
      const ctx = {lang,ui,content};
      const html = stage.id==='concept'?conceptView(ctx):stage.id==='practice'?practiceView(ctx):stage.id==='measure'?measureView(ctx):stage.id==='cities'?citiesView(ctx)
        : exportView({lang,ui,place,record:{unresolved:localizeRecord(place,lang,overlay).unresolved},refGaps:referenceGaps(content,lang)});
      view.innerHTML = html; bindView();
    }
  };
  function setLang(next) { lang = next; persistLang(lang,store); const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u); render(); }
  function update() {const next=new URL(location.href);next.searchParams.set('place',place.key);next.searchParams.set('stage',stage.id);next.searchParams.set('lang',lang);history.replaceState(null,'',next);render();}
  render();
} catch(error) {
  document.documentElement.lang = lang;
  $('places').textContent=error.message;
  $('stage-boundary').textContent=lang==='de'?'Die Untersuchung konnte nicht geladen werden. Öffnen Sie den Belegatlas oder die Strassenansicht direkt.':'The investigation could not load. Open the evidence atlas or Street X-Ray directly.';
  $('stage-boundary').classList.add('error');
}
