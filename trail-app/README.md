# Trail App (working title)

An open-source, privacy-respecting alternative to AllTrails: a native mobile app for discovering and navigating hiking trails, built on OpenStreetMap data, with optional community features that never compromise user privacy or lock users into an account.

- **No account required** to browse, download offline maps, or save favorites.
- **Local-first** — your data lives on your device by default.
- **No data collection or sale.** No analytics, no ad trackers.
- **Fully open source, donation-funded.**

See [`docs/PROJECT_BRIEF.md`](../docs/PROJECT_BRIEF.md) for the full vision and roadmap, [`docs/DATA_ARCHITECTURE.md`](../docs/DATA_ARCHITECTURE.md) for exactly what data exists and where it lives, [`docs/PRIVACY_POLICY.md`](../docs/PRIVACY_POLICY.md) for the user-facing privacy commitment, and [`docs/FUNDING.md`](../docs/FUNDING.md) for how this stays donation-funded rather than ad- or data-funded.

## About the development process

This app is built with AI assistance — Claude (Anthropic), via Claude Code — under my own architecture, privacy, and security direction. I'm a systems administrator with years of experience maintaining high-stakes production environments in the semiconductor industry; this is my first time building a mobile app specifically, but not my first time working with production software, security-sensitive systems, or infrastructure that has to actually hold up.

Concretely, what that means: I set every non-negotiable principle in `docs/PROJECT_BRIEF.md` (no account required, local-first storage, no data collection, security-by-design), made the real architecture calls (what gets bundled vs. fetched live, what's encrypted, what a live lookup like Wikipedia is and isn't allowed to know), reviewed and tested every feature on real devices before accepting it, and caught real bugs along the way rather than taking output at face value. Claude wrote the literal code, ran the commands, and did the research, under that direction — every commit says so directly in its own message (`Co-Authored-By: Claude`).

I'm disclosing this plainly because this project's entire premise is user trust, and glossing over how it's actually built would undercut that from the start.

## Development setup

This is an [Expo](https://expo.dev) project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npx expo start
   ```

From there you can open it in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), or [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/). This project uses [file-based routing](https://docs.expo.dev/router/introduction) under `src/app/`.
