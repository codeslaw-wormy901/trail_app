import { createContext, useContext, useState, type ReactNode } from 'react';

import { REGION_CATALOG, type RegionCatalogEntry } from '@/data/regions';

const DEFAULT_SLUG = 'guadalupe-mountains';

type SelectedRegionContextValue = {
  region: RegionCatalogEntry;
  setRegionSlug: (slug: string) => void;
};

const SelectedRegionContext = createContext<SelectedRegionContextValue | null>(null);

/**
 * Which bundled region is currently active, shared between the region
 * picker and the map screen. In-memory only for now (resets on app
 * restart) — not persisted, since this is still a proof-of-concept picker
 * over a handful of hardcoded regions, not the real Phase 3 feature.
 */
export function SelectedRegionProvider({ children }: { children: ReactNode }) {
  const [slug, setRegionSlug] = useState(DEFAULT_SLUG);
  const region = REGION_CATALOG.find((r) => r.slug === slug) ?? REGION_CATALOG[0];

  return (
    <SelectedRegionContext.Provider value={{ region, setRegionSlug }}>
      {children}
    </SelectedRegionContext.Provider>
  );
}

export function useSelectedRegion() {
  const context = useContext(SelectedRegionContext);
  if (!context) {
    throw new Error('useSelectedRegion must be used within a SelectedRegionProvider');
  }
  return context;
}
