import type {
  LayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { Asset } from 'expo-asset';
import { namedTheme, noLabels, layers as themeLayers } from 'protomaps-themes-base';
import { useEffect, useState } from 'react';

import { REGION_ASSETS } from '@/data/regions';
import { usePoiSpriteUrl } from '@/hooks/use-poi-sprite';

const SOURCE_ID = 'bundled-basemap';

/**
 * Builds the icon-only "pois" symbol layer: takes the full themed layer set
 * (which needs a `lang` even though we discard every text-field from it) and
 * strips everything down to just `icon-image`. Full POI labels need bundled
 * font glyphs too — real extra scope, deliberately deferred — so this
 * renders icons (peaks, water, restrooms, etc.) with no name text under them.
 */
function buildPoiIconLayer(): LayerSpecification | null {
  const theme = namedTheme('light');
  const allLayers = themeLayers(SOURCE_ID, theme, { lang: 'en' });
  const poiLayer = allLayers.find(
    (l): l is SymbolLayerSpecification => l.id === 'pois' && l.type === 'symbol',
  );
  if (!poiLayer) return null;

  const { paint: _paint, layout, ...rest } = poiLayer;
  return {
    ...rest,
    layout: { 'icon-image': layout?.['icon-image'] },
  };
}

/**
 * Builds a MapLibre style for the given bundled region's offline PMTiles
 * basemap — see src/data/README.md for how each .pmtiles file was
 * extracted. No network calls: it ships inside the app and is read
 * directly from local storage via MapLibre's native pmtiles:// support
 * (Android SDK 13.2.0 / iOS SDK 6.26.0, both well past the versions that
 * added it).
 *
 * Uses `noLabels` plus one icon-only POI layer, rather than the full
 * Protomaps theme: full text labels (POI names, place names, road names)
 * need a bundled font-glyph server too, which is real extra scope,
 * deliberately deferred. This still renders terrain, roads, water, landuse,
 * and POI icons — just without any text.
 */
export function useOfflineBasemapStyle(regionSlug: string) {
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const spriteUrl = usePoiSpriteUrl();

  useEffect(() => {
    let cancelled = false;
    setStyle(null);

    if (!spriteUrl) return;

    async function load() {
      const asset = Asset.fromModule(REGION_ASSETS[regionSlug].basemap);
      await asset.downloadAsync();
      if (cancelled || !asset.localUri) return;

      const poiLayer = buildPoiIconLayer();
      const layers = poiLayer ? [...noLabels(SOURCE_ID, 'light'), poiLayer] : noLabels(SOURCE_ID, 'light');

      setStyle({
        version: 8,
        sprite: spriteUrl!,
        sources: {
          [SOURCE_ID]: {
            type: 'vector',
            url: `pmtiles://${asset.localUri}`,
            // Required by OSM's ODbL license and Protomaps' terms — surfaced
            // by MapLibre's native attribution control (the (i) button).
            // Needs real anchor tags: the native parser recognizes and
            // links known attributions individually rather than rendering
            // plain text, and drops anything it doesn't recognize as a link.
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://protomaps.com">Protomaps</a>',
          },
        },
        layers,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [regionSlug, spriteUrl]);

  return style;
}
