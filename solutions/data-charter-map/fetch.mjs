// Builds data/charter-map.json: the point layers of the Data Charter map.
// REAL = records exactly as published (trees, groundwater stations, permits).
// INFERRED = values we derive from them (tree-pit class, depth to groundwater, permit categories, dig windows).
// Each inferred value keeps its method; real and inferred live in separate fields.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const api = "https://data.bs.ch/api/explore/v2.1/catalog/datasets";
const fetchedAt = new Date();

const getJson = async url => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (attempt >= 3) throw new Error(`${url}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
};
const exportJson = (id, query, format = "json") => getJson(`${api}/${id}/exports/${format}?${new URLSearchParams(query)}`);
const sourceMeta = async id => {
  const meta = (await getJson(`${api}/${id}`)).metas.default;
  return { id: `data-bs-${id}`, dataset: id, title: meta.title, publisher: meta.publisher, licence: meta.license, url: `https://data.bs.ch/explore/dataset/${id}/`, modified: meta.modified };
};
const round = value => Math.round(value * 1e5) / 1e5;

// ---------- Polygon helpers (lon/lat, small areas)
const rings = geometry => {
  if (!geometry) return [];
  if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(rings);
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map(polygon => polygon[0]);
  return [];
};
const inside = (x, y, ring) => {
  let hit = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    if ((y1 > y) !== (y2 > y) && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) hit = !hit;
  }
  return hit;
};
const areaM2 = ring => {
  const kx = 111320 * Math.cos(ring[0][1] * Math.PI / 180), ky = 110540;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) sum += ring[i][0] * kx * ring[i + 1][1] * ky - ring[i + 1][0] * kx * ring[i][1] * ky;
  return Math.abs(sum) / 2;
};

// ---------- 1. Street trees (REAL) and pit class (INFERRED)
const treeRows = await exportJson("100052", { where: "ba_gruppe='Strassenbäume'", select: "ba_baumnr,geo_point_2d,ba_standjahr,baumart_deutsch,ba_strasse" });
const planted = await exportJson("100477", { where: "bodenbedeckungsart like 'humusiert*' or bodenbedeckungsart like 'bestockt*'", select: "geo_shape" }, "geojson");
const cell = 0.002;
const grid = new Map();
for (const feature of planted.features) {
  for (const ring of rings(feature.geometry)) {
    const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
    const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    for (let gx = Math.floor(bbox[0] / cell); gx <= Math.floor(bbox[2] / cell); gx++)
      for (let gy = Math.floor(bbox[1] / cell); gy <= Math.floor(bbox[3] / cell); gy++) {
        const key = `${gx}:${gy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push({ bbox, ring });
      }
  }
}
const pitOf = (lon, lat) => {
  for (const { bbox, ring } of grid.get(`${Math.floor(lon / cell)}:${Math.floor(lat / cell)}`) || [])
    if (lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3] && inside(lon, lat, ring)) return Math.round(areaM2(ring));
  return null;
};
const species = [], speciesIndex = new Map();
const sp = name => { const key = name ?? ""; if (!speciesIndex.has(key)) { speciesIndex.set(key, species.length); species.push(key); } return speciesIndex.get(key); };
const trees = treeRows.filter(row => row.geo_point_2d).map(row => {
  const { lon, lat } = row.geo_point_2d;
  const strip = pitOf(lon, lat);
  return [row.ba_baumnr, round(lon), round(lat), sp(row.baumart_deutsch), Number.isFinite(+row.ba_standjahr) ? +row.ba_standjahr : null, strip === null ? 0 : 1, strip];
});

// ---------- 2. Groundwater stations (REAL) and depth to groundwater (INFERRED)
const gwRows = await exportJson("100180", {});  // field names start with digits (10ymax), so no select
const gwById = new Map();
for (const row of gwRows) {
  if (!(row.topterrain > 0 && row["10ymax"] > 0 && row["10ymax"] < row.topterrain && row.lon && row.lat)) continue;
  const depthMin = +(row.topterrain - row["10ymax"]).toFixed(1);
  const known = gwById.get(row.stationid);
  if (!known || depthMin < known.inferred.depth_min_m) {
    gwById.set(row.stationid, {
      id: row.stationid, name: row.stationname, lon: round(row.lon), lat: round(row.lat),
      real: { terrain_masl: row.topterrain, level_10y_max_masl: row["10ymax"], level_10y_mean_masl: row["10ymean"], period: `${row.startstatist ?? ""}–${row.endstatist ?? ""}` },
      inferred: { depth_min_m: depthMin, depth_mean_m: +(row.topterrain - row["10ymean"]).toFixed(1), method: "terrain height minus 10-year maximum (and mean) groundwater level" }
    });
  }
}
const groundwater = [...gwById.values()];

// ---------- 3. Works permits (REAL records) and underground categories / dig windows (INFERRED)
const CATEGORIES = [
  ["sewer", /kanalis|abwasser|entwässer/i],
  ["heat", /waerme|wärme|fernw/i],
  ["house", /hausanschluss/i],
  ["water", /wasserleitung|trinkwasser/i],
  ["gas", /\bgas/i],
  ["power", /elektr|strom|kabel/i],
  ["utility", /leitungsbau|werkleitung/i]
];
const permitRows = await exportJson("100018", {
  where: "belgartbez='Baustelle' or artbeg_bez='Meldung Aufgrabung'",
  select: "geo_point_2d,bezeichng,datum_von,datum_bis"
});
const ym = date => date ? +date.slice(0, 4) * 100 + +date.slice(5, 7) : null;
const permits = [];
for (const row of permitRows) {
  if (!row.geo_point_2d) continue;
  const category = CATEGORIES.findIndex(([, pattern]) => pattern.test(row.bezeichng || ""));
  if (category < 0) continue;
  permits.push([round(row.geo_point_2d.lon), round(row.geo_point_2d.lat), category, ym(row.datum_von), ym(row.datum_bis)]);
}

// ---------- 4. Canton boundary, for "missing data" coverage
const boundary = (await getJson("https://api3.geo.admin.ch/rest/services/api/MapServer/find?" + new URLSearchParams({
  layer: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill", searchText: "Basel-Stadt", searchField: "name", geometryFormat: "geojson", sr: "4326", returnGeometry: "true"
}))).results[0];

const snapshot = {
  schema_version: "charter-map/0.1",
  fetched_at: fetchedAt.toISOString(),
  sources: [...await Promise.all(["100052", "100477", "100180", "100018"].map(sourceMeta)), { id: "swissboundaries3d", title: "swissBOUNDARIES3D canton boundary", publisher: "swisstopo", licence: "OGD", url: "https://www.swisstopo.admin.ch/" }],
  trees: {
    columns: ["id", "lon", "lat", "species", "years_at_site", "inferred_pit", "inferred_strip_m2"],
    inferred: { inferred_pit: "0 = in sealed land cover (pit below the survey's mapping threshold, likely a grate pit); 1 = in a mapped planted strip", inferred_strip_m2: "area of that planted strip" },
    dictionaries: { species },
    rows: trees
  },
  groundwater,
  permits: {
    columns: ["lon", "lat", "inferred_category", "from_yyyymm", "to_yyyymm"],
    categories: CATEGORIES.map(([id]) => id),
    inferred: { inferred_category: "keyword match on the permit text (first match wins, in the order of categories)" },
    rows: permits
  },
  boundary: { type: "Feature", geometry: boundary.geometry, properties: { name: "Basel-Stadt" } }
};

const output = join(root, "data", "charter-map.json");
await writeFile(output, JSON.stringify(snapshot) + "\n");
console.log(`Wrote ${output}: ${trees.length} street trees (${trees.filter(t => t[5]).length} in planted strips), ${groundwater.length} groundwater stations, ${permits.length} works permits.`);
