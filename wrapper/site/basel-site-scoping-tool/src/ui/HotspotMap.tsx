import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { CandidateArea } from '../types';
import { scoreArea } from '../lib/scoring';
import 'leaflet/dist/leaflet.css';

export type BasemapStyle = 'planning' | 'analysis';
const styles = {
  planning: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' },
  analysis: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' },
};
export function HotspotMap({ areas, selectedId, style, onSelect }: { areas: CandidateArea[]; selectedId: string; style: BasemapStyle; onSelect: (area: CandidateArea) => void }) {
 const tile=styles[style];
 return <div className={`leaflet-map ${style}`}><MapContainer center={[47.558,7.588]} zoom={13} minZoom={11} maxZoom={18} scrollWheelZoom className="leaflet-canvas">
  <TileLayer key={style} attribution={tile.attribution} url={tile.url} />
  {areas.map(area=>{const score=scoreArea(area.indicators).score;const active=area.id===selectedId;return <CircleMarker key={area.id} center={[area.coordinates[1],area.coordinates[0]]} radius={active?12:Math.max(7,Math.min(10,6+score/35))} pathOptions={{color:'#fff',weight:active?3:2,fillColor:score>=75?'#ba6548':score>=65?'#d48e51':'#d3ad58',fillOpacity:active?1:.88}} eventHandlers={{click:()=>onSelect(area)}}><Tooltip direction="top" offset={[0,-8]}><b>{area.name}</b><br/>Priority {score} · select for profile</Tooltip></CircleMarker>})}
  </MapContainer><div className="map-attribution-note">© OpenStreetMap contributors · scoping indicators are illustrative</div></div>;
}
