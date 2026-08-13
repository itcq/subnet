# Developer Setup and Web Build Guide

**Last revised:** 2026-08-12

## Product target

The supported initial release target is Expo web. Mobile browsers are the primary design constraint; tablet and desktop browsers must provide the complete experience. Native Expo infrastructure is retained but deferred.

Use the exact Expo SDK 57 documentation for Expo configuration changes: https://docs.expo.dev/versions/v57.0.0/

## Prerequisites

- Git
- Node.js 22 and npm 10, or a compatible supported Node LTS release

Docker/Supabase, EAS, Android Studio, Xcode, Apple, and Google accounts are not required for the current web application.

## Install and run

```bash
git clone https://github.com/itcq/subnet.git
cd subnet-game
npm ci
npm start
```

`npm start` launches the web target. `npm run web` is the explicit equivalent.

## Optional local account backend

The released v1.0.0 curriculum needs no backend. Testing the development account slice additionally requires Docker and the Supabase CLI.

```bash
cp .env.example .env
npm run backend:start
# Put only the printed local publishable key and loopback URL in .env.
npm run backend:reset
npm run backend:test
```

Account enablement requires all three public values: Supabase URL, Supabase publishable key, and an HTTPS `EXPO_PUBLIC_ACCOUNT_PRIVACY_URL`. Missing or malformed values keep accounts unavailable. Web auth sessions use `sessionStorage`. Anonymous Journey completion uses `subnet-game:journey-progress:v1`; account Journey completion uses a separate user-ID-derived `localStorage` namespace. Automatic synchronization sends only signed-in account rows through the expected-user-bound `sync_account_progress` RPC. Authenticated export and deletion use `export_account_data` and `delete_own_account`; deletion removes the account-specific browser namespace without touching anonymous progress. Never place service-role, SMTP, database, signing, or other secrets in `EXPO_PUBLIC_*` variables.

GitHub Actions runs the real Supabase migration and pgTAP suite on every pushed branch and pull request. Production enablement still requires the same suite against the exact target project plus the operational gates in `docs/PRODUCTION_ACCOUNT_RUNBOOK.md`.

## Quality gate

```bash
npm run check
git diff --check
```

The project gate runs Jest serially, Expo ESLint, TypeScript without output, and Expo Doctor.

## Production web export

```bash
npm run export:web
npm run verify:release
```

The production app uses Expo Router static output and a `/subnet` GitHub Pages base path. Exact-artifact review must preserve:

- `index.html` as the only published HTML route; generated Expo diagnostic pages are removed
- `/subnet/_expo/` asset paths
- `.nojekyll`
- production title, description, canonical URL, and social metadata
- public crawler access in `robots.txt`
- no `/explore` route

## Browser persistence

The web factory uses a singleton `BrowserProgressRepository` with lazy browser-storage resolution. Journey completion is stored under:

```text
subnet-game:journey-progress:v1
```

The payload is versioned and contains only validated `LocalQuestionProgress` fields. Corrupt or unavailable storage must fail closed through the existing accessible load/retry UI; do not silently erase learner progress.

## Responsive artifact QA

Verify the exact production export at:

- 390px mobile
- 768px tablet
- 1440px desktop

Check octet input bounds, touch targets, keyboard behavior, horizontal overflow, scroll reset, feedback announcements, Journey completion, reload persistence, and browser console errors.

## Development rules

- Use strict RED→GREEN→REFACTOR TDD for behavior changes.
- Keep `src/domain/subnet.ts` independent of UI and persistence.
- Keep Guided Practice isolated from competitive and persisted Journey state.
- Never label anonymous browser-local state as cloud-synced or authoritative.
- Keep accounts optional and synchronization account-only, automatic while signed in, and bound to the initiating `auth.uid()` at the database boundary.
- Do not enable real accounts or collect personal data until PostgreSQL/RLS, configured lifecycle, privacy, retention, export/deletion, and physical-device gates pass.
- Run the full gate, exact export, independent review, and production parity checks before release.

## Deferred native work

Native SQLite, SecureStore, EAS profiles, and platform commands remain for a possible later phase. They are not part of the current release gate and should not drive product decisions until demand is demonstrated.
