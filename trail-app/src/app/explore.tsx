import { TrailMap } from '@/components/trail-map';
import { ThemedView } from '@/components/themed-view';

export default function ExploreScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <TrailMap />
    </ThemedView>
  );
}
