import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Check, ChevronDown, Database, Droplets, Leaf, Map as MapIcon, Search, SlidersHorizontal, Star, Thermometer, X } from 'lucide-react';
import type { CandidateArea, DatasetMetadata, SiteShortlistEntry } from '../types';
import { areas as namedAreas, explorationAreas } from '../data/areas';
import { seedDatasets } from '../data/seed-datasets';
import { sources } from '../data/sources';
import { loadCatalog } from '../lib/connectors';
import { scoreArea } from '../lib/scoring';
import { HotspotMap, type BasemapStyle } from './HotspotMap';

type Page = 'Map overview' | 'Dataset catalog' | 'Compare sites';
const initialSaved = (): SiteShortlistEntry[] => { try { return JSON.parse(localStorage.getItem('site-shortlist') ?? '[]') as SiteShortlistEntry[]; } catch { return []; } };
const countOptions = [5, 10, 20, 50];

export default function App() {
  const [page, setPage] = useState<Page>('Map overview');
  const [selected, setSelected] = useState<CandidateArea>(namedAreas[3]);
  const [datasets, setDatasets] = useState(seedDatasets);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [tag, setTag] = useState('all');
  const [saved, setSaved] = useState(initialSaved);
  const [showDetail, setShowDetail] = useState(true);
  const [loading, setLoading] = useState('');
  const [notice, setNotice] = useState('');
  const [hotspotCount, setHotspotCount] = useState(10);
  const [basemap, setBasemap] = useState<BasemapStyle>('planning');
  const rankedAreas = useMemo(() => [...explorationAreas].sort((a,b) => scoreArea(b.indicators).score-scoreArea(a.indicators).score), []);
  const visibleAreas = rankedAreas.slice(0, hotspotCount);
  const score = scoreArea(selected.indicators);
  const filtered = useMemo(() => datasets.filter(d => (source === 'all' || d.source === source) && (tag === 'all' || d.tags.some(t => t.toLowerCase().includes(tag))) && `${d.title} ${d.short_description} ${d.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [datasets, source, tag, query]);

  function toggleSave(area: CandidateArea) {
    const exists=saved.some(s=>s.areaId===area.id); const next=exists?saved.filter(s=>s.areaId!==area.id):[...saved,{areaId:area.id,addedAt:new Date().toISOString()}];
    setSaved(next); localStorage.setItem('site-shortlist',JSON.stringify(next)); setNotice(exists?'Removed from shortlist':'Added to shortlist'); setTimeout(()=>setNotice(''),1800);
  }
  function selectArea(area: CandidateArea) { setSelected(area); setShowDetail(true); }
  async function refreshCatalog(id:'basel-stadt'|'opendata-swiss') {
    setLoading(id); try { const results=await loadCatalog(id); setDatasets(prev=>[...prev.filter(d=>d.source!==id),...results]); setNotice(`Loaded ${results.length} catalog records`); }
    catch(e) { setNotice(`${e instanceof Error?e.message:'Catalog unavailable'} — showing starter records`); }
    finally { setLoading(''); setTimeout(()=>setNotice(''),3500); }
  }

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">BS</div><div><b>Basel / Sponge</b><small>INTERNAL SCOPING TOOL</small></div></div><div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div><div className="workspace">Basel-Stadt <span>●</span></div><div className="nav-label">RESEARCH</div>
      {(['Map overview','Dataset catalog','Compare sites'] as Page[]).map((p,i)=><button key={p} className={`nav-item ${page===p?'active':''}`} onClick={()=>setPage(p)}>{i===0?<MapIcon/>:i===1?<Database/>:<Activity/>}{p}{p==='Compare sites'&&saved.length>0&&<em>{saved.length}</em>}</button>)}
      <div className="sidebar-bottom"><div className="scope-card"><span className="pulse"/> Basel-only analysis <small>Border-region catalogs for discovery only</small></div><small className="version">SCOPING BUILD · v0.2</small></div>
    </aside>
    <main className="main"><header className="topbar"><div className="crumb">Research workspace <span>/</span> {page}</div><div className="header-actions"><span className="internal-pill">Internal decision support</span><button className="icon-button" aria-label="Preferences"><SlidersHorizontal size={17}/></button></div></header>
      {page==='Map overview'&&<>
        <section className="page-heading"><div><div className="eyebrow">SITE SELECTION · BASEL-STADT</div><h1>Find the overlap.<br/><i>Frame the opportunity.</i></h1><p>Explore where heat and water challenges may meet. Scores are provisional; inspect the evidence before shortlisting.</p></div><button className="outline-button" onClick={()=>setPage('Dataset catalog')}><Database size={15}/> Review datasets <ArrowUpRight size={14}/></button></section>
        <section className={`dashboard ${showDetail?'':'detail-closed'}`}><div className="map-column">
          <div className="map-toolbar"><div><b>Hotspot exploration</b><small>{visibleAreas.length} of {rankedAreas.length} illustrative screening points shown · select a marker to inspect</small></div><div className="map-controls"><label className="map-select-label">Show <select aria-label="Number of hotspots to show" value={hotspotCount} onChange={e=>{const count=Number(e.target.value);setHotspotCount(count);if(!rankedAreas.slice(0,count).some(a=>a.id===selected.id))selectArea(rankedAreas[0]);}}>{countOptions.map(n=><option key={n} value={n}>Top {n}</option>)}</select></label><label className="map-select-label">Basemap <select aria-label="Basemap style" value={basemap} onChange={e=>setBasemap(e.target.value as BasemapStyle)}><option value="planning">Planning</option><option value="analysis">Analysis contrast</option></select></label></div></div>
          <div className="map-and-list"><div className="map-frame"><HotspotMap areas={visibleAreas} selectedId={selected.id} style={basemap} onSelect={selectArea}/><div className="map-legend"><b>SCOPING PRIORITY</b><div><i className="legend-gradient"/><span>Lower</span><span>Higher</span></div><small>Illustrative score · not a hazard map</small></div></div>
            <div className="rankings"><div className="section-title"><b>Ranked screening points</b><span>{visibleAreas.length} shown · select to inspect</span></div>{visibleAreas.map((a,i)=><button key={a.id} className={`rank-row ${selected.id===a.id?'picked':''}`} onClick={()=>selectArea(a)}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><span className="rank-info"><b>{a.name}</b><small>{a.district} · {scoreArea(a.indicators).confidence} evidence confidence</small></span><span className="score-badge">{scoreArea(a.indicators).score}</span><span role="button" tabIndex={0} className={`save-mini ${saved.some(s=>s.areaId===a.id)?'saved':''}`} title="Shortlist" onClick={e=>{e.stopPropagation();toggleSave(a)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.stopPropagation();toggleSave(a);}}}><Star size={15} fill={saved.some(s=>s.areaId===a.id)?'currentColor':'none'}/></span></button>)}</div></div>
        </div>
        {showDetail?<AreaDetail area={selected} saved={saved.some(s=>s.areaId===selected.id)} score={score} onClose={()=>setShowDetail(false)} onSave={()=>toggleSave(selected)}/>:<button className="reopen-detail" onClick={()=>setShowDetail(true)}>Show area profile</button>}
        </section>
      </>}
      {page==='Dataset catalog'&&<section className="catalog-page"><div className="eyebrow">DATA DISCOVERY</div><h1>Dataset catalog</h1><p>Browse and mark evidence sources for the scoping workflow. Starter entries are discovery leads; example field concepts are labelled and must be checked against the publisher schema.</p>
        <div className="connector-row">{sources.slice(0,2).map(s=><button key={s.id} className="connector" onClick={()=>refreshCatalog(s.id as 'basel-stadt'|'opendata-swiss')}><div className="connector-logo">{s.id==='basel-stadt'?'BS':'OD'}</div><span><b>{s.name}</b><small>{s.apiType} · {s.geography}</small></span><span className="connect-action">{loading===s.id?'Loading…':'Refresh catalog ↗'}</span></button>)}</div>
        <div className="catalog-tools"><div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search datasets, topics, keywords…"/></div><select value={source} onChange={e=>setSource(e.target.value)}><option value="all">All sources</option><option value="basel-stadt">Basel-Stadt</option><option value="opendata-swiss">opendata.swiss</option></select><select value={tag} onChange={e=>setTag(e.target.value)}><option value="all">All topics</option>{['heat','runoff','trees','canopy','vegetation','land cover','impervious surfaces','ventilation','sponge city'].map(x=><option key={x} value={x}>{x}</option>)}</select><span>{filtered.length} datasets</span></div>
        <div className="dataset-list">{filtered.map(d=><DatasetCard key={`${d.source}-${d.id}`} dataset={d} onToggle={()=>setDatasets(current=>current.map(item=>item===d?{...item,relevance_for_scoping:!item.relevance_for_scoping}:item))}/>)}</div>
      </section>}
      {page==='Compare sites'&&<section className="compare-page"><div className="eyebrow">TEAM DISCUSSION</div><h1>Compare candidate sites</h1><p>Shortlist 3–6 areas to compare issue profiles, evidence confidence and prototype potential.</p>{saved.length===0?<div className="empty-state"><Star size={25}/><b>No shortlisted sites yet</b><span>Use the star beside an area on the map to add it here.</span><button className="outline-button" onClick={()=>setPage('Map overview')}>Explore the map</button></div>:<div className="compare-grid">{saved.map(entry=>{const area=explorationAreas.find(a=>a.id===entry.areaId);if(!area)return null;const result=scoreArea(area.indicators);return <article className="compare-card" key={area.id}><div className="compare-head"><span className="district-tag">{area.district}</span><button className="icon-button" onClick={()=>toggleSave(area)} aria-label="Remove from shortlist"><X size={16}/></button></div><h2>{area.name}</h2><div className="compare-score">{result.score}<small>/ 100 priority</small></div><span className={`confidence ${result.confidence}`}>{result.confidence} evidence</span><h3>Issue profile</h3>{[['Heat',area.indicators.heat],['Night cooling',area.indicators.nightCooling],['Canopy deficit',area.indicators.canopyDeficit],['Sealed surfaces',area.indicators.sealedSurface],['Runoff',area.indicators.runoff]].map(([label,val]:any)=><div className="compare-metric" key={label}><span>{label}</span><b>{Math.round(val*100)}</b></div>)}<h3>Why it could work</h3><p>{area.prototypePotential}</p><h3>Intervention directions</h3><div className="direction-tags">{area.directions.map(x=><span key={x}>{x}</span>)}</div><h3>Validation needed</h3><p>{area.indicators.missingData[0]}</p></article>})}</div>}</section>}
      {notice&&<div className="toast"><Check size={15}/>{notice}</div>}
    </main>
  </div>;
}

function AreaDetail({area,saved,score,onClose,onSave}:{area:CandidateArea;saved:boolean;score:ReturnType<typeof scoreArea>;onClose:()=>void;onSave:()=>void}) {
 const issueRows=[['Heat stress',area.indicators.heat,Thermometer],['Poor night cooling',area.indicators.nightCooling,Activity],['Canopy deficit',area.indicators.canopyDeficit,Leaf],['Sealed surfaces',area.indicators.sealedSurface,MapIcon],['Runoff relevance',area.indicators.runoff,Droplets]] as const;
 return <aside className="detail-panel"><div className="detail-top"><div><span className="eyebrow">AREA PROFILE · {area.id}</span><h2>{area.name}</h2><span className="district-tag">{area.district} · Basel-Stadt · illustrative location</span></div><button className="icon-button" onClick={onClose} aria-label="Close area profile"><X size={17}/></button></div>
  <div className="priority-card"><div><small>SCOPING PRIORITY</small><strong>{score.score}<i>/100</i></strong></div><span className={`confidence ${score.confidence}`}>{score.confidence} confidence</span><div className="score-track"><span style={{width:`${score.score}%`}}/></div><small className="score-note">Relative discussion aid · not a risk rating</small></div>
  <div className="detail-section"><h3>Issue profile</h3>{issueRows.map(([label,value,Icon])=><div className="metric" key={label}><Icon size={15}/><span>{label}</span><div className="metric-bar"><i style={{width:`${value*100}%`}}/></div><b>{Math.round(value*100)}</b></div>)}</div>
  <div className="detail-section"><h3>Why this area matters</h3><p className="profile-copy">{area.profile??`${area.problematics.join('. ')}. This is a screening hypothesis only; verify it against spatially aligned climate, canopy, land-cover and runoff evidence before treating it as a local condition.`}</p><ul>{area.problematics.map(x=><li key={x}>{x}</li>)}</ul></div>
  <div className="detail-section"><h3>Why it could be a prototype site</h3><p className="profile-copy">{area.prototypePotential}</p><p className="profile-copy">{area.prototypeStory??'If verified, this area could support a later prototype by making the heat-and-water relationship visible, comparing a small set of intervention concepts, and communicating what evidence supports each choice.'}</p></div>
  <div className="detail-section"><h3>Possible intervention directions <span className="soft-label">concepts · needs validation</span></h3><div className="direction-tags">{area.directions.map(x=><span key={x}>{x}</span>)}</div><p className="profile-copy">Treat these as options to investigate, not engineering recommendations. Confirm ownership, utilities, drainage and maintenance requirements.</p></div>
  <div className="detail-section"><h3>What still needs validation</h3><ul className="muted-list">{area.constraints.map(x=><li key={x}>{x}</li>)}{area.indicators.missingData.map(x=><li key={x}>{x}</li>)}</ul></div>
  <div className="detail-section sources"><h3>Evidence & limitations</h3><p>Evidence quality: <b>{Math.round(area.indicators.evidenceQuality*100)}% (provisional)</b></p>{area.indicators.sources.map(x=><small key={x}>↗ {x}</small>)}{area.indicators.missingData.map(x=><small key={x} className="missing">! Missing: {x}</small>)}</div>
  <button className={`shortlist-button ${saved?'is-saved':''}`} onClick={onSave}><Star size={16} fill={saved?'currentColor':'none'}/>{saved?'Shortlisted':'Add to shortlist'}</button>
 </aside>;
}

function DatasetCard({dataset:d,onToggle}:{dataset:DatasetMetadata;onToggle:()=>void}) {
 const [open,setOpen]=useState(false); const fields=d.fields??[];
 return <article className="dataset-card"><div className="dataset-main"><div className="dataset-icon"><Database size={17}/></div><div className="dataset-copy"><div className="dataset-title-line"><h3>{d.title}</h3><span className={`source-pill ${d.source}`}>{d.source==='basel-stadt'?'Basel-Stadt':'opendata.swiss'}</span></div><p>{d.short_description||'No description in catalog.'}</p><div className="tag-row">{d.tags.slice(0,5).map(t=><span key={t}>{t}</span>)}<span className="geo-tag">{d.geography}</span></div></div><button className={`relevance-button ${d.relevance_for_scoping?'marked':''}`} onClick={onToggle}>{d.relevance_for_scoping?<><Check size={14}/> Scoping</>:<><Star size={14}/> Mark useful</>}</button></div>
  <div className="dataset-summary"><span className="class-badge">{(d.dataset_class??'metadata-api').replaceAll('-',' ')}</span><span className={`use-badge ${d.hotspot_use??'discovery'}`}>{d.hotspot_use??'discovery'} hotspot use</span><span>{fields.length} listed fields</span><span>{d.update_frequency??'Update frequency unknown'}</span></div>
  <button className="metadata-toggle" onClick={()=>setOpen(!open)}>{open?'Hide':'Inspect'} fields & metadata <ChevronDown size={14} className={open?'rotate':''}/></button>
  {open&&<div className="metadata-grid"><div><small>FORMAT / CLASS</small><b>{Array.isArray(d.format)?d.format.join(', '):d.format||'Not listed'} · {(d.dataset_class??'unclassified').replaceAll('-',' ')}</b></div><div><small>GEOMETRY</small><b>{d.geometry_type||'Not listed — inspect layer'}</b></div><div><small>UPDATE FREQUENCY</small><b>{d.update_frequency||'Not published / not loaded'}</b></div><div><small>SPATIAL SCOPE / RELEVANCE</small><b>{d.spatial_relevance||d.geography+' scope; coverage should be checked against Basel-Stadt.'}</b></div><div><small>HOTSPOT ANALYSIS FIT</small><b>{d.hotspot_use??'Discovery only'} · {d.relevance_for_scoping?'marked useful for scoping':'not marked useful'}{d.notes?` · ${d.notes}`:''}</b></div>
    <div className="fields"><small>FIELDS / COLUMNS ({fields.length})</small>{fields.length?<div className="field-table"><div className="field-row field-header"><b>Field</b><b>Type</b><b>What it may contain</b></div>{fields.map((f,i)=><div className="field-row" key={`${f.name}-${i}`}><b>{f.name}</b><span>{f.type??'Type not provided'}</span><span>{f.description??'No field description'}</span></div>)}</div>:<b>Field schema not exposed by this catalog connector. Inspect the linked source/resource to review attributes.</b>}</div>
    <div className="fields"><small>LICENSE / API</small><b>{d.license||'License not listed — verify'} · {d.api_type}</b><a href={d.endpoint_url} target="_blank" rel="noreferrer">Open source record ↗ {d.endpoint_url}</a></div></div>}
 </article>;
}
