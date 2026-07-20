"""Generates contour lines for a region from its own bundled terrain.pmtiles
(same Mapterhorn terrarium DEM data used for hillshade and elevation gain —
see use-offline-basemap-style.ts and add_elevation_gain.py).

Unlike those two, contour generation needs a full 2D elevation grid, not
point samples, so this mosaics every z11 tile covering the region's bbox
into one raster and runs it through GDAL's contour tracer.

Kept in Web Mercator (EPSG:3857) for the mosaic and contour tracing, then
reprojected to WGS84 (lon/lat) only at the very end: XYZ tiles are natively
uniform-pixel-size in Web Mercator, but that's *not* true in plain lon/lat
(a degree of longitude is a different ground distance than a degree of
latitude, and that ratio itself changes with latitude) — building the
mosaic directly in lon/lat would silently distort every contour line.

Requires: pmtiles CLI, Pillow, numpy, GDAL (Python bindings + gdal_contour +
ogr2ogr on PATH). All three coexist in one venv via:
  python3 -m venv --system-site-packages .venv && .venv/bin/pip install Pillow numpy
(GDAL itself installed via `brew install gdal`, which is what makes the
python bindings/CLI tools available to --system-site-packages.)
"""

import io
import json
import math
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from osgeo import gdal, osr
from PIL import Image

gdal.UseExceptions()

ZOOM = 11  # matches terrain.pmtiles's maxzoom (see src/data/README.md)
EARTH_RADIUS_3857 = 6378137.0
ORIGIN_3857 = math.pi * EARTH_RADIUS_3857  # 20037508.342789244


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    lat_rad = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n
    return x, y


def fetch_tile_elevation(pmtiles_path, z, x, y):
    result = subprocess.run(
        ["pmtiles", "tile", pmtiles_path, str(z), str(x), str(y)], capture_output=True
    )
    if not result.stdout:
        return None
    img = Image.open(io.BytesIO(result.stdout)).convert("RGB")
    arr = np.asarray(img).astype(np.float64)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    return (r * 256 + g + b / 256) - 32768  # terrarium encoding, meters


def build_mosaic(pmtiles_path, bbox):
    south, west, north, east = bbox
    x0f, y0f = lonlat_to_tile(west, north, ZOOM)
    x1f, y1f = lonlat_to_tile(east, south, ZOOM)
    x_min, x_max = int(x0f), int(x1f)
    y_min, y_max = int(y0f), int(y1f)

    tiles = {}
    tile_px = None
    for tx in range(x_min, x_max + 1):
        for ty in range(y_min, y_max + 1):
            elev = fetch_tile_elevation(pmtiles_path, ZOOM, tx, ty)
            if elev is not None:
                tile_px = elev.shape[0]
                tiles[(tx, ty)] = elev

    if tile_px is None:
        raise RuntimeError("No tiles decoded — check the pmtiles path and bbox")

    cols = (x_max - x_min + 1) * tile_px
    rows = (y_max - y_min + 1) * tile_px
    mosaic = np.zeros((rows, cols), dtype=np.float32)
    for (tx, ty), elev in tiles.items():
        col_off = (tx - x_min) * tile_px
        row_off = (ty - y_min) * tile_px
        mosaic[row_off : row_off + tile_px, col_off : col_off + tile_px] = elev

    n = 2 ** ZOOM
    meters_per_tile = (2 * ORIGIN_3857) / n
    pixel_size_m = meters_per_tile / tile_px
    left_m = -ORIGIN_3857 + x_min * meters_per_tile
    top_m = ORIGIN_3857 - y_min * meters_per_tile
    geotransform = (left_m, pixel_size_m, 0, top_m, 0, -pixel_size_m)
    return mosaic, geotransform


def write_geotiff(mosaic, geotransform, out_path):
    driver = gdal.GetDriverByName("GTiff")
    rows, cols = mosaic.shape
    ds = driver.Create(out_path, cols, rows, 1, gdal.GDT_Float32)
    ds.SetGeoTransform(geotransform)
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(3857)
    ds.SetProjection(srs.ExportToWkt())
    ds.GetRasterBand(1).WriteArray(mosaic)
    ds.FlushCache()
    ds = None


SIMPLIFY_TOLERANCE_M = 30  # ~ the DEM's own pixel resolution — simplifying below
# this just removes zigzag vertices the source data can't actually resolve
# anyway, without visibly changing the contour's shape at any real map zoom.


def trace_and_reproject_contours(geotiff_path, interval_m, out_geojson_path, scratch_dir):
    # GDAL's GeoJSON driver refuses to write over a file that already exists
    # (even empty) — these paths must not be pre-created, unlike NamedTemporaryFile.
    raw_path = f"{scratch_dir}/raw_contours_3857.geojson"
    subprocess.run(
        [
            "gdal_contour",
            "-i",
            str(interval_m),
            "-a",
            "elevMeters",
            geotiff_path,
            raw_path,
            "-f",
            "GeoJSON",
            "-lco",
            "RFC7946=YES",
        ],
        check=True,
    )
    # Simplify while still in EPSG:3857 (meters) — simplifying after
    # reprojecting to lon/lat would mean reasoning about the tolerance in
    # degrees, which isn't a uniform ground distance.
    simplified_path = f"{scratch_dir}/simplified_contours_3857.geojson"
    subprocess.run(
        ["ogr2ogr", "-simplify", str(SIMPLIFY_TOLERANCE_M), simplified_path, raw_path],
        check=True,
    )
    subprocess.run(
        ["ogr2ogr", "-t_srs", "EPSG:4326", out_geojson_path, simplified_path],
        check=True,
    )


def dedupe_consecutive(coords):
    """Removes consecutive duplicate points — a zero-length segment has no
    valid bearing, which is what triggers MapLibre's "Invalid geometry in
    line layer" warning at render time. A byproduct of simplification, not
    a real feature of the contour."""
    deduped = coords[:1]
    for pt in coords[1:]:
        if pt != deduped[-1]:
            deduped.append(pt)
    return deduped


def to_app_shape(raw_geojson_path, out_path):
    with open(raw_geojson_path) as f:
        data = json.load(f)

    features = []
    dropped = 0
    for feat in data["features"]:
        geometry = feat["geometry"]
        if geometry["type"] == "LineString":
            geometry["coordinates"] = dedupe_consecutive(geometry["coordinates"])
            if len(geometry["coordinates"]) < 2:
                dropped += 1
                continue
        elif geometry["type"] == "MultiLineString":
            geometry["coordinates"] = [
                dedupe_consecutive(line) for line in geometry["coordinates"]
            ]
            geometry["coordinates"] = [line for line in geometry["coordinates"] if len(line) >= 2]
            if not geometry["coordinates"]:
                dropped += 1
                continue

        elev_m = feat["properties"].get("elevMeters")
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "elevationFeet": round(elev_m * 3.28084) if elev_m is not None else None,
                },
                "geometry": geometry,
            }
        )

    with open(out_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    print(f"{out_path}: {len(features)} contour lines ({dropped} degenerate lines dropped)")


def main(terrain_pmtiles_path, south, west, north, east, interval_m, out_path):
    mosaic, geotransform = build_mosaic(terrain_pmtiles_path, (south, west, north, east))
    scratch_dir = tempfile.mkdtemp()
    try:
        tif_path = f"{scratch_dir}/elevation.tif"
        reprojected_path = f"{scratch_dir}/contours_4326.geojson"
        write_geotiff(mosaic, geotransform, tif_path)
        trace_and_reproject_contours(tif_path, interval_m, reprojected_path, scratch_dir)
        to_app_shape(reprojected_path, out_path)
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


if __name__ == "__main__":
    _, pmtiles_path, south, west, north, east, interval_m, out_path = sys.argv
    main(pmtiles_path, float(south), float(west), float(north), float(east), float(interval_m), out_path)
