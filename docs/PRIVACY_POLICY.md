# Privacy Policy

**Status: draft, written ahead of the code it describes.** Every claim below is tagged with what phase it applies to. `[Live]` sections describe the app as it will work once Phase 0–2 ship. `[Planned — Phase N]` sections describe features that don't exist yet and are included so the policy is complete, not because they're active. Before each phase ships, its section here gets checked against the actual code — see [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) for the underlying data inventory this policy is drawn from. If the two ever disagree, the architecture doc is correct and this file needs fixing.

This app is open source. You don't have to take this document's word for anything — you can read the code yourself at [repo link].

## The short version

- No account needed to use the core app.
- Your favorites and downloaded maps live only on your device. We never see them.
- We don't run analytics, ad tracking, or crash-reporting SDKs. There is nothing collecting usage data about you.
- We don't sell data, because we don't collect data to sell.
- Rendering a map requires talking to a map tile server — that's the one place your device necessarily contacts a third party, explained honestly below rather than hidden.
- Accounts and community features (reviews, etc.) are opt-in, off by default, and don't require your real name.

## What the app does not do

- No analytics SDK, no ad SDK, no third-party crash-reporting SDK.
- No tracking of what trails you view, search, or favorite, anywhere off your device.
- No third-party OAuth login (Google/Facebook-style "sign in with") required or offered as a default.
- No background location tracking, ever.
- No selling, renting, or sharing of your data with advertisers or data brokers — there's nothing to share.

## What actually leaves your device, and why `[Live]`

Two kinds of network requests happen even though there's no account and no analytics:

**Map tiles.** To draw the map on screen, your device requests map imagery for the area you're viewing from MapTiler, our tile hosting provider. That request includes your IP address and which map area you're looking at — this is true of any map app and isn't something an app can avoid while still showing you a map. What we do to limit it:

- No account, login, or persistent device ID is attached to these requests — a tile host can't link today's request to yesterday's.
- Tiles are cached on your device once fetched, so viewing the same area again doesn't generate a new request.
- Downloading an area for offline use (see below) means you can hike it later with zero network requests at all.
- We chose MapTiler partly because they publish a specific commitment for tile requests themselves: served through Cloudflare, with IP addresses held in memory a maximum of 20 minutes before being destroyed, and MapTiler stating they don't handle visitor IPs directly for map tile serving.
- We expect to eventually self-host tile generation (using OpenStreetMap-derived open data) to remove this third party entirely — planned for the phase where offline region downloads are built, not yet.

**Trail data.** For the one area this app currently supports (Guadalupe Mountains National Park), trail names, distances, tags, and the park boundary are bundled with the app itself — extracted from OpenStreetMap once ahead of time, not fetched live. That means **no network request happens at all** for this data; it works with no signal and reveals nothing to anyone, since there's no request to reveal it in. This wasn't the original plan — it started as a live Overpass API fetch, but the public Overpass service turned out to be unreliable enough during development that bundling this single region became the better answer, not just a workaround. When more areas are added, each will either get the same bundled treatment or, for areas not worth bundling, fall back to a live fetch — if that happens, it'll get the same no-account treatment described for map tiles above, and this section will be updated to say which applies where. Once Phase 4 ships, U.S. government trail sources (USGS, National Park Service, U.S. Forest Service) are folded in the same way — public data, extracted ahead of time where practical.

Map tile requests (above) still happen live, since rendering an interactive map that isn't just the one bundled area requires it. Neither map tile nor any future live trail-data request carries anything about you beyond what any web request inherently carries (your IP address, sent to the server you're asking for data from).

## What stays on your device `[Live once Phase 3 ships]`

- **Favorites** — saved locally in an on-device database. Never transmitted anywhere. Deleting the app deletes this list, unless your phone's own backup system (iCloud/Google) happens to include app data — that backup is between you and your device platform, not us.
- **Offline downloads** — map tiles and trail data you choose to download for a region are stored on-device for offline use. We don't keep any server-side record of what you downloaded, because there's no server involved in Phase 0–3 at all.

## Accounts and community features `[Planned — Phase 5, not yet built]`

These features don't exist yet. This section describes the intended design so it can be reviewed and challenged before it's built, rather than written after the fact to match whatever shipped.

- **Entirely opt-in.** The app works fully — browsing, maps, offline downloads, favorites — without ever creating an account. Community features are off until you choose to turn them on.
- **No real name required.** An account will be a pseudonymous username plus a credential. We do not plan to ever ask for your legal name.
- **Sign-in method.** Default sign-in will be first-party (email/password or a passwordless email link) — not a third-party login. We may offer "Sign in with Apple" as an *optional* extra (Apple can relay a hidden email address on your behalf), but never Google or Facebook login, and never as the default.
- **Reviews and posts** are public content tied to your pseudonymous username, the trail, and a timestamp — not to your live location. You can delete your own content; it's removed from the live database immediately, and purged from rolling backups within 30 days.
- **Moderation.** If content is reported, we retain only what's needed to review the report, and only for as long as needed to resolve it. Who reported something isn't made public.
- **Account deletion** removes your account and everything you've authored, on request, regardless of what any particular law requires as a minimum.
- **No live location is ever collected**, including for community features — a review is anchored to the trail's fixed location, never to where you personally were standing.

## Children's privacy

The app isn't directed at children and doesn't knowingly collect personal information from anyone, child or adult — there's no account system in the base app to collect information through in the first place.

## Changes to this policy

Since this document is meant to track the code, updates happen when the underlying architecture changes (see [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md)), not on a fixed schedule. Material changes will be called out, not silently edited in.

## Contact

[Add contact method once decided — e.g. a project email or GitHub issues link.]

## Funding and independence

This project is funded by donations and other non-binding funding, with no investor pressure to monetize user data. That's a structural reason to trust the "we don't collect data" claims above, not just a policy promise — there's no revenue model here that would benefit from collecting it.
