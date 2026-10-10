// Identity and investigation questions may cross module boundaries; site geometry
// and hydraulic parameters require their own validated provider.
const NOTE_DE = 'Die Koordinaten bezeichnen den Untersuchungskontext. Es werden keine Geometrie, gemessenen hydraulischen Parameter oder geprüften Massnahmenwirkungen übertragen.';
// With lang 'de' and an overlay, only display text is localized; ids, sources and classification stay as published.
export function candidateHandoff(profile, lang = 'en', overlay = null, key = null) {
  const loc = lang === 'de' ? overlay?.places?.[key]?.claims ?? {} : {};
  const unknowns = profile.claims.filter(c => c.evidence_class === 'unknown').map(c => ({ ...c, ...(loc[c.id] ? { title: loc[c.id].title ?? c.title, decision_blocked: loc[c.id].decision_blocked ?? c.decision_blocked, limitation: loc[c.id].limitation ?? c.limitation } : {}) }));
  return {
    version: 1,
    site: {
      id: profile.site.id, name: profile.site.name, district: profile.site.district,
      coordinates: [...profile.site.coordinates],
      indicators: {
        sources: [...new Set(profile.claims.map(c => loc[c.id]?.source ?? c.source).filter(Boolean))].slice(0, 20).map(s => s.slice(0, 240)),
        missingData: unknowns.map(c => c.title.slice(0, 240)).slice(0, 20)
      },
      constraints: unknowns.map(c => (c.decision_blocked || c.limitation || c.title).slice(0, 240)).slice(0, 20),
      directions: [((lang === 'de' && overlay?.places?.[key]?.intervention?.name) || profile.intervention.name).slice(0, 240)]
    },
    provenance: {
      classification: 'illustrative', source: 'Sponge City street evidence profile',
      note: lang === 'de' ? NOTE_DE : 'Coordinates identify the investigation context. No geometry, measured hydraulic parameters or validated intervention effects are transferred.'
    }
  };
}
export function encodeHandoff(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function moduleUrl(module, place, lang = null, overlay = null) {
  if (!module.path) return null;
  const params = new URLSearchParams();
  if (lang) params.set('lang', lang);
  if (module.context === 'street-profile') params.set('street', place.key);
  if (module.context === 'candidate') params.set('site', encodeHandoff(candidateHandoff(place.profile, lang ?? 'en', overlay, place.key)));
  if (module.context === 'observation') {
    params.set('place_id', place.profile.site.id);
    params.set('place', place.profile.site.name);
  }
  return module.path + (params.size ? '?' + params : '');
}
export function investigationRecord(place) {
  const profile = place.profile;
  return {
    schema_version: 'sponge-investigation/1',
    place: structuredClone(profile.site),
    evidence_source: place.source,
    evidence_sha256: place.sha256,
    snapshot: profile.snapshot.fetched_at,
    status: 'requires-investigation',
    engineering_recommendation: false,
    intervention: profile.intervention.name,
    claims: structuredClone(profile.claims),
    unresolved: profile.claims.filter(c => c.evidence_class === 'unknown').map(c => ({
      id: c.id, question: c.title, access_state: c.access_state,
      gatekeeper: c.gatekeeper || 'Confirm responsible owner',
      next_action: c.unlock_action, blocks: c.decision_blocked
    })),
    next_decision: 'Agree who commissions the outstanding site and authority checks. Reassess the evidence before design.',
    boundaries: [profile.site.boundary, 'Observation review and illustrative simulations do not clear authority gates.']
  };
}
