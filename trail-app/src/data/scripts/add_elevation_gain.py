"""Adds an elevationGainFeet property to each trail feature in a region's
trails.json, sampled from that region's own bundled terrain.pmtiles — the
same Mapterhorn terrarium DEM data used for hillshade (see
use-offline-basemap-style.ts), so no separate elevation data source or
extra network dependency is introduced.

Requires the `pmtiles` CLI (brew install pmtiles) and Pillow with webp
support (`pip3 install Pillow`, webp is built in on most platforms).
"""

import io
import json
import math
import subprocess
import sys

from PIL import Image

EARTH_RADIUS_METERS = 6371000.0
SAMPLE_INTERVAL_METERS = 30  # roughly the DEM's native ground resolution —
# sampling much finer just re-measures pixel noise, not real elevation change.
ZOOM = 11  # matches terrain.pmtiles's maxzoom (see src/data/README.md)


def haversine_meters(lon1, lat1, lon2, lat2):
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    dlat = lat2r - lat1r
    dlon = math.radians(lon2 - lon1)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * math.asin(min(1, math.sqrt(h)))


def resample_line(coords, interval_m):
    """Walks the line at a fixed distance step, returning (lon, lat) points —
    smooths out DEM pixel-level noise that raw per-vertex sampling would
    otherwise count as fake elevation change."""
    if len(coords) < 2:
        return coords

    points = [tuple(coords[0])]
    accumulated = 0.0  # distance walked since the last emitted sample point
    prev_lon, prev_lat = coords[0]
    for lon, lat in coords[1:]:
        seg_len = haversine_meters(prev_lon, prev_lat, lon, lat)
        if seg_len > 0:
            dist_into_segment = 0.0
            next_sample_at = interval_m - accumulated
            while next_sample_at <= seg_len - dist_into_segment:
                dist_into_segment += next_sample_at
                t = dist_into_segment / seg_len
                points.append((prev_lon + (lon - prev_lon) * t, prev_lat + (lat - prev_lat) * t))
                accumulated = 0.0
                next_sample_at = interval_m
            accumulated += seg_len - dist_into_segment
        prev_lon, prev_lat = lon, lat
    points.append(tuple(coords[-1]))
    return points


class ElevationSampler:
    """Reads elevation from a local terrain.pmtiles, caching decoded tiles
    (many trail points fall in the same tile, and decoding is the slow
    part)."""

    def __init__(self, pmtiles_path):
        self.pmtiles_path = pmtiles_path
        self._tile_cache = {}

    def _tile_image(self, z, x, y):
        key = (z, x, y)
        if key not in self._tile_cache:
            result = subprocess.run(
                ["pmtiles", "tile", self.pmtiles_path, str(z), str(x), str(y)],
                capture_output=True,
            )
            if not result.stdout:
                self._tile_cache[key] = None
            else:
                self._tile_cache[key] = Image.open(io.BytesIO(result.stdout)).convert("RGB")
        return self._tile_cache[key]

    def elevation_at(self, lon, lat):
        n = 2 ** ZOOM
        xf = (lon + 180.0) / 360.0 * n
        lat_rad = math.radians(lat)
        yf = (1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n
        x, y = int(xf), int(yf)

        img = self._tile_image(ZOOM, x, y)
        if img is None:
            return None
        w, h = img.size
        px = min(w - 1, max(0, int((xf - x) * w)))
        py = min(h - 1, max(0, int((yf - y) * h)))
        r, g, b = img.getpixel((px, py))
        return (r * 256 + g + b / 256) - 32768  # terrarium encoding, meters


def elevation_gain_feet(coords, sampler):
    points = resample_line(coords, SAMPLE_INTERVAL_METERS)
    elevations = [sampler.elevation_at(lon, lat) for lon, lat in points]
    elevations = [e for e in elevations if e is not None]
    if len(elevations) < 2:
        return None

    gain_m = sum(max(0.0, elevations[i] - elevations[i - 1]) for i in range(1, len(elevations)))
    gain_ft = gain_m * 3.28084
    return int(round(gain_ft / 10.0) * 10)  # rounded to the nearest 10 ft —
    # matches the real precision of a ~30m-resolution DEM, not false precision.


def main(trails_path, terrain_pmtiles_path, out_path):
    with open(trails_path) as f:
        data = json.load(f)

    sampler = ElevationSampler(terrain_pmtiles_path)
    updated = 0
    for feature in data["features"]:
        coords = feature["geometry"]["coordinates"]
        gain = elevation_gain_feet(coords, sampler)
        feature["properties"]["elevationGainFeet"] = gain
        if gain is not None:
            updated += 1

    with open(out_path, "w") as f:
        json.dump(data, f)

    print(f"{out_path}: elevation gain added for {updated}/{len(data['features'])} trails")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
