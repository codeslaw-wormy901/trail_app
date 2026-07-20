# Data Architecture

This document is the source of truth for "what data exists in this app, and where does it live." It exists so that every future feature gets checked against it before it's built, and so [PRIVACY_POLICY.md](PRIVACY_POLICY.md) is always a description of the architecture, not a wishlist. When these two documents disagree, this one wins, and the policy needs to be fixed.

**Rule for using this doc:** before adding any new field, table, API call, or third-party service, add a row here first. If you can't cleanly describe where the data lives and who can see it, don't ship the feature yet.

## Legend

- **Status**: `live` (exists in the current build), `planned` (Phase 3+ per [PROJECT_BRIEF.md](PROJECT_BRIEF.md), not built)
- **Leaves device?**: whether the data (or a derivative of it, like a query containing it) ever crosses the network
- **Default**: on/off out of the box

## Data inventory

| Data | What it is | Where it lives | Leaves device? | Default | Notes / retention |
|---|---|---|---|---|---|
| Trail metadata (name, distance, difficulty, tags) + park boundary | Public OSM data, one-time extracted and bundled with the app (currently: Guadalupe Mountains National Park only) | Bundled JSON in `src/data/`, part of the app install | **No** — zero network requests for this region's trail/boundary data, ever | On (core function, no toggle — it's public map data, not personal data) | Started as a live Overpass fetch; moved to bundled static data once the public Overpass service proved unreliable in practice, not merely as a workaround. See "Overpass: from live fetch to bundled static data" below and `src/data/README.md` for how to regenerate. |
| Vector map tiles | Rendered basemap imagery | Bundled PMTiles archive in `src/data/` (currently: Guadalupe Mountains area only), read directly via MapLibre's native `pmtiles://` support | **No** — zero network requests, same as trail data above | On (can't render a map otherwise) | Started as a live MapTiler fetch (Phase 1 decision, see "The tile host problem" below for that reasoning — kept for context, no longer describes current behavior). Once trail data got bundled and worked well, basemap tiles got the same treatment: a small (~1MB) regional extract pulled once from Protomaps' public PMTiles build via `pmtiles extract` against a bounding box, no full download of the underlying 100+GB planet file needed. Labels/place-names are intentionally left out (`protomaps-themes-base`'s `noLabels` layers) — full text labels need a bundled font-glyph server too, a real chunk of extra scope deliberately deferred. |
| Gov trail data (USGS/NPS/USFS) | Public agency datasets, merged with OSM | Same treatment as OSM data: fetched, cached, public | Yes, same as above | On, once Phase 4 ships | Read-only public data; only new wrinkle is attribution/licensing per agency, not privacy. |
| Favorites (saved trails) | User's personal list | On-device only, SQLite via `expo-sqlite` | No — never transmitted anywhere | On (local save is instant, no toggle needed) | Deleting the app deletes this. No backup unless the OS-level device backup (iCloud/Google) includes app data, which is the user's own device backup, not us. |
| Downloaded offline map/trail areas | Cached tiles + trail data for a chosen region — see "Offline region selection modes" below for the three ways a region gets picked | On-device file storage | The *download* leaves device (same as live tile/Overpass requests above); once downloaded, using that area needs zero network calls | Off until user picks a region | This is a privacy improvement over time: the more someone pre-downloads, the less they ever talk to the tile host during actual hikes (also just useful — most trails have no signal). |
| Route geometry (drawn or GPX-imported, for a corridor download) | A line the user drew on the map, or a GPX file they imported from elsewhere | On-device only | No — the route itself is never transmitted anywhere; it's used locally to compute a buffer polygon and figure out which tiles to fetch | Off until user starts a route-based download | Deliberate design choice: this is what keeps a personalized route download from becoming the single biggest privacy exposure in the app. See "Offline region selection modes" below. |
| Device identifiers, ad IDs, analytics IDs | — | Not collected | N/A | Off, permanently | No analytics SDK, no ad SDK, full stop — this isn't a toggle, it's just not in the codebase. |
| Crash/error reports | — | Not collected via any third-party SDK | N/A | Off | Rely on OS-native tooling only (Xcode Organizer, Play Console pre-launch reports), which are part of the platform, not an added third party. Revisit only if debugging genuinely requires it, and if so: opt-in, and say so here first. |
| Account (username, credential) | Pseudonymous identity for community features | Backend DB (Phase 5) | Yes, by definition (it's an account) | Off — entire account system doesn't exist until opted into | No real name field, ever. See open decisions below for auth mechanism. |
| Reviews / community posts | Public content authored by a user | Backend DB (Phase 5), tied to trail ID + pseudonymous username + timestamp | Yes | Off until user posts something | User-deletable: deleting a review removes it from the primary DB immediately. May persist in rolling backups for a bounded window (proposed: 30 days) before being purged there too. |
| Moderation records (reports, flags) | Data needed to review flagged content | Backend DB (Phase 5), admin-only | Yes | N/A (exists only alongside community features) | Retained only as long as needed to resolve a report, then purged. Reporter identity not exposed publicly. |
| Live GPS location | — | Never stored or transmitted for community features | N/A | Off | A review is tied to the trail's fixed location, not the user's live coordinates. No background location tracking, ever, for any feature in this brief. |

## The tile host problem (resolved for the current region — read this for why it matters elsewhere)

Every map app that isn't fully self-hosted has this issue, and it's worth being honest about instead of glossing over: to render a map tile, *something* has to receive a network request for "give me the imagery for this lat/lon box," and that request necessarily includes the requester's IP address. This is true even for MapLibre (open-source renderer) because the renderer still needs tiles from somewhere.

**Update: this is now fully resolved for Guadalupe Mountains National Park, the one region this app currently supports.** The basemap is a bundled PMTiles archive extracted once from Protomaps' open, public build (via `pmtiles extract` against a bounding box — see `src/data/README.md`) and read locally through MapLibre's native `pmtiles://` support. There is no tile host for this region at all anymore, not even a well-behaved one — zero requests, to anyone, ever, for map imagery. This happened faster than planned: it was originally scoped as a Phase 3+ migration (see the history below), but once trail data got the same bundled treatment for the same reason, extending it to tiles was a natural, quick next step, not a big separate undertaking.

This section's original reasoning is kept below because **it still applies the moment this app supports more than one region** — MapTiler (or a similar live host) will be needed again for any area that isn't worth bundling, and the reasoning for how to choose and limit exposure to that host doesn't go away:

1. **No compounding identifier.** Never attach a persistent client ID, account, or auth token to tile/Overpass requests. Each request is only as identifying as a bare IP address — nothing lets the tile host link today's requests to yesterday's.
2. **Cache aggressively.** Once an area is fetched live, don't re-request it.
3. **Tile host, decided for live fetching: MapTiler.** Compared against Protomaps' hosted API — MapTiler publishes a specific, concrete commitment for the actual tile-serving path (Cloudflare-fronted, IPs held a maximum of 20 minutes then destroyed, no personal data handled by MapTiler itself for tile requests) and has a consumer-friendly free tier (100k requests/month, then maps simply stop loading — no surprise bill). Protomaps' hosted API has a higher free ceiling (1M requests/month) and a strong general privacy philosophy, but no equivalent *published* log-retention specifics for that endpoint could be found. Also confirmed: raw `tile.openstreetmap.org` is not an option at all — its own usage policy explicitly bars production apps and specifically prohibits "download for offline use" style features, which is exactly why an intermediary exists.
4. **Self-hosting/bundling tiles (via Protomaps' open PMTiles builds) is the real long-term fix** — already done for this app's one region (above). The remaining work, whenever it's needed, is deciding per-new-region whether to bundle it the same way or fall back to live MapTiler for areas not worth bundling.

The privacy policy needs to say this plainly rather than imply the app has zero third-party exposure everywhere, forever — it might not, once more regions exist — and pretending otherwise is the kind of gap that erodes trust worse than disclosing it would.

## Overpass: from live fetch to bundled static data (done, not just planned)

Live testing hit real, sustained Overpass unavailability (both public mirrors unreachable — not just rate-limited, the status endpoint itself was unreachable too). Investigation found Overpass's operators have been blocking large Azure/AWS IP ranges over abuse from other tenants on that infrastructure, plus broader recent availability complaints from unrelated apps — this wasn't only about our own traffic. It's a live example of exactly the constraint already noted elsewhere in this doc: depending on the shared public instance indefinitely is fragile.

This was originally written up as an *eventual* direction, not urgent — but it turned out to be straightforward enough to just do immediately for the one region this app currently supports, rather than wait: **no live Overpass query engine, ever, for this app.** Instead, a regional OSM extract (Geofabrik's free Texas extract, cropped with `osmium-tool` down to a small area around Guadalupe Mountains National Park) was pulled once and pre-processed into the exact static JSON shape the app expects — see `src/data/README.md` for the exact reproducible steps. This is genuinely cheaper and simpler than any live-query alternative (no server to run at all for this data), and it's the same funding story already worked out in [FUNDING.md](FUNDING.md) if and when it's needed for other costs — not a separate cost problem.

Two concrete things this surfaced, worth remembering:
- **osmium assembles multipolygon relations correctly on its own** — the hand-written ring-stitching algorithm in `use-park-boundary.ts`'s git history turned out not to be needed for this bundled path. Still worth keeping in mind if live Overpass fetching (which returns raw unassembled way segments, not pre-assembled areas) is ever reintroduced for an unbundled location.
- **This park is tagged `boundary=protected_area` in OSM, not `boundary=national_park`** — the original live query assumed the wrong tag and would have returned nothing even when Overpass was reachable. Worth checking per-park rather than assuming one boundary tag covers every national park, whenever more locations are added.

This is now the model for "search/filter by location" going forward: bundle a region's data statically when it's worth adding as a real supported location, rather than defaulting to a live query for everything. Multi-location support (letting someone choose *between* bundled regions, or add a new one) is still the open next step — see `docs/PROJECT_BRIEF.md`.

## Offline region selection modes

Downloading a region for offline use (Phase 3) needs to support three different ways of picking "what area" — modeled loosely on how OrganicMaps/CoMaps handle this, plus a more personalized option those apps don't offer:

1. **Search a predefined region (city/town/park boundary).** The simplest case: the world is pre-sliced into named regions ahead of time (state, metro, or park-sized chunks), each hosted as a static file. Picking one is just "download this named file" — no per-user computation happens, and the privacy exposure is minimal: a request for a named public file, nothing that reveals a personal pattern.

2. **Draw or zoom to a box.** The user picks an arbitrary rectangular area on the map. This slices a region out of the tile archive on demand (e.g. via `pmtiles extract --bbox=...` against a larger archive). Privacy exposure here is about the same as ordinary map browsing — a bounding box is roughly as revealing as the viewport you're already looking at.

3. **Route + buffer corridor** (e.g. a planned Austin→Anchorage bike route, downloading the route plus a 1-mile buffer either side for detours). A bounding box around a route like that would be enormous — most of the western US and half of Canada — so this has to clip along a *buffered line*, not a rectangle, to stay personalized and small. Critically, **this computation happens entirely on-device**, not on a server:
   - The route geometry comes from the user drawing it or importing a GPX file (from RideWithGPS, Komoot, Strava, etc.) — not from typing two city names and having the app generate the route. Auto-generating a cross-continent route would need an on-device routing engine plus a bundled global road/trail network graph — a real engineering lift, and a good candidate for a later phase, not part of the first version of this feature.
   - Given the route (drawn or imported), the device buffers it by the chosen distance (a cheap, well-understood geometry operation regardless of route length) and computes which tile coordinates intersect that buffer polygon (standard tile-grid math, also cheap).
   - The device then requests only those specific tiles. **The route itself never leaves the device** — only individual tile-by-coordinate requests do, which is the same low-sensitivity request the app already makes for ordinary browsing. This avoids what would otherwise be the single most revealing thing this app could send anywhere: an explicit record of someone's real, chosen trip, including possibly their home address as a start point.
   - One residual thing worth disclosing honestly rather than glossing over (same spirit as "the tile host problem" above): fetching hundreds of tiles in a tight burst, all falling along one coherent path, is a more distinguishable pattern in a tile host's server logs than someone panning around casually. No route is ever sent as data, but the shape can be inferred from request timing and geography. Not a blocker, just something the privacy policy shouldn't pretend away.

## Traceability to core principles

Mapping each non-negotiable from [PROJECT_BRIEF.md](PROJECT_BRIEF.md) to how the architecture actually enforces it:

- *"No account required to browse/save/download"* → confirmed above: every Phase 0–4 row works with zero account system existing.
- *"Local-first storage"* → favorites and offline data rows are on-device only, no sync path exists to build a habit of assuming cloud storage.
- *"Community features opt-out by default"* → account/reviews rows default to Off, and there's no code path that turns them on without the user acting.
- *"No data collection or sale"* → analytics/ad ID row is a hard "not collected," not a toggle — there's nothing to sell because there's nothing collected.
- *"No third-party OAuth by default"* → addressed in open decisions below; default auth path is first-party.

## Resolved decisions

1. **Tile host for Phase 1: MapTiler.** Decided 2026-07-19 — superseded 2026-07-20 by bundling PMTiles directly (see "The tile host problem" above). MapTiler's evaluation stays relevant for whenever live fetching is needed again for an unbundled region.

## Open decisions (need your call before Phase 5)

2. **Auth mechanism for Phase 5.** Proposal: first-party email+password or passwordless email link as the default (no third party involved), with "Sign in with Apple" offered as an *optional* extra (not default) since Apple can relay a hidden email — still opt-in, still not Google/Facebook, consistent with the brief's rejection of third-party OAuth as a *default*. Needs your explicit sign-off since it's a real fork in direction.
3. **Backup retention window for deleted content.** Proposed 30 days for deleted reviews to fully purge from rolling backups. Arbitrary number, open to change.
4. **Any aggregate/opt-in telemetry, ever?** Current answer is a hard no — if a future feature wants "trail popularity," it should derive from public review counts (already-public data) rather than adding view tracking. Flagging so it's a deliberate choice if it ever comes up again, not a default we drift into.
5. **Route-corridor downloads: how regions are pre-sliced, and when (if ever) to build on-device route generation.** Confirmed direction: route geometry comes from drawing or GPX import, buffering/tile-selection happens on-device, nothing about the route is ever transmitted. Still open: how the world gets pre-sliced into named regions for selection mode 1 (political boundaries, like OrganicMaps? population-based? park boundaries?), and whether "type two cities, app generates the route" is ever built — it would need a bundled global routing network and an on-device routing engine, a big enough lift that it shouldn't be assumed as a v1 feature just because the buffer/tile-selection half is easy.
