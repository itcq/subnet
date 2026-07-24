# Developer Setup and Build Guide

**Last verified:** 2026-07-21

## Prerequisites

Current verified tool versions:

```text
Node.js  v22.22.3
npm      10.9.8
Expo CLI 57.0.10
Supabase CLI 2.109.1
```

Required tooling:

- Git
- Node.js 22 and npm 10, or a compatible supported Node LTS release
- Docker with a running daemon for the local Supabase stack
- Android Studio/SDK for local Android emulation, or an Android/iOS device with a compatible Expo workflow
- An EAS account only when cloud builds are required

Use the exact Expo SDK 57 documentation when changing Expo configuration: https://docs.expo.dev/versions/v57.0.0/

## Install

```bash
git clone https://github.com/itcq/subnet.git
cd subnet-game
npm ci
cp .env.example .env
```

## Environment configuration

The mobile client accepts only public Supabase configuration:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[LOCAL_PUBLISHABLE_KEY]
```

Obtain local values from `npm run backend:start` or `npx supabase status`.

Never place these values in `EXPO_PUBLIC_*` variables:

- Supabase service-role key
- SMTP credentials
- Email-provider API keys
- EAS/Apple/Google credentials
- Database passwords
- Signing keys

## Run the application

```bash
npm start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

The current playable mission is the default route.

## Quality checks

Run the complete local quality gate:

```bash
npm run check
```

This runs:

1. Jest in serial mode
2. Expo ESLint
3. TypeScript without emitting files
4. Expo Doctor

Current verified result on 2026-07-24:

```text
15 test suites passed
211 tests passed
20/20 Expo Doctor checks passed
Android, iOS, and static web exports passed
```

Export native/web bundles:

```bash
npm run export:native
```

Current verified result on 2026-07-21: Android, iOS, and static web exports completed successfully.

## Local Supabase backend

Start and verify the local stack:

```bash
npm run backend:start
npx supabase status
npm run backend:reset
npm run backend:test
```

Stop it when finished:

```bash
npm run backend:stop
```

### Current environment blocker

The Docker client is installed, but the daemon is not currently reachable:

```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

Database migrations and RLS tests must not be marked verified until the local Supabase stack runs successfully.

## EAS builds

Configured profiles:

- `development`
- `development-simulator`
- `preview` — Android APK/internal distribution
- `production`

Commands:

```bash
npm run build:development
npm run build:preview:android
npm run build:preview:ios
npm run build:production
npm run submit:production
```

### Current EAS status

The project is not authenticated with EAS. No cloud build or signing configuration is confirmed. Final bundle/package identifiers are also pending.

## Test locations

```text
src/domain/__tests__/subnet.test.ts
src/features/challenge/__tests__/challenges.test.ts
src/features/challenge/__tests__/NetworkChallenge.test.tsx
src/auth/__tests__/secureSessionStorage.test.ts
src/lib/__tests__/supabase.test.ts
```

## Development rules

- Use strict test-driven development for behavior changes.
- Keep `src/domain/subnet.ts` independent of React Native and backend SDKs.
- Never trust client-provided badge awards or authoritative progress.
- Preserve offline lesson play during backend/auth outages.
- Keep session material in Expo SecureStore, never AsyncStorage.
- Add RLS and cross-user authorization tests before connecting real accounts.
- Do not introduce real personal data into fixtures or local seeds.
- Run `npm run check` and `git diff --check` before every pull request.

## First backend milestone

The next implementation slice is:

1. Start local Supabase.
2. Write failing pgTAP authorization/constraint tests.
3. Add profiles, roles, missions, challenges, attempts, progress, badges, preferences, consent, and outbox migrations.
4. Add deny-by-default RLS.
5. Prove Student A cannot access Student B.
6. Add invite-only passwordless sign-in UI.
7. Add SQLite attempt outbox and idempotent server synchronization.
