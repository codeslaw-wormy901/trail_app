import catalogData from '@/data/catalog.json';

export type RegionCatalogEntry = {
  slug: string;
  name: string;
  category: string;
  bounds: { south: number; west: number; north: number; east: number };
  center: [number, number];
  zoom: number;
};

export const REGION_CATALOG = catalogData as RegionCatalogEntry[];

/**
 * Metro needs static, literal `require()` calls to bundle assets — a
 * dynamic `require(`.../${slug}/trails.json`)` will not work. This registry
 * is the one place that has to be extended by hand each time a new region
 * is added. When this app fetches regions from real hosting instead of
 * bundling them (see docs/DATA_ARCHITECTURE.md), this file goes away
 * entirely in favor of a runtime fetch keyed by slug.
 */
export const REGION_ASSETS: Record<
  string,
  { trails: GeoJSON.FeatureCollection; boundary: GeoJSON.Feature; basemap: number }
> = {
  'big-bend': {
    trails: require('@/data/regions/big-bend/trails.json'),
    boundary: require('@/data/regions/big-bend/boundary.json'),
    basemap: require('@/data/regions/big-bend/basemap.pmtiles'),
  },
  'guadalupe-mountains': {
    trails: require('@/data/regions/guadalupe-mountains/trails.json'),
    boundary: require('@/data/regions/guadalupe-mountains/boundary.json'),
    basemap: require('@/data/regions/guadalupe-mountains/basemap.pmtiles'),
  },
  'sam-houston-nf': {
    trails: require('@/data/regions/sam-houston-nf/trails.json'),
    boundary: require('@/data/regions/sam-houston-nf/boundary.json'),
    basemap: require('@/data/regions/sam-houston-nf/basemap.pmtiles'),
  },
};
