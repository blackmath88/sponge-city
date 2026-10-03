// Fetches a Basel open-data snapshot for the tree map into data/basel-map.json.
// Sources are CC BY 4.0 datasets on data.bs.ch; every value keeps its source id.
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

const query = (dataset, params) => `${api}/${dataset}/${params.export ? "exports/json" : "records"}?${new URLSearchParams(params.query)}`;

const sourceMeta = async id => {
  const meta = (await getJson(`${api}/${id}`)).metas.default;
  return { id: `data-bs-${id}`, dataset: id, title: meta.title, publisher: meta.publisher, licence: meta.license, url: `https://data.bs.ch/explore/dataset/${id}/`, modified: meta.modified };
};

// Dictionary-encode repeated strings to keep the embedded snapshot small.
const dictionary = () => {
  const values = [];
  const index = new Map();
  return {
    values,
    id(value) {
      const key = value ?? "";
      if (!index.has(key)) { index.set(key, values.length); values.push(key); }
      return index.get(key);
    }
  };
};

const round = value => Math.round(value * 1e5) / 1e5;

// 1. Tree register (Stadtgärtnerei Basel and Gemeinde Riehen)
const treeRows = await getJson(query("100052", { export: true, query: {
  select: "ba_baumnr,geo_point_2d,baumart_lateinisch,baumart_deutsch,ba_baumalter,ba_standjahr,ba_strasse,ba_gruppe,ba_gemeinde,ba_schutzstatus"
} }));
const species = dictionary();
const streets = dictionary();
const groups = dictionary();
const municipalities = dictionary();
const protection = dictionary();
const trees = treeRows
  .filter(row => row.geo_point_2d)
  .map(row => [
    row.ba_baumnr,
    round(row.geo_point_2d.lon),
    round(row.geo_point_2d.lat),
    species.id(`${row.baumart_lateinisch ?? ""}|${row.baumart_deutsch ?? ""}`),
    row.ba_baumalter ?? null,
    row.ba_standjahr ?? null,
    streets.id(row.ba_strasse),
    groups.id(row.ba_gruppe),
    municipalities.id(row.ba_gemeinde),
    protection.id(row.ba_schutzstatus)
  ]);

// 2. meteoblue Smart Climate stations with their latest reading in the last 3 hours
const stationRows = await getJson(query("100082", { export: true, query: { select: "name_original,name_custom,lon,lat,dates_max_date" } }));
const since = new Date(fetchedAt.getTime() - 3 * 3600e3).toISOString();
const readingRows = await getJson(query("100009", { export: true, query: {
  select: "name_original,dates_max_date,meta_airtemp,meta_rain24h_sum,meta_rain48h_sum",
  where: `dates_max_date >= "${since}"`,
  order_by: "dates_max_date desc"
} }));
const latest = new Map();
for (const row of readingRows) if (!latest.has(row.name_original)) latest.set(row.name_original, row);
const stations = stationRows
  .filter(row => latest.has(row.name_original) && row.lon && row.lat)
  .map(row => {
    const reading = latest.get(row.name_original);
    return {
      id: row.name_original,
      name: row.name_custom || row.name_original,
      lon: round(row.lon),
      lat: round(row.lat),
      observed_at: reading.dates_max_date,
      air_temp_c: reading.meta_airtemp,
      rain_24h_mm: reading.meta_rain24h_sum,
      rain_48h_mm: reading.meta_rain48h_sum
    };
  });

// 3. VoltaNord development-plan (Bebauungsplan) perimeters from the zoning overlay
const planRows = await getJson(query("100234", { export: true, query: {
  select: "bezeichnung,geschaeftsbezeichnung,geschaeftsstatus,datum_status,geolink,geo_shape",
  where: 'search("VoltaNord")'
} }));
const perimeters = {
  type: "FeatureCollection",
  features: planRows
    .filter(row => /VoltaNord/i.test(row.geschaeftsbezeichnung || ""))
    .map(row => ({
      type: "Feature",
      geometry: row.geo_shape.geometry,
      properties: { plan: row.bezeichnung, title: row.geschaeftsbezeichnung, status: row.geschaeftsstatus, status_date: row.datum_status, geolink: row.geolink }
    }))
};

const snapshot = {
  schema_version: "basel-map/0.1",
  fetched_at: fetchedAt.toISOString(),
  sources: await Promise.all(["100052", "100082", "100009", "100234"].map(sourceMeta)),
  trees: {
    columns: ["id", "lon", "lat", "species", "age_years", "years_at_site", "street", "group", "municipality", "protection"],
    dictionaries: { species: species.values, street: streets.values, group: groups.values, municipality: municipalities.values, protection: protection.values },
    rows: trees
  },
  stations,
  perimeters
};

const output = join(root, "data", "basel-map.json");
await writeFile(output, JSON.stringify(snapshot) + "\n");
console.log(`Wrote ${output}: ${trees.length} trees, ${stations.length} active stations, ${perimeters.features.length} VoltaNord plan polygons.`);
