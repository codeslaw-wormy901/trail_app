# Project Brief: [Working Title] — Privacy-First Trail App

## Vision
An open-source, privacy-respecting alternative to AllTrails: a native mobile app for discovering and navigating hiking trails, built on OpenStreetMap data, with optional community features that never compromise user privacy or lock users into an account.

## Core Principles (non-negotiable)
- **No account required** to browse trails, view maps, download offline data, or save favorites locally.
- **Local-first storage**: favorites, downloaded maps, and personal data live on-device by default. No cloud sync unless the user explicitly opts in for a specific reason (e.g., sharing a review).
- **Community features are opt-out by default** — off until the user turns them on.
- **No data collection or sale.** No analytics SDKs, no ad trackers, no third-party OAuth login by default.
- **Funded by donations** and other non-binding funding — no VC pressure to monetize user data later.
- **Fully open source.**

## Author Background
Building this as a first-ever coding project. Comfortable with bash/terminal and command-line workflows, but no prior experience with JavaScript, React, or app development. Expect to learn concepts as they come up — prefer explanations alongside code rather than being handed unexplained code.

## Tech Stack
- **Framework:** React Native + Expo (chosen for beginner-friendly tooling, large ecosystem, cross-platform from one codebase)
- **Map rendering:** MapLibre Native (open-source, no dependency on Google/Apple/Mapbox proprietary services)
- **Map data:** OpenStreetMap (via Overpass API for trail data), rendered via vector tiles
- **Vector tile source (to start):** hosted provider (Protomaps or MapTiler) — self-hosting tile generation (OpenMapTiles/Planetiler) is a possible later migration, not a Phase 0/1 requirement
- **Additional trail data (later phase):** US gov sources — USGS, National Park Service, USFS — merged with OSM data
- **Local storage:** on-device (e.g., expo-sqlite) for favorites and offline map/trail data
- **Platforms:** iOS first priority, Android second — both via the same React Native codebase
- **Dev environment:** macOS (M4 Pro MacBook Pro), Xcode for iOS, Android Studio for Android emulator/testing

## Explicitly Rejected Approaches (don't suggest these)
- Forking CoMaps or another existing native (C++) map app — decided against due to language/learning-curve mismatch and because the community/review layer (the actual novel part of this project) isn't something an existing nav app codebase helps with.
- Proprietary map SDKs (Google Maps SDK, Apple MapKit as primary renderer, Mapbox's current closed offering).
- Third-party OAuth (Google/Facebook login) as a default or required sign-in method.
- Building native Swift/Kotlin as two separate codebases instead of one cross-platform codebase.

## Phased Roadmap
**Phase 0 — Environment & fundamentals**
Get Node.js, Expo CLI, Xcode, and Android Studio set up. Blank Expo app running in iOS simulator and Android emulator.

**Phase 1 — Map proof of concept**
MapLibre Native rendering inside the app, connected to a vector tile source. Pull hiking trail data from OSM via Overpass API and render it on the map.

**Phase 2 — Trail browsing**
Trail detail view (name, distance, elevation gain, difficulty from OSM tags). Search/filter by location and attributes. No accounts, no local storage yet.

**Phase 3 — Local-first & offline**
On-device storage for favorites. Downloadable offline map areas + trail data for no-signal trail use.

**Phase 4 — Government data integration**
Merge USGS/NPS/USFS trail data with OSM data. Note: schema reconciliation across agencies is a data problem, not just an API integration.

**Phase 5 — Accounts, reviews, opt-in community**
Minimal backend: auth, database for reviews, moderation tooling. Privacy-respecting auth (avoid default third-party OAuth). Community features off until explicitly opted into.

**Phase 6 — Launch prep**
Privacy policy matching actual code behavior, app store privacy disclosures, donation/funding page.

## Current Status
_(Update this section as work progresses — note which phase is active, what's done, what's blocked.)_
- Status: Phase 2 functionally complete for a single park; Phase 3 favorites also already built (see below) ahead of the original phase order. Repo is now on GitHub (private) with a first commit — see "Version control" below.
- Phase 0: done. Xcode, Android Studio, Android SDK/emulator (Pixel_9 AVD) and Node were already in place; CocoaPods was missing and has been installed. `expo-doctor` passes all 20 checks.
- Phase 1: complete and verified. `@maplibre/maplibre-react-native` installed and wired up in the "Explore" tab (`src/components/trail-map.tsx`). Originally pointed at MapTiler's live `outdoor-v2` style — **superseded**, see the bundled-basemap entry below. Confirmed rendering correctly on both iOS simulator and Android emulator (Pixel_9) from the same codebase.
- Hiking trail data and the park boundary render as line/fill overlays on the map — confirmed working on both Android and iOS, showing the real Guadalupe Mountains NP trail network (302 ways) and its actual boundary shape. **No longer a live fetch** — see below, this moved to bundled static data after live Overpass proved unreliable in practice.
- Pinch-to-zoom: confirmed to already work correctly — the earlier "only drag works" report was a testing-technique issue (holding the modifier key but not actually clicking-and-dragging in the simulator), not a code bug. No code change needed here.
- Design docs written before writing app code, per the "nail down design and privacy first" approach: [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md), [docs/PRIVACY_POLICY.md](PRIVACY_POLICY.md), [docs/FUNDING.md](FUNDING.md).
- Phase 2 (trail detail view, type filter) rebuilt properly and verified in a follow-up session, with the safe-area bug fixed from the start (`useSafeAreaInsets()` used for the top filter row, `BottomTabInset` for the bottom detail sheet — both already-established conventions elsewhere in the app). Since both public Overpass mirrors were still unreachable (406 / timeout) at verification time, the tap/filter/detail interactions were verified against a small temporary hardcoded GeoJSON sample (since removed) rather than live data — confirmed working end-to-end on Android (filter toggle hides/shows trails correctly, tapping a trail shows the correct name/distance/difficulty/surface, close button works) and confirmed on iOS specifically for the safe-area fix (filter row now sits cleanly below the Dynamic Island, no longer hidden or unclickable). The tap-to-detail interaction itself wasn't re-verified on iOS specifically (only Android) — the underlying code is identical cross-platform and MapLibre rendering was already proven consistent across both in Phase 1, so this is a reasonable-confidence gap, not a known issue.
- Elevation gain remains a known, called-out gap (not in OSM way tags — needs a separate terrain/DEM data source, a real open decision for later).
- Park boundary is real (not the hand-picked rectangle used since Phase 1) — `src/hooks/use-park-boundary.ts` now returns a bundled, pre-assembled MultiPolygon. Multi-park selection is still the natural next step, not yet built (see "Phase 2 close-out call" below).
- **Live Overpass fetching removed, replaced with bundled static data (`src/data/`).** Both public Overpass mirrors were unreachable for the entire session — not just rate-limited, the status endpoint itself didn't respond — traced to Overpass blocking large Azure/AWS IP ranges over abuse from other tenants, plus broader recent complaints from unrelated apps. Rather than keep working around that, pulled a Geofabrik Texas extract, cropped it with `osmium-tool` to the Guadalupe Mountains area, and bundled the result directly into the app — see `src/data/README.md` for the exact reproducible steps and `docs/DATA_ARCHITECTURE.md`'s "Overpass: from live fetch to bundled static data" section for the full reasoning. This is a genuine architecture improvement, not just a fix: this region now needs zero network calls for trail/boundary data, ever. The old retry/fallback/ring-stitching logic still exists in git history if live fetching for unbundled locations is needed later.
- Two things the real data surfaced worth remembering: osmium assembles multipolygon boundary relations correctly on its own (the hand-rolled ring-stitching algorithm wasn't actually needed for this path), and this park is tagged `boundary=protected_area` in OSM, not `boundary=national_park` as the original live query assumed — that query would have returned nothing even if Overpass had been reachable.
- `docs/PRIVACY_POLICY.md` updated to match — it described a live Overpass fetch that no longer happens; now accurately says this region's trail data ships with the app and generates no network request at all.
- **Offline map tiles shipped too — completing this region's offline story.** Same day, natural follow-on: the live MapTiler basemap fetch was replaced with a bundled PMTiles archive (`src/data/guadalupe-basemap.pmtiles`, ~1.1MB), extracted via `pmtiles extract` directly against Protomaps' publicly-hosted daily build over HTTP range requests — no need to download the underlying 100+GB planet file. Rendered via MapLibre's native `pmtiles://` support (confirmed present well past the minimum version on both platforms: Android SDK 13.2.0 vs. needed 11.7.0, iOS SDK 6.26.0 vs. needed 6.10.0) and styled with `protomaps-themes-base`'s `noLabels` layers — deliberately no place-name text or POI icons, since that needs a bundled font-glyph server too, a real chunk of scope cut on purpose. Confirmed rendering correctly (landcover, water, roads, no labels) on both Android and iOS. **This resolves "the tile host problem"** — the single biggest documented privacy tension in `docs/DATA_ARCHITECTURE.md` — entirely, for this region: zero network requests for map tiles, on top of zero for trail/boundary data. That section of the architecture doc is updated to reflect this while keeping the original reasoning intact for whenever a live tile host is needed again for an unbundled area.
- `EXPO_PUBLIC_MAPTILER_KEY` is no longer read by any code path as of this change — MapTiler's evaluation and setup instructions stay in the docs since they're exactly what gets reused when live tile fetching returns for a future unbundled region, but the key itself isn't currently required to run the app.
- Required a new Metro config (`metro.config.js`, registering `.pmtiles` as a bundleable asset extension) and two new JS-only dependencies (`expo-asset`, `protomaps-themes-base`) — no new native modules, so no native rebuild was needed, just a Metro restart.
- **Phase 3 favorites shipped**: on-device saves via `expo-sqlite` (`src/lib/database.ts` for schema, `src/hooks/use-favorites.ts` for CRUD), a save/unsave toggle in the trail detail sheet, and a Favorites screen repurposing the previously-unused "Home" tab (renamed accordingly; tab icon is still the generic home.png placeholder — a heart icon is a cosmetic follow-up). Everything needed to display a favorite (name, distance, difficulty, geometry) is snapshotted at save time, so favorites work offline, consistent with the local-first principle.
- Verification note, worth reading before assuming this is airtight: the full save → list → remove pipeline was confirmed working by calling `addFavorite`/`removeFavorite` directly (bypassing the UI) and confirming correct data in the Favorites list on both platforms. The **actual "Save to Favorites" button**, however, could not be gotten to respond via automated taps on Android (`adb shell input tap`/`swipe`, at exactly-verified accessibility-tree coordinates) despite every other button on the same screen — Close, the filter chips, tab switches, and the Favorites list's own Remove button — responding correctly to the identical method. No error was ever thrown; it's an isolated, unexplained input-delivery gap for that one control, not a crash or logic bug (the underlying `useFavorites` hook is proven correct). Untestable on iOS by any method available this session, since reaching that button requires first tapping a trail line, and clicking MapLibre's raw rendered map surface via the System Events method reliably times out. **This needs one real manual tap check (simulator or real device) before treating the Save button as done** — everything behind it is verified, the button itself isn't.
- **Phase 2 close-out call**: functionally complete as scoped — detail view (minus elevation gain, an accepted documented gap), attribute filtering, and location-based scoping (via real park boundaries) all work. The one piece of the original "search/filter by location" wording not built is choosing *between* locations — right now there's exactly one hardcoded park. Decided to treat that as its own later increment (natural next step once there's a reason to support more than one place) rather than a blocker on calling Phase 2 done.
- **Version control**: git initialized at the project root (`trail_app/`, one level up from `trail-app/`) so docs and app code live in one history together — first commit made, pushed to a private GitHub repo via GitHub Desktop. `.env` (real MapTiler key) and all generated/native folders confirmed excluded before the first commit. The bundled-trail-data switch is committed and pushed (commit `2ba71f9`); the offline-map-tiles work above is not yet committed.
