"""Pick the demo street and gather its open inputs into data/demo-street.json.

The street is chosen by rule, not by taste: among segments the canton rates
sponge-suitable by traffic, with their middle vertex in a heat area marked
Fokus, take the named segment with the most active or upcoming permits within
60 m (ties: longer segment). Stdlib only; reuses compute_potential.py's
downloads and the Data Charter snapshot.

    python3 scripts/select_street.py [--cache DIR]
"""
import argparse, collections, json, math, pathlib, sys, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).resolve().parent.parent
WRAPPER = HERE.parent.parent
sys.path.insert(0, str(WRAPPER / "sponge-catalogue" / "scripts"))
import compute_potential as cp  # noqa: E402

CHARTER_MAP = WRAPPER / "data-charter-map" / "data" / "charter-map.json"
CORRIDOR_M, PERMIT_M = 12, 60


def xy(lon, lat):
    return lon * cp.KX, lat * cp.KY


def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = xy(*p), xy(*a), xy(*b)
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def line_dist(p, parts):
    return min(seg_dist(p, a, b) for part in parts for a, b in zip(part, part[1:]))


def ods_near(ds, lon, lat, radius_m, select):
    q = {"where": f"within_distance(geo_point_2d, geom'POINT({lon} {lat})', {radius_m}m)", "select": select}
    url = f"{cp.ODS}/{ds}/exports/geojson?" + urllib.parse.urlencode(q)
    return json.load(urllib.request.urlopen(url, timeout=300))["features"], url


def ods_at(ds, lon, lat, select):
    q = {"where": f"intersects(geo_shape, geom'POINT({lon} {lat})')", "select": select}
    url = f"{cp.ODS}/{ds}/exports/json?" + urllib.parse.urlencode(q)
    return json.load(urllib.request.urlopen(url, timeout=300)), url


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", type=pathlib.Path)
    a = ap.parse_args()
    if a.cache:
        a.cache.mkdir(parents=True, exist_ok=True)
    snap = json.loads(CHARTER_MAP.read_text())
    cols = snap["permits"]["columns"]
    permits = [dict(zip(cols, r)) for r in snap["permits"]["rows"]]
    upcoming = [r for r in permits if r["to_yyyymm"] and r["to_yyyymm"] >= cp.UPCOMING_FROM]
    cats = snap["permits"]["categories"]

    heat = cp.Index()
    for f in cp.stac("FGSK", a.cache)["features"]:
        for p in cp.polys(f["geometry"]):
            heat.add(p[0], f["properties"]["Art"])
    best = None
    for f in cp.stac("SETV", a.cache)["features"]:
        pr = f["properties"]
        if pr["Eignung_nach_DTV"] != cp.SUITABLE or not pr["Strassenname"].strip():
            continue
        mid = cp.midpoint(f["geometry"])
        if heat.at(*mid) != "Fokus":
            continue
        parts = f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiLineString" else [f["geometry"]["coordinates"]]
        near = [r for r in upcoming if line_dist((r["lon"], r["lat"]), parts) < PERMIT_M]
        key = (len(near), pr["Abschnittslaenge"] or 0)
        if not best or key > best[0]:
            best = (key, f, parts, near, mid)
    (_, length), seg, parts, near, mid = best
    pr = seg["properties"]
    # Join touching suitable segments of the same street in the same heat area.
    pool = []
    for f in cp.stac("SETV", a.cache)["features"]:
        q = f["properties"]
        if f is seg or q["Strassenname"].strip() != pr["Strassenname"].strip() or q["Eignung_nach_DTV"] != cp.SUITABLE:
            continue
        if heat.at(*cp.midpoint(f["geometry"])) == "Fokus":
            g = f["geometry"]
            pool.append((g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]], q["Abschnittslaenge"] or 0))
    ends = lambda ps: [tuple(pt[:2]) for part in ps for pt in (part[0], part[-1])]
    grew = True
    while grew:
        grew = False
        for item in list(pool):
            if any(math.dist(xy(*e), xy(*f)) < 1 for e in ends(item[0]) for f in ends(parts)):
                parts, length, grew = parts + item[0], length + item[1], True
                pool.remove(item)
    near = [r for r in upcoming if line_dist((r["lon"], r["lat"]), parts) < PERMIT_M]

    lons = [pt[0] for part in parts for pt in part]
    lats = [pt[1] for part in parts for pt in part]
    centre = ((min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2)
    reach = max(math.dist(xy(*centre), xy(lo, la)) for lo, la in zip(lons, lats)) + 300
    lc, lc_url = ods_near("100477", round(centre[0], 6), round(centre[1], 6), round(reach), "bodenbedeckungsart,geo_point_2d,geo_shape")
    # Sample the corridor on a 1 m grid; each sample takes the land-cover class it falls in.
    cover = cp.Index(cell=0.0005)
    for f in lc:
        for p in cp.polys(f["geometry"]):
            cover.add(p[0], cp.landcover_group(f["properties"]["bodenbedeckungsart"]))
    step_x, step_y = 1 / cp.KX, 1 / cp.KY
    area = collections.Counter()
    x = min(lons) - CORRIDOR_M * step_x
    while x <= max(lons) + CORRIDOR_M * step_x:
        y = min(lats) - CORRIDOR_M * step_y
        while y <= max(lats) + CORRIDOR_M * step_y:
            if line_dist((x, y), parts) <= CORRIDOR_M:
                area[cover.at(x, y) or "unmapped"] += 1
            y += step_y
        x += step_x

    tcols = snap["trees"]["columns"]
    trees = [dict(zip(tcols, r)) for r in snap["trees"]["rows"]]
    near_trees = [t for t in trees if line_dist((t["lon"], t["lat"]), parts) <= CORRIDOR_M]
    gw = min(snap["groundwater"], key=lambda s: math.dist(xy(s["lon"], s["lat"]), xy(*mid)))
    zones, zone_url = ods_at("100292", mid[0], mid[1], "typ,kantypbez,geschaesta")

    out = {
        "schema_version": "demo-street/0.1",
        "selection_rule": f"Suitable by traffic, middle vertex in a Fokus heat area, named; most active or upcoming permits within {PERMIT_M} m (ties: longer).",
        "segment": {"street": pr["Strassenname"].strip(), "length_m": round(length, 1), "parts": len(parts), "dtv_class": pr["DTV_Klassen"],
                    "suitability": pr["Eignung_nach_DTV"], "heat_area": "Fokus", "geometry": {"type": "MultiLineString", "coordinates": parts},
                    "middle_vertex": list(mid)},
        "permits_near": {"radius_m": PERMIT_M, "snapshot": snap["fetched_at"], "count": len(near),
                         "by_category": dict(collections.Counter(cats[r["inferred_category"]] for r in near).most_common()),
                         "ends": sorted({r["to_yyyymm"] for r in near})},
        "corridor": {"half_width_m": CORRIDOR_M, "method": "1 m grid samples within the half width of the line, classed by the land-cover polygon they fall in", "source": lc_url,
                     "area_m2": {g: round(v) for g, v in sorted(area.items())}},
        "trees": {"count": len(near_trees), "no_mapped_planted_polygon": sum(1 for t in near_trees if t["inferred_pit"] == 0)},
        "groundwater_station": {"name": gw["name"], "distance_m": round(math.dist(xy(gw["lon"], gw["lat"]), xy(*mid))),
                                "depth_min_m": gw["inferred"]["depth_min_m"], "period": gw["real"]["period"]},
        "protection_zone": {"source": zone_url, "zones": [z["kantypbez"] for z in zones]},
    }
    path = HERE / "data" / "demo-street.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in out.items() if k != "segment"} | {"street": out["segment"]["street"], "length_m": out["segment"]["length_m"]}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
