# Subnet Game

A mobile-first IPv4 subnetting mastery game.

This is an independent standalone project with no external brand, LMS, or student-directory affiliation.

## Current curriculum

The current build teaches network-address calculation through a deterministic, versioned catalog of 500 questions.

Included:

- 500 stable network-address questions generated from a fixed seed
- Four difficulty tiers:
  - Easy: questions 1–100
  - Intermediate: questions 101–299
  - Hard: questions 300–399
  - Hardest: questions 400–500
- Progressive hint policies for subnet masks and block sizes
- `/31` point-to-point and `/32` host-route edge cases in the hardest tier
- Structured four-octet mobile input
- Immediate correct/incorrect feedback with mask, block-size, network, and broadcast explanations
- Correct-answer-gated advancement and tier checkpoints
- Final completion at question 500 without wrapping back to question 1
- Resume at the first incomplete question
- Expo support for Android, iOS, and web

The curriculum is local-first and does not require an account or network connection.

## Progress persistence

- **Android and iOS:** completed questions are stored locally in SQLite. Repository, hydration, retry, and route behavior are covered by automated tests. A physical-device restart/resume smoke test is still required before merge.
- **Web:** progress is stored only in memory for the current browser session and is cleared when the page reloads. The app displays this limitation directly.
- **Cloud sync:** not implemented. Local records are marked for future synchronization, but no server progress claim is made.

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
src/app/                         Expo Router entry points and progress hydration
src/domain/subnet.ts             Pure subnet calculation engine
src/domain/questions/            Deterministic 500-question catalog
src/features/challenge/          Session engine and active challenge UI
src/progress/                    In-memory and SQLite progress repositories
src/auth/                        Secure session storage
src/lib/                         Backend client factories
supabase/                        Local backend configuration
docs/                            Architecture, setup, and status documentation
```

## Product principles

- Teach accuracy and reasoning before speed.
- Explain mistakes instead of punishing them.
- Keep practice available offline.
- Preserve learner progress before showing completion.
- Avoid loss-framed streaks, artificial urgency, and unnecessary student-data collection.
