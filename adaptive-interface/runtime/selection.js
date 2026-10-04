// Situation Map → Adaptive Interface handoff. See contracts/handoff.md.
//
//   adaptive-interface/demo/index.html?lat=47.57350&lon=7.57410&radius=50&from=situation-map&place_id=point-7.57410-47.57350
//
// The selection is a location and radius, not data. Providers fetch their own evidence for it.

export const DEFAULT_RADIUS_M = 50;
export const RADIUS_LIMITS = [10, 250];

export function parseSelection(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || "");
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const errors = [];
  if (!params.has("lat") || !params.has("lon")) return { selection: null, errors: [] };
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("lat must be a number between -90 and 90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push("lon must be a number between -180 and 180");
  let radius = params.has("radius") ? Number(params.get("radius")) : DEFAULT_RADIUS_M;
  if (!Number.isFinite(radius)) { errors.push("radius must be a number"); radius = DEFAULT_RADIUS_M; }
  radius = Math.min(RADIUS_LIMITS[1], Math.max(RADIUS_LIMITS[0], radius));
  if (errors.length) return { selection: null, errors };
  return {
    selection: {
      lon, lat, radius_m: radius,
      from: params.get("from") || null,
      place_profile_id: params.get("place_id") || null
    },
    errors
  };
}

export function handoffUrl(base, { lon, lat, radius_m = DEFAULT_RADIUS_M, from = "situation-map", place_profile_id } = {}) {
  const params = new URLSearchParams({ lat: lat.toFixed(5), lon: lon.toFixed(5), radius: String(Math.round(radius_m)), from });
  if (place_profile_id) params.set("place_id", place_profile_id);
  return `${base}?${params}`;
}
