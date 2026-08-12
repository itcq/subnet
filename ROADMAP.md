# Roadmap

This roadmap separates implemented capability from planned work. Dates are omitted until evidence supports scheduling.

## Milestone 0 — Web learning foundation

**Status:** Deployed and being revised for durable browser progress

- Canonical IPv4 subnet engine
- Deterministic, versioned 500-question Journey
- Beginner Learn path and worked examples
- Four-stage Guided Practice transfer set
- Optional Timed Mode with explicitly local/unverified results
- Mobile-safe segmented IPv4 input
- Static GitHub Pages deployment under `/subnet`
- Browser-local Journey persistence across reloads
- Complete tablet/desktop browser access

**Exit criteria:** exact artifact passes automated gates, independent review, browser reload/resume, 390px/768px/1440px QA, production parity, and physical iPhone WebKit confirmation.

## Milestone 1 — Beginner learning validation

**Status:** Next evidence milestone

- Observe 3–5 true beginners completing Learn and Guided Practice
- Test whether they can explain the boundary method
- Test transfer to a new subnet problem without app hints
- Fix only the strongest comprehension blockers

**Exit criterion:** most participants solve and explain a new `/26–/29` example without answer-revealing help.

## Milestone 2 — Curriculum expansion

**Status:** Planned after validation

- Connect the current boundary method to IPv4's 32-bit structure
- Deepen network bits, host bits, masks, and block-size understanding
- Add evidence-driven question types and practice
- Preserve deterministic IDs, engine-derived facts, and accessibility

Not in current scope: IPv6, multiplayer, public leaderboards, pressure streaks, or outcome promises.

## Milestone 3 — Optional account continuity

**Status:** Implemented as a production-blocked development vertical slice

The worktree now contains optional verified-email accounts and manual account-only progress synchronization. Anonymous browser history remains separate and is never imported. Signed-in completions use an account-specific browser namespace, and the database binds each synchronization transaction to the user ID that initiated it.

Production enablement still requires:

- Real PostgreSQL execution of the RLS/25-case pgTAP suite
- Configured OTP, two-account, sign-out, and account-switch lifecycle E2E
- Production verification of the implemented authenticated export/deletion flows and completion of provider retention/privacy fields
- Project-owned SMTP, rate limits, allowed origins, and delivery monitoring
- Physical iPhone Safari/WebKit acceptance

Accounts remain optional and fail closed when public configuration is absent. Do not enable them merely to replace a problem browser storage already solves.

## Milestone 4 — Operations and reporting

**Status:** Optional; requires approved need and privacy model

- Aggregate instructional reporting
- Explicit staff roles
- Audited individual support access
- MFA/AAL2 for privileged roles
- Support and incident procedures

## Milestone 5 — Native application decision

**Status:** Deferred

Revisit Apple/Android packaging only when a demonstrated need cannot be served well by the responsive web application.

Possible triggers:

- Material browser keyboard/offline limitations
- Meaningful learner demand for an installed app
- Ethical notification use case
- App-store discovery value
- Required device capability unavailable on web

If approved later, reuse the dormant Expo/native SQLite foundation and establish a separate physical-device and store-distribution acceptance gate.
