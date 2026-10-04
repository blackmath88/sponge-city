import type { AreaIndicators, ScopingScoreBreakdown } from '../types';
const dimensions = [
  { key:'heat', label:'Heat stress', weight:.25 }, { key:'nightCooling',label:'Poor night cooling',weight:.20 },
  { key:'canopyDeficit',label:'Canopy deficit',weight:.15 }, { key:'sealedSurface',label:'Sealed surfaces',weight:.15 },
  { key:'runoff',label:'Runoff relevance',weight:.20 }, { key:'coolingOpportunity',label:'Intervention opportunity',weight:.05 },
] as const;
/** Equal-area normalized, provisional 0–1 indicators. Missing inputs are excluded and weights renormalized. */
export function scoreArea(indicators: AreaIndicators): ScopingScoreBreakdown {
  const available = dimensions.filter(d => Number.isFinite(indicators[d.key]));
  const weightTotal = available.reduce((sum,d)=>sum+d.weight,0) || 1;
  const components = dimensions.map(d => { const value=indicators[d.key]; const present=Number.isFinite(value); const weight=present?d.weight/weightTotal:0; return {key:d.key,label:d.label,value,weight,contribution:present?value*weight:0,available:present}; });
  const score=Math.round(components.reduce((sum,c)=>sum+c.contribution,0)*100);
  const count=available.length;
  const confidence: ScopingScoreBreakdown['confidence']=count>=5&&indicators.evidenceQuality>=.7?'high':count>=4&&indicators.evidenceQuality>=.45?'medium':'low';
  const explanation=components.filter(c=>c.available).sort((a,b)=>b.contribution-a.contribution).slice(0,3).map(c=>`${c.label} contributes ${Math.round(c.contribution*100)} points`);
  return {score,components,confidence,explanation};
}
