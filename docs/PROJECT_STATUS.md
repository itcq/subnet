# Project Status

**Snapshot:** 2026-08-04

## Executive status

Subnet Game is a deployed static web application with a deterministic IPv4 subnetting Journey, beginner Learn path, Guided Practice transfer set, optional Timed Mode, and responsive mobile-browser input. The product is now web-first: mobile browser functionality is the primary target and desktop browsers provide the complete experience.

## Current revision

In progress:

- Replace reload-cleared web Journey state with versioned browser-local persistence.
- Make web the default development/export workflow.
- Reframe architecture and rollout documentation around mobile-browser-first delivery.
- Preserve native Expo/SQLite infrastructure as dormant future capability.

## Verified product capabilities

- Canonical IPv4/CIDR engine, including `/31` and `/32` semantics
- Deterministic 500-question Journey with stable IDs and fingerprint protections
- First-incomplete resume and correct-answer-gated advancement
- Beginner lesson with delayed proofs
- Four-stage Guided Practice with reduced scaffolding and method-only hints
- Optional 120/240-second Timed Mode
- Local unverified rank/badge presentation
- Mobile-safe four-octet answer entry
- Static GitHub Pages export under `/subnet`
- Anti-indexing and crawler-denial controls

## Progress semantics

- Journey completion persists across reloads in the same browser origin.
- Progress does not sync across devices or browsers.
- Clearing browser site data may remove progress.
- Guided Practice remains unpersisted and competitively isolated.
- Timed alpha scores/ranks/badges remain session-local and unverified.
- No account or authoritative cloud progress is implemented.

## Current release gate

Before this revision is released:

- Browser repository regression tests pass.
- Full tests, lint, TypeScript, and Expo Doctor pass.
- Exact static artifact passes at 390px, 768px, and 1440px.
- Journey completion survives a real artifact reload.
- Storage corruption produces an accessible load/retry state without data deletion.
- Production artifact matches the approved manifest byte-for-byte.
- Independent review passes against the exact staged tree.

## Known limitations

- No phone-to-desktop or cross-device synchronization
- No account recovery/export/deletion because accounts do not exist
- Browser-private/storage-restricted modes may prevent persistence
- Multiple tabs are not a real-time synchronization system
- Physical iPhone WebKit verification is separate from desktop responsive emulation
- Native packaging, store distribution, and physical native persistence QA are deferred

## Next product evidence

After web persistence is released, test the full lesson and Guided Practice flow with true beginners. Use observed transfer—not completion rate alone—to decide the next curriculum increment.
