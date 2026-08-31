# Architecture

**Status:** Web-first implementation with deferred native infrastructure

## Current system

Released v1.0.0 uses the anonymous path below. The current development worktree also contains the optional, fail-closed account path shown beside it.

```text
Mobile / tablet / desktop browser
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│ Expo Router static web application                      │
│                                                         │
│ UI ──> deterministic curriculum ──> subnet engine       │
│  │                                                      │
│  ├──> anonymous BrowserProgressRepository               │
│  │      └──> localStorage key                           │
│  │          subnet-game:journey-progress:v1             │
│  │                                                      │
│  └──> optional verified-email account                   │
│         ├──> sessionStorage Supabase session            │
│         ├──> account localStorage namespace by user ID  │
│         └──> automatic signed-in synchronization        │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / loopback HTTP only
                            ▼
                  Supabase Auth + Postgres
                  ├── RLS-protected profiles/progress
                  └── atomic expected-user sync RPC
```

The application never requires an account for anonymous learning. Without a valid Supabase URL, publishable key, and HTTPS privacy-notice URL, the account path is unavailable and no registration request is initiated. Released production v1.0.0 remains on the anonymous path only.

## Product target

- **Primary:** narrow mobile browsers and touch input
- **Supported:** tablet and desktop browsers with complete curriculum/progress access
- **Deferred:** Apple App Store and Google Play packaging

Expo/React Native Web remains the implementation layer. This avoids a destructive rewrite and preserves an optional future native path without making native distribution a current requirement.

## Core modules

### `src/domain/subnet.ts`

Pure TypeScript source of truth for IPv4/CIDR arithmetic. UI, persistence, and manually authored content must not duplicate production subnet calculations.

### `src/domain/questions/`

Deterministic, versioned Journey catalog. Stable catalog versions, question IDs, and ordinals are persistence boundaries.

### `src/features/learning/`

Optional beginner instruction and deterministic Guided Practice. Guided Practice remains unscored, unlimited-retry, and isolated from Journey, Timed Mode, ranks, badges, achievements, and persistence.

### `src/progress/browserProgressRepository.ts`

Web Journey storage adapter behind `LocalProgressRepository`.

- Resolves browser storage lazily so static export can render safely.
- Stores only validated `LocalQuestionProgress` fields.
- Uses key `subnet-game:journey-progress:v1`.
- Uses payload `{ schemaVersion: 1, records: [...] }`.
- Fails closed on malformed, unsupported, unavailable, or unwritable storage.
- Does not silently delete corrupt data.

### `src/progress/createProgressRepository.ts`

Web/base factory. Creates the anonymous browser repository and account-specific repositories. Anonymous progress uses `subnet-game:journey-progress:v1`; signed-in repositories use a separate user-ID-derived namespace. Signing out changes the active repository back to anonymous without deleting either namespace.

### Optional account synchronization

`src/auth/` implements fail-closed passwordless Supabase Auth. Web session material is intentionally stored in `sessionStorage`; closing that tab ends restoration from that tab's storage. `src/progress/accountProgressSync.ts` reads only the active account repository and calls one `sync_account_progress` RPC with the initiating user ID. PostgreSQL checks that value against `auth.uid()` before inserts and returns that account's complete catalog snapshot in the same transaction. Anonymous progress is never passed into this path.

### Dormant native adapters

`createProgressRepository.native.ts` and `sqliteProgressRepository.ts` remain available for a possible future native phase. They are not part of the current web release target or acceptance gate.

## Persistence semantics

### Saved

- Correctly completed Journey questions
- Stable catalog version, question ID, ordinal, timestamp, attempt count, and pending-sync marker

### Not saved

- Unfinished answers
- Guided Practice completion
- Timed practice scores/ranks/badges beyond the current session
- Personal identity

### Scope

Browser storage is scoped to the browser profile and origin. It survives reloads but does not move between phone and desktop, browsers, or devices. Clearing site data can remove it.

This local state is useful for learning continuity but is not authoritative evidence or a credential.

## Responsive boundary

Release QA prioritizes:

1. 390px narrow mobile browser
2. 768px tablet browser
3. 1440px desktop browser

At every width, interactive controls must remain visible, octet inputs must not overlap, touch targets must remain usable, internal scrolling must reset correctly, and horizontal overflow must be zero.

## Deployment

- Expo SDK 57 managed project
- Expo Router `web.output: static`
- Canonical cache-cleared production export with `npm run export:web`
- GitHub Pages base path `/subnet`
- `.nojekyll` required
- production title, description, canonical URL, and public crawler access support discovery

## Account synchronization enablement

The development worktree implements optional account continuity as a separate security-reviewed vertical slice. Production enablement still requires real PostgreSQL authorization tests, configured OTP/two-account lifecycle E2E, approved privacy and data-lifecycle operations, project-owned authentication safeguards, and physical iPhone WebKit acceptance. Do not reinterpret anonymous local browser storage as cloud sync.
