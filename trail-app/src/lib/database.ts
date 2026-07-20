import type { SQLiteDatabase } from 'expo-sqlite';

export const FAVORITES_DB_NAME = 'trail-app.db';

// Runs once when the database is first opened (see SQLiteProvider's onInit
// in _layout.tsx). Local-first by design — favorites live only on-device,
// never transmitted anywhere. See docs/DATA_ARCHITECTURE.md.
export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY NOT NULL,
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
