# Roadmap

This roadmap distinguishes planned work from implemented capability. Dates are intentionally omitted until ownership, infrastructure, and release decisions are confirmed.

## Milestone 0 — Local curriculum implementation

**Status:** Implementation complete; physical-device restart verification pending

- Pure IPv4 subnet engine
- Deterministic, versioned catalog of 500 network-address questions
- Easy 1–100, Intermediate 101–299, Hard 300–399, Hardest 400–500
- Progressive mask and block-size hint policies
- Immediate instructional feedback
- Correct-answer-gated progression and tier checkpoints
- Final completion without automatic restart
- Native SQLite completion persistence and first-incomplete resume
- Explicit session-only web fallback
- Android, iOS, and web exports
- Automated quality checks

**Remaining exit criterion:** On physical Android and iOS devices, complete questions, terminate and restart the app, and verify resume at the first incomplete question.

## Milestone 1 — Standalone account vertical slice

**Status:** In progress; blocked on a working Supabase test environment

- Invite-only passwordless authentication
- Secure session persistence
- Profiles and student-role defaults
- RLS ownership policies and abuse tests
- Detailed attempt outbox
- Idempotent attempt synchronization
- Canonical server progress view
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

## Milestone 3 — Curriculum refinement

**Status:** Planned

- Difficulty calibration using learner evidence
- Additional subnetting question types and missions
- Adaptive practice based on demonstrated errors
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
