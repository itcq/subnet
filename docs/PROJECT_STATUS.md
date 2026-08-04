# Project Status

**Snapshot:** 2026-08-04

## Executive status

Subnet Game has a deployed alpha and a public-production release candidate with a deterministic IPv4 subnetting Journey, beginner Learn path, Guided Practice transfer set, optional Timed Mode, and responsive mobile-browser input. The product is web-first: mobile browser functionality is the primary target and desktop browsers provide the complete experience.

## Current revision

Public-production release candidate:

- Responsive web target at `https://itcq.github.io/subnet/`
- Versioned browser-local Journey persistence
- Web-default development and production export workflow
- Mobile-browser-first delivery with complete desktop access
- Dormant native Expo/SQLite infrastructure preserved for possible future use

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
- Candidate production search metadata and public crawler access

## Progress semantics

- Journey completion persists across reloads in the same browser origin.
- Progress does not sync across devices or browsers.
- Clearing browser site data may remove progress.
- Guided Practice remains unpersisted and competitively isolated.
- Timed practice scores/ranks/badges remain session-local and unverified.
- No account or authoritative cloud progress is implemented.

## Release process

Each public release verifies:

- Browser repository regression tests pass.
- Full tests, lint, TypeScript, and Expo Doctor pass.
- Exact static artifact passes at 390px, 768px, and 1440px.
- Journey completion survives a real artifact reload.
- Storage corruption produces an accessible load/retry state without data deletion.
- Production artifact matches the approved manifest byte-for-byte.

## Known limitations

- No phone-to-desktop or cross-device synchronization
- No account recovery/export/deletion because accounts do not exist
- Browser-private/storage-restricted modes may prevent persistence
- Multiple tabs are not a real-time synchronization system
- Physical-device browser checks remain a separate release input from desktop responsive emulation
- Native packaging, store distribution, and physical native persistence QA are deferred

## Next product evidence

Observe the full lesson and Guided Practice flow with real learners. Use observed transfer—not completion rate alone—to decide the next curriculum increment while fixing production defects as they appear.
