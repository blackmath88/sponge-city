export const kinds = {
 inlet: ['Possible inlet', 'Visible surface structure', 'Network connection, pipe depth or capacity', 'Ask drainage owner to check connection and condition'],
 cover: ['Cover / manhole', 'Visible cover', 'Asset owner or underground route', 'Identify the responsible asset owner'],
 tree: ['Tree pit', 'Apparent planting condition', 'Root volume or soil health', 'Check soil and rooting space'],
 sealed: ['Sealed-looking surface', 'Surface appearance', 'Infiltration rate or sub-base', 'Measure area and investigate pavement construction'],
 green: ['Green / permeable-looking surface', 'Visible vegetation or surface appearance', 'Permeability or storage capacity', 'Check soil permeability and groundwater'],
 ponding: ['Water / stain / debris', 'A reported surface clue', 'Flood hazard or cause', 'Repeat observation during rain with time and conditions'],
 constraint: ['Access / obstruction', 'An apparent spatial constraint', 'Legal compliance or ownership', 'Request access and ownership review'],
 opportunity: ['Possible planting space', 'A candidate surface opportunity', 'Buildability or utility clearance', 'Check utilities, ownership and accessibility']
};
export const reviews = {pending:'Pending review',accepted:'Visible clue accepted',uncertain:'Needs another observation',rejected:'Rejected / misclassified',clarification:'Needs specialist clarification'};
export const missions = [
 ['Follow the rain','Look for inlets, pooling and water traces.','Suche Einläufe, Pfützen und Wasserspuren.'],
 ['Find the sponge','Look for tree pits and planted areas.','Suche Baumscheiben und bepflanzte Flächen.'],
 ['Find the hard edge','Look for long sealed-looking surfaces.','Suche lange, versiegelt wirkende Flächen.'],
 ['Find the constraint','Look for narrow passages and obstructions.','Suche Engstellen und Hindernisse.']
];
export function seed() {return ['inlet','inlet','cover','tree','tree','sealed','ponding','constraint','green','opportunity'].map((kind,i)=>({id:`demo-${i+1}`,kind,positionM:8+i*10,source:'demo',confidence:'low',observedAt:null,rain:'unknown',note:'Synthetic practice clue; no photograph or field visit.',review:'pending',history:[]}));}
export function reviewObservation(observation,status,note,at=new Date().toISOString()) {
 if(!Object.hasOwn(reviews,status)) throw new Error('Invalid review');
 if(!note.trim()) throw new Error('Add a review reason');
 return {...observation,review:status,history:[...observation.history,{from:observation.review,to:status,note:note.trim(),at,reviewer:'Local demo reviewer'}]};
}
export function passport(observations,place,investigationContext=null) {
 return {schema:'sponge-street-evidence/v1',exportedAt:new Date().toISOString(),place,
 ...(investigationContext ? {investigationContext} : {}),
 boundary:'Local prototype. Visual review is not authority confirmation or construction clearance. No automatic simulation updates.',
 summary:{total:observations.length,acceptedDemo:observations.filter(o=>o.review==='accepted'&&o.source==='demo').length,acceptedCommunity:observations.filter(o=>o.review==='accepted'&&o.source==='community').length,rejected:observations.filter(o=>o.review==='rejected').length,pending:observations.filter(o=>o.review==='pending').length},
 observations:observations.map(o=>({...o,canEstablish:kinds[o.kind][1],cannotEstablish:kinds[o.kind][2]})),
 nextChecks:[...new Set(observations.filter(o=>o.review!=='rejected').map(o=>kinds[o.kind][3]))],
 unknowns:['Utility clearance and depth','Soil permeability and groundwater','Drainage connection and capacity','Ownership, accessibility and maintenance'],
 scenarioUpdate:'None: reviewed visual clues do not establish hydraulic parameters.'};
}
export function validState(value) {return value?.version===1 && typeof value.place==='string' && Array.isArray(value.observations) && value.observations.every(o=>o && typeof o.id==='string' && Object.hasOwn(kinds,o.kind) && ['demo','community'].includes(o.source) && Object.hasOwn(reviews,o.review) && Number.isFinite(o.positionM) && o.positionM>=0 && o.positionM<=120 && typeof o.note==='string' && ['low','medium','high'].includes(o.confidence) && Array.isArray(o.history));}
