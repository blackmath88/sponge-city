"""Pilot: infer street-tree pit type from cadastral land cover and compare canopy growth.

Reproduces the numbers in docs/GAP-FILLING.md (section "Tree pits").
Open data only (CC BY 4.0, Kanton Basel-Stadt):
  - 100052 Baumkataster (street trees: ba_gruppe = 'Strassenbäume')
  - 100477 Bodenbedeckung (planted polygons: humusiert*, bestockt*)
  - 100357 Baumkronenbedeckung 2012 / 2024 (PNG, 0.5 m, LV95 world file)

Run:  pip install numpy pillow && python3 docs/pilots/tree_pit_canopy.py
Downloads ~80 MB of canopy PNGs into ./.pilot-cache (not committed).
Result is a screening signal, not a causal estimate: species, neighbouring
vegetation inside the radius and pruning all confound it.
"""
import json, math, collections, pathlib, urllib.request, urllib.parse
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
API = "https://data.bs.ch/api/explore/v2.1/catalog/datasets"
CANOPY = "https://data-bs.ch/stata/stadtgaertnerei/baumkronenbedeckung/Baumkronenbedeckung_{}.png"
CACHE = pathlib.Path(".pilot-cache"); CACHE.mkdir(exist_ok=True)
RADIUS_M = 8.0
X0, Y0, PX = 2608306.75, 1272278.25, 0.5  # from the .pgw world file (LV95)


def export(ds, **params):
    return json.load(urllib.request.urlopen(f"{API}/{ds}/exports/{params.pop('fmt', 'json')}?" + urllib.parse.urlencode(params), timeout=300))


def wgs84_to_lv95(lon, lat):  # swisstopo approximate formulas, ~1 m
    p, l = (lat * 3600 - 169028.66) / 10000, (lon * 3600 - 26782.5) / 10000
    e = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
    n = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
    return e, n


def rings(g):
    if not g: return []
    if g["type"] == "GeometryCollection": return [r for x in g["geometries"] for r in rings(x)]
    if g["type"] == "Polygon": return [g["coordinates"][0]]
    if g["type"] == "MultiPolygon": return [p[0] for p in g["coordinates"]]
    return []


def inside(x, y, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c


def area_m2(ring):
    kx, ky = 111320 * math.cos(math.radians(ring[0][1])), 110540
    pts = [(x * kx, y * ky) for x, y in ring]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:]))) / 2


trees = export("100052", where="ba_gruppe='Strassenbäume'", select="ba_baumnr,geo_point_2d,ba_standjahr,baumart_deutsch")
planted = export("100477", fmt="geojson", where="bodenbedeckungsart like 'humusiert*' or bodenbedeckungsart like 'bestockt*'", select="geo_shape")["features"]

grid, G = collections.defaultdict(list), 0.002
for f in planted:
    for r in rings(f["geometry"]):
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        bb = (min(xs), min(ys), max(xs), max(ys))
        for gx in range(int(bb[0] / G), int(bb[2] / G) + 1):
            for gy in range(int(bb[1] / G), int(bb[3] / G) + 1): grid[(gx, gy)].append((bb, r))

canopy = {}
for year in (2012, 2024):
    path = CACHE / f"canopy_{year}.png"
    if not path.exists(): urllib.request.urlretrieve(CANOPY.format(year), path)
    canopy[year] = np.asarray(Image.open(path)) != 0  # palette index 0 = transparent = no canopy

R = int(RADIUS_M / PX); yy, xx = np.mgrid[-R:R + 1, -R:R + 1]; disk = xx * xx + yy * yy <= R * R
rows = []
for t in trees:
    lon, lat = t["geo_point_2d"]["lon"], t["geo_point_2d"]["lat"]
    hit = next((r for bb, r in grid.get((int(lon / G), int(lat / G)), []) if bb[0] <= lon <= bb[2] and bb[1] <= lat <= bb[3] and inside(lon, lat, r)), None)
    e, n = wgs84_to_lv95(lon, lat); col, row = round((e - X0) / PX), round((Y0 - n) / PX)
    if not (R <= row < canopy[2012].shape[0] - R and R <= col < canopy[2012].shape[1] - R): continue
    c = {y: float(a[row - R:row + R + 1, col - R:col + R + 1][disk].sum() * PX * PX) for y, a in canopy.items()}
    try: standing = int(t["ba_standjahr"])
    except (TypeError, ValueError): standing = None
    rows.append({"context": "planted strip" if hit else "sealed paving", "strip_m2": area_m2(hit) if hit else None, "standing": standing, **{f"c{y}": v for y, v in c.items()}})

print(f"street trees: {len(rows)}; in planted strip: {sum(r['context'] == 'planted strip' for r in rows)}")
for lo, hi in [(13, 25), (26, 50), (51, 500)]:
    print(f"years at site {lo}-{hi}:")
    for ctx in ("sealed paving", "planted strip"):
        sel = [r for r in rows if r["context"] == ctx and r["standing"] and lo <= r["standing"] <= hi]
        if not sel: continue
        d = np.array([r["c2024"] - r["c2012"] for r in sel])
        print(f"  {ctx:14} n={len(sel):5}  canopy within {RADIUS_M:g} m: {np.median([r['c2012'] for r in sel]):6.1f} -> {np.median([r['c2024'] for r in sel]):6.1f} m2, median change {np.median(d):+5.1f}")
