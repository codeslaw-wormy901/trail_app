import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

type TrailProperties = {
  name?: string | null;
  highwayLabel?: string;
  surface?: string | null;
  difficulty?: string | null;
  distanceMiles?: number;
  elevationGainFeet?: number | null;
};

// Trail tags (name, distance, difficulty, surface) come straight from OSM —
// shown honestly as "not available" when OSM doesn't have them, rather than
// guessed. Elevation gain is sampled separately, from each region's bundled
// terrain data (see src/data/scripts/add_elevation_gain.py) — also shown as
// "not available" for the small number of trails whose path extends just
// past the extracted terrain bounding box.
export function TrailDetailSheet({
  feature,
  onClose,
  isFavorited,
  onToggleFavorite,
}: {
  feature: GeoJSON.Feature;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const props = (feature.properties ?? {}) as TrailProperties;

  return (
    <ThemedView type="backgroundElement" style={styles.sheet}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          {props.name ?? 'Unnamed trail'}
        </ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <ThemedText type="smallBold">Close</ThemedText>
        </Pressable>
      </View>

      <ThemedText type="small">
        {props.highwayLabel ?? 'Trail'}
        {typeof props.distanceMiles === 'number' ? ` · ${props.distanceMiles} mi` : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Difficulty: {props.difficulty ?? 'not specified in OpenStreetMap'}
      </ThemedText>
      {props.surface && (
        <ThemedText type="small" themeColor="textSecondary">
          Surface: {props.surface}
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Elevation gain:{' '}
        {typeof props.elevationGainFeet === 'number'
          ? `~${props.elevationGainFeet.toLocaleString()} ft`
          : 'not available for this trail'}
      </ThemedText>

      <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.favoriteRow}>
        <ThemedText type="smallBold">
          {isFavorited ? '★ Saved to Favorites' : '☆ Save to Favorites'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    // BottomTabInset keeps this clear of the native tab bar, same convention
    // already used elsewhere in the app (see src/app/index.tsx).
    bottom: BottomTabInset + Spacing.two,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    flexShrink: 1,
  },
  favoriteRow: {
    marginTop: Spacing.two,
  },
});
