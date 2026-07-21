import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// A round corner button (map-filter affordance requested by the user) that
// opens a small menu below it. Only one filter exists so far — more
// attribute filters can be added as rows in the same menu later.
export function TrailheadFilter({
  hideShortTrails,
  onChangeHideShortTrails,
}: {
  hideShortTrails: boolean;
  onChangeHideShortTrails: (value: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrapper, { top: insets.top + Spacing.two }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        hitSlop={8}
        accessibilityLabel="Trail filters">
        <ThemedView type="backgroundElement" style={styles.button}>
          <View style={[styles.bar, { width: 16 }]} />
          <View style={[styles.bar, { width: 11 }]} />
          <View style={[styles.bar, { width: 20 }]} />
        </ThemedView>
      </Pressable>

      {open && (
        <ThemedView type="backgroundElement" style={styles.menu}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Hide trails under 1 mile</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Cuts short access/connector paths from the map
              </ThemedText>
            </View>
            <Switch value={hideShortTrails} onValueChange={onChangeHideShortTrails} />
          </View>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: Spacing.three,
    alignItems: 'flex-end',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#57534e',
  },
  menu: {
    marginTop: Spacing.two,
    width: 220,
    borderRadius: 12,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
