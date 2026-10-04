import type { DatasetClass, DatasetField, DatasetMetadata, SourceId } from '../types';
const terms=['heat','klima','baum','vegetation','versiegel','oberflächenabfluss','regen','starkregen','grün','stadtklima','land cover','runoff','tree'];
function tagsFor(text:string){return terms.filter(t=>text.toLowerCase().includes(t));}
function classify(title:string,format:string[],geometry?:string):DatasetClass {
 const text=`${title} ${format.join(' ')} ${geometry??''}`.toLowerCase();
 if(/boundary|grenze|administrative|gemeindegrenze/.test(text))return 'administrative-boundary';
 if(/climate|klima|heat|hitze|temperature|temperatur/.test(text))return 'climate-indicator';
 if(/raster|grid|wms|tiff|geotiff/.test(text))return 'raster-grid';
 if(geometry||/geojson|shp|shape|wfs|vector/.test(text))return 'geospatial-vector';
 if(/api|metadata/.test(text))return 'metadata-api';
 return 'tabular';
}
function baselDataset(raw:any):DatasetMetadata {
 const title=raw.title??raw.dataset_title??raw.dataset_id??'Untitled dataset'; const desc=raw.description??raw.themes?.join(', ')??'';
 const fields:DatasetField[]=(raw.fields??[]).map((f:any)=>({name:f.name??f.field_name??'unknown',type:f.type??f.datatype,description:f.description}));
 const id=raw.dataset_id??raw.datasetid??title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const geometry=fields.find(f=>/geo|geom/i.test(f.name))?.type; const formats=Array.isArray(raw.metas?.default?.data_processed)?raw.metas.default.data_processed:String(raw.metas?.default?.data_processed??'API / GIS (inspect record)').split(',').map((v:string)=>v.trim());
 const relevance=tagsFor(`${title} ${desc}`).length>0;
 return {id,source:'basel-stadt',title,short_description:desc.slice(0,180),full_description:desc,tags:[...new Set<string>([...((raw.metas?.default?.keyword??[]) as string[]),...tagsFor(`${title} ${desc}`)])],geography:'Basel-Stadt',format:formats,api_type:'Opendatasoft Explore API',endpoint_url:`https://data.bs.ch/explore/dataset/${id}/`,geometry_type:geometry,temporal_coverage:raw.metas?.default?.temporal_coverage,update_frequency:raw.metas?.default?.publisher_frequency,license:raw.license?.name??raw.metas?.default?.license,fields,dataset_class:classify(title,formats,geometry),spatial_relevance:'Publisher catalog is Basel-Stadt hosted; confirm feature coverage and coordinate reference in the layer.',hotspot_use:relevance?'direct':'discovery',relevance_for_scoping:relevance};
}
function swissDataset(raw:any):DatasetMetadata {
 const title=raw.title??'Untitled dataset'; const desc=raw.notes??''; const id=raw.name??raw.id??title;
 const formats=Array.from(new Set<string>((raw.resources??[]).map((r:any)=>String(r.format??'')).filter(Boolean))); const relevance=tagsFor(`${title} ${desc}`).length>0;
 return {id,source:'opendata-swiss',title,short_description:desc.slice(0,180),full_description:desc,tags:[...(raw.tags??[]).map((t:any)=>t.display_name??t.name??'').filter(Boolean),...tagsFor(`${title} ${desc}`)],geography:(raw.organization?.title??raw.owner_org??'Switzerland'),format:formats,api_type:'CKAN package_search',endpoint_url:`https://opendata.swiss/en/dataset/${id}`,license:raw.license_title,fields:[],dataset_class:classify(title,formats),spatial_relevance:'National catalog metadata; inspect resource coverage to establish Basel relevance.',hotspot_use:relevance?'supporting':'discovery',relevance_for_scoping:relevance,notes:'CKAN search metadata does not expose resource field schema; open a resource to inspect it.'};
}
export async function fetchBaselDatasets(query=''):Promise<DatasetMetadata[]> {
 const url=new URL('https://data.bs.ch/api/explore/v2.1/catalog/datasets'); url.searchParams.set('limit','100'); if(query)url.searchParams.set('where',`search(*, '${query.replaceAll("'","\\'")}')`);
 const response=await fetch(url); if(!response.ok)throw new Error(`Basel catalog returned ${response.status}`); const data=await response.json(); return (data.results??[]).map(baselDataset);
}
export async function fetchSwissDatasets(query='heat OR climate OR tree OR runoff OR rain') {
 const url=new URL('https://opendata.swiss/api/3/action/package_search'); url.searchParams.set('q',query); url.searchParams.set('rows','100');
 const response=await fetch(url); if(!response.ok)throw new Error(`opendata.swiss returned ${response.status}`); const data=await response.json(); if(!data.success)throw new Error('opendata.swiss catalog request failed'); return (data.result?.results??[]).map(swissDataset);
}
export async function loadCatalog(source:SourceId,query=''):Promise<DatasetMetadata[]> { if(source==='basel-stadt')return fetchBaselDatasets(query); if(source==='opendata-swiss')return fetchSwissDatasets(query||'heat OR climate OR tree OR runoff OR rain'); return []; }
