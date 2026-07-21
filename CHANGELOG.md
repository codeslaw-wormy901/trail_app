# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions. This
project uses [Semantic Versioning](https://semver.org/) — `0.x.y` while
pre-launch (not yet on any app store, not yet publicly released).

Versioning starts here, at 0.1.0. Everything built before this point is
still described in detail in `docs/PROJECT_BRIEF.md`'s Current Status log —
it isn't restated below.

## [0.1.0] - 2026-07-21

### Added
- Short-trail filter: a round button in the map's top-right corner opens a
  menu with one toggle, "Hide trails under 1 mile," off by default.
- A custom trailhead signpost icon, replacing the bundled sprite's generic
  "attraction" pin.
- Color-coded difficulty (green/yellow/orange/red, matching OSM's
  `sac_scale`) shown as a small dot next to "Difficulty," in both the trail
  detail sheet and trailhead pickers.
- A pill-shaped "stat chip" row (trail type, distance, difficulty, surface,
  elevation gain) in the trail detail sheet, replacing stacked text lines.
- Shadows and a larger corner radius on the map's floating panels (detail
  sheet, trailhead/cluster pickers, filter menu, park info panel), so they
  read as lifted above the map.
- An amber accent color for the active "Saved to Favorites" state.

### Fixed
- Favorites now key on a trail's full, sorted set of OSM way-segment ids
  instead of just the first one, so identity isn't an accident of chain
  ordering.
- Trailhead/cluster picker rows no longer show the generic placeholder
  "Trailhead" for every unnamed trailhead — they fall back to the name of
  the first trail that starts there.
