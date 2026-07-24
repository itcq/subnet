# Project Decisions

**Last updated:** 2026-07-24

This log records decisions that materially constrain the implementation. Change a decision explicitly rather than allowing the code and documentation to drift.

## D-001 — Independent product

**Status:** Accepted

The application is a standalone independent project. It has no affiliation, ownership, branding, student-directory, LMS, or account integration with external education organizations.

**Consequence:** Use project-neutral ownership, account, domain, email, and branding placeholders until the actual owner is confirmed.

## D-002 — Expo, React Native, and TypeScript

**Status:** Accepted

Build one Android/iOS codebase with Expo SDK 57, React Native, TypeScript, and Expo Router. Use EAS for cloud builds.

**Consequence:** Follow the exact Expo SDK 57 documentation and verify native/export compatibility after dependency changes.

## D-003 — Pure subnet domain engine

**Status:** Accepted

Keep subnet calculations in a framework-independent TypeScript module.

**Consequence:** UI, persistence, authentication, and backend SDKs may consume the engine but must not be imported into it.

## D-004 — Local-first learning

**Status:** Accepted

Connectivity and authentication failures must not destroy or block an in-progress lesson.

**Consequence:** Feedback runs locally. Correct completed-question records are stored locally on native platforms before the UI marks them complete. Detailed attempt synchronization remains separate planned work.

## D-005 — Managed authentication

**Status:** Accepted direction; provider implementation incomplete

Use managed identity rather than custom password storage or cryptography. Supabase Auth is the current implementation direction, beginning with verified passwordless email.

**Consequence:** Session secrets use Expo SecureStore. Privileged keys never ship in the app.

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

**Status:** Accepted for the current release slice

Android and iOS use one versioned Expo SQLite repository instance. Web uses an in-memory repository for the active browser session.

**Consequence:** Native completion is committed before the UI shows success. Load failures provide retry. Web displays that progress is cleared on reload and makes no durable-persistence claim. Physical-device restart testing remains a merge requirement.

## Open decisions

- Legal owner and license
- Final product name and branding
- Registration policy after beta
- Minimum age
- Retention/deletion policy
- Staff reporting roles
- Email provider/domain
- Badge sharing/export
- App-store identifiers and account ownership
