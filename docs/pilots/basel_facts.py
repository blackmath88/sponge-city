"""Reproduces the 'basel-data' numbers in data/sponge-facts.json (except canopy, see tree_pit_canopy.py).

Open data only: data.bs.ch 100254 (MeteoSwiss NBCN Basel-Binningen), 100477 (land cover),
100180 (groundwater statistics) and geo.bs.ch STAC SETV (sponge suitability).
Run: python3 docs/pilots/basel_facts.py   (standard library only; downloads ~60 MB)
"""
import collections, io, json, math, statistics, urllib.parse, urllib.request, zipfile

API = "https://data.bs.ch/api/explore/v2.1/catalog/datasets"
get = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=900).read()
export = lambda ds, fmt="json", **q: json.loads(get(f"{API}/{ds}/exports/{fmt}?" + urllib.parse.urlencode(q)))

# Climate: hot days and heavy-rain days per period
rows = export("100254", select="date,rre150d0,tre200dx")
years = collections.defaultdict(list)
for r in rows:
    if r["date"]: years[int(r["date"][:4])].append(r)
def per_year(a, b, test):
    full = [y for y in range(a, b + 1) if len(years.get(y, [])) > 350]
    return statistics.mean(sum(1 for r in years[y] if test(r)) for y in full)
for a, b in [(1961, 1990), (1991, 2020), (2015, 2024)]:
    hot = per_year(a, b, lambda r: r["tre200dx"] is not None and r["tre200dx"] >= 30)
    wet = per_year(a, b, lambda r: r["rre150d0"] is not None and r["rre150d0"] >= 20)
    print(f"{a}-{b}: hot days/yr {hot:.1f}, days >= 20 mm/yr {wet:.1f}")
wettest = sorted((r for r in rows if r["rre150d0"] is not None), key=lambda r: -r["rre150d0"])[:2]
print("wettest days:", [(r["date"][:10], r["rre150d0"]) for r in wettest])

# Sealed share of the canton (official survey land cover)
def polys(g):
    if not g: return []
    if g["type"] == "GeometryCollection": return [p for x in g["geometries"] for p in polys(x)]
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []
def ring_area(ring):
    kx, ky = 111320 * math.cos(math.radians(ring[0][1])), 110540
    pts = [(x * kx, y * ky) for x, y in ring]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:]))) / 2
area = collections.Counter()
for f in export("100477", "geojson", select="bodenbedeckungsart,geo_shape")["features"]:
    area[f["properties"]["bodenbedeckungsart"]] += sum(ring_area(p[0]) - sum(ring_area(h) for h in p[1:]) for p in polys(f["geometry"]))
total = sum(area.values()); share = lambda prefix: sum(v for k, v in area.items() if k.startswith(prefix)) / total
print(f"canton {total / 1e6:.1f} km2: buildings {share('Gebaeude'):.1%}, paved {share('befestigt'):.1%}, sealed {share('Gebaeude') + share('befestigt'):.1%}; "
      f"roads {area['befestigt.Strasse_Weg'] / 1e4:.0f} ha, sidewalks {area['befestigt.Trottoir'] / 1e4:.0f} ha")

# Sponge suitability by street length
z = zipfile.ZipFile(io.BytesIO(get("https://api.geo.bs.ch/stac/v1/download/SETV/latest/geojson")))
setv = json.loads(z.read([n for n in z.namelist() if n.endswith(".geojson")][0]))
length = collections.Counter()
for f in setv["features"]: length[f["properties"]["Eignung_nach_DTV"]] += f["properties"]["Abschnittslaenge"] or 0
L = sum(length.values())
print("suitability by length:", {k: f"{v / 1000:.0f} km ({v / L:.0%})" for k, v in length.items()})

# Shallowest depth to groundwater per station
best = {}
for r in export("100180"):
    if r.get("topterrain") and r.get("10ymax") and r["10ymax"] < r["topterrain"]:
        d = round(r["topterrain"] - r["10ymax"], 1)
        best[r["stationid"]] = min(d, best.get(r["stationid"], d))
v = sorted(best.values())
print(f"groundwater: {len(v)} stations, shallowest {v[0]} m, deepest {v[-1]} m, median {statistics.median(v)} m")
