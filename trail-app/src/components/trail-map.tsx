import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ParkInfoPanel } from '@/components/park-info-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrailDetailSheet } from '@/components/trail-detail-sheet';
import { TrailTypeFilter } from '@/components/trail-type-filter';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useParkBoundary } from '@/hooks/use-park-boundary';
import { useTrailData, type TrailBounds } from '@/hooks/use-trail-data';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PARK_NAME = 'Guadalupe Mountains National Park';

const INITIAL_CENTER: [number, number] = [-104.8608, 31.8956];
const INITIAL_ZOOM = 10;

// Hand-picked rectangle, used only until the real park boundary loads (or if
// it fails to) — see use-park-boundary.ts for why the real polygon is worth
// having instead of this.
const FALLBACK_BOUNDS: TrailBounds = {
  south: 31.82,
  west: -104.95,
  north: 31.95,
  east: -104.75,
};

const ALL_TRAIL_TYPES = ['path', 'footway', 'track'];

// Falls back to MapLibre's public demo style (no key needed) so the map still
// renders before a MapTiler key is configured in .env — see docs/DATA_ARCHITECTURE.md
// for why MapTiler was chosen as the Phase 1 tile host.
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json';

export function TrailMap() {
  const { boundary, bounds: parkBounds } = useParkBoundary(PARK_NAME);
  const { geojson, error } = useTrailData(parkBounds ?? FALLBACK_BOUNDS);
  const [visibleTypes, setVisibleTypes] = useState<string[]>(ALL_TRAIL_TYPES);
  const [selectedTrail, setSelectedTrail] = useState<GeoJSON.Feature | null>(null);
  const [parkSelected, setParkSelected] = useState(false);
  const insets = useSafeAreaInsets();
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();

  function toggleType(type: string) {
    setVisibleTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Map style={styles.map} mapStyle={STYLE_URL}>
        <Camera initialViewState={{ center: INITIAL_CENTER, zoom: INITIAL_ZOOM }} />

        {boundary && (
          <GeoJSONSource
            id="park-boundary"
            data={boundary}
            onPress={() => {
              setParkSelected(true);
              setSelectedTrail(null);
            }}>
            <Layer
              id="park-boundary-fill"
              type="fill"
              paint={{ 'fill-color': '#16a34a', 'fill-opacity': 0.08 }}
            />
            <Layer
              id="park-boundary-line"
              type="line"
              paint={{ 'line-color': '#16a34a', 'line-width': 1.5 }}
            />
          </GeoJSONSource>
        )}

        {geojson && (
          <GeoJSONSource
            id="trails"
            data={geojson}
            onPress={(event) => {
              const feature = event.nativeEvent.features[0];
              if (feature) {
                setSelectedTrail(feature);
                setParkSelected(false);
              }
            }}>
            <Layer
              id="trails-line"
              type="line"
              filter={['in', ['get', 'highway'], ['literal', visibleTypes]]}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#c2410c', 'line-width': 2 }}
            />
            {selectedTrail && (
              <Layer
                id="trails-line-selected"
                type="line"
                filter={['==', ['id'], selectedTrail.id ?? -1]}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': '#fbbf24', 'line-width': 5 }}
              />
            )}
          </GeoJSONSource>
        )}
      </Map>

      <TrailTypeFilter visibleTypes={visibleTypes} onToggle={toggleType} />

      {error && (
        <ThemedView
          type="backgroundElement"
          style={[styles.errorBanner, { top: insets.top + Spacing.six }]}>
          <ThemedText type="small">Trail data didn&apos;t load — showing map only.</ThemedText>
        </ThemedView>
      )}

      {selectedTrail && (
        <TrailDetailSheet
          feature={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          isFavorited={isFavorited(selectedTrail.id as number)}
          onToggleFavorite={() => {
            const id = selectedTrail.id as number;
            if (isFavorited(id)) {
              removeFavorite(id);
            } else {
              addFavorite(selectedTrail);
            }
          }}
        />
      )}
      {parkSelected && !selectedTrail && (
        <ParkInfoPanel name={PARK_NAME} onClose={() => setParkSelected(false)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
