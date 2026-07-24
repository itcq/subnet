# Project Status

**Snapshot:** 2026-07-24 22:34 UTC

## Executive status

The project has a working and automated-test-verified 500-question IPv4 network-address curriculum with native local completion persistence, first-incomplete resume logic, and an explicit session-only web fallback. It is not yet a complete account-enabled application and has not been released.

## Completed and verified in automation

- Expo SDK 57 / React Native / TypeScript project scaffold
- Android, iOS, and static web targets
- Pure IPv4/CIDR subnet engine, including `/31` and `/32` edge behavior
- Deterministic, versioned catalog of 500 unique network-address questions
- Stable question IDs and ordinal assignments
- Difficulty tiers:
  - Easy 1–100
  - Intermediate 101–299
  - Hard 300–399
  - Hardest 400–500
- Progressive hint policies for masks and block sizes
- First-incomplete resume, correct-answer gating, tier checkpoints, and final completion without wrapping
- Complete instructional feedback after submission
- In-memory progress repository and native Expo SQLite repository
- Versioned SQLite migration with stable question-ID/ordinal constraints
- Hydration loading, load retry, save retry, stale-callback isolation, and duplicate-write prevention
- Native route wiring using a singleton SQLite repository
- Explicit web session-only fallback; exported web bundle contains the notice and excludes the SQLite repository
- SecureStore-backed session storage adapter
- Supabase client factory using PKCE and secure persistence
- Local Supabase configuration initialized
- EAS build profiles written
- Architecture, rollout, store-listing, and security recommendations documented
- Full app quality gate run on 2026-07-24:
  - 15 test suites passed
  - 211 tests passed
  - ESLint passed with no warnings
  - TypeScript passed
  - Expo Doctor passed 20/20
- Android, iOS, and static web exports completed successfully on 2026-07-24

## Implemented but awaiting external verification

### Physical-device persistence

Automated tests cover SQLite migrations, completion writes, hydration, route behavior, and resume-state selection. Before merge, physical Android and iOS tests must confirm that completed questions survive process termination and app restart and that the learner resumes at the first incomplete question.

## In progress

- Standalone authentication/backend foundation
- Physical-device persistence smoke testing
- Curriculum difficulty and usability review

## Blockers

### Local Supabase runtime

Docker daemon is unavailable, so the local Supabase database, auth service, migrations, and RLS tests cannot currently be executed.

### Mobile distribution

- EAS is not authenticated
- No EAS project association is confirmed
- App Store/Play identifiers are pending
- Signing and store accounts are pending
- Current icon/splash assets are placeholders

## Known limitations

- Web progress exists only for the active browser session and is cleared on reload
- Native completion persistence has not yet been proven on physical devices
- `pendingSync` records have no implemented server synchronization consumer
- Incorrect answer attempts are not yet stored as a detailed attempt history
- No authoritative cloud progress or badges are available

## Not started

- Authentication screens and session routing
- Database schema/migrations/RLS for account-owned server data
- Detailed offline attempt outbox
- Sync function and conflict handling
- Canonical server progress UI
- Server-side badge engine
- Account settings, export, and deletion
- Consent-aware email delivery
- Staff reporting
- Physical-device beta builds

## Decisions still required

1. Final product/app name
2. Legal owner and source-code license
3. Public versus invite-only registration after beta
4. Intended minimum user age
5. Data retention and account-deletion timing
6. Staff roles permitted to view individual progress
7. Final email provider and sending domain
8. Badge visibility/sharing policy
9. Final Apple/Google package identifiers and store accounts

## Next recommended milestone

**Verify local curriculum persistence, then continue the standalone account vertical slice.**

Immediate acceptance criteria:

- Fresh install starts at question 1
- Correct completion advances only after the learner presses the next action
- Android restart resumes at the first incomplete question
- iOS restart resumes at the first incomplete question
- Hidden hints appear in post-submission feedback
- Tier checkpoints appear at 100, 299, and 399
- Question 500 completes without wrapping
- Offline mode does not block local completion

Account-slice acceptance criteria remain:

- Invited synthetic user signs in through verified passwordless email
- Detailed attempts sync idempotently after reconnect
- Server recomputes correctness
- Canonical progress appears in the app
- One badge is awarded exactly once by the server
- Cross-user reads/writes are denied by automated tests

## Accuracy note

This file distinguishes automated verification, implemented-but-unverified device behavior, and planned architecture. Do not report physical-device durability or planned backend capabilities as verified until their acceptance tests run successfully.
