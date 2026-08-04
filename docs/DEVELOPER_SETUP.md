# Developer Setup and Web Build Guide

**Last revised:** 2026-08-04

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

No environment variables are required for the current local curriculum. Never place service-role, SMTP, database, signing, or other secrets in `EXPO_PUBLIC_*` variables.

## Quality gate

```bash
npm run check
git diff --check
```

The project gate runs Jest serially, Expo ESLint, TypeScript without output, and Expo Doctor.

## Production web export

```bash
npm run export:web
```

The production app uses Expo Router static output and a `/subnet` GitHub Pages base path. Exact-artifact review must preserve:

- `/subnet/_expo/` asset paths
- `.nojekyll`
- `noindex,nofollow,noarchive`
- crawler denial in `robots.txt`
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
- Never label browser-local state as cloud-synced or authoritative.
- Do not connect real accounts or personal data without a separate approved security vertical slice.
- Run the full gate, exact export, independent review, and production parity checks before release.

## Deferred native work

Native SQLite, SecureStore, EAS profiles, and platform commands remain for a possible later phase. They are not part of the current release gate and should not drive product decisions until demand is demonstrated.
