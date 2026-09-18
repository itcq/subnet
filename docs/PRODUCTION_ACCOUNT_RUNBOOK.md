# Production Account Operations Runbook

**Accounts remain fail-closed until every launch gate is checked and evidenced.**

## Approved product behavior

- Accounts are optional.
- Anonymous Journey progress stays browser-local and is never uploaded, imported, claimed, or deleted by account operations.
- Registration does not subscribe a learner to marketing.
- Signed-in completion uses an account-specific browser namespace.
- Signed-in Journey progress synchronizes automatically when an account session is established and after each signed-in completion.
- Anonymous browser progress remains separate and is never uploaded during account synchronization.
- Synchronized completion is learner-reported practice continuity, not verified mastery or a credential.
- Account export and deletion are authenticated self-service operations.

## Ownership and access register

Complete this register before creating or modifying production resources:

| Resource | Project/resource ID | Owner | Administrators | Recovery method |
| --- | --- | --- | --- | --- |
| GitHub repository/Pages | `itcq/subnet` | [OWNER] | [ADMINS] | [METHOD] |
| Supabase project | [PROJECT REF] | [OWNER] | [ADMINS] | [METHOD] |
| SMTP/email provider | [ACCOUNT/DOMAIN] | [OWNER] | [ADMINS] | [METHOD] |
| DNS/domain | [DOMAIN] | [OWNER] | [ADMINS] | [METHOD] |
| Monitoring/alerts | [RESOURCE] | [OWNER] | [ADMINS] | [METHOD] |

Require MFA for every administrative account. Never place secrets in this document, Discord, Git, `EXPO_PUBLIC_*`, or the static artifact.

## Supabase production configuration

1. Create or select the project-owned Supabase project.
2. Record project ref, region, plan, owner, and administrators in the register.
3. Configure the production site URL as `https://itcq.github.io/subnet/`.
4. Allow only required production and reviewed preview origins/redirects. Do not use wildcard production origins.
5. Keep public account environment variables absent until all gates pass.
6. Apply migrations from the reviewed commit.
7. Execute the complete pgTAP suite against the target PostgreSQL/Supabase version.
8. Confirm RLS is enabled and forced, direct authenticated progress-table access is denied, and lifecycle RPCs are authenticated-only.
9. Capture sanitized command output, commit SHA, migration list, Supabase/PostgreSQL versions, and timestamp in the release record.

Public static-build values:

```text
EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[PUBLIC PUBLISHABLE KEY]
EXPO_PUBLIC_ACCOUNT_PRIVACY_URL=https://[PUBLISHED PRIVACY NOTICE]
```

The publishable key is intended for clients but still belongs in protected deployment configuration rather than documentation. Never use the service-role key in the app.

## Authentication email and SMTP

1. Configure a project-owned sending domain and SMTP/email provider.
2. Complete SPF, DKIM, and DMARC configuration and verify alignment.
3. Use an authentication-only sender such as `[AUTH SENDER]`.
4. Configure the OTP template to include the six-digit `{{ .Token }}` value. The app verifies a code; it does not depend on a magic-link redirect.
5. Use generic learner-facing responses that do not reveal whether an email is already registered.
6. Configure provider and Supabase rate limits based on documented provider capacity.
7. Route delivery failures, bounce-rate alerts, abuse signals, and provider outages to `[MONITORING OWNER/DESTINATION]`.
8. Test delivery to at least two unrelated email providers and verify mobile rendering.
9. Keep CAPTCHA disabled until the client sends and the backend verifies a challenge token.

Do not invent numeric limits. Record the approved values and rationale in the release record after the actual provider is selected.

## Privacy and lifecycle

Before launch:

- Complete every bracketed field in `docs/ACCOUNT_PRIVACY_NOTICE.md`.
- Publish the final notice at an approved stable URL and link it before account creation.
- Verify export downloads a valid versioned JSON document for the authenticated owner only.
- Verify export never contains another account's data or anonymous browser progress.
- Verify typed-confirmation deletion removes the Auth user and cascades through profile/progress rows.
- Verify deletion clears only the deleted account's browser cache and preserves anonymous progress.
- Record provider log and backup retention periods.
- Establish a monitored privacy/support contact and an incident escalation owner.

Current approved retention behavior: account and synchronized-progress rows are retained while the account exists and deleted on authenticated self-service deletion. No automatic inactive-account purge is promised.

## Required E2E matrix

Use synthetic, project-controlled test inboxes only.

1. Anonymous progress exists before registration.
2. User A requests and verifies an OTP.
3. User A sees no anonymous-history import.
4. User A completes signed-in challenges and confirms synchronization occurs automatically.
5. A new browser session for User A receives only the automatically synchronized account progress.
6. User A signs out and anonymous progress returns.
7. User B signs in on the same browser and cannot see or mutate User A progress.
8. A delayed User A synchronization cannot write after switching to User B.
9. User A exports only User A account data.
10. User B cannot export or delete User A.
11. User A deletes the account after typed confirmation.
12. User A's Auth/profile/progress data is gone, account cache is removed, and anonymous progress remains.
13. Expired, reused, malformed, and rate-limited OTP flows show generic actionable errors.
14. Closing the tab clears the web authentication session as designed.

## Physical iPhone acceptance

On current iPhone Safari/WebKit at the production base path:

- Request, enter, and verify the OTP using native email/keyboard flows.
- Complete a signed-in challenge, confirm automatic synchronization, sign out, and sign back in.
- Download the JSON export or confirm the platform's standard share/download behavior.
- Confirm the deletion input/button remain reachable above the keyboard and safe-area insets.
- Confirm no horizontal overflow, obscured controls, duplicate submission, or console/network error.

Record device model, iOS version, browser, timestamp, and result. This requires a human with the physical device.

## Enablement sequence

1. CI quality/export gate passes on the exact commit.
2. CI real Supabase migration/pgTAP gate passes.
3. Target-project migration and pgTAP gate passes.
4. SMTP, DNS, origins, limits, and monitoring are configured and evidenced.
5. Privacy notice and support contact are complete and published.
6. Two-account E2E passes.
7. Physical iPhone Safari/WebKit acceptance passes.
8. Build with all three required public values: Supabase URL, publishable key, and the published HTTPS privacy-notice URL.
9. Verify the exact artifact for secrets, source maps, routes, base paths, and digest.
10. Deploy intentionally and verify production byte parity.
11. Monitor OTP delivery, auth failures, deletion failures, and error rates during rollout.

If any gate fails, remove any required public account configuration value and redeploy. The Account screen will fail closed while anonymous play remains available.

## Incident rollback

- **Auth/email incident:** remove public configuration from the build and redeploy; accounts become unavailable without affecting anonymous progress.
- **Authorization concern:** disable account enablement, revoke affected sessions/keys through Supabase, preserve audit evidence, and investigate before re-enabling.
- **SMTP abuse/delivery incident:** pause authentication delivery at the provider/Supabase level, alert the operational owner, and keep the static app fail-closed.
- **Suspected credential exposure:** rotate/revoke immediately; never paste the exposed value into an issue or chat.
