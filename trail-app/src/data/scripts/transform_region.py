"""Transforms a region's raw osmium trail export + catalog boundary entry
into the app's expected shape. Generalized version of the one-off script
used for the first Guadalupe extraction."""

import json
import math
import sys

EARTH_RADIUS_MILES = 3958.8

HIGHWAY_LABELS = {"path": "Path", "footway": "Footway", "track": "Track"}
SAC_SCALE_LABELS = {
    "hiking": "Easy",
    "mountain_hiking": "Moderate",
    "demanding_mountain_hiking": "Difficult",
    "alpine_hiking": "Very difficult",
    "demanding_alpine_hiking": "Very difficult",
    "difficult_alpine_hiking": "Extreme",
}


def line_length_miles(coords):
    total = 0.0
    for i in range(1, len(coords)):
        lon1, lat1 = coords[i - 1]
        lon2, lat2 = coords[i]
        lat1r, lat2r = math.radians(lat1), math.radians(lat2)
        dlat = lat2r - lat1r
        dlon = math.radians(lon2 - lon1)
        h = math.sin(dlat / 2) ** 2 + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlon / 2) ** 2
        total += 2 * EARTH_RADIUS_MILES * math.asin(min(1, math.sqrt(h)))
    return total


def transform_trails(raw_path, out_path):
    with open(raw_path) as f:
        raw = json.load(f)

    features = []
    for feat in raw["features"]:
        props = feat.get("properties", {})
        highway = props.get("highway")
        sac_scale = props.get("sac_scale")
        coords = feat["geometry"]["coordinates"]
        features.append(
            {
                "type": "Feature",
                "id": props.get("@id"),
                "properties": {
                    "name": props.get("name"),
                    "highway": highway,
                    "highwayLabel": HIGHWAY_LABELS.get(highway, highway or "Unknown"),
                    "surface": props.get("surface"),
                    "difficulty": SAC_SCALE_LABELS.get(sac_scale, sac_scale) if sac_scale else None,
                    "distanceMiles": round(line_length_miles(coords), 1),
                },
                "geometry": feat["geometry"],
            }
        )

    with open(out_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    print(f"{out_path}: {len(features)} trail features")


def extract_boundary(catalog_path, region_name, out_path):
    with open(catalog_path) as f:
        catalog = json.load(f)
    entry = next(e for e in catalog if e["name"] == region_name)
    boundary = {
        "type": "Feature",
        "properties": {"name": entry["name"]},
        "geometry": entry["geometry"],
    }
    with open(out_path, "w") as f:
        json.dump(boundary, f)
    print(f"{out_path}: boundary written ({entry['geometry']['type']})")


if __name__ == "__main__":
    _, raw_trails, catalog_path, region_name, trails_out, boundary_out = sys.argv
    transform_trails(raw_trails, trails_out)
    extract_boundary(catalog_path, region_name, boundary_out)
