import { REGION_ASSETS } from '@/data/regions';

/**
 * The given bundled region's real boundary polygon — see
 * src/data/README.md. Extracted from OSM's `boundary=protected_area` (or
 * `boundary=national_park`) relations, tag conventions verified against
 * real data per region rather than assumed uniform across all of them.
 */
export function useParkBoundary(regionSlug: string) {
  return { boundary: REGION_ASSETS[regionSlug].boundary };
}
