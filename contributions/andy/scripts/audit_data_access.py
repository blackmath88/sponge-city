#!/usr/bin/env python3
"""Small, reproducible live-data feasibility audit for the Tellplatz AOI."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml
from pyproj import Transformer
from shapely.geometry import Point, Polygon, shape, mapping
from shapely.ops import transform, unary_union
from shapely import wkb

ROOT = Path(__file__).resolve().parents[1]
AOI_KML = ROOT / "data/raw_data/tellPlatz-coordinates.kml"
AOI_GEOJSON = ROOT / "data/processed/tellplatz_aoi.geojson"
EVIDENCE = ROOT / "data/processed/audit"
TIMEOUT = 30

OGC = "https://api.geo.bs.ch/ogc/v1/wfs3"
ODS = "https://data.bs.ch/api/explore/v2.1/catalog/datasets/100052/records"
COVER = "ch.bs.av_bodenbedeckung_einzelobjekte_avbe.bodenbedeckung"
FOCUS = "ch.bs.fokusgebiet_hitzeentwicklung_fgsk"
HEAT_WMS = "https://wms.geo.bs.ch/"
RUNOFF_WMS = "https://wms.geo.admin.ch/"
HEAT_GPKG = ROOT / "data/raw_data/heat/basel_stadt_waermeinseleffekt_current_epsg2056.gpkg"
HEAT_EVIDENCE = EVIDENCE / "heat"


def load_aoi(path: Path = AOI_KML):
    root = ET.parse(path).getroot()
    ns = {"k": "http://www.opengis.net/kml/2.2"}
    polygons = []
    for node in root.findall(".//k:Polygon", ns):
        text = node.findtext(".//k:outerBoundaryIs/k:LinearRing/k:coordinates", namespaces=ns)
        if not text:
            continue
        coords = []
        for item in text.split():
            values = item.split(",")
            if len(values) >= 2:
                coords.append((float(values[0]), float(values[1])))
        if len(coords) >= 4:
            polygons.append(Polygon(coords))
    if not polygons:
        raise ValueError("KML contains no polygon geometry")
    geom = polygons[0] if len(polygons) == 1 else polygons[0].union(*polygons[1:])
    if geom.geom_type not in ("Polygon", "MultiPolygon"):
        raise ValueError(f"KML geometry is {geom.geom_type}, not Polygon/MultiPolygon")
    if geom.is_empty:
        raise ValueError("KML polygon is empty")
    if not geom.is_valid:
        geom = geom.buffer(0)
    if geom.is_empty or not geom.is_valid:
        raise ValueError("KML polygon could not be repaired")
    return geom


def write_geojson(path: Path, features):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2) + "\n")


def request_json(url, params):
    response = requests.get(url, params=params, timeout=TIMEOUT)
    response.raise_for_status()
    if "json" not in response.headers.get("content-type", "").lower():
        raise ValueError(f"expected JSON, got {response.headers.get('content-type')}")
    return response.json(), response


def _numeric_value(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and re.fullmatch(r"[-+]?\d+(?:[.,]\d+)?", value.strip()):
        return float(value.replace(",", "."))
    return None


def parse_numeric_wms_value(text: str, content_type: str = ""):
    """Extract a heat value only from a named analytical attribute, never coordinates/IDs."""
    allowed = re.compile(r"(?:heat|wärme|waerme|temperature|temp|value|wert)", re.I)
    try:
        document = json.loads(text)
        properties = []
        for feature in document.get("features", []):
            properties.append(feature.get("properties", {}))
        for item in properties:
            for key, value in item.items():
                number = _numeric_value(value)
                if number is not None and allowed.search(str(key)):
                    return number
        return None
    except (ValueError, TypeError, json.JSONDecodeError):
        pass
    try:
        root = ET.fromstring(text)
        for node in root.iter():
            key = node.tag.rsplit("}", 1)[-1]
            number = _numeric_value(node.text)
            if number is not None and allowed.search(key):
                return number
        return None
    except ET.ParseError:
        for line in text.splitlines():
            key, _, value = line.partition(":")
            number = _numeric_value(value)
            if number is not None and allowed.search(key):
                return number
    return None


def has_numeric_wms_value(text: str, content_type: str = "") -> bool:
    """Return true only when a named analytical value is parsed."""
    return parse_numeric_wms_value(text, content_type) is not None


def classify_runoff_response(response):
    """Classify JSON GetFeatureInfo without confusing empty data with HTTP failure."""
    content_type = response.headers.get("content-type", "")
    if response.status_code != 200:
        return "request_failure", None
    try:
        document = response.json()
    except ValueError:
        return "unqueryable", None
    if document.get("type") != "FeatureCollection":
        return "unqueryable", None
    features = document.get("features", [])
    if not features:
        return "no_hazard", None
    geometries = [shape(feature["geometry"]) for feature in features if feature.get("geometry")]
    return ("analytical_geometry", geometries) if geometries else ("unqueryable", None)


def derive_heat_status(valid_value_count, raster_available=False):
    if raster_available and valid_value_count:
        return "PASS"
    return "PARTIAL" if valid_value_count else "FAIL"


def derive_runoff_status(classifications, has_geometry):
    if has_geometry or classifications and all(item == "no_hazard" for item in classifications):
        return "PASS"
    if "analytical_value" in classifications:
        return "PARTIAL"
    return "FAIL"


def bbox(geom):
    return [round(v, 8) for v in geom.bounds]


def audit_vector(geom4326, name, collection, output_name, limit=1000):
    params = {"bbox": ",".join(map(str, bbox(geom4326))), "limit": limit}
    data, response = request_json(f"{OGC}/collections/{collection}/items.json", params)
    features = data.get("features", [])
    clipped = []
    for feature in features:
        source_geom = shape(feature["geometry"])
        if not source_geom.is_valid:
            source_geom = source_geom.buffer(0)
        intersection = source_geom.intersection(geom4326)
        if not intersection.is_empty:
            clipped.append({"type": "Feature", "geometry": mapping(intersection), "properties": feature.get("properties", {})})
    write_geojson(EVIDENCE / output_name, clipped)
    return data, response, clipped


def audit_trees(geom4326):
    wkt = geom4326.wkt
    params = {"limit": 100, "where": f"within(geo_shape,geom'{wkt}')"}
    all_records = []
    while True:
        data, response = request_json(ODS, params)
        all_records.extend(data.get("results", []))
        if len(all_records) >= data.get("total_count", len(all_records)) or len(data.get("results", [])) < params["limit"]:
            break
        params["offset"] = len(all_records)
    features = []
    for record in all_records:
        point = Point(record["geo_point_2d"]["lon"], record["geo_point_2d"]["lat"])
        if geom4326.covers(point):
            properties = {k: v for k, v in record.items() if k not in ("geo_point_2d", "geo_shape")}
            features.append({"type": "Feature", "geometry": mapping(point), "properties": properties})
    write_geojson(EVIDENCE / "trees_clipped.geojson", features)
    return response, features


def wms_info(url, layer, x, y, info_format="text/plain", version="1.3.0"):
    params = {"SERVICE": "WMS", "VERSION": version, "REQUEST": "GetFeatureInfo", "LAYERS": layer,
              "STYLES": "", "BBOX": f"{x-50},{y-50},{x+50},{y+50}", "WIDTH": 101, "HEIGHT": 101,
              "QUERY_LAYERS": layer, "INFO_FORMAT": info_format, "FEATURE_COUNT": 1}
    if version == "1.3.0":
        params.update(CRS="EPSG:2056", I=50, J=50)
    else:
        params.update(SRS="EPSG:2056", X=50, Y=50)
    response = requests.get(url, params=params, timeout=TIMEOUT)
    return response


def grid_points(geom2056):
    """Return a 5x5 regular grid in an inset AOI bbox, all inside the AOI."""
    minx, miny, maxx, maxy = geom2056.bounds
    margin = 0.10
    minx += (maxx - minx) * margin
    maxx -= (maxx - minx) * margin
    miny += (maxy - miny) * margin
    maxy -= (maxy - miny) * margin
    points = []
    for column in range(5):
        for row in range(5):
            point = Point(minx + (column + 0.5) * (maxx - minx) / 5,
                          miny + (row + 0.5) * (maxy - miny) / 5)
            if geom2056.covers(point):
                points.append(point)
    if len(points) != 25:
        raise ValueError(f"expected 25 grid points inside AOI, got {len(points)}")
    return points


def inspect_capabilities(url, layer):
    versions = []
    roots = []
    for version in ("1.1.1", "1.3.0"):
        response = requests.get(url, params={"SERVICE": "WMS", "REQUEST": "GetCapabilities", "VERSION": version}, timeout=TIMEOUT)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        versions.append(root.attrib.get("version", version))
        roots.append(root)
    root = roots[-1]
    ns = {"w": "http://www.opengis.net/wms", "x": "http://www.w3.org/1999/xlink"}
    target = next((element for element in root.iter()
                   if element.find("w:Name", ns) is not None and element.find("w:Name", ns).text == layer), None)
    if target is None:
        raise ValueError(f"layer {layer} not found in GetCapabilities")
    info = root.find(".//w:Capability/w:Request/w:GetFeatureInfo", ns)
    formats = [node.text for node in info.findall("w:Format", ns)] if info is not None else []
    return {"versions": versions, "queryable": target.attrib.get("queryable") == "1",
            "crs": [node.text for node in target.findall("w:CRS", ns)],
            "getfeatureinfo_formats": formats,
            "title": target.findtext("w:Title", namespaces=ns),
            "links": [node.attrib.get("{http://www.w3.org/1999/xlink}href")
                      for node in target.iter() if node.attrib.get("{http://www.w3.org/1999/xlink}href")]}


def gpkg_geometry(blob):
    """Decode a GeoPackage geometry blob, including its optional envelope."""
    if not blob or blob[:2] != b"GP":
        raise ValueError("not a GeoPackage geometry blob")
    envelope_sizes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    envelope_code = (blob[3] >> 1) & 0x07
    return wkb.loads(blob[8 + envelope_sizes.get(envelope_code, 0):])


def heat_value_field(columns):
    """Select no field unless its name documents a heat measurement/value."""
    excluded = re.compile(r"(?:fid|id|identifier|coord|x|y|date|year|class|code)", re.I)
    candidate = re.compile(r"(?:heat|wärme|waerme|temperature|temp|value|wert)", re.I)
    for column in columns:
        name = column["name"]
        if column["type"].upper() in ("REAL", "DOUBLE", "FLOAT", "NUMERIC", "INTEGER") and candidate.search(name) and not excluded.search(name):
            return name
    return None


def inspect_heat_gpkg(path=HEAT_GPKG):
    """Inventory GeoPackage contents without altering the immutable source."""
    path = Path(path)
    connection = sqlite3.connect(path)
    try:
        contents = [dict(zip(("table_name", "data_type", "identifier", "description", "last_change", "min_x", "min_y", "max_x", "max_y", "srs_id"), row))
                    for row in connection.execute("select table_name,data_type,identifier,description,last_change,min_x,min_y,max_x,max_y,srs_id from gpkg_contents")]
        layers = []
        for item in contents:
            table = item["table_name"]
            columns = [{"name": row[1], "type": row[2], "notnull": bool(row[3]), "primary_key": bool(row[5])}
                       for row in connection.execute(f'pragma table_info("{table}")')]
            geometry = connection.execute("select column_name,geometry_type_name,srs_id,z,m from gpkg_geometry_columns where table_name=?", (table,)).fetchone()
            count = connection.execute(f'select count(*) from "{table}"').fetchone()[0]
            distinct = {}
            for column in columns:
                if column["type"].upper() in ("TEXT", "INTEGER") and column["name"].lower() in ("art", "class", "klasse", "category", "kategorie"):
                    distinct[column["name"]] = [{"value": row[0], "count": row[1]} for row in connection.execute(
                        f'select "{column["name"]}",count(*) from "{table}" group by "{column["name"]}"')]
            layers.append({"table_name": table, "data_type": item["data_type"], "identifier": item["identifier"],
                           "description": item["description"], "extent": [item["min_x"], item["min_y"], item["max_x"], item["max_y"]],
                           "srs_id": item["srs_id"], "geometry": {"column": geometry[0], "type": geometry[1], "srs_id": geometry[2]} if geometry else None,
                           "feature_count": count, "columns": columns, "distinct_categorical_values": distinct,
                           "candidate_heat_value_field": heat_value_field(columns)})
        metadata_tables = [row[0] for row in connection.execute("select name from sqlite_master where type='table' and name like '%metadata%'")]
        sqlite_tables = [row[0] for row in connection.execute("select name from sqlite_master where type='table' order by name")]
        tile_matrix_sets = []
        tile_matrices = []
        if "gpkg_tile_matrix_set" in sqlite_tables:
            tile_matrix_sets = [dict(zip(("table_name", "srs_id", "min_x", "min_y", "max_x", "max_y"), row))
                                for row in connection.execute("select table_name,srs_id,min_x,min_y,max_x,max_y from gpkg_tile_matrix_set")]
        if "gpkg_tile_matrix" in sqlite_tables:
            tile_matrices = [dict(zip(("table_name", "zoom_level", "matrix_width", "matrix_height", "tile_width", "tile_height", "pixel_x_size", "pixel_y_size"), row))
                             for row in connection.execute("select table_name,zoom_level,matrix_width,matrix_height,tile_width,tile_height,pixel_x_size,pixel_y_size from gpkg_tile_matrix")]
        spatial_refs = [dict(zip(("srs_id", "organization", "organization_coordsys_id", "definition", "description"), row))
                        for row in connection.execute("select srs_id,organization,organization_coordsys_id,definition,description from gpkg_spatial_ref_sys")]
        try:
            source_file = str(path.relative_to(ROOT))
        except ValueError:
            source_file = str(path)
        return {"source_file": source_file, "file_size_bytes": path.stat().st_size,
                "sqlite_tables": sqlite_tables, "contents": layers, "metadata_tables": metadata_tables,
                "tile_matrix_sets": tile_matrix_sets, "tile_matrices": tile_matrices, "spatial_ref_systems": spatial_refs}
    finally:
        connection.close()


def audit_local_heat(path, aoi2056, evidence_dir=HEAT_EVIDENCE):
    """Clip the delivered vector source and prove whether it contains heat values."""
    inventory = inspect_heat_gpkg(path)
    evidence_dir = Path(evidence_dir)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    (evidence_dir / "heat_gpkg_inventory.json").write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + "\n")
    layer = next((item for item in inventory["contents"] if item["data_type"] == "features"), None)
    if not layer or not layer["geometry"]:
        summary = {"source_file": inventory["source_file"], "source_layer": None, "source_type": "unknown", "status": "FAIL",
                   "crs": None, "unit": None, "model_year": None, "resolution": None, "value_field": None,
                   "feature_or_pixel_count": None, "valid_value_count": None, "null_or_nodata_count": None,
                   "coverage_area_m2": None, "coverage_fraction": None, "mean_heat_island_k": None,
                   "area_weighted_mean_heat_island_k": None, "median_heat_island_k": None, "minimum_heat_island_k": None,
                   "maximum_heat_island_k": None, "class_areas_m2": {}, "class_fractions": {},
                   "limitations": ["No readable feature layer was found."]}
        (evidence_dir / "heat_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
        return summary
    table = layer["table_name"]
    columns = [column["name"] for column in layer["columns"]]
    clipped = []
    connection = sqlite3.connect(path)
    try:
        for row in connection.execute(f'select "geometry", "Art", "FID", "Id_Fokusgebiet" from "{table}"'):
            geometry = gpkg_geometry(row[0])
            intersection = geometry.intersection(aoi2056)
            if not intersection.is_empty:
                clipped.append({"type": "Feature", "geometry": mapping(intersection),
                                "properties": {"Art": row[1], "FID": row[2], "Id_Fokusgebiet": row[3]}})
    finally:
        connection.close()
    write_geojson(evidence_dir / "tellplatz_heat_clipped.geojson", clipped)
    class_areas = defaultdict(float)
    for feature in clipped:
        class_areas[str(feature["properties"].get("Art"))] += shape(feature["geometry"]).area
    coverage = unary_union([shape(feature["geometry"]) for feature in clipped]).area if clipped else 0.0
    summary = {"source_file": inventory["source_file"], "source_layer": table, "source_type": "categorical", "status": "FAIL",
               "source": "delivered official local GeoPackage",
               "indicator": "Fokusgebiete Stadtklimakonzept, not a numerical heat indicator", "crs": "EPSG:2056", "unit": None,
               "model_year": None, "resolution": None, "value_field": None, "feature_or_pixel_count": layer["feature_count"],
               "valid_value_count": 0, "null_or_nodata_count": None, "coverage_area_m2": coverage,
               "coverage_fraction": coverage / aoi2056.area if aoi2056.area else None, "mean_heat_island_k": None,
               "area_weighted_mean_heat_island_k": None, "median_heat_island_k": None, "minimum_heat_island_k": None,
               "maximum_heat_island_k": None, "class_areas_m2": dict(class_areas),
               "class_fractions": {key: value / aoi2056.area for key, value in class_areas.items()},
               "limitations": ["The only numeric fields are FID and Id_Fokusgebiet identifiers.",
                              "Art contains planning categories Erhalten, Fokus, Verbessern and übriges Gebiet, not heat intensity.",
                              "No unit, model year, resolution, heat value field or metadata tables are present."]}
    (evidence_dir / "heat_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    return summary


def save_metadata(name, response, extra=None):
    record = {"url": response.url, "status_code": response.status_code,
              "content_type": response.headers.get("content-type"), "body_excerpt": response.text[:1000]}
    if extra:
        record.update(extra)
    (EVIDENCE / name).write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="only validate the KML and normalized AOI")
    args = parser.parse_args()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).isoformat()
    geom = load_aoi()
    to2056 = Transformer.from_crs(4326, 2056, always_xy=True).transform
    geom2056 = transform(to2056, geom)
    AOI_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
    write_geojson(AOI_GEOJSON, [{"type": "Feature", "geometry": mapping(geom), "properties": {"area_m2_epsg2056": geom2056.area}}])
    metrics = {"area_id": "tellplatz", "generated_at": generated,
               "aoi": {"area_m2": geom2056.area, "area_ha": geom2056.area / 10000,
                       "bbox_epsg4326": bbox(geom), "bbox_epsg2056": bbox(geom2056)},
               "heat": {"status": "FAIL", "mean_heat_island_k": None, "min_heat_island_k": None, "max_heat_island_k": None,
                        "sample_count": 0, "valid_value_count": 0, "unit": None, "method": None, "source": "KL_Waermeinseleffekt"},
               "land_cover": {"status": "FAIL", "feature_count": 0, "classes": {}, "sealed_fraction": None, "source": COVER},
               "trees": {"status": "FAIL", "tree_count": 0, "trees_per_ha": None, "source": "100052"},
               "runoff": {"status": "FAIL", "exposed_fraction": None, "classes": {}, "sample_count": 0,
                          "analytical_value_count": 0, "no_hazard_count": 0, "unqueryable_count": 0,
                          "source": "ch.bafu.gefaehrdungskarte-oberflaechenabfluss"},
                "focus": {"status": "FAIL", "intersects": False, "source": FOCUS}}
    if HEAT_GPKG.exists():
        baseline_path = EVIDENCE / "baseline_metrics.json"
        if baseline_path.exists():
            metrics = json.loads(baseline_path.read_text())
        metrics["generated_at"] = generated
        metrics["heat"] = audit_local_heat(HEAT_GPKG, geom2056)
        status_table = metrics.setdefault("status_table", {})
        status_table["AOI"] = "PASS"
        status_table["Wärmeinseleffekt"] = metrics["heat"]["status"]
        (EVIDENCE / "baseline_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n")
        print(f"AOI                    {status_table.get('AOI', 'PASS')}")
        print(f"Wärmeinseleffekt       {status_table['Wärmeinseleffekt']}")
        print("Local heat audit complete; remote source probes skipped")
        return 0
    if args.offline:
        (EVIDENCE / "baseline_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
        print("AOI PASS (offline)")
        return 0
    statuses = {}
    try:
        cover, response, clipped = audit_vector(geom, "land_cover", COVER, "land_cover_clipped.geojson")
        classes = defaultdict(float)
        for feature in clipped:
            classes[str(feature["properties"].get("Bodenbedeckungsart", "(missing)"))] += transform(to2056, shape(feature["geometry"])).area
        metrics["land_cover"].update(
            status="PASS" if clipped else "FAIL",
            feature_count=len(clipped),
            classes={key: {"area_m2": area, "percentage": area / geom2056.area * 100} for key, area in classes.items()},
        )
        statuses["Bodenbedeckung"] = metrics["land_cover"]["status"]
        save_metadata("land_cover_response.json", response, {"feature_count_bbox": cover.get("numberMatched"), "feature_count_clipped": len(clipped)})
    except Exception as exc:
        statuses["Bodenbedeckung"] = "FAIL"; save_metadata("land_cover_error.json", requests.Response(), {"error": str(exc)})
    try:
        response, trees = audit_trees(geom)
        metrics["trees"].update(status="PASS" if trees else "FAIL", tree_count=len(trees), trees_per_ha=len(trees) / metrics["aoi"]["area_ha"])
        statuses["Baumkataster"] = metrics["trees"]["status"]
        save_metadata("trees_response.json", response, {"feature_count_clipped": len(trees)})
    except Exception as exc:
        statuses["Baumkataster"] = "FAIL"; (EVIDENCE / "trees_error.json").write_text(json.dumps({"error": str(exc)}, indent=2) + "\n")
    try:
        focus, response, clipped = audit_vector(geom, "focus", FOCUS, "focus_areas_clipped.geojson", 100)
        metrics["focus"].update(status="PASS" if clipped else "FAIL", intersects=bool(clipped), feature_count=len(clipped))
        save_metadata("focus_response.json", response, {"feature_count_bbox": focus.get("numberMatched"), "feature_count_clipped": len(clipped)})
    except Exception as exc:
        metrics["focus"]["error"] = str(exc)
    points = grid_points(geom2056)
    center = points[12]
    alternate = {"heat": {"official_capability_links": [], "geo_bs_stac_matches": [], "download_found": False},
                 "runoff": {"metadata_url": "https://www.geocat.ch/geonetwork/srv/ger/catalog.search#/metadata/6b59f9ee-9e5f-4b12-86cf-f8afb539ae5d",
                             "download_found": False, "assets": []}}
    try:
        heat_capabilities = inspect_capabilities(HEAT_WMS, "KL_Waermeinseleffekt")
        (EVIDENCE / "heat_capabilities.json").write_text(json.dumps(heat_capabilities, indent=2, ensure_ascii=False) + "\n")
        alternate["heat"]["official_capability_links"] = heat_capabilities["links"]
        format_probes = []
        for version in heat_capabilities["versions"]:
            for info_format in heat_capabilities["getfeatureinfo_formats"]:
                response = wms_info(HEAT_WMS, "KL_Waermeinseleffekt", center.x, center.y, info_format, version)
                format_probes.append({"version": version, "format": info_format, "status_code": response.status_code,
                                      "content_type": response.headers.get("content-type"),
                                      "numeric_value": parse_numeric_wms_value(response.text, response.headers.get("content-type", "")),
                                      "body_excerpt": response.text[:500]})
        (EVIDENCE / "heat_format_probes.json").write_text(json.dumps(format_probes, indent=2, ensure_ascii=False) + "\n")
        grid_results = []
        for index, point in enumerate(points):
            response = wms_info(HEAT_WMS, "KL_Waermeinseleffekt", point.x, point.y, "application/json", "1.3.0")
            value = parse_numeric_wms_value(response.text, response.headers.get("content-type", ""))
            grid_results.append({"index": index, "x_epsg2056": point.x, "y_epsg2056": point.y,
                                 "status_code": response.status_code, "content_type": response.headers.get("content-type"),
                                 "value": value, "body_excerpt": response.text[:500]})
        (EVIDENCE / "heat_grid_results.json").write_text(json.dumps(grid_results, indent=2, ensure_ascii=False) + "\n")
        values = [item["value"] for item in grid_results if item["value"] is not None]
        metrics["heat"].update(sample_count=len(grid_results), valid_value_count=len(values),
                                method="25-point EPSG:2056 grid; WMS GetFeatureInfo JSON plus all declared formats at center")
        if values:
            metrics["heat"].update(status=derive_heat_status(len(values)), mean_heat_island_k=sum(values) / len(values),
                                    min_heat_island_k=min(values), max_heat_island_k=max(values), unit="K")
        else:
            metrics["heat"]["status"] = "FAIL"
    except Exception as exc:
        metrics["heat"].update(method=f"Capabilities/grid investigation failed: {exc}")
    try:
        runoff_capabilities = inspect_capabilities(RUNOFF_WMS, "ch.bafu.gefaehrdungskarte-oberflaechenabfluss")
        (EVIDENCE / "runoff_capabilities.json").write_text(json.dumps(runoff_capabilities, indent=2, ensure_ascii=False) + "\n")
        format_probes = []
        for version in runoff_capabilities["versions"]:
            for info_format in runoff_capabilities["getfeatureinfo_formats"]:
                response = wms_info(RUNOFF_WMS, "ch.bafu.gefaehrdungskarte-oberflaechenabfluss", center.x, center.y, info_format, version)
                format_probes.append({"version": version, "format": info_format, "status_code": response.status_code,
                                      "content_type": response.headers.get("content-type"), "body_excerpt": response.text[:500]})
        (EVIDENCE / "runoff_format_probes.json").write_text(json.dumps(format_probes, indent=2, ensure_ascii=False) + "\n")
        grid_results, hazard_geometries = [], []
        for index, point in enumerate(points):
            response = wms_info(RUNOFF_WMS, "ch.bafu.gefaehrdungskarte-oberflaechenabfluss", point.x, point.y, "application/json", "1.3.0")
            result, geometries = classify_runoff_response(response)
            if geometries:
                hazard_geometries.extend(geometries)
            grid_results.append({"index": index, "x_epsg2056": point.x, "y_epsg2056": point.y,
                                 "status_code": response.status_code, "content_type": response.headers.get("content-type"),
                                 "classification": result, "body_excerpt": response.text[:500]})
        (EVIDENCE / "runoff_grid_results.json").write_text(json.dumps(grid_results, indent=2, ensure_ascii=False) + "\n")
        analytical_count = sum(item["classification"] == "analytical_geometry" for item in grid_results)
        no_hazard_count = sum(item["classification"] == "no_hazard" for item in grid_results)
        unqueryable_count = sum(item["classification"] not in ("analytical_geometry", "no_hazard") for item in grid_results)
        metrics["runoff"].update(sample_count=len(grid_results), analytical_value_count=analytical_count,
                                  no_hazard_count=no_hazard_count, unqueryable_count=unqueryable_count,
                                  method="25-point EPSG:2056 grid; WMS GetFeatureInfo JSON geometry")
        classifications = [item["classification"] for item in grid_results]
        if hazard_geometries:
            hazard = hazard_geometries[0]
            for geometry in hazard_geometries[1:]:
                hazard = hazard.union(geometry)
            clipped_hazard = hazard.intersection(geom2056)
            exposed_fraction = clipped_hazard.area / geom2056.area
            write_geojson(EVIDENCE / "runoff_hazard_clipped.geojson", [{"type": "Feature", "geometry": mapping(clipped_hazard),
                                                                         "properties": {"source_class": None}}])
            metrics["runoff"].update(status=derive_runoff_status(classifications, True), exposed_fraction=exposed_fraction,
                                      classes={"unclassified_hazard": clipped_hazard.area})
        elif unqueryable_count == 0:
            metrics["runoff"].update(status=derive_runoff_status(classifications, False), exposed_fraction=0.0, classes={})
        else:
            metrics["runoff"]["status"] = "FAIL"
        stac_url = "https://data.geo.admin.ch/api/stac/v1/collections/ch.bafu.gefaehrdungskarte-oberflaechenabfluss/items"
        stac_response = requests.get(stac_url, timeout=TIMEOUT)
        stac_response.raise_for_status()
        items = stac_response.json().get("features", [])
        alternate["runoff"]["assets"] = [asset.get("href") for item in items for asset in item.get("assets", {}).values() if asset.get("href")]
        alternate["runoff"]["download_found"] = bool(alternate["runoff"]["assets"])
    except Exception as exc:
        metrics["runoff"]["method"] = f"Capabilities/grid investigation failed: {exc}"
    try:
        stac = requests.get("https://api.geo.bs.ch/stac/v1/collections", timeout=TIMEOUT)
        stac.raise_for_status()
        alternate["heat"]["geo_bs_stac_matches"] = [item.get("id") for item in stac.json().get("collections", [])
                                                       if any(term in (str(item.get("id", "")) + " " + str(item.get("title", ""))).lower()
                                                              for term in ("wärmeinseleffekt", "waermeinseleffekt", "heat"))]
    except Exception as exc:
        alternate["heat"]["stac_error"] = str(exc)
    (EVIDENCE / "alternate_services.json").write_text(json.dumps(alternate, indent=2, ensure_ascii=False) + "\n")
    metrics["status_table"] = {"AOI": "PASS", "Wärmeinseleffekt": metrics["heat"]["status"], **statuses,
                                "Oberflächenabfluss": metrics["runoff"]["status"], "Fokusgebiete": metrics["focus"]["status"]}
    (EVIDENCE / "baseline_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n")
    for name, status in metrics["status_table"].items(): print(f"{name:22} {status}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"unexpected audit failure: {exc}", file=sys.stderr)
        raise
