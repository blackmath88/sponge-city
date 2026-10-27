from pathlib import Path
import json
import sqlite3
import sys

import pytest
from pyproj import Transformer
from shapely.geometry import Point, Polygon
from shapely import wkb

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
import audit_data_access as audit


def test_actual_kml_is_valid_polygon():
    geom = audit.load_aoi()
    assert geom.geom_type in {"Polygon", "MultiPolygon"}
    assert geom.is_valid and not geom.is_empty


def test_aoi_crs_transformation_has_metric_area():
    geom = audit.load_aoi()
    transformer = Transformer.from_crs(4326, 2056, always_xy=True)
    projected = audit.transform(transformer.transform, geom)
    assert projected.area > 100_000
    assert projected.bounds[0] > 2_600_000


def test_saved_wms_evidence_does_not_claim_numeric_success():
    evidence = Path(__file__).parents[1] / "data/processed/audit/heat_grid_results.json"
    records = __import__("json").loads(evidence.read_text())
    assert records and all(record["value"] is None for record in records)


def test_numeric_heat_response_is_parsed_from_named_attribute():
    response = '{"type":"FeatureCollection","features":[{"properties":{"heat_value":2.75}}]}'
    assert audit.parse_numeric_wms_value(response, "application/json") == 2.75
    assert audit.has_numeric_wms_value(response, "application/json")


def test_layer_name_and_coordinates_are_not_heat_values():
    response = '{"features":[{"id":"KL_Waermeinseleffekt","properties":{},"type":"Feature"}]}'
    assert audit.parse_numeric_wms_value(response, "application/json") is None
    assert not audit.has_numeric_wms_value(response, "application/json")


def test_valid_no_hazard_response_is_distinguished_from_unqueryable():
    class Response:
        status_code = 200
        headers = {"content-type": "application/json"}
        def json(self):
            return {"type": "FeatureCollection", "features": []}

    assert audit.classify_runoff_response(Response())[0] == "no_hazard"


def test_empty_non_json_response_is_unqueryable():
    class Response:
        status_code = 200
        headers = {"content-type": "text/plain"}
        text = "Search returned no results"
        def json(self):
            raise ValueError("not JSON")

    assert audit.classify_runoff_response(Response())[0] == "unqueryable"


def test_derived_status_logic():
    assert audit.derive_heat_status(0) == "FAIL"
    assert audit.derive_heat_status(3) == "PARTIAL"
    assert audit.derive_heat_status(3, raster_available=True) == "PASS"
    assert audit.derive_runoff_status(["no_hazard", "no_hazard"], False) == "PASS"
    assert audit.derive_runoff_status(["unqueryable"], False) == "FAIL"


def test_image_response_is_not_analytical():
    assert not audit.has_numeric_wms_value("PNG image bytes 123456")


def test_unavailable_endpoint_is_graceful():
    with pytest.raises(Exception):
        audit.request_json("http://127.0.0.1:1/unavailable", {})


def test_aoi_contains_known_interior_point():
    geom = audit.load_aoi()
    assert geom.covers(Point(7.5916, 47.567))


def test_delivered_gpkg_inventory_rejects_identifier_fields_as_heat_values():
    inventory = audit.inspect_heat_gpkg()
    layer = inventory["contents"][0]
    assert layer["data_type"] == "features"
    assert layer["geometry"]["type"] == "POLYGON"
    assert layer["candidate_heat_value_field"] is None
    assert layer["feature_count"] == 976


def test_local_categorical_fixture_is_clipped_and_fails_heat(tmp_path):
    path = tmp_path / "fixture.gpkg"
    connection = sqlite3.connect(path)
    connection.executescript("""
        create table gpkg_contents (table_name text, data_type text, identifier text, description text,
          last_change text, min_x real, min_y real, max_x real, max_y real, srs_id integer);
        create table gpkg_geometry_columns (table_name text, column_name text, geometry_type_name text,
          srs_id integer, z integer, m integer);
        create table gpkg_spatial_ref_sys (srs_name text, srs_id integer, organization text,
          organization_coordsys_id integer, definition text, description text);
        create table sample (FID integer primary key, geometry blob, Id_Fokusgebiet integer, Art text);
    """)
    polygon = Polygon([(2611300, 1268300), (2611400, 1268300), (2611400, 1268400), (2611300, 1268400), (2611300, 1268300)])
    blob = b"GP\x00\x00\x00\x00\x00\x00" + wkb.dumps(polygon)
    connection.execute("insert into gpkg_contents values ('sample','features','sample','', '',2611300,1268300,2611400,1268400,2056)")
    connection.execute("insert into gpkg_geometry_columns values ('sample','geometry','POLYGON',2056,0,0)")
    connection.execute("insert into sample values (1,?,?,?)", (blob, 99, "Fokus"))
    connection.commit(); connection.close()
    aoi = Polygon([(2611300, 1268300), (2611350, 1268300), (2611350, 1268350), (2611300, 1268350), (2611300, 1268300)])
    summary = audit.audit_local_heat(path, aoi, tmp_path / "evidence")
    assert summary["status"] == "FAIL"
    assert summary["value_field"] is None
    assert summary["class_areas_m2"]["Fokus"] == 2500
    clipped = json.loads((tmp_path / "evidence/tellplatz_heat_clipped.geojson").read_text())
    assert len(clipped["features"]) == 1
