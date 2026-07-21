"""Transforms an osmium export of natural=peak nodes into the app's expected
shape for a region's independently-bundled peaks.json.

Bundled separately from the vector basemap's own POI layer on purpose:
Protomaps' basemap build prunes minor features (including named peaks) out
of tiles below zoom 11 to keep general-purpose tiles small — a real
tile-generation constraint no style setting can override (confirmed by
decoding the raw tile data directly). Bundling peaks the same way as
trails/boundary/contours makes them visible at whatever zoom this app
chooses, not whatever the basemap's tile-size budget allows.

Sorted by elevation descending so the tallest, most recognizable peaks get
render priority in MapLibre's symbol-collision system (paired with
symbol-z-order: "source" in the app's layer config) — at a zoom where not
every peak fits without label overlap, the taller ones win.
"""

import json
import sys


def main(raw_geojson_path, out_path):
    with open(raw_geojson_path) as f:
        raw = json.load(f)

    features = []
    for feat in raw["features"]:
        props = feat.get("properties", {})
        name = props.get("name")
        if not name:
            continue
        ele_m = props.get("ele")
        elevation_feet = round(float(ele_m) * 3.28084) if ele_m is not None else None
        features.append(
            {
                "type": "Feature",
                "properties": {"name": name, "elevationFeet": elevation_feet},
                "geometry": feat["geometry"],
            }
        )

    features.sort(key=lambda f: f["properties"]["elevationFeet"] or 0, reverse=True)

    with open(out_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    print(f"{out_path}: {len(features)} peaks")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
