# Funding & Infrastructure Sustainability

This document exists because Phase 5 (accounts, reviews, moderation) is the first point in the roadmap that needs a server and a database — real, ongoing infrastructure cost, in a project whose [PROJECT_BRIEF.md](PROJECT_BRIEF.md) explicitly commits to donation-based, non-binding funding and rejects feature paywalls as a fallback. This doc is where that tension gets worked out deliberately, instead of getting solved under pressure later by quietly adding a paywall.

**Facts below were verified via live search on 2026-07-19.** Grant deadlines, amounts, and program status change; re-verify anything time-sensitive before acting on it, don't trust this doc as current forever.

## The actual failure mode is smaller than it feels

Because the app's core (browsing, maps, offline downloads, favorites — [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md)) has zero server dependency, a funding shortfall for the *community* backend degrades to "pause or shrink that one feature," not "the app stops working." That's a genuinely different risk category than most funded-by-donations projects face, and worth remembering when this feels scary — the worst case was already designed to be survivable before this conversation started.

## Reduce the number before worrying how to cover it

- **Corridor computation stays on-device** (per [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md)) — a cost center most similar apps would be paying a server to run, already avoided.
- **Text-first community features.** Reviews/moderation without photo or video hosting keeps storage and bandwidth costs low. Media hosting is where "cheap hobby project" backends usually turn into real bills — worth treating as a deliberate later decision, not a default.
- **Database reality check:** a small app with intermittent traffic on Neon's serverless Postgres (scale-to-zero, pay only while active) realistically runs around **$5/month**; the same workload on Supabase's flat-rate plan is about $25/month regardless of usage. If the full Supabase-style bundle (auth + storage + realtime in one) isn't needed, Neon-plus-a-few-small-services is meaningfully cheaper. Worth a real decision when Phase 5 architecture gets designed, not assumed now.
- **Rate-limit abuse, not usage.** If cost risk turns out to be concentrated in a small number of heavy/scripted users rather than normal traffic, fix that with technical rate limits (still free for everyone else) rather than reaching for monetization.

## Fiscal sponsorship (do this before or alongside your first grant application)

A fiscal sponsor lets a project like this accept grants and donations under an existing nonprofit's legal/financial umbrella, without forming your own 501(c)(3). Two real options, with a real tradeoff between them:

| | **Open Source Collective** | **Software Freedom Conservancy** |
|---|---|---|
| Entity type | 501(c)(6) nonprofit | 501(c)(3) public charity (verify at application time) |
| Donations tax-deductible? | Not as a charitable deduction (c)(6) status doesn't carry that) | Yes, typically |
| Speed | Can be near-instant via GitHub-verified auto-approval if eligibility is clear; manual review otherwise (days) | Deliberately slow — described as a many-months, high-touch evaluation, explicitly not a rapid process |
| What you get | Transparent public budget on Open Collective natively, fund management, ability to pay contributors | Strong "software freedom" mission alignment, more hands-on legal/org support |
| Fee | 10% of funds raised | ~10% (occasionally negotiated) |
| Best fit if... | You want to start collecting donations transparently now, and tax-deductibility isn't the deciding factor | You want the mission-alignment and are fine waiting months before it's active |

Given this project isn't fundraising yet, **Open Source Collective is the more actionable near-term move** — apply via GitHub verification once the repo is public, and the transparent-ledger point from our earlier conversation comes bundled in for free. Software Freedom Conservancy is worth a parallel inquiry email (`apply@sfconservancy.org`) precisely because it takes months — better to have that clock running in the background than to start it only once the OSC option feels insufficient.

## Grants — which ones are actually a fit

- **NLnet NGI Zero (nlnet.nl)** — **best fit on paper.** Funds exactly this profile: free/open-source, privacy-respecting, human-centered internet projects. Applications are unusually lightweight — 6 questions, 1-2 pages, not a 30-50 page proposal. Grant sizes run €5,000–€50,000 (scalable further with proven traction). **Current status (verified 2026-07-19): the regular open call is temporarily paused**, with only two unrelated specific funds (GNU Taler, Fediversity) accepting proposals through August 1, 2026 — the general call is expected to reopen after summer 2026. Worth watching, not applying to right now.
- **Prototype Fund (prototypefund.de)** — good fit *if eligible by residency* (Germany/EU-oriented program; confirm eligibility before investing time). Funds up to ~€47,500 for an individual over 6 months, and has shifted its 2026 focus specifically toward data security and software infrastructure — thematically close to this project. Next application window: **October 1 – November 30, 2026.**
- **OpenStreetMap US Microgrants** — **not a fit for infrastructure costs.** These are travel/event/education grants (max $200–$500) for community organizing around OSM, not ongoing server funding. Worth knowing about for later community-building, not as an infra-cost answer.
- **Sovereign Tech Fund** — **not a fit.** Minimum grant is €50,000 and it targets foundational/base technologies (libraries, protocols, dev tooling), not end-user applications like this one.

## In-kind infrastructure sponsorship

- **Cloudflare's open-source program ("Project Alexandria")** — actively running, gives recurring annual credits to open-source projects for Cloudflare's CDN/security/dev-platform products. Directly relevant given the tile-hosting/CDN discussion already in [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) — this is one program, not two separate asks, if tile-serving ever moves to a Cloudflare-fronted setup.
- (Checked and ruled out: **Fly.io no longer has any free tier or open-source credit program** as of 2024–2026 — don't plan around it.)

## Non-paywall ways to let people voluntarily support the project

Once accounts exist (Phase 5), it's possible to invite support without gating any functionality:
- A purely cosmetic supporter badge next to a username — carries zero functional benefit, so no one's experience depends on paying for it.
- Merch (stickers, shirts) — classic OSS-nonprofit funding, entirely disconnected from the app itself.

These only work if they stay genuinely non-functional. The moment a "supporter" gets something the app does differently, it's a paywall by another name.

## Longer-term structural option (not a near-term decision)

Because the whole project is open source, the community-features backend doesn't have to remain one centrally-funded server forever. It could eventually be federated — e.g. a hiking club or a parks-focused nonprofit running its own regional instance — spreading infrastructure cost across multiple operators instead of one person covering it all. Worth knowing this door exists; not something to architect for now.

## Open decisions

1. **Fiscal sponsor: Open Source Collective now, Software Freedom Conservancy inquiry in parallel, or neither yet?** Recommendation above is OSC now + SFC inquiry running in the background, but this is your call.
2. **NLnet application timing** — watch for the general call to reopen after summer 2026; worth having a short project write-up ready given how lightweight their application is.
3. **Prototype Fund eligibility** — confirm residency/location requirements before treating this as a real option for the Oct–Nov 2026 window.
4. **Backend hosting choice** (Neon vs. Supabase vs. something else) — ties directly to the Phase 5 architecture decision in [docs/DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md); the ~$5/mo vs. $25/mo gap is worth resolving deliberately rather than defaulting to whichever is easiest to set up first.
