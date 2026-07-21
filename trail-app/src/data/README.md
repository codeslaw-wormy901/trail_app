# Bundled region data

Each folder under `regions/<slug>/` (`trails.json`, `boundary.json`, `basemap.pmtiles`, `terrain.pmtiles`, `contours.json`, `peaks.json`, `trailheads.json`) is a one-time extraction from OpenStreetMap + Protomaps + Mapterhorn, bundled with the app so that region works with **zero live network calls** — see `docs/DATA_ARCHITECTURE.md` for why (Overpass and MapTiler, the public APIs this data would otherwise come from live, turned out to be unreliable enough during development that bundling became the right call, not just a workaround).

`catalog.json` is the index of bundled regions (name, category, bounding box, map center/zoom) that drives the Regions picker screen (`src/app/regions.tsx`). `regions.ts` maps each catalog entry's slug to its `require()`'d asset files — Metro needs static, literal `require()` paths, so **`REGION_ASSETS` in `regions.ts` must be manually extended by hand any time a new region folder is added**; there's no dynamic loading yet.

**Current state is a proof of concept, not the real region-download feature.** Three regions (Guadalupe Mountains NP, Big Bend NP, Sam Houston NF) are hardcoded and bundled into the app binary. The real Phase 3 feature — user-searchable/downloadable regions from a full ~50-state catalog, hosted externally rather than bundled — is still ahead. See `docs/PROJECT_BRIEF.md` and `docs/DATA_ARCHITECTURE.md`'s "Offline region selection modes" for that target.

## `scripts/`

- **`build_catalog.py`** — takes an osmium GeoJSON export of every `boundary=protected_area`/`boundary=national_park` feature in a state extract, and produces a curated catalog: filters to recognized hiking-relevant designations (National Park, National Forest, State Park, Wilderness Area, etc. — inclusion-based, not a blocklist, since OSM tags plenty of things "protected" that aren't real hiking destinations, like historic missions or urban parks), merges disjoint same-named parcels into one `MultiPolygon` (common for wildlife refuges split across several parcels), and computes each entry's bounding box.
- **`transform_region.py`** — takes one region's raw osmium trail export plus a catalog entry, and produces the app-shaped `trails.json` (highway type labeled, `sac_scale` mapped to a plain difficulty label, distance computed from geometry) and `boundary.json` (the single named boundary feature pulled out of the catalog).
- **`add_elevation_gain.py`** — adds an `elevationGainFeet` property to each trail feature by sampling that region's own bundled `terrain.pmtiles` (same Mapterhorn DEM data as hillshade, no separate elevation source). Resamples each trail's line at a fixed ~30m step (matching the DEM's native resolution) before summing positive elevation deltas — sampling every raw OSM vertex instead would mostly just re-measure DEM pixel noise, not real elevation change. A small number of trails whose path extends past the extracted terrain bbox get `null` (shown as "not available" in the UI) rather than a wrong number.
- **`generate_contours.py`** — generates `contours.json` (elevation contour lines) from that region's own bundled `terrain.pmtiles`. Unlike elevation gain (point samples), contour tracing needs a full 2D elevation grid: mosaics every z11 tile covering the region's bbox into one raster, kept in Web Mercator (EPSG:3857) for the mosaic and contour tracing since XYZ tiles are only pixel-uniform in that projection — building the mosaic directly in lon/lat would silently distort every line — then reprojects to WGS84 only at the end. Requires GDAL (`brew install gdal`, plus Pillow/numpy in the same Python environment — see the venv setup note in the script's own docstring). 60m contour interval, simplified to a 30m tolerance (matching the DEM's own resolution) before reprojecting, which cut output size by roughly 95% with no visible quality loss — worth doing before assuming a "too big" interval is the only lever available. Degenerate zero-length segments (a simplification byproduct, and the direct cause of a real "Invalid geometry in line layer" warning caught by testing on-device) are stripped before writing.
- **`transform_peaks.py`** — converts an osmium export of `natural=peak` nodes into a region's independently-bundled `peaks.json`. Bundled separately from the vector basemap's own POI layer on purpose: checked the raw tile data directly (not assumed) and confirmed Protomaps' basemap build prunes named peaks out of tiles below zoom 11 to keep general-purpose tiles small — a real tile-generation constraint no style setting can override. Sorted by elevation descending so taller peaks get render priority in MapLibre's own label-collision system (paired with `symbol-z-order: "source"` in `trail-map.tsx`) when not every peak fits on screen without overlapping.
- **`derive_trailheads.py`** — builds a region's `trailheads.json`, the markers driving trailhead-based browsing (see `docs/DATA_ARCHITECTURE.md`). Hybrid naming: real OSM `highway=trailhead` nodes name a derived trailhead when one sits within 150m; everything else is plainly "Trailhead" rather than a guessed name. The derivation itself took three attempts worth remembering: naively clustering every way-segment endpoint produced 426 "trailheads" for a park with 302 segments (every stitch point between fragments of the same trail counted as one); merging segments by shared `name` barely helped because 241 of Guadalupe's 302 segments have no name at all; what works is merging by network *topology* — chaining segments through degree-2 pass-through points into logical trails, then keeping only *named* logical trails as trailhead candidates (standalone unnamed segments are overwhelmingly social-trail spurs; they still render via the basemap's dotted paths, just without a marker). Result: 66/266/292 trailheads for Guadalupe/Big Bend/Sam Houston. Each trailhead's `trails` property carries the logical trails starting there (per-trail summed distance/elevation gain, segment id list) so the app can highlight and favorite a whole logical trail at once.
- **`texas-catalog.json`** — the full 50-entry Texas catalog produced by `build_catalog.py` from a full-state extract. Only 3 of these 50 are currently wired into `catalog.json`/`regions.ts` — the rest are here for reference and as the starting point whenever more Texas regions get added. Known data-quality issue to fix before trusting this further: at least one duplicate entry from inconsistent OSM naming ("Caprock Canyons State Park" vs "...and Trailway").

## How a region gets added (reproduce for a new region, or when OSM data goes stale)

Requires [`osmium-tool`](https://osmcode.org/osmium-tool/) (`brew install osmium-tool`) and [`pmtiles`](https://github.com/protomaps/go-pmtiles) (`brew install pmtiles`), plus a regional OSM extract from [Geofabrik](https://download.geofabrik.de/) covering the area — Texas, in these examples.

```bash
# 1. Download the regional extract (~700MB for Texas) — reuse this across all
#    regions in the same state rather than re-downloading per region.
curl -L -o texas.osm.pbf https://download.geofabrik.de/north-america/us/texas-latest.osm.pbf

# 2. Build (or refresh) the statewide catalog of protected areas once per state.
osmium tags-filter texas.osm.pbf wr/boundary=protected_area,national_park -o all-protected-tx.osm.pbf
osmium export all-protected-tx.osm.pbf -o all-protected-tx.geojson
python3 scripts/build_catalog.py all-protected-tx.geojson scripts/texas-catalog.json

# 3. Crop to a buffered box around the specific area of interest (fast after this point)
osmium extract -b <south,west,north,east> texas.osm.pbf -o <slug>-area.osm.pbf --strategy=smart

# 4. Filter for hiking-relevant ways and export (osmium assembles multipolygons from
#    relations correctly on its own — no manual ring-stitching needed)
osmium tags-filter <slug>-area.osm.pbf w/highway=path,footway,track -o <slug>-trails.osm.pbf
osmium export <slug>-trails.osm.pbf -o <slug>-trails-raw.geojson --geometry-types=linestring --attributes=id

# 5. Transform into the app's expected shape
python3 scripts/transform_region.py <slug>-trails-raw.geojson scripts/texas-catalog.json \
  "<Exact Name From Catalog>" regions/<slug>/trails.json regions/<slug>/boundary.json

# 6. Extract a matching basemap slice from Protomaps' public daily build
#    (HTTP range requests — no full planet-file download needed)
pmtiles extract https://build.protomaps.com/$(date +%Y%m%d).pmtiles regions/<slug>/basemap.pmtiles \
  --bbox=<west,south,east,north> --minzoom=0 --maxzoom=14

# 7. Extract a matching terrain (hillshade) slice from Mapterhorn's public
#    planet archive — same HTTP-range-request pattern, webp-encoded
#    "terrarium" raster-dem tiles. Capped at z11 (source goes to z12): the
#    vector basemap's extra zoom levels are worth the detail for roads/trails,
#    but terrain-tile size roughly quadruples per zoom level for not much
#    visible shading improvement once already this close.
pmtiles extract https://download.mapterhorn.com/planet.pmtiles regions/<slug>/terrain.pmtiles \
  --bbox=<west,south,east,north> --minzoom=9 --maxzoom=11

# 8. Add elevation gain per trail, sampled from the terrain slice just extracted
#    (requires Pillow: pip3 install Pillow)
python3 scripts/add_elevation_gain.py regions/<slug>/trails.json regions/<slug>/terrain.pmtiles \
  regions/<slug>/trails.json

# 9. Generate contour lines from the same terrain slice (requires GDAL — see
#    generate_contours.py's docstring for the venv setup)
python3 scripts/generate_contours.py regions/<slug>/terrain.pmtiles \
  <south> <west> <north> <east> 60 regions/<slug>/contours.json

# 10. Extract named peaks independently of the basemap's own POI layer
#     (which drops them below zoom 11 — see transform_peaks.py)
osmium tags-filter <slug>-area.osm.pbf n/natural=peak -o <slug>-peaks.osm.pbf
osmium export <slug>-peaks.osm.pbf -o <slug>-peaks.geojson
python3 scripts/transform_peaks.py <slug>-peaks.geojson regions/<slug>/peaks.json

# 11. Derive trailheads (run AFTER step 8 so per-trail elevation gain is
#     already in trails.json — the trailhead entries aggregate it)
osmium tags-filter <slug>-area.osm.pbf n/highway=trailhead -o <slug>-trailheads-tagged.osm.pbf
osmium export <slug>-trailheads-tagged.osm.pbf -o <slug>-trailheads-tagged.geojson
python3 scripts/derive_trailheads.py regions/<slug>/trails.json \
  <slug>-trailheads-tagged.geojson regions/<slug>/trailheads.json
```

Then, by hand:

1. Add an entry to `catalog.json` (slug, name, category, bounds, center, zoom).
2. Add a matching entry to `REGION_ASSETS` in `regions.ts` with static `require()`s for the seven new files.

## When this needs to change

- **OSM data goes stale**: re-run the steps above periodically (this is the "periodic pull" from `docs/DATA_ARCHITECTURE.md`'s eventual self-hosting plan — currently done manually, not on a schedule).
- **The real region-download feature gets built**: this bundled-into-the-app-binary approach doesn't scale past a handful of regions (see the size math in `docs/DATA_ARCHITECTURE.md`) — at that point, `REGION_ASSETS`'s static `require()` registry gets replaced with a runtime fetch from real hosting (Cloudflare R2 is the current plan), and `catalog.json` grows from 3 curated entries toward the full national catalog these scripts can already produce per-state.
