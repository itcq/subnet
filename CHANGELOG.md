# Changelog

All notable project changes are recorded here. The project has not yet published a tagged release.

## Unreleased

### Added

- Expo SecureStore-backed Supabase session persistence
- Supabase client factory configured for PKCE
- Expo SQLite and Supabase client dependencies
- Local Supabase CLI scaffolding and backend scripts
- Developer setup, architecture, project status, decisions, roadmap, and security documentation
- GitHub Actions verification workflow
- Third-party notice and explicit undecided-license status

### Changed

- Clarified that the application is an independent standalone project
- Prepared EAS development, preview, simulator, and production build profiles
- Aligned Expo and React Native package versions with Expo SDK 57 requirements
- Removed the Expo starter template's root license so it is not mistaken for the project's license decision

### Fixed

- Corrected `/31` point-to-point and `/32` host-route usable-host ranges
- Removed the destructive Expo template reset script from the standalone application

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
