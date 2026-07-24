# Secure Accounts, Progress, Email, and Badges

**Status:** Architecture recommendation — no production services or student data have been provisioned

**Prepared:** 2026-07-17

## Executive recommendation

Keep the Expo app local-first, but add a project-owned backend for identity, synchronization, progress, badges, and email events.

Recommended first release:

- **Mobile client:** Existing Expo + React Native + TypeScript app
- **Authentication and application database:** Supabase Auth + Postgres
- **Trusted backend logic:** Supabase Edge Functions and database functions
- **Mobile session storage:** `expo-secure-store`
- **Application email:** Postmark with separate Transactional and Broadcast Message Streams, unless the project already has a suitable provider
- **Marketing campaigns:** Keep in the project's existing consent-aware email/CRM platform rather than creating a second marketing list
- **Reporting:** SQL views plus a restricted staff dashboard; do not query student data directly from the mobile client

This is a standalone application. Supabase Auth is the application's identity system and Supabase Postgres is the source of truth for app progress, badges, preferences, and reporting. No LMS account, SSO, entitlement lookup, or external student directory is part of the architecture.

## Standalone identity model

### Recommended registration model

1. A student registers or signs in to the app using a verified email and passwordless email code/link through Supabase Auth.
2. Supabase creates a stable user ID after the email is verified.
3. The database creates a minimal profile and default email preferences for that user.
4. The app stores only the managed session secret in platform-secure storage.
5. Registration does not automatically opt the student into optional progress, badge, or marketing email.

Advantages:

- No password database or password cryptography is owned by the app team.
- One standalone identity maps directly to progress, badges, and preferences.
- Passwordless sign-in reduces password reuse and recovery burden.
- The account system can later add Apple or Google sign-in without changing the progress model.

Tradeoff:

- Email-code delivery becomes part of login availability, so production SMTP, rate limits, recovery behavior, and deliverability monitoring are launch requirements.

### Not recommended

- Storing passwords ourselves.
- Shipping a Supabase service-role key or email-provider key inside the app.
- Using email as the database primary key; retain the stable authentication-provider user ID when email changes.
- Giving the mobile client permission to assign roles, mark authoritative progress, or award badges.
- Creating a second marketing list without reconciling consent and suppression status.

## Why Supabase is the recommended application backend

The app's data is naturally relational:

- Students have attempts and progress.
- Attempts apply to versioned challenges and missions.
- Badge awards result from validated progress events.
- Email preferences and consent changes belong to students.
- Staff need aggregate reporting across those relationships.

Postgres is a stronger fit than a document-only model for this reporting and rules work. Supabase adds managed authentication, Row Level Security, database migrations, functions, and Expo-compatible client libraries without requiring the project team to operate a custom authentication stack.

### Alternatives considered

| Option | Strength | Main concern for this app | Recommendation |
|---|---|---|---|
| Supabase | Postgres, RLS, Auth, functions, strong reporting model | RLS and database permissions must be designed and tested carefully | **Recommended** |
| Firebase | Mature mobile tooling, Auth, offline Firestore | Progress/badge reporting and relational integrity become more complex; security rules require equal care | Viable alternative |
| Auth0 or Clerk alone | Strong identity UX | Does not replace the progress database, badge engine, reporting, or email event system | Use only as identity layer |
| Custom Node/AWS backend | Maximum control | More operations, security ownership, and maintenance than the first release needs | Do not start here |

## Proposed system

```text
Expo mobile app
  |-- passwordless auth / short-lived access token
  |-- offline attempt queue
  |-- secure session storage
  |
  v
Supabase
  |-- Auth
  |-- Postgres + Row Level Security
  |-- Edge Functions / trusted badge evaluator
  |-- audit and outbox events
  |
  `----> Postmark or existing project email platform

Restricted staff dashboard
  `----> server-authorized reporting views/functions
```

## Minimum data model

### Identity and access

`profiles`

- `user_id` — references the authentication provider
- `display_name` — optional
- `account_status`
- `locale` — optional
- `created_at`
- `deleted_at` — nullable

`user_roles`

- `user_id`
- `role` — student, support, instructor, or administrator
- `granted_by`
- `granted_at`
- `revoked_at` — nullable

Role assignment must be server-controlled and auditable. Registration always creates a student account; the client cannot promote itself or another account.

### Learning and progress

`missions`

- Stable mission ID
- Curriculum/version ID
- Title and status

`challenges`

- Stable challenge ID
- Mission ID
- Curriculum version
- Rule/configuration reference

`attempts`

- UUID generated on the device
- User ID
- Mission and challenge IDs
- Curriculum version
- Submitted answer or minimal answer facts required for review
- Correct/incorrect result calculated or verified by the server
- Attempt number
- Device occurrence time
- Server receipt time
- App version
- Idempotency key

`progress_summary`

- User ID
- Mission ID
- Completed challenges
- Mastery/status fields
- First and latest activity timestamps
- Version number for conflict handling

Keep the immutable attempt/event history as the source of truth. Treat summaries as derived data that can be rebuilt.

### Badges

`badge_definitions`

- Stable badge code
- Name and student-facing description
- Criteria version
- Active flag
- Artwork reference

`badge_awards`

- User ID
- Badge code
- Criteria version
- Awarded timestamp
- Source event/attempt ID
- Revocation timestamp and reason, if ever required

Use a unique database constraint on `(user_id, badge_code, criteria_version)` so retries cannot award the same badge twice.

### Email preferences

`email_preferences`

- User ID
- Security/account messages — required when necessary to operate the account
- Progress summaries — optional
- Badge notifications — optional
- Educational/news messages — separate optional consent
- Updated timestamp and source

`consent_events`

- User ID
- Preference/category
- Previous and new state
- Timestamp
- Source and policy/version

`email_outbox`

- Event ID
- User ID
- Template/category
- Idempotency key
- Eligibility/consent decision
- Send status
- Provider message ID
- Created/sent timestamps

## Progress and badge flow

1. The student completes a challenge locally.
2. The app immediately updates local progress so losing connectivity does not interrupt the lesson.
3. The app adds a UUID-keyed attempt to an offline sync queue.
4. When connected, the app sends the attempt with the authenticated session.
5. The server ignores any client-supplied user ID and uses the authenticated subject.
6. The server validates the mission, challenge, curriculum version, answer, and attempt format.
7. A transaction inserts the attempt once, updates derived progress, and evaluates badge rules.
8. A newly earned badge is inserted once and creates an outbox event.
9. The app receives the authoritative progress/badge state.
10. The email worker sends a badge message only when that email category is enabled and the address is not suppressed.

The client may display an optimistic celebration, but only the server should create the permanent badge award.

## Badge recommendations

Badges should recognize learning milestones, not pressure students to return.

Use three clearly labeled trust levels:

- **Practice complete:** Local/offline evidence has been preserved and synchronized.
- **Verified mastery:** The server independently validated sufficient evidence; higher-trust awards can require a fresh server-issued verification challenge after offline practice syncs.
- **Portable credential:** A later, explicitly shareable credential. This is not required for the MVP.

A modified mobile client can fabricate offline activity. Offline work should still count as learning progress, but it must not be presented as exam-grade or credential-grade proof without server-verifiable evidence.

Good initial criteria:

- First completed mission
- Correctly solving every prefix family in the curriculum
- Completing a mission without hints
- Improving from an earlier attempt
- Demonstrating mastery across multiple subnet sizes

Avoid at launch:

- Daily streaks
- Public leaderboards
- Timer-based beginner badges
- Badges tied to email opens or marketing activity
- Claims that an in-app badge is an accredited credential

Every badge should have visible criteria. Criteria changes should create a new version rather than silently changing previously earned awards.

## Email recommendation

### Separate message categories

**Required operational messages**

- Verify email/sign-in code
- Account recovery
- Security alert
- Account deletion/export confirmation

**Optional product messages**

- Badge earned
- Progress summary
- New learning activity relevant to the student's settings

**Optional marketing messages**

- Promotions
- General newsletter
- Sales campaigns

Do not bundle marketing consent into account creation. A student must be able to disable progress and badge email without losing the app.

### Provider choice

Use the project's current provider if it already maintains consent, unsubscribes, bounces, and sending-domain reputation.

If a new provider is needed, **Postmark** is the recommended first integration. Its separate Transactional and Broadcast Message Streams provide the clearest operational guardrail against mixing account/security messages with optional lifecycle or marketing email. Broadcast streams require unsubscribe handling, and suppressions can be managed by stream.

**Resend** is the best runner-up when React Email, TypeScript developer experience, or programmatic broadcasts are the higher priority. Amazon SES offers lower-level control but creates substantially more IAM, reputation, queue, template, and preference-management work. SendGrid is capable but requires more operational discipline to keep traffic and suppression semantics separated.

For either provider:

- Send from a project-controlled subdomain such as `auth.[PROJECT_DOMAIN]` or `notifications.[PROJECT_DOMAIN]`.
- Configure SPF, DKIM, and DMARC.
- Keep authentication email separate from marketing reputation.
- Disable open/click tracking for authentication messages.
- Process bounce, complaint, and suppression webhooks idempotently.
- Honor unsubscribe promptly.
- Do not put sensitive detailed performance data in an email subject line.

## Security requirements

### Mobile application

- Keep access tokens in memory where practical and store refresh/session secrets in `expo-secure-store`, never AsyncStorage by default.
- Clear sessions on sign-out and account deletion.
- Use short-lived access tokens with refresh-token rotation or provider-managed sessions.
- Use universal/app links with an allowlisted callback path for email login.
- Never embed service-role keys or email API keys in the app.
- Treat rooted/jailbroken devices as untrusted clients; server authorization remains mandatory.
- Keep the subnet engine and offline lesson available during outages.

### Authentication

- Require email verification before granting account access.
- Use generic responses for registration/reset so attackers cannot enumerate student emails.
- Rate-limit sign-up, OTP, reset, and account-linking requests.
- Add bot protection when public registration opens.
- Require MFA for staff and administrators.
- Support session revocation, passwordless recovery, and account deletion.
- If passwords are later enabled, let the managed identity provider hash and protect them; never handle password cryptography in application code.

### Authorization and database

- Enable Row Level Security on every student-facing table.
- Students can read their own profile, progress, attempts, badges, and preferences only.
- Students can insert attempts for themselves through a restricted function; they cannot write authoritative results or badge awards.
- Staff reporting uses explicit roles and server-side functions/views.
- Do not place staff roles in client-editable profile metadata.
- Keep service-role operations server-side.
- Test every policy with owner, other-student, instructor, admin, anonymous, and revoked-account cases.

### APIs and integrations

- Validate all request bodies and reject unknown curriculum IDs/versions.
- Use idempotency keys for attempt sync, badge awards, emails, and webhook handlers.
- Verify email-provider webhook signatures and require HTTPS.
- Deduplicate repeated webhooks and log failures without storing unnecessary payload fields.
- Store email-provider and backend secrets in server-managed secret storage.
- Apply per-user and per-IP rate limits at public endpoints.

### Operations

- Separate development, staging, and production projects.
- Use project-controlled owner accounts and role-based team access.
- Require MFA for backend, email, DNS, Apple, Google, and Expo/EAS administration.
- Enable database backups and point-in-time recovery appropriate to the launch tier.
- Test restoring data rather than only confirming backups exist.
- Centralize security/audit logs and alert on repeated auth failures, privilege changes, and unusual exports.
- Establish key rotation, dependency updates, incident response, and student-notification procedures.
- Review the mobile app against OWASP MASVS before public release.

## Privacy and student trust

Collect only what is necessary:

- Verified email
- Stable user/provider IDs
- Optional display name
- Challenge attempts and derived progress
- Badge awards
- Email preferences and consent history
- Minimal operational/audit metadata

Do not collect birth date, phone, precise location, contacts, advertising ID, or unrelated profile details unless there is a documented need.

Before collecting real student data, publish plain-language disclosures covering:

- What progress is collected
- Why it is collected
- Who can see it
- How long it is retained
- Whether it is shared with backend hosting or email providers
- How to export or delete an account
- How to change email preferences

The intended age range must be decided before public registration. If children under 13 may use the app, obtain qualified legal/privacy review and implement the required parental-consent and data-minimization workflow before collecting their personal information. Do not casually add a birth-date field as a substitute for an age-policy decision.

## Staff reporting

Start with a restricted, read-only dashboard showing:

- Registered and active users
- Mission starts and completions
- Challenge success and retry rates
- Common incorrect subnet boundaries
- Completion by curriculum version
- Badge awards
- Sync failures
- Email delivery/suppression health

Aggregate views should be the default. Access to individual student records should be limited to staff with a legitimate support or instructional need and should be auditable.

## Rollout phases

### Phase 0 — decisions and data inventory

- Confirm whether registration is public, invite-only during beta, or both in separate environments.
- Confirm passwordless email as the first sign-in method and whether Apple/Google sign-in is a later requirement.
- Confirm intended minimum age.
- Identify the current project email/CRM provider and consent source of truth.
- Define staff roles and who may see individual progress.
- Approve retention, export, and deletion rules.

### Phase 1 — secure backend foundation

- Create project-owned Supabase development/staging projects.
- Add migrations, RLS policies, server functions, test fixtures, and audit events.
- Add passwordless Expo authentication with SecureStore.
- Build registration, verification, sign-in, sign-out, recovery, and deletion flows.
- Add automated authorization tests before connecting real students.

### Phase 2 — local-first synchronization

- Add device persistence and an idempotent attempt queue.
- Add server-validated attempts and derived progress.
- Test offline completion, retries, duplicate delivery, app reinstall, and conflict handling.
- Add an explicit opt-in flow for attaching pre-registration local progress to a new account.

### Phase 3 — badge engine

- Add versioned badge definitions and server-side evaluation.
- Add the in-app badge collection and accessible earned-state presentation.
- Test duplicate, out-of-order, offline, and retroactive award behavior.

### Phase 4 — email and staff reporting

- Connect the approved provider and project-controlled sending subdomain.
- Add category-specific preferences, consent history, unsubscribe, and suppression handling.
- Add restricted aggregate reporting and audited student lookup.

### Phase 5 — security and privacy pilot

- Run RLS/authorization abuse tests and mobile security review.
- Verify backup restore and account deletion/export end to end.
- Pilot with staff/test records, then a small student cohort.
- Review support load and registration/recovery failures before wider release.

## Launch gates

Do not open public registration until all are true:

- Project owner controls all production accounts and DNS records.
- Authentication and account recovery are tested.
- RLS denies cross-student data access.
- Admin MFA and least privilege are enabled.
- Progress sync survives offline/retry scenarios without duplicate credit.
- Badge awards are server-side and idempotent.
- Email preferences, unsubscribe, bounces, and suppressions work end to end.
- Privacy policy and in-app disclosure match actual data flows.
- Account export and deletion work.
- Backups have been restored in a test.
- The intended-age decision is documented.
- Apple and Google privacy disclosures match production behavior.

## Decisions required from project leadership

1. Should registration be public immediately, or invite-only during the beta?
2. Should passwordless email be the only initial sign-in method?
3. What platform currently sends project transactional and marketing email?
4. Which email categories should default off or be explicitly offered during onboarding?
5. What is the intended minimum user age?
6. Which staff roles may view individual student progress?
7. How long should detailed attempts and inactive accounts be retained?
8. Should badges remain private by default, with explicit opt-in sharing?

## Research sources

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Expo authentication guidance: https://docs.expo.dev/develop/authentication/
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- Postmark Message Streams: https://postmarkapp.com/manual
- Postmark Broadcast unsubscribe requirements: https://postmarkapp.com/support/article/1217-why-broadcasts-require-an-unsubscribe-link
- Postmark webhooks: https://postmarkapp.com/developer/webhooks/webhooks-overview
- Resend domain/authentication guidance: https://resend.com/docs/dashboard/domains/introduction
- Resend webhook delivery guidance: https://resend.com/docs/dashboard/webhooks/introduction
- Resend + Supabase authentication deliverability: https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails
- 1EdTech Open Badges 3.0: https://www.imsglobal.org/spec/ob/v3p0
- OWASP Mobile Application Security Verification Standard: https://mas.owasp.org/MASVS/
- FTC CAN-SPAM compliance guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- FTC COPPA guidance: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
