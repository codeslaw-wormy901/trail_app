import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { Asset } from 'expo-asset';
import { noLabels } from 'protomaps-themes-base';
import { useEffect, useState } from 'react';

const SOURCE_ID = 'guadalupe-basemap';

/**
 * Builds a MapLibre style for the bundled offline PMTiles basemap covering
 * Guadalupe Mountains National Park — see src/data/README.md for how the
 * .pmtiles file was extracted. No network calls: it ships inside the app
 * and is read directly from local storage via MapLibre's native pmtiles://
 * support (Android SDK 13.2.0 / iOS SDK 6.26.0, both well past the versions
 * that added it).
 *
 * Uses `noLabels` rather than the full Protomaps theme: full labels need a
 * bundled font-glyph server too, which is real extra scope, deliberately
 * deferred. This still renders terrain, roads, water, and landuse — just
 * without place-name text.
 */
export function useOfflineBasemapStyle() {
  const [style, setStyle] = useState<StyleSpecification | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = Asset.fromModule(require('@/data/guadalupe-basemap.pmtiles'));
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
  }, []);

  return style;
}
