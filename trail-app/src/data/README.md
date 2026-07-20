# Bundled trail data

`guadalupe-trails.json` and `guadalupe-boundary.json` are a one-time extraction from OpenStreetMap, bundled with the app so this region works with **zero live network calls** — see `docs/DATA_ARCHITECTURE.md` for why (Overpass, the public API this data would otherwise come from live, turned out to be unreliable enough during development that bundling became the right call, not just a workaround).

## How this was generated (reproduce when OSM data goes stale)

Requires [`osmium-tool`](https://osmcode.org/osmium-tool/) (`brew install osmium-tool`) and a regional OSM extract from [Geofabrik](https://download.geofabrik.de/) covering the area — Texas, in this case.

```bash
# 1. Download the regional extract (~700MB for Texas)
curl -L -o texas.osm.pbf https://download.geofabrik.de/north-america/us/texas-latest.osm.pbf

# 2. Crop to a buffered box around the area of interest (fast after this point)
osmium extract -b -105.1,31.7,-104.65,32.05 texas.osm.pbf -o area.osm.pbf --strategy=smart

# 3. Filter for hiking-relevant ways
osmium tags-filter area.osm.pbf w/highway=path,footway,track -o trails.osm.pbf

# 4. Filter for the park boundary — note the actual tag is boundary=protected_area
#    for this park, not boundary=national_park (see open item in use-park-boundary.ts)
osmium tags-filter area.osm.pbf r/boundary -o any-boundary.osm.pbf

# 5. Export both to GeoJSON (osmium assembles multipolygons from relations correctly
#    on its own — no need for manual ring-stitching for this path)
osmium export trails.osm.pbf -o trails-raw.geojson --geometry-types=linestring --attributes=id
osmium export any-boundary.osm.pbf -o any-boundary.geojson
```

Then run a transform step (see git history for the one-off Python script used the first
time) to convert osmium's raw-OSM-tag GeoJSON into the shape `use-trail-data.ts` and
`use-park-boundary.ts` expect — highway type labeled, `sac_scale` mapped to a plain
difficulty label, distance computed from geometry, and the named park feature picked out
of the general boundary export.

## When this needs to change

- **OSM data goes stale**: re-run the steps above periodically (this is the "periodic pull" from `docs/DATA_ARCHITECTURE.md`'s eventual self-hosting plan — currently done manually, not on a schedule).
- **Multi-location support gets built**: this bundled-single-region approach is what "search/filter by location" collapsed into for now (see `docs/PROJECT_BRIEF.md`). When more locations are added, decide then whether that means bundling more regions this same way, or reintroducing live Overpass fetching for arbitrary/unbundled areas (the retry/fallback logic for that already exists in git history if needed again).
