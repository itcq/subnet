# Project Decisions

**Last updated:** 2026-07-21

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

**Consequence:** Immediate feedback runs locally; attempts are queued durably and synchronized later.

## D-005 — Managed authentication

**Status:** Accepted direction; provider implementation incomplete

Use managed identity rather than custom password storage or cryptography. Supabase Auth is the current implementation direction, beginning with verified passwordless email.

**Consequence:** Session secrets use Expo SecureStore. Privileged keys never ship in the app.

## D-006 — Server-authoritative verified progress and badges

**Status:** Accepted

The client may show local practice but cannot grant authoritative progress, roles, or badges.

**Consequence:** The server validates attempts, deduplicates offline retries, updates progress transactionally, and evaluates versioned badge rules.

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
