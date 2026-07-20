import { REGION_ASSETS } from '@/data/regions';

/**
 * Hiking-relevant ways (path/footway/track) for the given bundled region —
 * see src/data/README.md for how each region's data was generated and
 * src/data/regions.ts for the registry of what's currently bundled.
 *
 * This replaced a live Overpass API fetch: the public Overpass mirrors
 * turned out to be unreliable enough during development that bundling
 * became the right call, not a workaround — it also means zero network
 * calls and zero dependency on a third party for this data, consistent
 * with the local-first principle.
 */
export function useTrailData(regionSlug: string) {
  return { geojson: REGION_ASSETS[regionSlug].trails, error: null };
}
