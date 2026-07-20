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
- Status: Phase 1 in progress (map proof of concept).
- Phase 0: done. Xcode, Android Studio, Android SDK/emulator (Pixel_9 AVD) and Node were already in place; CocoaPods was missing and has been installed. `expo-doctor` passes all 20 checks.
- Phase 1: complete and verified. `@maplibre/maplibre-react-native` installed and wired up in the "Explore" tab (`src/components/trail-map.tsx`), pointed at MapTiler's `outdoor-v2` style (falls back to MapLibre's public demo style if no key is configured). Confirmed rendering correctly on both iOS simulator and Android emulator (Pixel_9) from the same codebase.
- Hiking trail data (`src/hooks/use-trail-data.ts`) pulled live from OpenStreetMap's public Overpass API and rendered as line overlays — confirmed working on both Android and iOS, showing the real Guadalupe Mountains NP trail network (Guadalupe Peak Trail, El Capitan Trail, etc.). Built with retry + two-mirror fallback since the public Overpass endpoint is flaky, and a visible fallback banner (instead of silent failure) if trail data can't load. Client-side request timeout (30s) is deliberately set longer than the Overpass query's own server-side `[timeout:25]` — a shorter client timeout was found to cancel legitimately-slow-but-successful responses (iOS hit this during testing). No on-device caching yet — that's Phase 3.
- Pinch-to-zoom: confirmed to already work correctly — the earlier "only drag works" report was a testing-technique issue (holding the modifier key but not actually clicking-and-dragging in the simulator), not a code bug. No code change needed here.
- Design docs written before writing app code, per the "nail down design and privacy first" approach: [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md), [docs/PRIVACY_POLICY.md](PRIVACY_POLICY.md), [docs/FUNDING.md](FUNDING.md).
- Phase 2 (trail detail view, type filter) rebuilt properly and verified in a follow-up session, with the safe-area bug fixed from the start (`useSafeAreaInsets()` used for the top filter row, `BottomTabInset` for the bottom detail sheet — both already-established conventions elsewhere in the app). Since both public Overpass mirrors were still unreachable (406 / timeout) at verification time, the tap/filter/detail interactions were verified against a small temporary hardcoded GeoJSON sample (since removed) rather than live data — confirmed working end-to-end on Android (filter toggle hides/shows trails correctly, tapping a trail shows the correct name/distance/difficulty/surface, close button works) and confirmed on iOS specifically for the safe-area fix (filter row now sits cleanly below the Dynamic Island, no longer hidden or unclickable). The tap-to-detail interaction itself wasn't re-verified on iOS specifically (only Android) — the underlying code is identical cross-platform and MapLibre rendering was already proven consistent across both in Phase 1, so this is a reasonable-confidence gap, not a known issue.
- Live Overpass connectivity is still down as of this session (both `overpass-api.de` and the `kumi.systems` mirror, now returning 429 rather than 406 — status changed but still unusable) — worth a real check next session before assuming it's still broken.
- Elevation gain remains a known, called-out gap (not in OSM way tags — needs a separate terrain/DEM data source, a real open decision for later).
- Park-boundary search added (`src/hooks/use-park-boundary.ts`): fetches a named park's real boundary polygon from OSM (`boundary=national_park` relations) instead of the hand-picked rectangle used since Phase 1, including the "ring assembly" step OSM boundary relations always need (stitching several way segments — in arbitrary order/direction — into closed rings; handles multi-parcel parks and degrades gracefully on incomplete data). This is what "search/filter by location" turned into for a single named park; multi-park selection is a natural next step, not yet built. The assembled polygon now drives the trail query's bounding box (more accurate than the old rectangle) and renders as a tappable outline on the map — tapping it shows the park name, tapping a trail still shows trail details, the two don't conflict since trails render on top of the boundary fill.
- Verification note: since Overpass was unreachable all session, the boundary rendering/tap interaction was confirmed via a temporary mock polygon (removed after); the ring-assembly algorithm itself (the riskiest new logic — never exercised by that mock) was separately verified with standalone tests covering reversed-direction segments, shuffled segment order, multi-parcel (disjoint ring) parks, and incomplete/broken boundary data. Not yet verified: the real Overpass query for an actual park relation, since that couldn't be tested live this session.
- Worth noting for later, not urgent now: `useParkBoundary` and `useTrailData` each independently retry against the same two Overpass endpoints, so a single screen load now makes up to ~8 requests total when both are struggling, not 4 — fine at this scale, worth revisiting if Overpass fair-use ever becomes a real constraint.
- Explicit decision: the OSM-sourced park-boundary feature stays in place as a deliberate interim version, not a throwaway. When Phase 4 (government data integration) happens, only the fetch/parse layer (Overpass query + ring-stitching) gets swapped for official NPS/BLM/NFS boundary data — the tappable UI/interaction pattern is already source-agnostic and doesn't need rework.
- **Phase 3 favorites shipped**: on-device saves via `expo-sqlite` (`src/lib/database.ts` for schema, `src/hooks/use-favorites.ts` for CRUD), a save/unsave toggle in the trail detail sheet, and a Favorites screen repurposing the previously-unused "Home" tab (renamed accordingly; tab icon is still the generic home.png placeholder — a heart icon is a cosmetic follow-up). Everything needed to display a favorite (name, distance, difficulty, geometry) is snapshotted at save time, so favorites work offline, consistent with the local-first principle.
- Verification note, worth reading before assuming this is airtight: the full save → list → remove pipeline was confirmed working by calling `addFavorite`/`removeFavorite` directly (bypassing the UI) and confirming correct data in the Favorites list on both platforms. The **actual "Save to Favorites" button**, however, could not be gotten to respond via automated taps on Android (`adb shell input tap`/`swipe`, at exactly-verified accessibility-tree coordinates) despite every other button on the same screen — Close, the filter chips, tab switches, and the Favorites list's own Remove button — responding correctly to the identical method. No error was ever thrown; it's an isolated, unexplained input-delivery gap for that one control, not a crash or logic bug (the underlying `useFavorites` hook is proven correct). Untestable on iOS by any method available this session, since reaching that button requires first tapping a trail line, and clicking MapLibre's raw rendered map surface via the System Events method reliably times out. **This needs one real manual tap check (simulator or real device) before treating the Save button as done** — everything behind it is verified, the button itself isn't.
