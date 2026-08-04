# Security Policy and Development Rules

## Current support status

This project is a public static web application. It has no account system, application backend, cloud progress synchronization, payment flow, or authoritative credential system. Journey progress is stored in the learner's browser.

## Reporting a security issue

Report suspected vulnerabilities privately to the project owner. Do not open a public issue containing credentials, personal data, exploit details, or active exploit information. A dedicated public security address has not been published.

## Secret handling

Never commit or send through chat:

- `.env` files containing real values
- Supabase service-role keys
- Database passwords
- SMTP or email-provider credentials
- OAuth client secrets
- EAS, Apple, or Google credentials
- Signing keys, certificates, or recovery codes
- Real student records

Only public client configuration may use `EXPO_PUBLIC_*`. Public keys do not replace Row Level Security.

## Authentication rules

- Use managed authentication.
- Store managed session material in Expo SecureStore.
- Rotate/revoke sessions through the provider.
- Use exact callback allowlists.
- Rate-limit authentication endpoints.
- Use generic responses that reduce account enumeration.
- Require MFA for staff/administrative systems.

## Authorization rules

- Deny by default.
- Enable RLS on every exposed student-data table.
- Derive user identity from verified server context, never request-body user IDs.
- Test anonymous, owner, other-user, support, instructor, and administrator cases.
- UI visibility is not authorization.

## Progress and badge integrity

- The client submits immutable attempt evidence, not badge claims.
- The server recomputes correctness against known challenge/version data.
- UUID/idempotency and canonical payload hashes protect offline retries.
- Progress projections are rebuildable from attempts.
- Badge definitions and awards are versioned and uniquely constrained.

## Privacy rules

- Collect the minimum data required for identity, progress, support, and approved communication.
- Use synthetic fixtures only during development.
- Optional email categories default off.
- Define retention, export, and deletion behavior before real-user onboarding.
- Keep badges and individual progress private by default.

## Required checks before release

```bash
npm run check
npm run export:web
npm run verify:release
git diff --check
```

Also verify the exact static artifact, single-route HTML allowlist, browser-local progress reload, mobile input behavior, crawler metadata, absence of source maps/secrets, and production byte parity. Backend, account, and native-app security gates become mandatory only if those deferred capabilities are introduced.

## Dependency findings

A July 26, 2026 `npm audit --omit=dev` reports 36 affected dependency paths (25 high, 11 moderate), but those paths collapse to two underlying transitive advisories:

- **GHSA-mh99-v99m-4gvg (`brace-expansion`)** — denial of service when attacker-controlled brace/glob input is expanded inside a Node process. In this project it is reached through Jest/ESLint globbing and Expo fingerprint/build tooling. The web application accepts no user-provided file or glob patterns, GitHub Pages runs no project Node process, and this package is not an application import.
- **GHSA-w5hq-g745-h8pq (`uuid`)** — missing output-buffer bounds checks in UUID v3/v5/v6. The dependency is reached only through the Node-based `xcode` config plugin, whose installed call site uses `uuid.v4()` without a caller-provided buffer. The application does not import `uuid`.

These findings are assessed as **not reachable in the static web runtime**. They remain present in the build dependency tree and must be reassessed when compatible Expo updates are available and before distributing native production builds. Do not force npm's suggested Expo/Jest downgrades; they are semver-major, SDK-incompatible remediations.

For each web release, export the exact reviewed tree and verify that neither advisory package is present in the emitted browser artifact. This is a scoped reachability assessment, not a claim that the dependency tree is vulnerability-free.
