import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useFavorites, type FavoriteTrail } from '@/hooks/use-favorites';

function FavoriteRow({ favorite, onRemove }: { favorite: FavoriteTrail; onRemove: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView style={styles.rowText}>
        <ThemedText type="smallBold">{favorite.name ?? 'Unnamed trail'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {favorite.highwayLabel ?? 'Trail'}
          {typeof favorite.distanceMiles === 'number' ? ` · ${favorite.distanceMiles} mi` : ''}
          {favorite.difficulty ? ` · ${favorite.difficulty}` : ''}
        </ThemedText>
      </ThemedView>
      <Pressable onPress={onRemove} hitSlop={12}>
        <ThemedText type="small">Remove</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function FavoritesScreen() {
  const { favorites, removeFavorite } = useFavorites();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Favorites
        </ThemedText>

        {favorites.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              Trails you save from the map will show up here. Everything stays on this
              device — nothing is synced anywhere.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <FavoriteRow favorite={item} onRemove={() => removeFavorite(item.id)} />
            )}
          />
        )}
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
    marginBottom: Spacing.three,
  },
  emptyState: {
    paddingVertical: Spacing.four,
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
