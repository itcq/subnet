# Project Status

**Snapshot:** 2026-07-21 01:11 UTC

## Executive status

The project has a working and tested five-question subnetting mission plus initial secure-session and Supabase client foundations. It is not yet a complete account-enabled application and has not been released.

## Completed and verified

- Expo SDK 57 / React Native / TypeScript project scaffold
- Android, iOS, and static web targets
- Pure IPv4/CIDR subnet engine
- Five network-address challenges: `/20`, `/26`, `/27`, `/28`, `/30`
- Guided correct/incorrect explanations
- Challenge progression and final restart
- SecureStore-backed session storage adapter
- Supabase client factory using PKCE and secure persistence
- Local Supabase configuration initialized
- EAS build profiles written
- Architecture, rollout, store-listing, and security recommendations documented
- Full app quality gate run on 2026-07-24:
  - 5 test suites passed
  - 20 tests passed
  - ESLint passed
  - TypeScript passed
  - Expo Doctor passed 20/20
- Android, iOS, and static web exports completed successfully on 2026-07-24

## In progress

- Standalone authentication/backend foundation
- Developer documentation and project backup process

## Blockers

### Local Supabase runtime

Docker daemon is unavailable, so the local Supabase database, auth service, migrations, and RLS tests cannot currently be executed.

### Source-control backup

- Git repository exists locally
- GitHub remote is configured as `itcq/subnet`
- Initial commit and push are in progress
- Repository authentication still requires authorization

The project is not backed up remotely until the first push succeeds.

### Mobile distribution

- EAS is not authenticated
- No EAS project association is confirmed
- App Store/Play identifiers are pending
- Signing and store accounts are pending
- Current icon/splash assets are placeholders

## Not started

- Authentication screens and session routing
- Database schema/migrations/RLS
- Offline SQLite attempt queue
- Sync function and conflict handling
- Canonical progress UI
- Server-side badge engine
- Account settings, export, and deletion
- Consent-aware email delivery
- Staff reporting
- Physical-device beta builds

## Decisions still required

1. Final product/app name
2. Legal owner and source-code license
3. Private GitHub repository owner and commit identity
4. Public versus invite-only registration after beta
5. Intended minimum user age
6. Data retention and account-deletion timing
7. Staff roles permitted to view individual progress
8. Final email provider and sending domain
9. Badge visibility/sharing policy
10. Final Apple/Google package identifiers and store accounts

## Next recommended milestone

**Standalone account vertical slice**

Acceptance criteria:

- Invited test user signs in through verified passwordless email
- Challenge remains playable offline
- Attempt survives restart in SQLite
- Attempt syncs idempotently after reconnect
- Server recomputes correctness
- Canonical progress appears in the app
- One badge is awarded exactly once by the server
- Cross-user reads/writes are denied by automated tests

## Accuracy note

This file distinguishes implemented and verified work from planned architecture. Do not report planned backend capabilities as available until their tests have run successfully.
