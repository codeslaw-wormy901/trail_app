import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { Asset } from 'expo-asset';
import { noLabels } from 'protomaps-themes-base';
import { useEffect, useState } from 'react';

import { REGION_ASSETS } from '@/data/regions';

const SOURCE_ID = 'bundled-basemap';

/**
 * Builds a MapLibre style for the given bundled region's offline PMTiles
 * basemap — see src/data/README.md for how each .pmtiles file was
 * extracted. No network calls: it ships inside the app and is read
 * directly from local storage via MapLibre's native pmtiles:// support
 * (Android SDK 13.2.0 / iOS SDK 6.26.0, both well past the versions that
 * added it).
 *
 * Uses `noLabels` rather than the full Protomaps theme: full labels need a
 * bundled font-glyph server too, which is real extra scope, deliberately
 * deferred. This still renders terrain, roads, water, and landuse — just
 * without place-name text.
 */
export function useOfflineBasemapStyle(regionSlug: string) {
  const [style, setStyle] = useState<StyleSpecification | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStyle(null);

    async function load() {
      const asset = Asset.fromModule(REGION_ASSETS[regionSlug].basemap);
      await asset.downloadAsync();
      if (cancelled || !asset.localUri) return;

      setStyle({
        version: 8,
        sources: {
          [SOURCE_ID]: {
            type: 'vector',
            url: `pmtiles://${asset.localUri}`,
          },
        },
        layers: noLabels(SOURCE_ID, 'light'),
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [regionSlug]);

  return style;
}
