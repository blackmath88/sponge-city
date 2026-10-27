#!/usr/bin/env python3
"""Time-boxed, optional Landsat daytime LST feasibility extraction for Tellplatz."""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np
import planetary_computer
import pystac_client
import rasterio
from rasterio.mask import mask
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
API = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "landsat-c2-l2"
AOI_PATH = ROOT / "data/processed/tellplatz_aoi.geojson"
OUT_DIR = ROOT / "data/processed/audit/heat"
SUMMER_START = "2021-06-01T00:00:00Z"
SUMMER_END = "2025-08-31T23:59:59Z"
QA_BITS = {"fill": 0, "dilated_cloud": 1, "cirrus": 2, "cloud": 3, "cloud_shadow": 4, "snow_ice": 5}
PLAUSIBLE_C = (-50.0, 80.0)


def load_aoi(path=AOI_PATH):
    document = json.loads(Path(path).read_text())
    return shape(document["features"][0]["geometry"])


def make_reference_ring(aoi, inner_m=500, outer_m=1500):
    to_2056 = Transformer.from_crs(4326, 2056, always_xy=True).transform
    to_4326 = Transformer.from_crs(2056, 4326, always_xy=True).transform
    projected = transform(to_2056, aoi)
    ring = projected.buffer(outer_m).difference(projected.buffer(inner_m)).difference(projected)
    return transform(to_4326, ring)


def write_geojson(path, geom):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"inner_buffer_m": 500, "outer_buffer_m": 1500}, "geometry": mapping(geom)}]}, indent=2) + "\n")


def calibration(asset):
    bands = asset.extra_fields.get("raster:bands", [])
    band = bands[0] if bands else {}
    scale = band.get("scale", asset.extra_fields.get("scale"))
    offset = band.get("offset", asset.extra_fields.get("offset"))
    nodata = band.get("nodata", asset.extra_fields.get("nodata"))
    unit = band.get("unit", asset.extra_fields.get("unit"))
    if scale is None or offset is None:
        raise ValueError("thermal asset has no verified scale/offset metadata")
    return {"scale": float(scale), "offset": float(offset), "nodata": nodata, "unit": unit}


def dn_to_celsius(values, scale, offset):
    return values.astype("float64") * scale + offset - 273.15


def qa_is_clear(qa):
    invalid = np.zeros(qa.shape, dtype=bool)
    for bit in QA_BITS.values():
        invalid |= (qa & (1 << bit)) != 0
    return ~invalid


def stats(values, total_pixels):
    valid = values[np.isfinite(values)]
    if not len(valid):
        return {"valid_pixel_count": 0, "pixel_count": int(total_pixels), "valid_fraction": 0.0, "median_c": None, "mean_c": None, "min_c": None, "max_c": None}
    return {"valid_pixel_count": int(len(valid)), "pixel_count": int(total_pixels), "valid_fraction": float(len(valid) / total_pixels), "median_c": float(np.median(valid)), "mean_c": float(np.mean(valid)), "min_c": float(np.min(valid)), "max_c": float(np.max(valid))}


def accept_scene(aoi_stats, ring_stats, threshold=0.5):
    reasons = []
    if not aoi_stats["valid_pixel_count"]:
        reasons.append("zero valid AOI pixels")
    if not ring_stats["valid_pixel_count"]:
        reasons.append("zero valid reference-ring pixels")
    if aoi_stats["valid_fraction"] < threshold:
        reasons.append(f"AOI valid fraction {aoi_stats['valid_fraction']:.3f} below {threshold:.2f}")
    for label, record in (("AOI", aoi_stats), ("reference ring", ring_stats)):
        for key in ("min_c", "max_c"):
            value = record[key]
            if value is not None and not (PLAUSIBLE_C[0] <= value <= PLAUSIBLE_C[1]):
                reasons.append(f"{label} {key} outside plausible range {PLAUSIBLE_C[0]}..{PLAUSIBLE_C[1]} C")
    return (not reasons), reasons


def aggregate(accepted):
    def range_for(key):
        values = [x[key] for x in accepted]
        return {"min": float(min(values)), "max": float(max(values))}
    aoi = [x["aoi"]["median_c"] for x in accepted]
    ring = [x["ring"]["median_c"] for x in accepted]
    anomalies = [x["anomaly_c"] for x in accepted]
    return {"tellplatz_median_c": float(np.median(aoi)), "tellplatz_scene_range_c": {"min": float(min(aoi)), "max": float(max(aoi))}, "reference_ring_median_c": float(np.median(ring)), "reference_ring_scene_range_c": {"min": float(min(ring)), "max": float(max(ring))}, "relative_anomaly_median_c": float(np.median(anomalies)), "relative_anomaly_scene_range_c": {"min": float(min(anomalies)), "max": float(max(anomalies))}}


def _asset(item, names, label):
    for name in names:
        if name in item.assets:
            return name, item.assets[name]
    raise ValueError(f"no {label} asset found; available={sorted(item.assets)}")


def read_area(href, geom, qa_href, calibration_info):
    with rasterio.open(href) as thermal, rasterio.open(qa_href) as qa:
        project = Transformer.from_crs(4326, thermal.crs, always_xy=True).transform
        projected_geom = transform(project, geom)
        thermal_data, thermal_transform = mask(thermal, [mapping(projected_geom)], crop=True, filled=False)
        qa_project = Transformer.from_crs(4326, qa.crs, always_xy=True).transform
        qa_geom = transform(qa_project, geom)
        qa_data, _ = mask(qa, [mapping(qa_geom)], crop=True, filled=False)
        raw = thermal_data[0].astype("float64")
        q = qa_data[0]
        valid = (~thermal_data[0].mask) & (~qa_data[0].mask) & qa_is_clear(q)
        if calibration_info["nodata"] is not None:
            valid &= raw != calibration_info["nodata"]
        values = np.full(raw.shape, np.nan)
        values[valid] = dn_to_celsius(raw[valid], calibration_info["scale"], calibration_info["offset"])
        return values, int(values.size)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aoi", type=Path, default=AOI_PATH)
    args = parser.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    aoi = load_aoi(args.aoi)
    ring = make_reference_ring(aoi)
    ring_path = OUT_DIR / "landsat_reference_ring.geojson"
    write_geojson(ring_path, ring)
    try:
        catalog = pystac_client.Client.open(API)
        query = {"eo:cloud_cover": {"lt": 20}, "platform": {"in": ["landsat-8", "landsat-9"]}}
        items = []
        for year in range(2021, 2026):
            search = catalog.search(collections=[COLLECTION], intersects=mapping(aoi), datetime=f"{year}-06-01T00:00:00Z/{year}-08-31T23:59:59Z", query=query)
            items.extend(search.items())
        relaxed = False
        if len(items) < 3:
            query = {"eo:cloud_cover": {"lt": 40}, "platform": {"in": ["landsat-8", "landsat-9"]}}
            items = []
            for year in range(2021, 2026):
                search = catalog.search(collections=[COLLECTION], intersects=mapping(aoi), datetime=f"{year}-06-01T00:00:00Z/{year}-08-31T23:59:59Z", query=query)
                items.extend(search.items())
            relaxed = True
    except Exception as exc:
        write_outputs([], [], {"status": "FAIL", "error": f"STAC collection/search unreachable: {exc}", "cloud_filter_relaxed": False})
        return
    accepted, rejected = [], []
    for item in items:
        record = {"id": item.id, "datetime": item.datetime.isoformat() if item.datetime else None, "cloud_cover": item.properties.get("eo:cloud_cover"), "platform": item.properties.get("platform")}
        try:
            thermal_name, thermal = _asset(item, ("lwir11", "st_b10", "ST_B10"), "surface-temperature")
            qa_name, qa = _asset(item, ("qa_pixel", "QA_PIXEL"), "QA pixel")
            cal = calibration(thermal)
            signed_thermal = planetary_computer.sign(thermal.href)
            signed_qa = planetary_computer.sign(qa.href)
            aoi_values, aoi_total = read_area(signed_thermal, aoi, signed_qa, cal)
            ring_values, ring_total = read_area(signed_thermal, ring, signed_qa, cal)
            aoi_record, ring_record = stats(aoi_values, aoi_total), stats(ring_values, ring_total)
            usable, reasons = accept_scene(aoi_record, ring_record)
            record.update({"thermal_asset": thermal_name, "qa_asset": qa_name, "calibration": cal, "qa_bits_excluded": QA_BITS, "aoi": aoi_record, "ring": ring_record, "anomaly_c": (aoi_record["median_c"] - ring_record["median_c"]) if aoi_record["median_c"] is not None and ring_record["median_c"] is not None else None, "accepted": usable, "rejection_reasons": reasons})
            (accepted if usable else rejected).append(record)
        except Exception as exc:
            record.update({"accepted": False, "rejection_reasons": [str(exc)]})
            rejected.append(record)
    write_outputs(accepted, rejected, {"status": "", "cloud_filter_relaxed": relaxed, "candidate_count": len(items)})


def write_outputs(accepted, rejected, context):
    all_records = accepted + rejected
    candidate = context.get("candidate_count", len(all_records))
    usable = len(accepted)
    status = "PASS" if usable >= 3 else "PARTIAL" if usable else "FAIL"
    metrics = {"source": API, "collection": COLLECTION, "period": {"start": SUMMER_START, "end": SUMMER_END}, "cloud_filter": "< 40% (relaxed from < 20% because fewer than 3 candidates)" if context.get("cloud_filter_relaxed") else "< 20%", "cloud_filter_relaxed": context.get("cloud_filter_relaxed", False), "qa_bits_excluded": QA_BITS, "scenes": all_records}
    (OUT_DIR / "landsat_scene_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    baseline = {"status": status, "source": API, "variable": "satellite-derived daytime land-surface-temperature baseline", "unit": "degC", "period": {"start": SUMMER_START, "end": SUMMER_END}, "scene_count": {"candidate": candidate, "usable": usable, "rejected": len(rejected)}, "tellplatz": {"median_c": None, "scene_range_c": None}, "reference_ring": {"median_c": None, "buffers_m": {"inner": 500, "outer": 1500}, "scene_range_c": None}, "relative_anomaly": {"median_c": None, "range_c": None}, "limitations": ["Landsat LST is satellite land-surface temperature, not air temperature or official Basel heat-island intensity.", "Thermal pixels are coarse relative to the 12.5 ha AOI; no street- or parcel-level claims are supported.", "AOI acceptance requires at least 50% valid pixels; this is a conservative coverage threshold for area statistics."]}
    if accepted:
        summary = aggregate(accepted)
        baseline["tellplatz"].update(median_c=summary["tellplatz_median_c"], scene_range_c=summary["tellplatz_scene_range_c"])
        baseline["reference_ring"].update(median_c=summary["reference_ring_median_c"], scene_range_c=summary["reference_ring_scene_range_c"])
        baseline["relative_anomaly"].update(median_c=summary["relative_anomaly_median_c"], range_c=summary["relative_anomaly_scene_range_c"])
    if context.get("error"):
        baseline["limitations"].append(context["error"])
    (OUT_DIR / "landsat_heat_baseline.json").write_text(json.dumps(baseline, indent=2) + "\n")


if __name__ == "__main__":
    main()
