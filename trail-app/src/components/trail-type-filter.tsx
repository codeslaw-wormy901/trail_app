import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const TRAIL_TYPES = [
  { value: 'path', label: 'Path' },
  { value: 'footway', label: 'Footway' },
  { value: 'track', label: 'Track' },
];

// Phase 2 "search/filter by attributes" — filtering by trail type only for
// now. Filtering/searching by location (moving beyond this fixed area) is a
// bigger feature (needs geocoding) and is deferred to a follow-up increment.
export function TrailTypeFilter({
  visibleTypes,
  onToggle,
}: {
  visibleTypes: string[];
  onToggle: (type: string) => void;
}) {
  // Fixed pixel offsets here would sit under the status bar / notch / Dynamic
  // Island on devices that have one — insets.top accounts for that. This bit
  // the previous attempt at this component (see docs/PROJECT_BRIEF.md).
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { top: insets.top + Spacing.two }]}>
      {TRAIL_TYPES.map(({ value, label }) => {
        const active = visibleTypes.includes(value);
        return (
          <Pressable key={value} onPress={() => onToggle(value)}>
            <ThemedView
              type={active ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.chip}>
              <ThemedText type="small">{label}</ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
});
