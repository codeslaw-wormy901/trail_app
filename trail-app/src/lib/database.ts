import type { SQLiteDatabase } from 'expo-sqlite';

export const FAVORITES_DB_NAME = 'trail-app.db';

// Runs once when the database is first opened (see SQLiteProvider's onInit
// in _layout.tsx). Local-first by design — favorites live only on-device,
// never transmitted anywhere. See docs/DATA_ARCHITECTURE.md.
export async function migrateDatabase(db: SQLiteDatabase) {
  // `id` is a comma-joined, sorted list of the trail's raw OSM way-segment
  // ids (e.g. "10,11,12") rather than just the first segment's id — a merged
  // trailhead trail's real identity is its full set of segments, not
  // whichever one happened to end up first when the trail was chained
  // together (see docs/DATA_ARCHITECTURE.md's "known minor quirk" note).
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      highway TEXT,
      highway_label TEXT,
      surface TEXT,
      difficulty TEXT,
      distance_miles REAL,
      geometry TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );
  `);
}
