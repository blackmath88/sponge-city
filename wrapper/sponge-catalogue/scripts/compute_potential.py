"""Reproduce the derived city findings in data/catalogue.json.

Stdlib only. Downloads open Basel data (data.bs.ch, api.geo.bs.ch) unless
--cache DIR already holds it, reads the permit snapshot from the Data Charter
map, and writes data/potential.json. Figures are derived, not validated: for
explaining and screening only.

    python3 scripts/compute_potential.py [--cache DIR] [--skip-landcover]
"""
import argparse, collections, io, json, math, pathlib, urllib.parse, urllib.request, zipfile

HERE = pathlib.Path(__file__).resolve().parent.parent
ODS = "https://data.bs.ch/api/explore/v2.1/catalog/datasets"
STAC = "https://api.geo.bs.ch/stac/v1/download/{}/latest/geojson"
PERMITS = HERE.parent / "data-charter-map" / "data" / "charter-map.json"
SUITABLE, HEAT = "geeignet", ("Fokus", "Verbessern")
RADIUS_M, UPCOMING_FROM = 60, 202610


def fetch(url, cache, name):
    path = cache / name if cache else None
    if path and path.exists():
        return path.read_bytes()
    print("download", url)
    data = urllib.request.urlopen(url, timeout=900).read()
    if path:
        path.write_bytes(data)
    return data


def ods(ds, cache, **q):
    return json.loads(fetch(f"{ODS}/{ds}/exports/geojson?" + urllib.parse.urlencode(q), cache, f"ods-{ds}.geojson"))


def stac(ds, cache):
    with zipfile.ZipFile(io.BytesIO(fetch(STAC.format(ds), cache, f"stac-{ds}.zip"))) as z:
        name = next(n for n in z.namelist() if n.endswith(".geojson"))
        return json.loads(z.read(name))


def polys(g):
    if not g:
        return []
    if g["type"] == "GeometryCollection":
        return [p for x in g["geometries"] for p in polys(x)]
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []


KX, KY = 111320 * math.cos(math.radians(47.56)), 110540  # metres per degree at Basel


def ring_area(r):
    p = [(x * KX, y * KY) for x, y in r]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:]))) / 2


def inside(x, y, r):
    c = False
    for (x1, y1), (x2, y2) in zip(r, r[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


class Index:
    """Grid index of polygon outer rings, each tagged with a label."""

    def __init__(self, cell=0.001):
        self.cell, self.grid = cell, collections.defaultdict(list)

    def add(self, ring, label):
        xs, ys = [q[0] for q in ring], [q[1] for q in ring]
        bb = (min(xs), min(ys), max(xs), max(ys))
        for gx in range(int(bb[0] / self.cell), int(bb[2] / self.cell) + 1):
            for gy in range(int(bb[1] / self.cell), int(bb[3] / self.cell) + 1):
                self.grid[(gx, gy)].append((bb, ring, label))

    def at(self, x, y):
        for bb, r, label in self.grid.get((int(x / self.cell), int(y / self.cell)), []):
            if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and inside(x, y, r):
                return label
        return None


def landcover_group(cls):
    if cls.startswith("Gebaeude"):
        return "building"
    if cls in ("befestigt.Strasse_Weg", "befestigt.Trottoir", "befestigt.Verkehrsinsel"):
        return "road"
    if cls.startswith("befestigt"):
        return "paved-other"
    if cls.startswith(("humusiert", "bestockt")):
        return "planted"
    return "water"


def sealed_by_parcel(cache):
    parcels = Index()
    for f in ods("100201", cache, select="grundstuecksart,geo_shape")["features"]:
        kind = "allmend" if f["properties"]["grundstuecksart"].endswith("Allmendparzelle") else "other-parcels"
        for p in polys(f["geometry"]):
            parcels.add(p[0], kind)
    area = collections.Counter()
    for f in ods("100477", cache, select="bodenbedeckungsart,geo_point_2d,geo_shape")["features"]:
        pt = f["properties"].get("geo_point_2d")
        if not pt:
            continue
        a = sum(ring_area(p[0]) - sum(ring_area(h) for h in p[1:]) for p in polys(f["geometry"]))
        kind = parcels.at(pt["lon"], pt["lat"]) or "no-parcel"
        area[(kind, landcover_group(f["properties"]["bodenbedeckungsart"]))] += a
    ha = {k: {g: round(area[(k, g)] / 1e4) for g in ("building", "road", "paved-other", "planted", "water")}
          for k in ("allmend", "other-parcels", "no-parcel")}
    sealed = {k: round(sum(area[(k, g)] for g in ("building", "road", "paved-other")) / 1e4) for k in ha}
    return {"area_ha": ha, "sealed_ha": sealed, "total_ha": round(sum(area.values()) / 1e4)}


def midpoint(g):
    """Middle vertex of the longest part of a (Multi)LineString."""
    parts = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
    line = max(parts, key=len)
    return tuple(line[len(line) // 2][:2])


def suitable_in_heat(cache):
    heat = Index()
    for f in stac("FGSK", cache)["features"]:
        for p in polys(f["geometry"]):
            heat.add(p[0], f["properties"]["Art"])
    km, mids = collections.Counter(), []
    for f in stac("SETV", cache)["features"]:
        if f["properties"]["Eignung_nach_DTV"] != SUITABLE:
            continue
        x, y = midpoint(f["geometry"])
        art = heat.at(x, y) or "outside"
        km[art] += (f["properties"]["Abschnittslaenge"] or 0) / 1000
        if art in HEAT:
            mids.append((x, y))
    return {"suitable_km_by_heat_area": {k: round(v, 1) for k, v in sorted(km.items())},
            "suitable_km_in_fokus_or_verbessern": round(sum(km[k] for k in HEAT), 1)}, mids


def works_near(mids):
    snap = json.loads(PERMITS.read_text())
    cols = snap["permits"]["columns"]
    rows = [dict(zip(cols, r)) for r in snap["permits"]["rows"]]
    cats = snap["permits"]["categories"]
    upcoming = [r for r in rows if r["to_yyyymm"] and r["to_yyyymm"] >= UPCOMING_FROM]
    cell = RADIUS_M / KY
    grid = collections.defaultdict(list)
    for x, y in mids:
        grid[(int(x / cell), int(y / cell))].append((x, y))

    def near(r):
        gx, gy = int(r["lon"] / cell), int(r["lat"] / cell)
        return any(math.hypot((x - r["lon"]) * KX, (y - r["lat"]) * KY) < RADIUS_M
                   for dx in (-2, -1, 0, 1, 2) for dy in (-1, 0, 1) for x, y in grid.get((gx + dx, gy + dy), []))

    hits = [r for r in upcoming if near(r)]
    return {"snapshot": snap["fetched_at"], "upcoming": len(upcoming), "near_suitable_in_heat": len(hits),
            "by_category": dict(collections.Counter(cats[r["inferred_category"]] for r in hits).most_common())}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", type=pathlib.Path)
    ap.add_argument("--skip-landcover", action="store_true", help="skip the slow land-cover x parcel overlay")
    a = ap.parse_args()
    if a.cache:
        a.cache.mkdir(parents=True, exist_ok=True)
    out_path = HERE / "data" / "potential.json"
    out = json.loads(out_path.read_text()) if out_path.exists() else {}
    out.update({"schema_version": "sponge-potential/0.1", "evidence": "derived", "validation": "not validated",
                "permitted_use": ["explain", "screen"]})
    if not a.skip_landcover:
        out["sealed-by-parcel"] = sealed_by_parcel(a.cache)
    out["suitable-in-heat"], mids = suitable_in_heat(a.cache)
    out["works-near-suitable"] = works_near(mids)
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
