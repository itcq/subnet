# Subnet Game

A mobile-browser-first IPv4 subnetting learning game that also provides a complete desktop-browser experience.

This is an independent standalone project with no NetworkChuck, NetworkChuck Academy, LMS, or student-directory affiliation.

## Product direction

The initial product is **web only**:

- Mobile browser functionality is the primary design and QA constraint.
- Tablet and desktop browsers provide the same curriculum and progress path.
- Journey completion is saved in the current browser and survives reloads.
- Browser progress does **not** sync between a phone and desktop, between browsers, or between devices yet.
- Apple and Android packaging is deferred unless learner demand justifies it. Existing Expo/native infrastructure remains dormant for that possible phase.

## Current experience

- Untimed staged Journey with correct-answer-gated progression
- Optional Learn hub with worked examples and multiple methods
- Four-example Guided Practice with gradually reduced scaffolding
- Optional two- and four-minute typed-answer practice
- Local alpha points, personal rank bands, badges, and sharing with explicit unverified-result language
- Deterministic, versioned 500-question network-address curriculum
- Four accessible octet inputs designed for narrow mobile screens
- Immediate misconception-specific feedback and engine-derived subnet facts
- First-incomplete resume and final completion without wrapping

The Journey remains untimed, with no lives, streak penalties, or pressure mechanics.

## Progress and trust boundaries

### Journey completion

Journey completion is stored in browser `localStorage` under a versioned payload. It survives reloads on the same browser origin.

It can be lost when the learner clears site data, uses storage-restricted/private browsing, changes browser, or changes device. It is learner-controlled local practice state—not an authoritative credential.

### Timed results

Timed scores, personal rank bands, and badges remain session-local and unverified. They are not a public leaderboard, verified award, or competitive student ranking.

### Cloud sync

Accounts and cross-device progress synchronization are not implemented. The interface states this directly.

## Run the web application

```bash
npm ci
npm start
```

`npm start` opens the web development target. The explicit equivalent is:

```bash
npm run web
```

## Quality and production export

```bash
npm run check
npm run export:web
```

The production site uses Expo Router static output and GitHub Pages under `/subnet`.

## Deferred native work

The Expo iOS/Android configuration, SQLite repository, and EAS profiles remain in the repository as dormant future infrastructure. Native store builds, signing, physical native persistence QA, and distribution are not current release requirements.

## Structure

```text
src/app/                         Web application shell and progress hydration
src/domain/subnet.ts             Canonical IPv4/CIDR calculation engine
src/domain/questions/            Deterministic curriculum catalog
src/features/challenge/          Journey challenge flow
src/features/learning/           Learn and Guided Practice experiences
src/features/timed/              Optional timed practice
src/progress/                    Browser, in-memory, and dormant native repositories
docs/                            Architecture, setup, roadmap, and operations notes
```

## Product principles

- Teach accuracy and reasoning before speed.
- Explain mistakes instead of punishing them.
- Design touch interactions for mobile browsers first.
- Keep the full learning path usable from a desktop browser.
- Preserve learner progress before showing completion.
- Make local, session, and future cloud state visibly distinct.
- Avoid pressure mechanics and unnecessary personal-data collection.
