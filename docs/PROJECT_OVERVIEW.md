# Project Overview

**Last reviewed:** 2026-07-21

## Project identity

Subnet Game is an independent mobile-first IPv4 subnetting practice application. It is not affiliated with, owned by, or integrated with any external education brand, LMS, or student directory.

## Product goal

Help learners build accurate subnet-boundary reasoning through short, guided practice that explains mistakes instead of punishing them.

## Current learner experience

The implemented prototype contains one mission with five deterministic network-address challenges:

| Challenge | Target | Prefix | Network answer |
|---|---|---:|---|
| 1 | `192.168.10.70` | `/27` | `192.168.10.64` |
| 2 | `10.20.30.200` | `/26` | `10.20.30.192` |
| 3 | `192.168.4.22` | `/28` | `192.168.4.16` |
| 4 | `172.16.45.130` | `/20` | `172.16.32.0` |
| 5 | `192.168.50.14` | `/30` | `192.168.50.12` |

Learners enter a four-octet network address, receive immediate feedback, see a block-size explanation, advance only after a correct answer, and can restart after the final challenge.

## Implemented capabilities

- Expo SDK 57 application for Android, iOS, and web
- Expo Router entry points
- Dark mobile-first challenge interface
- Pure TypeScript IPv4/CIDR calculation engine
- CIDR validation, masks, network/broadcast, host ranges, block size, and usable hosts
- Explicit `/31` point-to-point and `/32` host-route semantics
- Five engine-derived challenges
- Correct/incorrect feedback and challenge progression
- Jest unit/component coverage
- Property-based subnet tests with `fast-check`
- Expo SecureStore session-storage adapter
- Supabase client factory configured for PKCE and secure persistence
- Expo SQLite and Supabase dependencies installed for planned offline synchronization
- Local Supabase project configuration initialized
- EAS development, preview, simulator, production, and submit profiles

## Not yet implemented

- Registration or sign-in UI
- Auth state provider and route protection
- Hosted Supabase project
- Database migrations, Row Level Security policies, or database tests
- Durable local attempt queue
- Cross-device progress synchronization
- Server-side attempt verification
- Progress screens
- Badge definitions, evaluation, or awards
- Account deletion/export UI
- Email provider integration or consent workflows
- Staff reporting dashboard
- Production app identifiers, signing, branding, or store submissions

## Product principles

- Accuracy and reasoning before speed
- Helpful explanations rather than punishment
- Offline-first lesson continuity
- Private progress by default
- Server authority for verified progress and badges
- No loss-framed streaks, public leaderboards, artificial scarcity, or guilt-based engagement
- Minimum necessary personal data
- No custom password storage or cryptography

## Current maturity

**Stage:** Verified frontend prototype with an early standalone-auth foundation.

The lesson experience and core subnet engine are working and tested. Backend/auth packages and secure-storage abstractions exist, but no production backend or student account flow has been completed.

## Related documentation

- [`DEVELOPER_SETUP.md`](DEVELOPER_SETUP.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
- [`DECISIONS.md`](DECISIONS.md)
- [`ACCOUNT_PROGRESS_SECURITY_RECOMMENDATION.md`](ACCOUNT_PROGRESS_SECURITY_RECOMMENDATION.md)
- [`MOBILE_ROLLOUT.md`](MOBILE_ROLLOUT.md)
- [`STORE_LISTING_DRAFT.md`](STORE_LISTING_DRAFT.md)
- [`../ROADMAP.md`](../ROADMAP.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)
- [`../SECURITY.md`](../SECURITY.md)
