"""Builds a region's trailheads.json — the hybrid approach described in
docs/DATA_ARCHITECTURE.md's "Trailhead-based browsing" section: prefer real
OSM `highway=trailhead` nodes (rare, but well-named when present), fall back
to deriving a trailhead from wherever trail endpoints cluster together
(common — most real trailheads don't have an explicit OSM node, but they're
exactly where multiple trails' start/end points converge, e.g. a shared
parking area).

Two failed-then-fixed attempts are worth remembering here:

1. Naively clustering every trail segment's raw endpoints produced 426
   "trailheads" for a park with 302 trails — almost all spurious, because
   OSM commonly splits one logical named trail into many short way
   segments, and every stitch point between two segments of the *same*
   trail was being counted as if it were a real trailhead.
2. Merging segments that share a `name` tag barely helped (278 logical
   trails from 302 segments) — checked the actual data and found 241 of
   302 segments in Guadalupe alone have *no name at all*, so name-based
   merging left almost everything untouched.

The fix that actually works: merge by trail-network *topology*, not by
name. Build the graph of which segments touch which coordinates, and chain
segments together through simple pass-through points (degree 2 — exactly
two segment-ends meet there) regardless of whether they're named. Only
stop a chain at true junctions/branches/dead-ends (degree 1 or 3+). A
chain's display name is whichever real name (if any) appears among its
segments — chains that end up sharing an OSM name anyway (a genuinely
disconnected trail in the source data) get merged again as a final pass.

Clustering the resulting chain extremities across different logical trails
is a union-find over point pairs within CLUSTER_RADIUS_M — point-to-point
distance, not cluster-centroid distance, so a cluster can't drift
arbitrarily far by accumulating one nearby point at a time.

Derived trailheads with no nearby tagged OSM name are labeled plainly
"Trailhead" rather than guessing a name from whichever trail happens to be
in the cluster — consistent with how this app already handles missing OSM
data (difficulty, elevation gain): show honestly as unavailable, don't
invent it. The real trail names are still fully visible once a user taps in.
"""

import json
import math
import sys
from collections import defaultdict

CLUSTER_RADIUS_M = 60
TAGGED_MATCH_RADIUS_M = 150
EARTH_RADIUS_M = 6371000.0


def haversine_m(lon1, lat1, lon2, lat2):
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    dlat = lat2r - lat1r
    dlon = math.radians(lon2 - lon1)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1, math.sqrt(h)))


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def cluster_points(points):
    """points: list of dicts with 'lon'/'lat'. Returns list of groups (each a
    list of the original dicts) using point-to-point union-find, not
    centroid distance."""
    uf = UnionFind(len(points))
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            if haversine_m(points[i]["lon"], points[i]["lat"], points[j]["lon"], points[j]["lat"]) < CLUSTER_RADIUS_M:
                uf.union(i, j)

    groups = {}
    for i, p in enumerate(points):
        groups.setdefault(uf.find(i), []).append(p)
    return list(groups.values())


def chain_segments_by_topology(trails):
    """Merges way segments into logical trails by network topology: chains
    through degree-2 pass-through points regardless of name, stopping only
    at true junctions/branches/dead-ends (degree 1 or 3+)."""
    seg_endpoints = {}
    point_segments = defaultdict(list)
    for idx, t in enumerate(trails):
        coords = t["geometry"]["coordinates"]
        if len(coords) < 2:
            continue
        start, end = tuple(coords[0]), tuple(coords[-1])
        seg_endpoints[idx] = (start, end)
        point_segments[start].append(idx)
        point_segments[end].append(idx)

    degree = {pt: len(segs) for pt, segs in point_segments.items()}

    visited = set()
    chains = []
    for idx in seg_endpoints:
        if idx in visited:
            continue
        visited.add(idx)
        chain_ids = [idx]

        current_point = seg_endpoints[idx][1]
        while degree.get(current_point) == 2:
            candidates = [s for s in point_segments[current_point] if s not in visited]
            if not candidates:
                break
            next_idx = candidates[0]
            chain_ids.append(next_idx)
            visited.add(next_idx)
            s, e = seg_endpoints[next_idx]
            current_point = e if s == current_point else s

        current_point = seg_endpoints[idx][0]
        while degree.get(current_point) == 2:
            candidates = [s for s in point_segments[current_point] if s not in visited]
            if not candidates:
                break
            prev_idx = candidates[0]
            chain_ids.insert(0, prev_idx)
            visited.add(prev_idx)
            s, e = seg_endpoints[prev_idx]
            current_point = s if e == current_point else e

        chains.append(chain_ids)
    return chains, seg_endpoints


def build_logical_trails(trails):
    chains, seg_endpoints = chain_segments_by_topology(trails)

    logical = []
    for chain_ids in chains:
        segs = [trails[i] for i in chain_ids]
        names = [s["properties"].get("name") for s in segs if s["properties"].get("name")]
        display_name = names[0] if names else "Unnamed Trail"

        endpoint_count = {}
        for idx in chain_ids:
            for pt in seg_endpoints[idx]:
                endpoint_count[pt] = endpoint_count.get(pt, 0) + 1
        extremities = [pt for pt, count in endpoint_count.items() if count == 1]

        distances = [s["properties"].get("distanceMiles") for s in segs if s["properties"].get("distanceMiles")]
        gains = [s["properties"].get("elevationGainFeet") for s in segs if s["properties"].get("elevationGainFeet")]
        difficulty = next((s["properties"].get("difficulty") for s in segs if s["properties"].get("difficulty")), None)
        logical.append(
            {
                "name": display_name,
                "ids": [s.get("id") for s in segs],
                "extremities": extremities,
                "distanceMiles": round(sum(distances), 1) if distances else None,
                "elevationGainFeet": round(sum(gains)) if gains else None,
                "difficulty": difficulty,
                "highway": segs[0]["properties"].get("highway"),
                "highwayLabel": segs[0]["properties"].get("highwayLabel"),
                "surface": next((s["properties"].get("surface") for s in segs if s["properties"].get("surface")), None),
            }
        )

    # A final pass: chains that ended up sharing a real OSM name anyway (a
    # genuinely disconnected trail in the source data) are merged into one
    # display entry, combining ids/extremities and summing distance.
    by_name = defaultdict(list)
    unnamed = []
    for lt in logical:
        if lt["name"] == "Unnamed Trail":
            unnamed.append(lt)
        else:
            by_name[lt["name"]].append(lt)

    merged = list(unnamed)
    for name, group in by_name.items():
        ids = [i for lt in group for i in lt["ids"]]
        extremities = [pt for lt in group for pt in lt["extremities"]]
        distances = [lt["distanceMiles"] for lt in group if lt["distanceMiles"]]
        gains = [lt["elevationGainFeet"] for lt in group if lt["elevationGainFeet"]]
        difficulty = next((lt["difficulty"] for lt in group if lt["difficulty"]), None)
        merged.append(
            {
                "name": name,
                "ids": ids,
                "extremities": extremities,
                "distanceMiles": round(sum(distances), 1) if distances else None,
                "elevationGainFeet": round(sum(gains)) if gains else None,
                "difficulty": difficulty,
                "highway": group[0]["highway"],
                "highwayLabel": group[0]["highwayLabel"],
                "surface": next((lt["surface"] for lt in group if lt["surface"]), None),
            }
        )
    return merged


def main(trails_path, tagged_trailheads_path, out_path):
    with open(trails_path) as f:
        trails = json.load(f)["features"]

    logical_trails = build_logical_trails(trails)

    # Only named logical trails are trailhead candidates. Unnamed segments
    # that connect (via topology) to a named chain already inherited that
    # name in build_logical_trails, so they're still represented here —
    # this only excludes segments that stand genuinely alone with no name,
    # which are overwhelmingly short unofficial/social-trail spurs, not
    # real trailheads. They still render on the map as dotted-line context
    # via the basemap's own path styling, just without a marker of their own.
    named_trails = [lt for lt in logical_trails if lt["name"] != "Unnamed Trail"]

    points = []
    for idx, lt in enumerate(named_trails):
        for lon, lat in lt["extremities"]:
            points.append({"lon": lon, "lat": lat, "trail_idx": idx})

    clusters = cluster_points(points)

    tagged = []
    if tagged_trailheads_path and tagged_trailheads_path != "none":
        with open(tagged_trailheads_path) as f:
            tagged_data = json.load(f)
        for feat in tagged_data["features"]:
            lon, lat = feat["geometry"]["coordinates"]
            tagged.append({"lon": lon, "lat": lat, "name": feat["properties"].get("name")})

    features = []
    named_count = 0
    for cluster in clusters:
        lon = sum(p["lon"] for p in cluster) / len(cluster)
        lat = sum(p["lat"] for p in cluster) / len(cluster)
        trail_indices = sorted({p["trail_idx"] for p in cluster})
        trails_here = [
            {
                "name": named_trails[i]["name"],
                "ids": named_trails[i]["ids"],
                "distanceMiles": named_trails[i]["distanceMiles"],
                "elevationGainFeet": named_trails[i]["elevationGainFeet"],
                "difficulty": named_trails[i]["difficulty"],
                "highway": named_trails[i]["highway"],
                "highwayLabel": named_trails[i]["highwayLabel"],
                "surface": named_trails[i]["surface"],
            }
            for i in trail_indices
        ]

        name = "Trailhead"
        best_dist = TAGGED_MATCH_RADIUS_M
        for t in tagged:
            if t["name"] is None:
                continue
            d = haversine_m(lon, lat, t["lon"], t["lat"])
            if d < best_dist:
                best_dist = d
                name = t["name"]
        if name != "Trailhead":
            named_count += 1

        features.append(
            {
                "type": "Feature",
                "id": len(features),
                "properties": {"name": name, "trails": trails_here},
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
            }
        )

    with open(out_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    print(
        f"{out_path}: {len(features)} trailheads ({named_count} named from OSM, "
        f"{len(features) - named_count} generic) from {len(named_trails)} named logical trails "
        f"({len(logical_trails)} total logical trails, {len(trails)} raw way segments)"
    )


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
