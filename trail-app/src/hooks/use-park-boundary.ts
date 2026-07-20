import boundaryData from '@/data/guadalupe-boundary.json';

/**
 * Guadalupe Mountains National Park's real boundary polygon, bundled with
 * the app from a one-time OpenStreetMap extraction — see src/data/README.md.
 *
 * Note for whenever multi-location support or live fetching is reintroduced:
 * this park is tagged `boundary=protected_area` in OSM, not
 * `boundary=national_park` — worth checking per-park rather than assuming
 * one tag covers every national park.
 */
export function useParkBoundary() {
  return { boundary: boundaryData as GeoJSON.Feature };
}
