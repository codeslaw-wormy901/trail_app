import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ParkInfoPanel } from '@/components/park-info-panel';
import { ThemedView } from '@/components/themed-view';
import { TrailDetailSheet } from '@/components/trail-detail-sheet';
import { TrailheadPicker } from '@/components/trailhead-picker';
import { useContours } from '@/hooks/use-contours';
import { useFavorites } from '@/hooks/use-favorites';
import { useOfflineBasemapStyle } from '@/hooks/use-offline-basemap-style';
import { useParkBoundary } from '@/hooks/use-park-boundary';
import { usePeaks } from '@/hooks/use-peaks';
import { useSelectedRegion } from '@/hooks/use-selected-region';
import { useTrailData } from '@/hooks/use-trail-data';
import { useTrailheads, type TrailheadProperties, type TrailheadTrailSummary } from '@/hooks/use-trailheads';

// Maps a region's catalog category to a sprite icon name — both already
// exist in the bundled POI sprite (src/assets/sprites/), no new asset
// needed. Falls back to "park" for any category not explicitly mapped.
function iconForCategory(category: string): string {
  if (category.includes('Forest')) return 'forest';
  return 'park';
}

export function TrailMap() {
  const { region } = useSelectedRegion();
  const mapStyle = useOfflineBasemapStyle(region.slug);
  const { boundary } = useParkBoundary(region.slug);
  const { geojson } = useTrailData(region.slug);
  const contours = useContours(region.slug);
  const peaks = usePeaks(region.slug);
  const trailheads = useTrailheads(region.slug);
  const [selectedTrail, setSelectedTrail] = useState<GeoJSON.Feature | null>(null);
  const [selectedTrailIds, setSelectedTrailIds] = useState<number[]>([]);
  const [activeTrailhead, setActiveTrailhead] = useState<TrailheadProperties | null>(null);
  const [parkSelected, setParkSelected] = useState(false);
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();

  // Trailhead taps carry a logical (name-merged) trail that can span several
  // raw OSM way segments — see src/data/scripts/derive_trailheads.py. This
  // looks each segment's real geometry up by id and combines them into one
  // MultiLineString, so the rest of the app (highlight layer, favorites,
  // TrailDetailSheet) can keep treating "a trail" as a single GeoJSON
  // Feature without knowing about the underlying fragmentation.
  const trailsById = useMemo(() => {
    const byId: Record<number, GeoJSON.Feature> = {};
    for (const feature of geojson.features) {
      if (typeof feature.id === 'number') {
        byId[feature.id] = feature;
      }
    }
    return byId;
  }, [geojson]);

  function selectTrail(trail: TrailheadTrailSummary) {
    const coordinates = trail.ids
      .map((id) => trailsById[id])
      .filter((feature): feature is GeoJSON.Feature => !!feature)
      .map((feature) => (feature.geometry as GeoJSON.LineString).coordinates);

    setSelectedTrail({
      type: 'Feature',
      id: trail.ids[0],
      properties: {
        name: trail.name,
        highway: trail.highway,
        highwayLabel: trail.highwayLabel,
        surface: trail.surface,
        difficulty: trail.difficulty,
        distanceMiles: trail.distanceMiles,
        elevationGainFeet: trail.elevationGainFeet,
      },
      geometry: { type: 'MultiLineString', coordinates },
    });
    setSelectedTrailIds(trail.ids);
    setParkSelected(false);
  }

  function closeTrailSelection() {
    setSelectedTrail(null);
    setSelectedTrailIds([]);
    setActiveTrailhead(null);
  }

  function handleTrailheadPress(event: { nativeEvent: { features: GeoJSON.Feature[] } }) {
    const tapped = event.nativeEvent.features[0];
    if (!tapped || !trailheads) return;
    // The native press-event bridge serializes the feature id as a string
    // (Android's GeoJSONUtils uses putString for it, whatever the source
    // JSON had) — coerce back to the numeric ids our bundled data uses. A
    // strict `typeof id === 'number'` guard here silently ate every tap.
    const tappedId = Number(tapped.id);
    if (Number.isNaN(tappedId)) return;
    // Looking properties back up from the already-loaded trailheads
    // FeatureCollection by id, rather than trusting the tap event's own
    // properties, sidesteps any uncertainty about whether a nested
    // array-of-objects property (trails: [...]) survives the native
    // press-event bridge intact.
    const trailhead = trailheads.features.find((f) => f.id === tappedId);
    if (!trailhead) return;
    const props = trailhead.properties as TrailheadProperties;

    selectTrail(props.trails[0]);
    setActiveTrailhead(props.trails.length > 1 ? props : null);
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
            closeTrailSelection();
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

        {contours && (
          <GeoJSONSource id="contours" data={contours}>
            <Layer
              id="contours-line"
              type="line"
              paint={{ 'line-color': '#8b7355', 'line-width': 1, 'line-opacity': 0.5 }}
            />
          </GeoJSONSource>
        )}

        {/* Trails are no longer bold and always-visible by default — see
            "Trailhead-based browsing" in docs/DATA_ARCHITECTURE.md. Only the
            currently-selected (logical) trail gets the bold highlight;
            everything else is still visible as the basemap's own thin/dotted
            path styling (protomaps-themes-base's "roads_other" layer),
            present for context without competing for attention. */}
        <GeoJSONSource id="trails" data={geojson}>
          {selectedTrailIds.length > 0 && (
            <Layer
              id="trails-line-selected"
              type="line"
              filter={['in', ['id'], ['literal', selectedTrailIds]]}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#fbbf24', 'line-width': 5 }}
            />
          )}
        </GeoJSONSource>

        {/* Named peaks, bundled independently of the vector basemap's own
            POI layer (which Protomaps prunes below zoom 11 to keep general-
            purpose tiles small — confirmed by decoding the raw tile data,
            not assumed). Secondary to the region label below: no
            allow-overlap, so MapLibre's own label-collision system declutters
            naturally at low zoom rather than an arbitrary min-zoom cutoff —
            symbol-z-order "source" plus the data's elevation-descending sort
            (see transform_peaks.py) means taller, more recognizable peaks
            win when not everything fits. */}
        {peaks && (
          <GeoJSONSource id="peaks" data={peaks}>
            <Layer
              id="peaks-symbol"
              type="symbol"
              layout={{
                'icon-image': 'peak',
                'icon-size': 0.9,
                'symbol-z-order': 'source',
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 11,
                'text-anchor': 'top',
                'text-offset': [0, 0.6],
                'text-justify': 'center',
              }}
              paint={{
                'text-color': '#57534e',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1.2,
              }}
            />
          </GeoJSONSource>
        )}

        {/* Trailheads: the default way to discover trails now, replacing the
            old always-visible bold trail lines. A plain circle, not a
            symbol/text label — most derived trailheads (see
            derive_trailheads.py) don't have a real name, and repeating the
            generic word "Trailhead" under every marker would read as noise,
            not signal. Tapping one selects (and, if there's more than one
            trail there, opens a picker for) whichever trail starts here. */}
        {trailheads && (
          <GeoJSONSource id="trailheads" data={trailheads} onPress={handleTrailheadPress}>
            <Layer
              id="trailheads-circle"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': '#2563eb',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>
        )}

        {/* The single most prominent thing on the map: a tree icon + the
            park/forest's own name, so a user glancing at the map immediately
            knows what they're looking at and can find it again later — the
            actual ask, not a byproduct of the peaks/POI work below. Built
            directly from already-bundled data (region.center/name), not a
            new extraction — last in the JSX tree so it draws on top of
            trails/contours/boundary, never obscured by them. */}
        <GeoJSONSource
          id="region-label"
          data={{
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: region.name, icon: iconForCategory(region.category) },
                geometry: { type: 'Point', coordinates: region.center },
              },
            ],
          }}>
          <Layer
            id="region-label-symbol"
            type="symbol"
            layout={{
              'icon-image': ['get', 'icon'],
              'icon-size': 1.6,
              'icon-allow-overlap': true,
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 15,
              'text-anchor': 'top',
              'text-offset': [0, 0.8],
              'text-justify': 'center',
              'text-max-width': 8,
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': '#166534',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.6,
            }}
          />
        </GeoJSONSource>
      </Map>

      {activeTrailhead && (
        <TrailheadPicker
          trailheadName={activeTrailhead.name}
          trails={activeTrailhead.trails}
          selectedTrailName={(selectedTrail?.properties as { name?: string } | undefined)?.name ?? null}
          onSelect={selectTrail}
          onClose={closeTrailSelection}
        />
      )}

      {selectedTrail && (
        <TrailDetailSheet
          feature={selectedTrail}
          onClose={closeTrailSelection}
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
