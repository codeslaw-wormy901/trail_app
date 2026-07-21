import { REGION_ASSETS } from '@/data/regions';

/**
 * Named peaks for the given bundled region — extracted independently from
 * OSM `natural=peak` nodes (see src/data/scripts/transform_peaks.py) rather
 * than relying on the vector basemap's own POI layer, which Protomaps prunes
 * from tiles below zoom 11 to keep general-purpose tiles small. Sorted by
 * elevation descending so taller peaks get render priority when not every
 * peak fits on screen without label collision.
 */
export function usePeaks(regionSlug: string) {
  return REGION_ASSETS[regionSlug].peaks;
}
