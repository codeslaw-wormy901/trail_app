import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { REGION_CATALOG, type RegionCatalogEntry } from '@/data/regions';
import { useSelectedRegion } from '@/hooks/use-selected-region';

function RegionRow({
  entry,
  selected,
  onPress,
}: {
  entry: RegionCatalogEntry;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
        <ThemedView style={styles.rowText}>
          <ThemedText type="smallBold">{entry.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.category}
          </ThemedText>
        </ThemedView>
        {selected && <ThemedText type="smallBold">Selected</ThemedText>}
      </ThemedView>
    </Pressable>
  );
}

export default function RegionsScreen() {
  const { region, setRegionSlug } = useSelectedRegion();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Regions
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {REGION_CATALOG.length} bundled with the app — all fully offline, no download needed.
          This is a proof of concept, not the real region-download feature yet.
        </ThemedText>

        <FlatList
          data={REGION_CATALOG}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RegionRow
              entry={item}
              selected={item.slug === region.slug}
              onPress={() => setRegionSlug(item.slug)}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  title: {
    marginTop: Spacing.three,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.three,
  },
  rowText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
});
