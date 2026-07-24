# Architecture

**Status:** Current implementation plus approved direction

## System context

```text
┌───────────────────────────────────────────────┐
│ Expo application                             │
│                                               │
│  Challenge UI ──> Pure subnet domain engine  │
│       │                                       │
│       ├──> SQLite attempt outbox (planned)    │
│       └──> SecureStore auth session           │
└──────────────────────┬────────────────────────┘
                       │ HTTPS + authenticated JWT
                       ▼
┌───────────────────────────────────────────────┐
│ Supabase (planned; not provisioned)           │
│                                               │
│  Auth                                         │
│  Postgres + Row Level Security                │
│  Attempt validation / progress projection     │
│  Server-side badge evaluation                 │
│  Transactional event outbox                   │
└──────────────────────┬────────────────────────┘
                       │ server-side only
                       ▼
             Email provider (later)

Restricted reporting UI (later) ──> server-authorized views/functions
```

## Trust boundaries

### Device

Trusted for:

- Immediate lesson feedback
- Temporary/local progress presentation
- Durable offline attempt capture
- Securely retaining managed auth session material

Not trusted for:

- Assigning roles
- Declaring authoritative progress
- Awarding permanent badges
- Accessing another user's records
- Holding service-role, database, SMTP, or email-provider secrets

### Backend

Responsible for:

- Authentication identity
- Ownership and role authorization
- Attempt deduplication
- Recomputing answers from known challenge/version data
- Canonical progress projections
- Versioned badge evaluation and unique awards
- Consent/suppression checks before optional email
- Auditable staff access

## Implemented modules

### `src/domain/subnet.ts`

Pure TypeScript subnet engine. It validates IPv4/CIDR input and derives:

- Network address
- Broadcast address
- Subnet mask
- First/last host
- Block size
- Interesting octet
- Total and usable addresses

This module must remain free of React Native, Supabase, persistence, and UI dependencies.

### `src/features/challenge/`

Contains deterministic challenge definitions and the current learner interface. Answers are generated through the domain engine rather than duplicated manually.

### `src/auth/secureSessionStorage.ts`

Adapts Expo SecureStore to the Supabase storage contract. On iOS, values use `AFTER_FIRST_UNLOCK` accessibility.

### `src/lib/supabase.ts`

Constructs a Supabase client with:

- PKCE flow
- SecureStore persistence
- Token auto-refresh
- URL session detection disabled for the native client
- Required public-configuration validation

No singleton client or auth provider is connected to the UI yet.

### `supabase/config.toml`

Local Supabase configuration currently sets:

- New signups disabled for invite-only beta direction
- Anonymous sign-in disabled
- Email confirmation enabled
- Refresh-token rotation enabled
- Exact web/native callback allowlist
- 15-minute OTP expiry
- 60-second email resend frequency

## Planned data model

```text
profiles
user_roles
missions
challenges
attempts
progress_summary
badge_definitions
badge_awards
email_preferences
consent_events
outbox_events
```

Key rules:

- Authentication-provider UUID is the stable user key.
- Attempts are immutable and idempotent.
- Progress is a rebuildable projection.
- Badge criteria and awards are versioned.
- Registration creates only a student role.
- Optional communication preferences default off.

## Planned attempt flow

1. Learner submits an answer.
2. App computes immediate instructional feedback locally.
3. App writes an immutable UUID-based attempt to SQLite.
4. Outbox synchronizes when authenticated connectivity exists.
5. Server derives user ID from the access token.
6. Server validates challenge/version and recomputes correctness.
7. Transaction inserts the attempt, updates progress, evaluates badges, and writes notification events.
8. Client acknowledges accepted/duplicate events without losing rejected diagnostics.

## Authorization model

- Anonymous: no student data access
- Student: own profile, attempts, progress, badges, and preferences only
- Support: limited audited lookup after role approval
- Instructor: approved aggregate/instructional views
- Administrator: least-privilege administration with MFA/AAL2

UI hiding is not authorization. RLS and trusted server functions enforce access.

## Offline strategy

The lesson must remain playable when:

- The device is offline
- Authentication refresh temporarily fails
- The backend is unavailable

Unsynchronized work remains visible as local practice. Only server-validated work may be labeled verified mastery.

## Build and release path

- Expo SDK 57 managed workflow
- EAS cloud builds
- Internal Android APK and iOS preview testing first
- Final identifiers, ownership, branding, privacy/support URLs, and signing accounts still pending

## Architectural constraints

- Standalone independent application
- No LMS or external account integration
- No custom password storage or cryptography
- No public leaderboard or loss-framed streak mechanics
- No real personal data before privacy/retention/deletion approval
- No production secrets in mobile bundles or source control
