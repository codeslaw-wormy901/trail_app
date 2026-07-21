import { REGION_ASSETS } from '@/data/regions';

export type TrailheadTrailSummary = {
  name: string;
  ids: number[];
  distanceMiles: number | null;
  elevationGainFeet: number | null;
  difficulty: string | null;
  highway: string | null;
  highwayLabel: string | null;
  surface: string | null;
};

export type TrailheadProperties = {
  name: string;
  trails: TrailheadTrailSummary[];
};

/**
 * Trailhead markers for the given bundled region — the default thing
 * visible on the map instead of every trail line (see "Trailhead-based
 * browsing" in docs/DATA_ARCHITECTURE.md). Each feature's `trails` property
 * lists the logical (name-merged) trails starting there — see
 * src/data/scripts/derive_trailheads.py for how trailheads are identified
 * (hybrid: real OSM `highway=trailhead` nodes where tagged, derived from
 * clustered trail-network endpoints everywhere else) and why raw way
 * segments get merged into logical trails first (OSM fragmentation).
 */
export function useTrailheads(regionSlug: string) {
  return REGION_ASSETS[regionSlug].trailheads;
}
