import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ParkInfoPanel } from '@/components/park-info-panel';
import { ThemedView } from '@/components/themed-view';
import { TrailDetailSheet } from '@/components/trail-detail-sheet';
import { TrailTypeFilter } from '@/components/trail-type-filter';
import { useFavorites } from '@/hooks/use-favorites';
import { useOfflineBasemapStyle } from '@/hooks/use-offline-basemap-style';
import { useParkBoundary } from '@/hooks/use-park-boundary';
import { useSelectedRegion } from '@/hooks/use-selected-region';
import { useTrailData } from '@/hooks/use-trail-data';

const ALL_TRAIL_TYPES = ['path', 'footway', 'track'];

export function TrailMap() {
  const { region } = useSelectedRegion();
  const mapStyle = useOfflineBasemapStyle(region.slug);
  const { boundary } = useParkBoundary(region.slug);
  const { geojson } = useTrailData(region.slug);
  const [visibleTypes, setVisibleTypes] = useState<string[]>(ALL_TRAIL_TYPES);
  const [selectedTrail, setSelectedTrail] = useState<GeoJSON.Feature | null>(null);
  const [parkSelected, setParkSelected] = useState(false);
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();

  function toggleType(type: string) {
    setVisibleTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  if (!mapStyle) {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
      {/* key={region.slug} forces a full remount on region change, so Camera's
          initialViewState (which only applies on first mount) resets correctly
          and no state from the previous region's selection lingers. */}
      <Map key={region.slug} style={styles.map} mapStyle={mapStyle}>
        <Camera initialViewState={{ center: region.center, zoom: region.zoom }} />

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
      </Map>

      <TrailTypeFilter visibleTypes={visibleTypes} onToggle={toggleType} />

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
        <ParkInfoPanel name={region.name} onClose={() => setParkSelected(false)} />
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
});
