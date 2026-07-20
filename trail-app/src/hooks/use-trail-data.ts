import { useEffect, useState } from 'react';

// Two public mirrors of the same open Overpass service — if the primary is
// slow or rate-limiting us, we fall back to the other rather than giving up.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Must exceed the Overpass query's own `[timeout:25]` below — otherwise we'd
// abort a request the server was still legitimately still working on.
const REQUEST_TIMEOUT_MS = 30000;
const RETRIES_PER_ENDPOINT = 2;

export type TrailBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function buildQuery({ south, west, north, east }: TrailBounds) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:25];
(
  way["highway"="path"](${bbox});
  way["highway"="footway"](${bbox});
  way["highway"="track"](${bbox});
);
out geom;`;
}

type OverpassWay = {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

const EARTH_RADIUS_MILES = 3958.8;

// Sum of great-circle distances between consecutive points — good enough for
// a trail-length estimate at hiking scale, no need for anything fancier.
function lineLengthMiles(points: { lat: number; lon: number }[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return total;
}

// OSM's sac_scale tag (https://wiki.openstreetmap.org/wiki/Key:sac_scale) is
// the closest thing to a difficulty rating in the raw tag set, but it's a
// European/Alps-oriented convention — most US trails simply don't have it.
// We show what's there and say so plainly when it's missing, rather than
// guessing a difficulty that isn't actually in the data.
const SAC_SCALE_LABELS: Record<string, string> = {
  hiking: 'Easy',
  mountain_hiking: 'Moderate',
  demanding_mountain_hiking: 'Difficult',
  alpine_hiking: 'Very difficult',
  demanding_alpine_hiking: 'Very difficult',
  difficult_alpine_hiking: 'Extreme',
};

const HIGHWAY_LABELS: Record<string, string> = {
  path: 'Path',
  footway: 'Footway',
  track: 'Track',
};

function toGeoJSON(elements: OverpassWay[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: elements
      .filter((element) => element.geometry && element.geometry.length > 1)
      .map((element) => {
        const tags = element.tags ?? {};
        return {
          type: 'Feature',
          id: element.id,
          properties: {
            name: tags.name ?? null,
            highway: tags.highway ?? null,
            highwayLabel: HIGHWAY_LABELS[tags.highway ?? ''] ?? tags.highway ?? 'Unknown',
            surface: tags.surface ?? null,
            difficulty: tags.sac_scale ? (SAC_SCALE_LABELS[tags.sac_scale] ?? tags.sac_scale) : null,
            distanceMiles: Number(lineLengthMiles(element.geometry!).toFixed(1)),
          },
          geometry: {
            type: 'LineString',
            coordinates: element.geometry!.map((point) => [point.lon, point.lat]),
          },
        };
      }),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 (rate limited) and 5xx (server trouble) are worth retrying — a 4xx like
// 400 means the query itself is malformed, and retrying won't fix that.
function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

// Tries one endpoint up to RETRIES_PER_ENDPOINT times, backing off between
// attempts. Throws (without retrying) on non-retryable errors so the caller
// can move on to the next endpoint immediately.
async function fetchFromEndpoint(endpoint: string, query: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRIES_PER_ENDPOINT; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Best-effort courtesy per Overpass's usage etiquette — some RN
          // networking layers may override this, so it's not load-bearing.
          'User-Agent': 'trail-app (Phase 1 proof of concept)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < RETRIES_PER_ENDPOINT - 1) {
          lastError = new Error(`${endpoint} returned ${response.status}`);
          await sleep(2 ** attempt * 1000);
          continue;
        }
        throw new Error(`${endpoint} returned ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt < RETRIES_PER_ENDPOINT - 1) {
        await sleep(2 ** attempt * 1000);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function fetchTrailElements(bounds: TrailBounds): Promise<OverpassWay[]> {
  const query = buildQuery(bounds);
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const json = await fetchFromEndpoint(endpoint, query);
      return json.elements ?? [];
    } catch (err) {
      lastError = err;
      console.warn(`[useTrailData] ${endpoint} failed, trying next endpoint if any:`, err);
    }
  }

  throw lastError ?? new Error('All Overpass endpoints failed');
}

/**
 * Fetches hiking-relevant ways (path/footway/track) from OpenStreetMap via the
 * public Overpass API for a fixed area. No account or user identifier attached
 * to the request — see docs/DATA_ARCHITECTURE.md.
 *
 * Phase 1 proof of concept only: no on-device caching yet (Phase 3), and no
 * route relations for named multi-segment trails (Phase 2).
 */
export function useTrailData(bounds: TrailBounds) {
  const [geojson, setGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrails() {
      try {
        const elements = await fetchTrailElements(bounds);
        if (!cancelled) {
          setGeoJSON(toGeoJSON(elements));
          setError(null);
        }
      } catch (err) {
        // A warning, not console.error: this is a handled, expected-to-sometimes-happen
        // condition (public Overpass endpoints are flaky) — we already retried and
        // fell back, and the UI shows its own banner. Not worth a full-screen dev overlay.
        console.warn('[useTrailData] failed to load trail data:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load trail data');
        }
      }
    }

    fetchTrails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.south, bounds.west, bounds.north, bounds.east]);

  return { geojson, error };
}
