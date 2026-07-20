import { REGION_ASSETS } from '@/data/regions';

/**
 * Elevation contour lines for the given bundled region — generated at
 * data-build time from that region's own terrain.pmtiles (same Mapterhorn
 * DEM data as hillshade and per-trail elevation gain), not read live from
 * the raster tiles at app runtime. See src/data/scripts/generate_contours.py
 * and src/data/README.md for how each region's contours.json was produced.
 */
export function useContours(regionSlug: string) {
  return REGION_ASSETS[regionSlug].contours;
}
