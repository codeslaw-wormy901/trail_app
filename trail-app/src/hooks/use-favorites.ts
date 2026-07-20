import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export type FavoriteTrail = {
  id: number;
  name: string | null;
  highway: string | null;
  highwayLabel: string | null;
  surface: string | null;
  difficulty: string | null;
  distanceMiles: number | null;
  geometry: GeoJSON.Geometry;
  savedAt: number;
};

type FavoriteRow = {
  id: number;
  name: string | null;
  highway: string | null;
  highway_label: string | null;
  surface: string | null;
  difficulty: string | null;
  distance_miles: number | null;
  geometry: string;
  saved_at: number;
};

function rowToFavorite(row: FavoriteRow): FavoriteTrail {
  return {
    id: row.id,
    name: row.name,
    highway: row.highway,
    highwayLabel: row.highway_label,
    surface: row.surface,
    difficulty: row.difficulty,
    distanceMiles: row.distance_miles,
    geometry: JSON.parse(row.geometry),
    savedAt: row.saved_at,
  };
}

type TrailProperties = {
  name?: string | null;
  highway?: string | null;
  highwayLabel?: string | null;
  surface?: string | null;
  difficulty?: string | null;
  distanceMiles?: number | null;
};

/**
 * On-device favorites, stored via expo-sqlite — see src/lib/database.ts for
 * the schema. Everything needed to display a favorite (name, distance,
 * difficulty, geometry) is snapshotted at save time, so favorites work with
 * zero network access, consistent with docs/DATA_ARCHITECTURE.md.
 */
export function useFavorites() {
  const db = useSQLiteContext();
  const [favorites, setFavorites] = useState<FavoriteTrail[]>([]);

  const refresh = useCallback(async () => {
    const rows = await db.getAllAsync<FavoriteRow>(
      'SELECT * FROM favorites ORDER BY saved_at DESC',
    );
    setFavorites(rows.map(rowToFavorite));
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorited = useCallback(
    (id: number) => favorites.some((favorite) => favorite.id === id),
    [favorites],
  );

  const addFavorite = useCallback(
    async (feature: GeoJSON.Feature) => {
      const props = (feature.properties ?? {}) as TrailProperties;
      await db.runAsync(
        `INSERT OR REPLACE INTO favorites
           (id, name, highway, highway_label, surface, difficulty, distance_miles, geometry, saved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          feature.id as number,
          props.name ?? null,
          props.highway ?? null,
          props.highwayLabel ?? null,
          props.surface ?? null,
          props.difficulty ?? null,
          props.distanceMiles ?? null,
          JSON.stringify(feature.geometry),
          Date.now(),
        ],
      );
      await refresh();
    },
    [db, refresh],
  );

  const removeFavorite = useCallback(
    async (id: number) => {
      await db.runAsync('DELETE FROM favorites WHERE id = ?', [id]);
      await refresh();
    },
    [db, refresh],
  );

  return { favorites, isFavorited, addFavorite, removeFavorite };
}
