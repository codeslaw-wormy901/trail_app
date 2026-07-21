import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { difficultyColor, PanelRadius, PanelShadow, Spacing } from '@/constants/theme';
import type { TrailheadTrailSummary } from '@/hooks/use-trailheads';

// Shown when a tapped trailhead has more than one trail starting there —
// tapping a row updates the map highlight immediately (see trail-map.tsx),
// and the list stays open so a user can keep switching between options
// before committing, matching the "at a glance" browsing described in
// docs/DATA_ARCHITECTURE.md's "Trailhead-based browsing" section.
//
// Positioned at the top (insets.top-aware, same reasoning as the old
// TrailTypeFilter it replaces — a fixed offset would sit under the status
// bar / notch / Dynamic Island on devices that have one) rather than the
// bottom, since TrailDetailSheet is also on-screen at the same time
// (selecting a trail from this list shows its detail immediately) and the
// two would otherwise overlap at the same bottom edge.
export function TrailheadPicker({
  trailheadName,
  trails,
  selectedTrailName,
  onSelect,
  onClose,
}: {
  trailheadName: string;
  trails: TrailheadTrailSummary[];
  selectedTrailName: string | null;
  onSelect: (trail: TrailheadTrailSummary) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView type="backgroundElement" style={[styles.panel, { top: insets.top + Spacing.two }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold">{trailheadName}</ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <ThemedText type="smallBold">Close</ThemedText>
        </Pressable>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {trails.map((trail) => {
          const active = trail.name === selectedTrailName;
          return (
            <Pressable key={trail.name} onPress={() => onSelect(trail)}>
              <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
                <ThemedText type="smallBold">{trail.name}</ThemedText>
                <View style={styles.metaRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {trail.highwayLabel ?? 'Trail'}
                    {typeof trail.distanceMiles === 'number' ? ` · ${trail.distanceMiles} mi` : ''}
                  </ThemedText>
                  {trail.difficulty && (
                    <View style={styles.difficultyInline}>
                      <View style={[styles.dot, { backgroundColor: difficultyColor(trail.difficulty) }]} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {trail.difficulty}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: PanelRadius,
    padding: Spacing.three,
    maxHeight: '40%',
    ...PanelShadow,
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  difficultyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  row: {
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.half,
  },
});
