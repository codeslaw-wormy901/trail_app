import trailsData from '@/data/guadalupe-trails.json';

/**
 * Hiking-relevant ways (path/footway/track) for Guadalupe Mountains National
 * Park, bundled with the app from a one-time OpenStreetMap extraction — see
 * src/data/README.md for how it was generated and when to regenerate it.
 *
 * This replaced a live Overpass API fetch: the public Overpass mirrors turned
 * out to be unreliable enough during development that bundling the single
 * region this app currently supports was the right call, not a workaround —
 * it also means zero network calls and zero dependency on a third party for
 * this data, consistent with the local-first principle. See "Overpass:
 * eventual self-hosting direction" in docs/DATA_ARCHITECTURE.md.
 *
 * When multi-location support is built, this is the point where either more
 * regions get bundled the same way, or live fetching gets reintroduced for
 * unbundled areas (that logic still exists in git history).
 */
export function useTrailData() {
  return { geojson: trailsData as GeoJSON.FeatureCollection, error: null };
}
