import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TrailheadProperties } from '@/hooks/use-trailheads';

// Shown when a tapped map dot is a merged cluster of several trailheads
// (they merge together as the map zooms out — see the `cluster` props on
// the trailheads GeoJSONSource in trail-map.tsx). Lists the real trailheads
// grouped into that dot; tapping one drills into it exactly like tapping
// that trailhead's own marker would — TrailheadPicker takes over from there
// if it has more than one trail.
export function TrailheadClusterPicker({
  trailheads,
  onSelect,
  onClose,
}: {
  trailheads: TrailheadProperties[];
  onSelect: (trailhead: TrailheadProperties) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView type="backgroundElement" style={[styles.panel, { top: insets.top + Spacing.two }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold">{trailheads.length} trailheads here</ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <ThemedText type="smallBold">Close</ThemedText>
        </Pressable>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {trailheads.map((trailhead, index) => (
          <Pressable key={`${trailhead.name}-${index}`} onPress={() => onSelect(trailhead)}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">{trailhead.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {trailhead.trails.length} {trailhead.trails.length === 1 ? 'trail' : 'trails'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: Spacing.three,
    maxHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.one,
  },
  row: {
    borderRadius: 10,
    padding: Spacing.two,
    gap: Spacing.half,
  },
});
