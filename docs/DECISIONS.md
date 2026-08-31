# Project Decisions

**Last updated:** 2026-08-12

This log records decisions that materially constrain the implementation. Change a decision explicitly rather than allowing the code and documentation to drift.

## D-001 — Independent product

**Status:** Accepted

The application is a standalone independent project. It has no affiliation, ownership, branding, student-directory, LMS, or account integration with external education organizations.

**Consequence:** Use project-neutral ownership, account, domain, email, and branding placeholders until the actual owner is confirmed.

## D-002 — Expo, React Native, and TypeScript

**Status:** Superseded for initial distribution by D-013

Build with Expo SDK 57, React Native, TypeScript, and Expo Router while native distribution is under consideration.

**Consequence:** The implementation foundation remains reusable, but current release effort follows D-013's web target.

## D-003 — Pure subnet domain engine

**Status:** Accepted

Keep subnet calculations in a framework-independent TypeScript module.

**Consequence:** UI, persistence, authentication, and backend SDKs may consume the engine but must not be imported into it.

## D-004 — Local-first learning

**Status:** Accepted

Connectivity and authentication failures must not destroy or block an in-progress lesson.

**Consequence:** Feedback runs locally. Correct completed-question records are stored locally on native platforms before the UI marks them complete. Detailed attempt synchronization remains separate planned work.

## D-005 — Managed authentication

**Status:** Implemented for the production-blocked web account slice

Use managed identity rather than custom password storage or cryptography. The current web implementation uses Supabase Auth with verified passwordless email.

**Consequence:** Web session material uses tab-scoped `sessionStorage`; dormant native work may use Expo SecureStore only after separate native review. Privileged keys never ship in the app. Public account enablement remains blocked on configured lifecycle and operational security gates.

## D-006 — Server-authoritative verified progress and badges

**Status:** Accepted; server implementation incomplete

The client may show local practice but cannot grant authoritative cloud progress, roles, or badges.

**Consequence:** A future server validates attempts, deduplicates offline retries, updates progress transactionally, and evaluates versioned badge rules. Current SQLite records are local completion state only.

## D-007 — Private-by-default student data

**Status:** Accepted

Students access only their own records. Aggregate reporting is preferred, and individual staff access must be scoped and auditable.

**Consequence:** Row Level Security and cross-user abuse tests are launch requirements.

## D-008 — Respectful engagement

**Status:** Accepted

Do not use public leaderboards, loss-framed streaks, guilt, artificial scarcity, or timer-gated beginner progression.

**Consequence:** Recognize skill demonstration, breadth, consistency, and improvement instead of pressure or comparison.

## D-009 — Communication consent separation

**Status:** Accepted direction; provider implementation incomplete

Required account/security mail, optional progress/badge mail, and marketing mail are separate categories.

**Consequence:** Optional categories default off, unsubscribe/suppression is honored, and the app never exposes email-provider credentials.

## D-010 — Deterministic versioned curriculum

**Status:** Accepted

The initial curriculum is a fixed catalog of 500 network-address questions generated from a stable seed. IDs, ordinals, answers, and catalog version are deterministic.

**Consequence:** Progress references stable question identity. Catalog changes require a new version and must not silently reinterpret existing completion records.

## D-011 — Four explicit difficulty tiers

**Status:** Accepted

The curriculum tiers are Easy 1–100, Intermediate 101–299, Hard 300–399, and Hardest 400–500. Question 300 belongs to Hard. The Hardest tier includes `/31` and `/32`.

**Consequence:** Tier boundaries, hint policies, progress labels, tests, and checkpoint actions use these exact ranges.

## D-012 — Platform-specific local persistence

**Status:** Superseded for the web release by D-013 and D-014

Android and iOS use one versioned Expo SQLite repository instance. Web originally used an in-memory repository for the active browser session.

**Consequence:** Native SQLite remains dormant future infrastructure. Current web behavior is governed by D-014.

## D-013 — Web-first initial distribution

**Status:** Accepted

Ship the initial product as a responsive static web application. Mobile browser functionality is the primary design and QA constraint; tablet and desktop browsers provide the complete curriculum and Journey.

**Consequence:** CI and release review export web as the production artifact. Apple and Android packaging, signing, store distribution, and native physical-device acceptance are deferred until evidence demonstrates a need. Existing Expo/native infrastructure remains dormant rather than being deleted.

## D-014 — Durable same-browser Journey progress

**Status:** Accepted

Anonymous web Journey completion uses a versioned `localStorage` repository behind `LocalProgressRepository`. It survives reloads on the same browser origin. The optional account slice uses a separate user-ID-derived browser namespace and automatically synchronizes only progress completed while signed in; anonymous history is never imported.

**Consequence:** The app explicitly discloses each storage scope. Malformed, unavailable, quota-limited, or unwritable storage fails closed through accessible load/save handling rather than silently clearing data. Timed scores, ranks, and badges remain session-local and unverified. Account synchronization runs automatically through one atomic expected-user-bound database RPC when a signed-in session is established and after signed-in Journey completion. A failed remote write does not discard the account-local completion; a later signed-in trigger retries it.

## D-015 — Account retention and self-service lifecycle

**Status:** Accepted for the production-blocked account slice

Account and automatically synchronized signed-in progress rows are retained while the optional account exists. Authenticated learners can download a versioned JSON export and permanently delete their own account after typed confirmation. Database ownership checks bind both operations to `auth.uid()`; deletion cascades through profile/progress rows and removes only the deleted account's browser namespace.

**Consequence:** Anonymous progress remains untouched. No automatic inactive-account purge is promised. Provider log/backup retention and legal/privacy contact fields remain launch-time operational requirements.

## Open decisions

- Legal owner and license
- Final product name and branding
- Registration policy after beta
- Minimum age
- Provider log and backup retention periods
- Staff reporting roles
- Email provider/domain
- Badge sharing/export
- App-store identifiers and account ownership
