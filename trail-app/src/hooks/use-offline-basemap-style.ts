import type { LayerSpecification, StyleSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-react-native';
import { Asset } from 'expo-asset';
import { namedTheme, noLabels, layers as themeLayers } from 'protomaps-themes-base';
import { useEffect, useState } from 'react';

import { REGION_ASSETS } from '@/data/regions';
import { usePoiSpriteUrl } from '@/hooks/use-poi-sprite';

const SOURCE_ID = 'bundled-basemap';
const TERRAIN_SOURCE_ID = 'bundled-terrain';
// Bundled by plugins/with-font-glyphs.js at prebuild time (Noto Sans
// Regular, SIL OFL licensed, from Protomaps' open basemaps-assets repo) —
// see that plugin for why this needs a native config plugin rather than
// the expo-asset/require() trick used for pmtiles and the sprite. Only
// "Regular" is bundled: the "pois" layer below is the only labelled layer
// this style uses, and it only ever references Noto Sans Regular, not the
// Italic/Medium variants city/road labels would need.
const GLYPHS_URL = 'asset://fonts/{fontstack}/{range}.pbf';

/**
 * Pulls the "pois" symbol layer (icon + name label) out of the full themed
 * layer set — the rest of that set (place/road/city labels) stays unused,
 * since only POI names are in scope here, not general map text.
 *
 * Overrides the theme's default label placement (name to the *side* of the
 * icon) with a centered label *below* the icon — the familiar Apple/Google
 * Maps look (pin or icon on top, name stacked underneath).
 *
 * Also drops the theme's `zoom >= min_zoom` filter condition. That's a
 * general-purpose-basemap recommendation for avoiding label clutter across
 * every possible zoom level and region size — checked the raw tile data
 * directly (not just our own filter) and confirmed peaks are only *present*
 * in tiles from zoom 11 up regardless of what we do in our style, but our
 * filter was adding an extra gate on top of that (requiring the feature's
 * own suggested min_zoom, 12-14 for named peaks), pushing visibility later
 * than the data actually requires. For a small, hiking-specific POI set
 * (a handful of peaks/water sources per region, not hundreds), showing
 * whatever the current tile already contains is the right call — dropping
 * this still doesn't show anything below zoom 11, since that's a real
 * tile-generation cutoff we don't control, not a style choice.
 */
function buildPoiLayer(): LayerSpecification | null {
  const theme = namedTheme('light');
  const allLayers = themeLayers(SOURCE_ID, theme, { lang: 'en' });
  const poiLayer = allLayers.find(
    (l): l is SymbolLayerSpecification => l.id === 'pois' && l.type === 'symbol',
  );
  if (!poiLayer) return null;

  const { 'text-variable-anchor': _variableAnchor, ...layout } = poiLayer.layout ?? {};
  const kindFilter = (
    Array.isArray(poiLayer.filter) ? poiLayer.filter[1] : poiLayer.filter
  ) as typeof poiLayer.filter;
  return {
    ...poiLayer,
    filter: kindFilter,
    layout: {
      ...layout,
      'text-justify': 'center',
      'text-anchor': 'top',
      'text-offset': [0, 0.6],
    },
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
 * Uses `noLabels` plus one POI layer (icon + name), rather than the full
 * Protomaps theme: general map text (place names, road names) still needs
 * more bundled font-glyph variants than just POI names do, and is
 * deliberately out of scope here — see plugins/with-font-glyphs.js.
 *
 * Hillshade source: a per-region terrain.pmtiles slice extracted from
 * Mapterhorn's public, webp-encoded "terrarium" planet archive (same
 * `pmtiles extract --bbox=...` pattern as the vector basemap, no live
 * server dependency). Confirmed webp raster-dem tiles decode correctly on
 * both platforms despite some outstanding upstream MapLibre Native issues
 * around webp support — tested directly rather than assumed from docs.
 */
export function useOfflineBasemapStyle(regionSlug: string) {
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const spriteUrl = usePoiSpriteUrl();

  useEffect(() => {
    let cancelled = false;
    setStyle(null);

    if (!spriteUrl) return;

    async function load() {
      const regionAssets = REGION_ASSETS[regionSlug];
      const asset = Asset.fromModule(regionAssets.basemap);
      await asset.downloadAsync();
      if (cancelled || !asset.localUri) return;

      let terrainLocalUri: string | null = null;
      if (regionAssets.terrain) {
        const terrainAsset = Asset.fromModule(regionAssets.terrain);
        await terrainAsset.downloadAsync();
        if (cancelled) return;
        terrainLocalUri = terrainAsset.localUri ?? null;
      }

      const poiLayer = buildPoiLayer();
      const baseLayers = poiLayer ? [...noLabels(SOURCE_ID, 'light'), poiLayer] : noLabels(SOURCE_ID, 'light');

      // Hillshade has to go last: the theme's "earth" background layer is an
      // opaque fill, so hillshade needs to draw after it (on top) to be
      // visible at all — putting it first just gets fully painted over.
      // Roads/water/trails still read clearly on top since MapLibre's
      // hillshade paint blends with what's below rather than replacing it.
      const hillshadeLayer: LayerSpecification[] = terrainLocalUri
        ? [
            {
              id: 'hillshade',
              type: 'hillshade',
              source: TERRAIN_SOURCE_ID,
              paint: { 'hillshade-shadow-color': '#5b4636', 'hillshade-exaggeration': 0.6 },
            },
          ]
        : [];

      setStyle({
        version: 8,
        sprite: spriteUrl!,
        glyphs: GLYPHS_URL,
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
          ...(terrainLocalUri
            ? {
                [TERRAIN_SOURCE_ID]: {
                  type: 'raster-dem' as const,
                  url: `pmtiles://${terrainLocalUri}`,
                  encoding: 'terrarium' as const,
                  tileSize: 256,
                  attribution: '© <a href="https://mapterhorn.com/attribution">Mapterhorn</a>',
                },
              }
            : {}),
        },
        layers: [...baseLayers, ...hillshadeLayer],
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [regionSlug, spriteUrl]);

  return style;
}
