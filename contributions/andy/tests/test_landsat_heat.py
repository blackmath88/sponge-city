from pathlib import Path
import sys

import numpy as np
from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
import extract_landsat_heat as heat


def test_reference_ring_is_metric_and_excludes_aoi():
    aoi = Polygon([(7.59, 47.56), (7.60, 47.56), (7.60, 47.57), (7.59, 47.57)])
    ring = heat.make_reference_ring(aoi)
    assert ring.is_valid and not ring.intersects(aoi)


def test_scale_offset_conversion():
    assert np.isclose(heat.dn_to_celsius(np.array([10000]), 0.00341802, 149.0)[0], -89.9698)


def test_qa_bits_interpretation():
    assert heat.qa_is_clear(np.array([0, 1 << 3, 1 << 5, 1 << 1], dtype=np.uint16)).tolist() == [True, False, False, False]


def test_accept_reject_logic():
    good = {"valid_pixel_count": 2, "valid_fraction": 0.5, "min_c": 20, "max_c": 40}
    ring = {"valid_pixel_count": 2, "valid_fraction": 1, "min_c": 19, "max_c": 39}
    assert heat.accept_scene(good, ring)[0]
    bad = dict(good, valid_fraction=0.49)
    assert not heat.accept_scene(bad, ring)[0]


def test_aggregation_uses_scene_medians_not_pooled_pixels():
    records = [{"aoi": {"median_c": 20}, "ring": {"median_c": 18}, "anomaly_c": 2}, {"aoi": {"median_c": 30}, "ring": {"median_c": 25}, "anomaly_c": 5}, {"aoi": {"median_c": 22}, "ring": {"median_c": 20}, "anomaly_c": 2}]
    result = heat.aggregate(records)
    assert result["tellplatz_median_c"] == 22
    assert result["relative_anomaly_median_c"] == 2


def test_zero_valid_pixel_scene_rejected():
    empty = heat.stats(np.array([np.nan, np.nan]), 2)
    assert not heat.accept_scene(empty, {"valid_pixel_count": 1, "valid_fraction": 1, "min_c": 20, "max_c": 20})[0]


def test_unreachable_asset_is_rejected_by_asset_lookup():
    class Item:
        assets = {}
    try:
        heat._asset(Item(), ("lwir11",), "surface-temperature")
    except ValueError as exc:
        assert "no surface-temperature asset" in str(exc)
    else:
        raise AssertionError("missing asset was accepted")


def test_unreachable_asset_read_is_offline(monkeypatch):
    def unavailable(_href):
        raise OSError("asset unreachable")
    monkeypatch.setattr(heat.rasterio, "open", unavailable)
    try:
        heat.read_area("https://example.invalid/lwir11.tif", Polygon(), "https://example.invalid/qa.tif", {"scale": 1, "offset": 0, "nodata": 0})
    except OSError as exc:
        assert "unreachable" in str(exc)
    else:
        raise AssertionError("unreachable asset was not rejected")
