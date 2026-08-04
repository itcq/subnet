# Changelog

All notable project changes are recorded here.

## 1.0.0 — Unreleased

### Added

- Web-first, mobile-browser-first product target with complete desktop browser support
- Versioned browser-local Journey persistence that survives reloads on the same origin
- Explicit same-browser/no-cross-device-sync learner disclosure
- Canonical `npm run export:web` production workflow
- Deterministic, versioned catalog of 500 network-address questions with stable IDs
- Four curriculum tiers: Easy 1–100, Intermediate 101–299, Hard 300–399, and Hardest 400–500
- Tier-specific mask and block-size hint policies
- Pure challenge-session engine for resume, submission, advancement, tier checkpoints, and final completion
- In-memory progress repository contract and implementation
- Versioned Expo SQLite repository with stable question-ID/ordinal mapping
- Progress hydration hook with retryable load failures and persistence-safe writes
- Native route integration using one SQLite repository instance
- Fail-closed browser storage validation and accessible load/save failure handling
- Route, repository, hook, session, catalog, and component regression coverage
- Expo SecureStore-backed Supabase session persistence
- Supabase client factory configured for PKCE
- Local Supabase CLI scaffolding and backend scripts
- Developer setup, architecture, project status, decisions, roadmap, and security documentation
- GitHub Actions verification workflow
- Third-party notice and explicit undecided-license status

### Changed

- Made the web target the default development workflow and deferred native distribution
- Reframed architecture, setup, roadmap, status, and mobile-delivery documentation around responsive web delivery
- Replaced the five-question prototype loop with active-question rendering from the 500-question catalog
- Changed final-question behavior from mission restart to a locked curriculum-complete state
- Added complete post-submission instruction with mask, block size, network, and broadcast facts
- Delayed correct UI completion until local persistence succeeds
- Clarified that the application is an independent standalone project
- Prepared EAS development, preview, simulator, and production build profiles
- Aligned Expo and React Native package versions with Expo SDK 57 requirements
- Prepared the responsive web product with production metadata and public crawler access
- Replaced user-facing alpha labels with accurate local-practice language
- Removed the Expo starter template's root license so it is not mistaken for the project's license decision

### Fixed

- Prevented stale hydration and completion callbacks from crossing repository or catalog changes
- Prevented writes before progress hydration completes
- Preserved active answers when local completion writes fail
- Prevented duplicate in-flight completion writes
- Locked answer fields when a completed curriculum is restored
- Corrected `/31` point-to-point and `/32` host-route usable-host ranges
- Removed the destructive Expo template reset script from the standalone application

### Known limitations

- Browser-local progress does not sync between phones, desktops, browsers, or devices
- Clearing site data or using storage-restricted browsing can remove or block progress
- Physical iPhone WebKit acceptance remains separate from desktop responsive emulation
- Native packaging and app-store distribution are deferred
- Cloud synchronization and canonical server progress are not implemented

## Prototype checkpoint — 2026-07-17

### Added

- Pure TypeScript IPv4/CIDR subnet engine
- Five deterministic network-address challenges covering `/20`, `/26`, `/27`, `/28`, and `/30`
- Four-octet mobile answer input
- Correct-answer-gated progression
- Dynamic block-boundary feedback
- Mission restart after the fifth challenge
- Unit, property-based, and component tests

## Versioning policy

Use semantic versions for meaningful checkpoints:

- Patch: fixes without changing intended behavior
- Minor: backward-compatible learner or platform capability
- Major: breaking data, API, or product behavior

Every tagged release should include verification results, known limitations, migration notes, and rollback instructions.
