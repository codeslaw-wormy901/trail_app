import { useEffect, useState } from 'react';

import type { TrailBounds } from '@/hooks/use-trail-data';

// Same public Overpass mirrors as use-trail-data.ts. Kept separate rather than
// shared to avoid coupling two independent queries' retry/fallback state —
// worth revisiting if we end up with a third thing querying Overpass.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUEST_TIMEOUT_MS = 30000;
const RETRIES_PER_ENDPOINT = 2;

type LonLat = [number, number];

type OverpassMember = {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
};

type OverpassRelation = {
  type: 'relation';
  id: number;
  tags?: Record<string, string>;
  members?: OverpassMember[];
};

function buildQuery(parkName: string) {
  // Park boundaries in OSM are relations, not simple ways, because a
  // boundary is usually stitched together from several way segments (see
  // the ring-assembly comment below) — occasionally with holes for
  // enclaves. `boundary=national_park` is the standard tag for this.
  const escaped = parkName.replace(/"/g, '\\"');
  return `[out:json][timeout:25];
relation["boundary"="national_park"]["name"="${escaped}"];
out geom;`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

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
          'User-Agent': 'trail-app (Phase 2 proof of concept)',
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

async function fetchParkRelation(parkName: string): Promise<OverpassRelation | null> {
  const query = buildQuery(parkName);
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const json = await fetchFromEndpoint(endpoint, query);
      const relation = (json.elements ?? []).find((el: { type: string }) => el.type === 'relation');
      return relation ?? null;
    } catch (err) {
      lastError = err;
      console.warn(`[useParkBoundary] ${endpoint} failed, trying next endpoint if any:`, err);
    }
  }

  throw lastError ?? new Error('All Overpass endpoints failed');
}

const RING_CLOSE_EPSILON = 1e-7;

function pointsEqual(a: LonLat, b: LonLat) {
  return Math.abs(a[0] - b[0]) < RING_CLOSE_EPSILON && Math.abs(a[1] - b[1]) < RING_CLOSE_EPSILON;
}

/**
 * Stitches a set of way segments (each an ordered list of points, in
 * whatever direction OSM happened to store them) into closed rings, by
 * repeatedly matching each segment's endpoints against the ring being built.
 * This is the standard "multipolygon assembly" step OSM boundary relations
 * always need — a boundary is rarely a single way, it's several segments
 * meeting at shared nodes.
 *
 * Simplification: if a relation has more than one outer ring (a park with
 * disjoint parcels), we return each as its own polygon but don't attempt to
 * work out which inner (hole) rings belong to which outer ring — holes all
 * go on the first polygon. Fine for the common case (one contiguous
 * boundary, zero or a couple of holes); worth revisiting if we hit a park
 * shaped otherwise.
 */
function assembleRings(segments: LonLat[][]): LonLat[][] {
  const remaining = [...segments];
  const rings: LonLat[][] = [];

  while (remaining.length > 0) {
    let ring = remaining.shift()!;

    while (!pointsEqual(ring[0], ring[ring.length - 1])) {
      const last = ring[ring.length - 1];
      const matchIndex = remaining.findIndex((segment) => {
        const [start, end] = [segment[0], segment[segment.length - 1]];
        return pointsEqual(start, last) || pointsEqual(end, last);
      });

      if (matchIndex === -1) break; // Incomplete ring — best effort, stop here.

      const [match] = remaining.splice(matchIndex, 1);
      const matchStartsAtLast = pointsEqual(match[0], last);
      ring = ring.concat(matchStartsAtLast ? match.slice(1) : [...match].reverse().slice(1));
    }

    rings.push(ring);
  }

  return rings;
}

function toLonLatSegments(members: OverpassMember[], role: string): LonLat[][] {
  return members
    .filter((member) => member.role === role && member.geometry && member.geometry.length > 1)
    .map((member) => member.geometry!.map((point): LonLat => [point.lon, point.lat]));
}

function relationToPolygonFeature(relation: OverpassRelation): GeoJSON.Feature | null {
  const members = relation.members ?? [];
  const outerRings = assembleRings(toLonLatSegments(members, 'outer'));
  const innerRings = assembleRings(toLonLatSegments(members, 'inner'));

  if (outerRings.length === 0) return null;

  const geometry: GeoJSON.Geometry =
    outerRings.length === 1
      ? { type: 'Polygon', coordinates: [outerRings[0], ...innerRings] }
      : {
          type: 'MultiPolygon',
          coordinates: outerRings.map((ring, i) => (i === 0 ? [ring, ...innerRings] : [ring])),
        };

  return {
    type: 'Feature',
    properties: { name: relation.tags?.name ?? null },
    geometry,
  };
}

function boundsFromFeature(feature: GeoJSON.Feature): TrailBounds {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  const visit = (coords: unknown): void => {
    const arr = coords as unknown[];
    if (typeof arr[0] === 'number') {
      const [lon, lat] = arr as LonLat;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
    } else {
      arr.forEach(visit);
    }
  };
  visit((feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates);

  return { south, west, north, east };
}

/**
 * Fetches a named park's real boundary polygon from OpenStreetMap (rather
 * than a hand-picked rectangle) — see docs/DATA_ARCHITECTURE.md for the
 * Overpass usage notes this follows (no account, no persistent identifier).
 *
 * Phase 2: single named park, live lookup, no caching yet. Multi-park
 * selection and offline bundling of boundaries are later increments.
 */
export function useParkBoundary(parkName: string) {
  const [boundary, setBoundary] = useState<GeoJSON.Feature | null>(null);
  const [bounds, setBounds] = useState<TrailBounds | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBoundary() {
      try {
        const relation = await fetchParkRelation(parkName);
        const feature = relation ? relationToPolygonFeature(relation) : null;
        if (!cancelled) {
          setBoundary(feature);
          setBounds(feature ? boundsFromFeature(feature) : null);
          setError(null);
        }
      } catch (err) {
        console.warn('[useParkBoundary] failed to load park boundary:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load park boundary');
        }
      }
    }

    fetchBoundary();
    return () => {
      cancelled = true;
    };
  }, [parkName]);

  return { boundary, bounds, error };
}
