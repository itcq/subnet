# Subnet Game

A mobile-first IPv4 subnetting mastery game.

This is an independent standalone project with no external brand, LMS, or student-directory affiliation.

## Current prototype

The first playable mission teaches students to find network addresses across five IPv4/CIDR challenges.

Included:

- Five guided challenges spanning `/20`, `/26`, `/27`, `/28`, and `/30`
- Clear next-challenge progression and mission restart
- Structured four-octet mobile input
- Immediate correct/incorrect feedback
- Dynamic block-size and subnet-boundary explanations
- Pure TypeScript IPv4 subnet engine
- Unit and component tests
- Expo support for Android, iOS, and web

The MVP is intentionally local-first. It does not require an account or backend.

## Run it

```bash
npm install
npm start
```

Scan the QR code with Expo Go for early device testing, or run:

```bash
npm run web
```

## Quality checks

```bash
npm run check
npm run export:native
```

## Local backend foundation

The standalone account/progress backend is developed locally with Supabase. It is configured for invite-only email authentication; no production project or student data is required.

Prerequisite: a running Docker daemon.

```bash
cp .env.example .env
npm run backend:start
npm run backend:reset
npm run backend:test
```

`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe for the mobile client only when Row Level Security is enabled and tested. Never place service-role, SMTP, or email-provider secrets in an `EXPO_PUBLIC_*` variable.

## Mobile builds

EAS authentication and project-owned app identifiers are required before creating installable binaries.

```bash
npm run build:preview:android
npm run build:preview:ios
npm run build:production
```

## Documentation

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`docs/DEVELOPER_SETUP.md`](docs/DEVELOPER_SETUP.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)
- [`docs/DECISIONS.md`](docs/DECISIONS.md)
- [`docs/MOBILE_ROLLOUT.md`](docs/MOBILE_ROLLOUT.md)
- [`docs/STORE_LISTING_DRAFT.md`](docs/STORE_LISTING_DRAFT.md)
- [`docs/ACCOUNT_PROGRESS_SECURITY_RECOMMENDATION.md`](docs/ACCOUNT_PROGRESS_SECURITY_RECOMMENDATION.md)
- [`ROADMAP.md`](ROADMAP.md)
- [`CHANGELOG.md`](CHANGELOG.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`SECURITY.md`](SECURITY.md)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

## Structure

```text
src/app/                         Expo Router entry points
src/domain/subnet.ts             Pure subnet calculation engine
src/domain/__tests__/            Domain behavior tests
src/features/challenge/          First playable challenge
src/features/challenge/__tests__ Component interaction tests
src/auth/                        Secure session storage
src/lib/                         Backend client factories
supabase/                        Local backend configuration
docs/                            Architecture, setup, and status documentation
```

## Product principles

- Teach accuracy and reasoning before speed.
- Explain mistakes instead of punishing them.
- Keep practice available offline.
- Avoid loss-framed streaks, artificial urgency, and unnecessary student-data collection.
