# Changelog

All notable project changes are recorded here. The project has not yet published a tagged release.

## Unreleased

### Added

- Deterministic, versioned catalog of 500 network-address questions with stable IDs
- Four curriculum tiers: Easy 1–100, Intermediate 101–299, Hard 300–399, and Hardest 400–500
- Tier-specific mask and block-size hint policies
- Pure challenge-session engine for resume, submission, advancement, tier checkpoints, and final completion
- In-memory progress repository contract and implementation
- Versioned Expo SQLite repository with stable question-ID/ordinal mapping
- Progress hydration hook with retryable load failures and persistence-safe writes
- Native route integration using one SQLite repository instance
- Explicit session-only web progress fallback and learner-facing notice
- Route, repository, hook, session, catalog, and component regression coverage
- Expo SecureStore-backed Supabase session persistence
- Supabase client factory configured for PKCE
- Local Supabase CLI scaffolding and backend scripts
- Developer setup, architecture, project status, decisions, roadmap, and security documentation
- GitHub Actions verification workflow
- Third-party notice and explicit undecided-license status

### Changed

- Replaced the five-question prototype loop with active-question rendering from the 500-question catalog
- Changed final-question behavior from mission restart to a locked curriculum-complete state
- Added complete post-submission instruction with mask, block size, network, and broadcast facts
- Delayed correct UI completion until local persistence succeeds
- Clarified that the application is an independent standalone project
- Prepared EAS development, preview, simulator, and production build profiles
- Aligned Expo and React Native package versions with Expo SDK 57 requirements
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

- Native restart/resume behavior still requires a physical Android and iOS smoke test before merge
- Web completion progress is session-only and clears on page reload
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
