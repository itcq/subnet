# Security Policy and Development Rules

## Current support status

Released v1.0.0 is a public static web application with browser-local Journey progress. Its production build has no configured account backend, cloud synchronization, payment flow, or authoritative credential system.

The current development worktree contains an optional, fail-closed Supabase account and manual progress-synchronization implementation. It remains unavailable unless valid public backend configuration is supplied. Anonymous browser progress is never uploaded. Signed-in completions use an account-specific browser namespace and synchronize only after a separate learner action. This capability is not production-ready until every backend, privacy, data-lifecycle, and physical-device gate below passes.

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
- On web, keep managed session material in `sessionStorage` so it is scoped to the current browser tab/session rather than durable shared-browser storage.
- If native account support is introduced, store managed session material in Expo SecureStore.
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

- Current account synchronization stores self-reported completed Journey ordinals. It is practice continuity, not verified mastery, a credential, or an authoritative badge.
- Remote completion rows are append-only and tied to the immutable catalog fingerprint.
- Account synchronization uses one atomic database RPC that rejects unless the initiating expected user ID still equals `auth.uid()`; direct authenticated client access to the progress table is revoked.
- Anonymous browser progress is never read or uploaded by account synchronization.
- Timed scores, local rank bands, and local badges remain unsynchronized and unverified.
- Any future verified awards require server-side correctness validation and separate security review.

## Privacy rules

- Collect the minimum data required for identity, progress, support, and approved communication.
- Use synthetic fixtures only during development.
- Optional email categories default off.
- Retain account and synchronized-progress rows while the account exists; provide authenticated self-service JSON export and permanent account deletion. Document provider log/backup retention before onboarding.
- Keep badges and individual progress private by default.

## Required checks before release

```bash
npm run check
npm run export:web
npm run verify:release
git diff --check
```

Also verify the exact static artifact, single-route HTML allowlist, browser-local progress reload, mobile input behavior, crawler metadata, absence of source maps/secrets, and production byte parity.

Before enabling accounts in production, additionally require:

- Real PostgreSQL execution of the complete pgTAP authorization suite
- Two-user RLS isolation and cross-user mutation denial
- Configured OTP, session expiry, sign-out, account switching, and manual-sync E2E
- Project-owned SMTP, allowed origins, authentication rate limits, and delivery monitoring
- Completed and published privacy notice, provider log/backup retention, and production verification of authenticated export/deletion
- Physical iPhone Safari/WebKit acceptance
- CAPTCHA challenge-token integration before CAPTCHA is enabled

## Dependency findings

An August 11, 2026 `npm audit --omit=dev` reports 23 affected dependency paths (15 high, 8 moderate), but those paths collapse to three underlying transitive advisories:

- **GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq (`image-size`)** — denial of service in ICNS, JXL, and HEIF parsers. Expo SDK 57 reaches `image-size` through Metro build tooling. The public application does not accept learner-supplied image files, and `image-size` is not an application import.
- **GHSA-w5hq-g745-h8pq (`uuid`)** — missing output-buffer bounds checks in UUID v3/v5/v6. The dependency is reached only through the Node-based `xcode` config plugin, whose installed call site uses `uuid.v4()` without a caller-provided buffer. The application does not import `uuid`.

These findings are assessed as **not reachable in the static web runtime**. They remain present in the build dependency tree and must be reassessed when compatible Expo updates are available and before distributing native production builds. npm's forced remediation would downgrade Expo SDK 57 to Expo SDK 53 and is rejected as a breaking, SDK-incompatible change.

For each web release, export the exact reviewed tree and verify that neither advisory package is present in the emitted browser artifact. This is a scoped reachability assessment, not a claim that the dependency tree is vulnerability-free.
