// Place identity scopes local reports. It does not establish surveyed geometry.
export function observationContext(search) {
  const params = new URLSearchParams(search);
  const id = params.get('place_id'), name = params.get('place');
  if (!id || !name || !/^[a-zA-Z0-9_-]{1,120}$/.test(id) || name.length > 240) return null;
  return {id, name, status:'investigation-context', geometry:'not-surveyed',
    boundary:'Selected place identity only. Positions refer to the 120 m practice layout, not measured street coordinates.'};
}
export function storageKey(context) {
  return context ? 'sponge-rain-walk-v1:' + context.id : 'sponge-rain-walk-v1';
}
export function initialObservations(context, seed) {return context ? [] : seed();}
