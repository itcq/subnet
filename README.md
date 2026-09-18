# Subnet Game

A mobile-browser-first IPv4 subnetting learning game that also provides a complete desktop-browser experience.

This is an independent standalone project with no NetworkChuck, NetworkChuck Academy, LMS, or student-directory affiliation.

## Product direction

The initial product is **web only**:

- Mobile browser functionality is the primary design and QA constraint.
- Tablet and desktop browsers provide the same curriculum and progress path.
- Journey completion is saved in the current browser and survives reloads.
- Optional verified-email accounts automatically sync Journey challenges completed while signed in.
- Anonymous learning remains available; registration does not subscribe a learner to marketing.
- Apple and Android packaging is deferred unless learner demand justifies it. Existing Expo/native infrastructure remains dormant for that possible phase.

## Current experience

- Untimed staged Journey with correct-answer-gated progression
- Optional Learn hub with worked examples and multiple methods
- Four-example Guided Practice with gradually reduced scaffolding
- Optional two- and four-minute typed-answer practice
- Local practice points, personal rank bands, badges, and sharing with explicit unverified-result language
- Deterministic, versioned 500-question network-address curriculum
- Four accessible octet inputs designed for narrow mobile screens
- Immediate misconception-specific feedback and engine-derived subnet facts
- First-incomplete resume and final completion without wrapping

The Journey remains untimed, with no lives, streak penalties, or pressure mechanics.

## Progress and trust boundaries

### Journey completion

Journey completion is stored in browser `localStorage` under a versioned payload. It survives reloads on the same browser origin.

It can be lost when the learner clears site data, uses storage-restricted/private browsing, changes browser, or changes device. It is learner-controlled local practice state—not an authoritative credential.

### Timed results

Timed scores, personal rank bands, and badges remain session-local and unverified. They are not a public leaderboard, verified award, or competitive student ranking.

### Cloud sync

Public account code is implemented behind fail-closed public configuration requiring a valid Supabase URL, publishable key, and published HTTPS account-privacy URL. Registration uses a verified email code; passwords are not collected by the app. Creating an account does not upload existing browser progress. Signed-in Journey progress synchronizes automatically when the account session is established and after each signed-in challenge completion. Anonymous browser progress remains separate and is never uploaded.

Supabase Auth stores the verified email address and managed user ID. The app-owned `profiles` table stores the user ID and profile creation timestamp. The progress table stores the user ID, catalog fingerprint, question ordinal, completion timestamp, and row creation timestamp for synced Journey progress. These tables do not store typed answers or timed-mode scores. Synced completion remains self-reported practice state—not verified mastery or a credential. Signed-in learners can download a versioned JSON export and permanently delete their account after typed confirmation; deletion cascades through managed account/profile/progress data and clears only that account's browser cache.

Anonymous browser progress remains local, is never uploaded by account synchronization, and is never deleted by sync. Once signed in, new Journey completions are stored in an account-specific browser namespace and automatically synchronized with that account’s remote progress. The client sends the initiating account ID with one atomic database RPC; PostgreSQL rejects the transaction if it no longer matches `auth.uid()`, and direct client access to the progress table is revoked. Signing out returns the visible Journey to the anonymous browser namespace; the account-specific browser cache remains available for a later sign-in on that browser. Row Level Security restricts profile and progress rows to the authenticated owner. The production account feature must remain unconfigured until the real database suite, project-owned Supabase/SMTP configuration, completed privacy notice, provider retention fields, two-account lifecycle E2E, and physical iPhone Safari acceptance pass. See `docs/PRODUCTION_ACCOUNT_RUNBOOK.md`.

## Run the web application

```bash
npm ci
npm start
```

`npm start` opens the web development target. The explicit equivalent is:

```bash
npm run web
```

## Local account backend

Docker is required for the local Supabase stack.

```bash
cp .env.example .env
npm run backend:start
# Replace [LOCAL_PUBLISHABLE_KEY] in .env with the key printed by Supabase.
npm run backend:reset
npm run backend:test
npm run web
```

Only the Supabase URL and publishable key belong in `EXPO_PUBLIC_*` variables. Never place a service-role key in the app or committed environment files.

The Supabase authentication email template must include the six-digit `{{ .Token }}` value because the app verifies an email code rather than opening a magic link. Before enabling public registration, configure project-owned SMTP, authentication rate limits, allowed origins, and delivery monitoring. CAPTCHA is not wired into the current OTP UI; if CAPTCHA is required, integrate its challenge token into the sign-in request and test it before enabling the account feature.

Without complete public Supabase configuration, the Account screen fails closed and explains that no registration data is collected. Anonymous Journey progress continues to work locally.

## Quality and production export

```bash
npm run check
npm run export:web
npm run verify:release
```

The production site uses Expo Router static output and GitHub Pages under `/subnet`.
The export finalizer removes Expo's generated diagnostic HTML pages so only the intentional root route is published.

**Live:** https://itcq.github.io/subnet/

## Deferred native work

The Expo iOS/Android configuration, SQLite repository, and EAS profiles remain in the repository as dormant future infrastructure. Native store builds, signing, physical native persistence QA, and distribution are not current release requirements.

## Structure

```text
src/app/                         Web application shell and progress hydration
src/domain/subnet.ts             Canonical IPv4/CIDR calculation engine
src/domain/questions/            Deterministic curriculum catalog
src/features/challenge/          Journey challenge flow
src/features/learning/           Learn and Guided Practice experiences
src/features/timed/              Optional timed practice
src/progress/                    Browser, in-memory, and dormant native repositories
docs/                            Architecture, setup, roadmap, and operations notes
```

## Product principles

- Teach accuracy and reasoning before speed.
- Explain mistakes instead of punishing them.
- Design touch interactions for mobile browsers first.
- Keep the full learning path usable from a desktop browser.
- Preserve learner progress before showing completion.
- Make local, session, and future cloud state visibly distinct.
- Avoid pressure mechanics and unnecessary personal-data collection.
