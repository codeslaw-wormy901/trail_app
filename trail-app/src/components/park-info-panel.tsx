import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, PanelRadius, PanelShadow, Spacing } from '@/constants/theme';

// Shown when the park boundary itself is tapped (rather than a trail inside
// it). Right now there's only ever one park loaded, so this is mostly about
// confirming what you're looking at — it earns its keep once there's more
// than one park to choose between.
export function ParkInfoPanel({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.panel}>
      <View style={styles.row}>
        <ThemedText type="smallBold">{name}</ThemedText>
        <Pressable onPress={onClose} hitSlop={12}>
          <ThemedText type="smallBold">Close</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: BottomTabInset + Spacing.two,
    borderRadius: PanelRadius,
    padding: Spacing.three,
    ...PanelShadow,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
