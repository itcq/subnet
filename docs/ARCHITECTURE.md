# Architecture

**Status:** Web-first implementation with deferred native infrastructure

## Current system

```text
Mobile / tablet / desktop browser
              │
              ▼
┌─────────────────────────────────────────────┐
│ Expo Router static web application          │
│                                             │
│ UI ──> deterministic curriculum             │
│  │          │                               │
│  │          └──> canonical subnet engine    │
│  │                                          │
│  └──> BrowserProgressRepository             │
│          └──> versioned localStorage        │
└─────────────────────────────────────────────┘
              │
              ▼
GitHub Pages at /subnet
```

The initial product has no required application backend, account, or cloud synchronization path.

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

Web/base factory. Creates one durable browser repository and discloses that progress does not sync across devices.

### Dormant native adapters

`createProgressRepository.native.ts` and `sqliteProgressRepository.ts` remain available for a possible future native phase. They are not part of the current web release target or acceptance gate.

## Persistence semantics

### Saved

- Correctly completed Journey questions
- Stable catalog version, question ID, ordinal, timestamp, attempt count, and pending-sync marker

### Not saved

- Unfinished answers
- Guided Practice completion
- Timed alpha scores/ranks/badges beyond the current session
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
- Production export with `npx expo export --platform web`
- GitHub Pages base path `/subnet`
- `.nojekyll` required
- `noindex,nofollow,noarchive` plus crawler denial remain limited-discovery controls, not access control

## Future cross-device sync

Cross-device continuity requires an account and trusted backend. If demand justifies it, add that as a separate security-reviewed vertical slice. Do not reinterpret local browser storage as cloud sync.
