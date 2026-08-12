# Project Overview

**Last reviewed:** 2026-08-12

## Project identity

Subnet Game is an independent, mobile-browser-first IPv4 subnetting learning application. It is not affiliated with, owned by, or integrated with any external education brand, LMS, or student directory.

## Product goal

Help aspiring network administrators and engineers build accurate subnet-boundary reasoning through guided practice that explains mistakes instead of punishing them.

## Initial delivery target

- Responsive static web application
- Narrow mobile browsers are the primary design and QA constraint
- Tablet and desktop browsers provide the complete curriculum and Journey
- Journey completion survives reloads in the same browser origin
- Released v1.0.0 progress does not sync between phone and desktop, browsers, or devices
- Apple and Android packaging is deferred unless evidence justifies it

## Current learner experience

- Deterministic, versioned 500-question network-address Journey
- Easy, Intermediate, Hard, and Hardest tiers
- Correct-answer-gated advancement and first-incomplete resume
- Optional beginner Learn path with multiple methods and worked examples
- Six-step guided Bits, Bytes & Octets lesson
- Four-stage Guided Practice transfer set with gradually reduced scaffolding
- Optional two- and four-minute typed-answer practice
- Local, unverified score bands and shareable badges
- Mobile-safe four-octet answer controls
- Immediate misconception-specific feedback and engine-derived subnet facts

The Journey is untimed. Timed practice is optional and does not gate learning progress.

## Implemented capabilities

- Expo SDK 57 and Expo Router static web application
- Pure TypeScript IPv4/CIDR calculation engine
- CIDR validation, masks, network/broadcast, host ranges, block size, and usable hosts
- Explicit `/31` point-to-point and `/32` host-route semantics
- Browser-local Journey repository with a versioned payload
- Hydration gating, accessible load retry, and persistence-safe UI updates
- React Native Web segmented inputs with numeric keyboard hints and WebKit text-fill/caret safeguards
- Jest component, unit, and property-based coverage
- GitHub Pages `/subnet` base path, `.nojekyll`, public indexing metadata, and crawler access
- Dormant native SQLite/SecureStore/EAS infrastructure for a possible future phase

## Development account slice

The current worktree contains an implemented but production-blocked optional account slice: verified-email create/sign-in, account-specific browser progress, and explicit manual synchronization across browsers and devices. Anonymous progress stays separate and is never uploaded. The account path fails closed without valid public configuration and is not enabled in released v1.0.0.

## Not yet implemented

- Production approval and enablement of the optional account/manual-sync slice
- Server-side attempt verification
- Authoritative public rankings or credentials
- Account recovery beyond verified-email OTP; authenticated self-service export/deletion is implemented in the production-blocked slice
- Staff reporting dashboard
- Native store identifiers, signing, distribution, or physical native acceptance

## Product principles

- Accuracy and reasoning before speed
- Helpful explanations rather than punishment
- Mobile-browser touch usability first
- Full desktop-browser access
- Private local practice by default
- Honest distinction between browser-local, session-local, and future verified state
- No loss-framed streaks, public leaderboards, artificial scarcity, or guilt-based engagement
- Minimum necessary personal data

## Current maturity

**Stage:** Public production web release with durable same-browser Journey progress.

The next product evidence is true-beginner comprehension and transfer testing. Production account enablement remains blocked on real database authorization tests, configured lifecycle E2E, approved privacy/data-lifecycle operations, and physical iPhone WebKit QA. Native apps remain an optional later decision.

## Related documentation

- [`DEVELOPER_SETUP.md`](DEVELOPER_SETUP.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
- [`DECISIONS.md`](DECISIONS.md)
- [`ALPHA_TESTER_GUIDE.md`](ALPHA_TESTER_GUIDE.md)
- [`MOBILE_ROLLOUT.md`](MOBILE_ROLLOUT.md)
- [`../ROADMAP.md`](../ROADMAP.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)
- [`../SECURITY.md`](../SECURITY.md)
