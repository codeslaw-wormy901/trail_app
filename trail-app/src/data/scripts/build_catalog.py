"""
Builds a curated catalog of hiking-relevant public lands from an osmium
protected-area export (see docs/data-catalog/README.md once this is copied
into the app repo). Deliberately inclusion-based, not exclusion-based: only
known, recognized designations make the cut, rather than trying to blocklist
the long tail of historic missions/courthouses/tribal lands/urban parks that
also show up tagged as "protected" in OSM but aren't primarily hiking
destinations.
"""

import json
import sys

# Maps a protection_title value straight through to our catalog category.
TITLE_TO_CATEGORY = {
    "National Park": "National Park",
    "National Monument": "National Monument",
    "National Preserve": "National Preserve",
    "National Recreation Area": "National Recreation Area",
    "National Forest": "National Forest",
    "National Grassland": "National Forest",  # grasslands are USFS-managed like forests
    "State Park": "State Park",
    "Wilderness Area": "Wilderness Area",
    "Wilderness Study Area": "Wilderness Area",
    "Wildlife Management Area": "Wildlife Refuge",
    "National Wildlife Refuge": "Wildlife Refuge",
    "Wildlife Sanctuary": "Wildlife Refuge",
}

# For boundary=national_park entries with no protection_title at all —
# categorize from the name itself, since that tag alone means "an NPS unit"
# but not which kind.
NAME_SUFFIX_TO_CATEGORY = [
    ("National Historical Park", "National Historical Park"),
    ("National Historic Site", "National Historic Site"),
    ("National Recreation Area", "National Recreation Area"),
    ("National Monument", "National Monument"),
    ("National Preserve", "National Preserve"),
    ("National Park", "National Park"),
]

# Operator strings that indicate "this is a real Texas Parks & Wildlife
# unit" even when protection_title wasn't filled in — still requires the
# name to look like a park (see below), not a blanket include.
STATE_PARK_OPERATORS = {"Texas Parks and Wildlife Department", "Texas Parks and Wildlife"}


def categorize(props):
    title = props.get("protection_title")
    if title in TITLE_TO_CATEGORY:
        return TITLE_TO_CATEGORY[title]

    boundary = props.get("boundary")
    name = props.get("name") or ""

    if boundary == "national_park":
        for suffix, category in NAME_SUFFIX_TO_CATEGORY:
            if suffix in name:
                return category
        return "National Park Service Unit"

    if props.get("operator") in STATE_PARK_OPERATORS and "State Park" in name:
        return "State Park"

    return None  # not a recognized hiking-relevant category — excluded


def merge_geometries(geometries):
    """Combines however many polygon/multipolygon parts (disjoint parcels
    of the same named area, common for wildlife refuges) into one
    MultiPolygon."""
    polygons = []
    for geom in geometries:
        if geom["type"] == "Polygon":
            polygons.append(geom["coordinates"])
        elif geom["type"] == "MultiPolygon":
            polygons.extend(geom["coordinates"])
    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


def bbox_of(geometry):
    south = west = float("inf")
    north = east = float("-inf")

    def visit(coords):
        nonlocal south, west, north, east
        if isinstance(coords[0], (int, float)):
            lon, lat = coords
            south, north = min(south, lat), max(north, lat)
            west, east = min(west, lon), max(east, lon)
        else:
            for c in coords:
                visit(c)

    visit(geometry["coordinates"])
    return {"south": south, "west": west, "north": north, "east": east}


def main(input_path, output_path):
    with open(input_path) as f:
        data = json.load(f)

    by_name = {}
    for feature in data["features"]:
        if feature["geometry"]["type"] not in ("Polygon", "MultiPolygon"):
            continue
        props = feature.get("properties", {})
        name = props.get("name")
        if not name:
            continue
        category = categorize(props)
        if category is None:
            continue
        entry = by_name.setdefault(
            name, {"name": name, "category": category, "geometries": []}
        )
        entry["geometries"].append(feature["geometry"])

    catalog = []
    for entry in by_name.values():
        geometry = merge_geometries(entry["geometries"])
        catalog.append(
            {
                "name": entry["name"],
                "category": entry["category"],
                "bounds": bbox_of(geometry),
                "geometry": geometry,
            }
        )

    catalog.sort(key=lambda e: (e["category"], e["name"]))

    with open(output_path, "w") as f:
        json.dump(catalog, f)

    by_category = {}
    for entry in catalog:
        by_category.setdefault(entry["category"], []).append(entry["name"])

    print(f"Catalog entries: {len(catalog)}")
    for category, names in sorted(by_category.items()):
        print(f"\n{category} ({len(names)}):")
        for name in names:
            print(f"  - {name}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
