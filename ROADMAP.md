# Roadmap

This roadmap distinguishes planned work from implemented capability. Dates are intentionally omitted until ownership, infrastructure, and release decisions are confirmed.

## Milestone 0 — Verified local prototype

**Status:** Complete

- Pure subnet engine
- Five guided network-address challenges
- Immediate instructional feedback
- Correct-answer-gated progression
- Android, iOS, and web project targets
- Automated quality checks

## Milestone 1 — Standalone account vertical slice

**Status:** In progress; blocked on a working Supabase test environment

- Invite-only passwordless authentication
- Secure session persistence
- Profiles and student-role defaults
- RLS ownership policies and abuse tests
- SQLite attempt outbox
- Idempotent attempt synchronization
- Canonical progress view
- One server-awarded badge

**Exit criteria:** An invited synthetic user can complete a challenge offline, restart, reconnect, synchronize once, and see verified progress while cross-user access is denied.

## Milestone 2 — Account lifecycle and privacy

**Status:** Planned

- Sign-out and session revocation
- Account recovery
- Data export
- Account deletion workflow
- Retention and backup-purge policy
- Communication preference center
- Privacy/support screens

## Milestone 3 — Curriculum expansion

**Status:** Planned

- Additional IPv4 subnetting missions
- Adaptive practice based on demonstrated errors
- Curriculum review and difficulty calibration
- Accessibility and real-device usability testing

Not in current scope: IPv6, VLSM, multiplayer, public leaderboards, AI tutoring, or pressure-based streak mechanics.

## Milestone 4 — Restricted reporting and operations

**Status:** Planned

- Aggregate progress reporting
- Explicit staff roles
- Audited individual lookup when approved
- MFA/AAL2 for privileged access
- Support and incident procedures

## Milestone 5 — Internal mobile beta

**Status:** Planned

- Final neutral product name and branding
- Permanent Android and iOS identifiers
- Project-owned EAS, Apple, and Google accounts
- Android internal APK/Play test
- iOS preview/TestFlight test
- Privacy disclosures and support URLs
- Physical-device acceptance testing

## Milestone 6 — Production release

**Status:** Planned

- Security and privacy review
- Database backup/restore test
- Email consent and suppression validation
- Store review and staged rollout
- Monitoring, support, and rollback plan

## Decisions required before scheduling

- Legal owner and license
- Final product name
- Intended minimum age
- Registration policy after beta
- Data retention/deletion rules
- Staff data-access roles
- Email provider and domain
- Badge visibility and sharing
- App-store account ownership and identifiers
