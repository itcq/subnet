# Standalone Account and Progress Vertical Slice Implementation Plan

> **For Hermes:** Use test-driven development and execute this plan task-by-task. Do not connect real student data until the security, privacy, and ownership gates are approved.

**Goal:** Deliver a secure standalone beta slice in which an invited student can register with a verified email, complete a subnet challenge offline, synchronize the attempt, receive one server-awarded badge, and view canonical progress.

**Architecture:** Preserve the existing Expo lesson as a local-first client. Supabase Auth supplies standalone identity; Postgres with Row Level Security stores canonical progress; an Edge Function validates idempotent attempt batches and evaluates badges. The device uses SQLite for durable local progress/outbox data and Expo SecureStore for session secrets. Postmark is deferred behind an email-provider interface until project-owned credentials and a sending domain are approved.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6, Expo Router, Jest, React Native Testing Library, Expo SecureStore, Expo SQLite, Supabase Auth/Postgres/Edge Functions, pgTAP, Postmark.

---

## Product defaults for the beta

Proceed with these defaults unless Zach changes them:

- Standalone application; no LMS, SSO, or external student directory.
- Invite-only beta before public registration.
- Passwordless verified-email sign-in.
- Registration creates only a `student` role.
- Optional progress, badge, and marketing email preferences default off.
- Badges are private by default.
- Offline practice is preserved; server state is authoritative for verified progress and badges.
- No real students until minimum-age, retention, privacy, staff-access, and deletion rules are approved.

## Proof required at the end

A test user must be able to:

1. Request and complete passwordless sign-in.
2. Complete a challenge with the network unavailable.
3. Restart the app without losing the queued attempt.
4. Reconnect and synchronize the attempt once.
5. See canonical progress from the backend.
6. Earn exactly one server-awarded `first-mission` badge.
7. Be unable to read another student's progress or assign a badge/role directly.
8. Sign out and remove the local session.

---

### Task 1: Establish local Supabase development infrastructure

**Objective:** Create a reproducible local backend without production credentials.

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/seed.sql`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `README.md`

**Steps:**

1. Add local Supabase CLI scripts to `package.json`: `backend:start`, `backend:stop`, `backend:reset`, and `backend:test`.
2. Initialize the `supabase/` directory using the current Supabase CLI.
3. Add placeholders only to `.env.example`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[LOCAL_PUBLISHABLE_KEY]
```

4. Ignore `.env`, local Supabase temporary data, and generated function artifacts.
5. Start the local stack and record the CLI-reported local URL; never commit service-role credentials.
6. Verify with:

```bash
npx supabase status
```

**Expected:** Local API, database, auth, and mail-testing services are healthy.

---

### Task 2: Create the standalone identity and learning schema with RLS

**Objective:** Establish minimum tables, constraints, and deny-by-default authorization.

**Files:**
- Create: `supabase/migrations/20260717_001_initial_learning_schema.sql`
- Create: `supabase/tests/database/001_rls_test.sql`
- Create: `supabase/tests/database/002_constraints_test.sql`

**Schema:**

- `profiles(user_id, display_name, locale, account_status, created_at, deleted_at)`
- `user_roles(user_id, role, granted_by, granted_at, revoked_at)`
- `missions(id, curriculum_version, title, status)`
- `challenges(id, mission_id, curriculum_version, verifier_key)`
- `attempts(id, user_id, challenge_id, curriculum_version, normalized_answer, correct, client_occurred_at, server_received_at, app_version, payload_hash)`
- `progress_summary(user_id, mission_id, completed_challenges, status, projection_version, first_activity_at, latest_activity_at)`
- `badge_definitions(id, badge_key, version, name, criteria_text, criteria_hash, active)`
- `badge_awards(id, user_id, badge_definition_id, source_attempt_id, evidence_snapshot, issued_at, revoked_at)`
- `email_preferences(user_id, badge_email, progress_email, marketing_email, updated_at)`
- `consent_events(id, user_id, category, previous_state, new_state, policy_version, source, created_at)`
- `outbox_events(id, aggregate_type, aggregate_id, event_type, payload, created_at, published_at)`

**TDD steps:**

1. Write pgTAP tests proving anonymous users cannot read or write student data.
2. Write tests proving Student A cannot read Student B's profile, attempts, progress, badges, or preferences.
3. Write tests proving a student cannot insert `user_roles`, `progress_summary`, or `badge_awards`.
4. Write tests proving registration creates a profile, default student role, and all optional email preferences set to false.
5. Write constraint tests for duplicate attempt IDs and duplicate badge awards.
6. Run tests and confirm failure before the migration exists:

```bash
npx supabase db reset
npx supabase test db
```

7. Implement the schema, grants, triggers, and RLS policies.
8. Rerun until all database tests pass.

**Security rule:** No table in an exposed schema may remain without RLS and explicit grants.

---

### Task 3: Install mobile auth and persistence dependencies

**Objective:** Add only the supported packages required for the vertical slice.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`

**Command:**

```bash
npx expo install @supabase/supabase-js expo-secure-store expo-sqlite react-native-url-polyfill
```

**Configuration:**

- Add `expo-secure-store` to Expo plugins if required by SDK 57.
- Add exact passwordless redirect paths under the existing `subnetgame` scheme.
- Do not place private values in `EXPO_PUBLIC_*` variables.

**Verification:**

```bash
npx expo-doctor
npx expo config --type public
```

**Expected:** Expo Doctor passes and public config contains no secret material.

---

### Task 4: Implement SecureStore-backed session persistence

**Objective:** Persist only managed auth session secrets in platform-secure storage.

**Files:**
- Create: `src/auth/secureSessionStorage.ts`
- Create: `src/auth/__tests__/secureSessionStorage.test.ts`
- Create: `src/lib/supabase.ts`

**TDD steps:**

1. Mock `expo-secure-store` and write tests for `getItem`, `setItem`, and `removeItem`.
2. Verify `setItem` rejects unexpectedly large or empty keys.
3. Verify sign-out removal is idempotent.
4. Run the focused test and confirm failure:

```bash
npm test -- src/auth/__tests__/secureSessionStorage.test.ts --runInBand
```

5. Implement the adapter and Supabase client with `persistSession: true`, `autoRefreshToken: true`, and the SecureStore adapter.
6. Rerun the focused test.

**Security rule:** Never fall back silently to AsyncStorage for tokens.

---

### Task 5: Add an authentication state boundary

**Objective:** Route signed-out users to registration and signed-in users to the lesson without weakening offline lesson behavior.

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`
- Create: `src/features/auth/__tests__/AuthProvider.test.tsx`
- Modify: `src/app/_layout.tsx`
- Create: `src/app/sign-in.tsx`

**TDD steps:**

1. Test loading, signed-out, signed-in, expired-session, and sign-out states.
2. Test that auth errors do not expose whether another student's email exists.
3. Test that a signed-in session restores after provider remount.
4. Implement the smallest provider and route gate that passes.
5. Ensure the existing subnet domain and challenge components do not import Supabase directly.

---

### Task 6: Build passwordless registration/sign-in

**Objective:** Allow an invited beta student to request and complete a verified email sign-in.

**Files:**
- Create: `src/features/auth/SignInScreen.tsx`
- Create: `src/features/auth/__tests__/SignInScreen.test.tsx`
- Create: `src/features/auth/authService.ts`
- Modify: `src/app/sign-in.tsx`

**TDD steps:**

1. Test valid email submission, malformed email rejection, neutral success messaging, duplicate taps, provider failure, and resend cooldown UI.
2. Test that the screen never asks for an external-platform password.
3. Implement `signInWithOtp` with an allowlisted app redirect.
4. Add an invite check in the backend for beta; do not encode invite lists in the app.
5. Test expired, reused, malformed, and wrong-route callback links.

**Student-facing success message:**

> If this address is eligible, check your inbox for a secure sign-in link.

---

### Task 7: Add durable local attempt storage

**Objective:** Preserve progress when offline or when the process restarts.

**Files:**
- Create: `src/storage/database.ts`
- Create: `src/storage/migrations.ts`
- Create: `src/storage/attemptOutbox.ts`
- Create: `src/storage/__tests__/attemptOutbox.test.ts`
- Modify: `src/features/challenge/NetworkChallenge.tsx`

**Model:**

```ts
type PendingAttempt = {
  id: string;
  challengeId: string;
  curriculumVersion: string;
  normalizedAnswer: string;
  clientOccurredAt: string;
  appVersion: string;
  state: 'pending' | 'sending' | 'acknowledged' | 'retryable' | 'rejected';
};
```

**TDD steps:**

1. Test append, restart/reload, ordered batch retrieval, acknowledgement, and duplicate UUID behavior.
2. Test stale `sending` rows return to `pending` after startup.
3. Test per-item rejection does not discard other queued attempts.
4. Implement with Expo SQLite transactions.
5. Update the challenge flow to append an attempt after answer submission without blocking feedback.

---

### Task 8: Implement the server-authoritative attempt sync endpoint

**Objective:** Accept offline batches idempotently and recompute correctness on the server.

**Files:**
- Create: `supabase/functions/sync-attempts/index.ts`
- Create: `supabase/functions/_shared/attemptSchema.ts`
- Create: `supabase/functions/_shared/subnetVerifier.ts`
- Create: `supabase/functions/tests/sync-attempts.test.ts`
- Create: `src/sync/syncAttempts.ts`
- Create: `src/sync/__tests__/syncAttempts.test.ts`

**Request rules:**

- Derive `user_id` only from the verified access token.
- Accept known event fields only.
- Bound item count and payload size.
- Validate challenge and curriculum versions.
- Recompute the expected subnet answer; never accept client-provided `correct` or badge eligibility.
- Compare a canonical payload hash for repeated IDs.

**Expected dispositions:** `accepted`, `duplicate`, `rejected`, `quarantined`.

**TDD abuse cases:**

- Cross-user attempt ID
- Unknown challenge/version
- Same ID and same payload
- Same ID and changed payload
- Oversized batch
- Invalid answer
- Expired/revoked account

**Transaction:** Insert attempt, update progress projection, evaluate badges, and insert outbox events atomically.

---

### Task 9: Award the first server-side badge

**Objective:** Prove that permanent badges cannot be granted by the client.

**Files:**
- Modify: `supabase/migrations/20260717_001_initial_learning_schema.sql` or create a follow-up migration
- Create: `supabase/tests/database/003_badge_award_test.sql`
- Modify: `supabase/functions/sync-attempts/index.ts`

**Badge definition:**

- Key: `first-mission`
- Trust label: `Verified mastery`
- Criterion: server-validated completion of all challenges in the first mission
- Version: `1`

**TDD steps:**

1. Test no award before the criterion is met.
2. Test exactly one award when the final required attempt is accepted.
3. Test sync retries do not create duplicates.
4. Test a student cannot insert or modify the award directly.
5. Test the award includes frozen criteria and evidence references.

---

### Task 10: Reconcile and display canonical progress

**Objective:** Show students what is saved locally versus synchronized and verified.

**Files:**
- Create: `src/features/progress/ProgressScreen.tsx`
- Create: `src/features/progress/__tests__/ProgressScreen.test.tsx`
- Create: `src/features/progress/progressRepository.ts`
- Create: `src/app/progress.tsx`
- Modify: `src/features/challenge/NetworkChallenge.tsx`

**TDD steps:**

1. Test `Saved on this device`, `Syncing`, `Synced`, and `Needs attention` states.
2. Test canonical server progress replaces stale local projections without deleting unsynced events.
3. Test earned badge name, criterion, version, and private-by-default status.
4. Test another user's records never render even if malicious local data is injected.

---

### Task 11: Add account and privacy controls

**Objective:** Make account lifecycle and communication choices usable before real students join.

**Files:**
- Create: `src/features/account/AccountScreen.tsx`
- Create: `src/features/account/__tests__/AccountScreen.test.tsx`
- Create: `src/features/account/accountService.ts`
- Create: `src/app/account.tsx`
- Create: `supabase/functions/delete-account/index.ts`

**Behavior:**

- Show verified email and optional display name.
- Allow progress and badge email preferences independently; both default off.
- Provide sign out.
- Provide account deletion with recent reauthentication and a clear confirmation.
- Clear SecureStore and local identity-bound caches after deletion.
- Preserve only legally/operationally required audit records in pseudonymized form according to the approved retention policy.

**TDD abuse cases:** Attempting to delete another account, stale session, repeated deletion, and network interruption after server deletion.

---

### Task 12: Add the email outbox boundary without production sending

**Objective:** Make communication event-driven and consent-aware before provider credentials exist.

**Files:**
- Create: `supabase/functions/process-email-outbox/index.ts`
- Create: `supabase/functions/_shared/emailProvider.ts`
- Create: `supabase/functions/_shared/postmarkProvider.ts`
- Create: `supabase/functions/tests/process-email-outbox.test.ts`

**TDD steps:**

1. Test account/security mail classification separately from optional badge/progress mail.
2. Test optional email is skipped when consent is false.
3. Test current consent and suppression are rechecked immediately before send.
4. Test deterministic idempotency keys prevent duplicate badge emails.
5. Test bounce/complaint webhook events suppress future optional sends.
6. Use a fake provider locally; do not provision Postmark or DNS until approved.

---

### Task 13: Add restricted staff reporting

**Objective:** Provide useful aggregate reporting without broadly exposing student records.

**Files:**
- Create: `supabase/migrations/20260717_002_reporting_views.sql`
- Create: `supabase/tests/database/004_reporting_access_test.sql`
- Create later, after access approval: `admin/` web application

**Initial views:**

- Mission starts/completions
- Challenge correctness/retry rates
- Common incorrect subnet boundaries
- Badge awards by definition/version
- Sync failure counts

**Authorization tests:**

- Students and anonymous users cannot query reporting views.
- Support cannot export data unless explicitly granted.
- Instructor/admin roles require server-enforced MFA/AAL2.
- Individual lookup is auditable and separate from aggregate reporting.

Do not build the admin web UI until staff roles and individual-record access are approved.

---

### Task 14: Run the complete security and mobile verification gate

**Objective:** Produce evidence that the vertical slice works, not merely that it compiles.

**Automated checks:**

```bash
npm run check
npx supabase db reset
npx supabase test db
npm run export:native
git diff --check
```

**Runtime checks:**

1. Start the local Supabase stack and Expo app.
2. Sign in using the local mail-testing inbox.
3. Disable network connectivity.
4. Complete the first mission.
5. Restart the app and verify the outbox remains.
6. Restore connectivity and synchronize.
7. Verify attempts are accepted once and the badge is awarded once.
8. Sign in as a second user and verify no first-user data is accessible.
9. Attempt direct writes to role, progress, and badge tables; verify denial.
10. Verify sign-out clears the SecureStore session.
11. Inspect browser/device logs for secrets, tokens, personal data, and uncaught errors.
12. Produce an Android preview build after local verification and test the same flow on a physical device.

**Security review gate:** Review authentication, storage, network, privacy, and resilience controls against OWASP MASVS before inviting students.

---

## Files likely to change

```text
package.json
package-lock.json
app.json
.env.example
.gitignore
README.md
src/app/_layout.tsx
src/app/sign-in.tsx
src/app/progress.tsx
src/app/account.tsx
src/auth/*
src/lib/supabase.ts
src/storage/*
src/sync/*
src/features/auth/*
src/features/challenge/NetworkChallenge.tsx
src/features/progress/*
src/features/account/*
supabase/config.toml
supabase/seed.sql
supabase/migrations/*
supabase/tests/database/*
supabase/functions/*
```

## Risks and mitigations

- **RLS configuration error:** Deny by default and require owner/other-user abuse tests before every schema change.
- **Extracted mobile configuration:** Only the publishable key may ship; all privileged keys remain server-side.
- **Duplicate offline events:** UUID + canonical payload hash + database uniqueness + atomic transactions.
- **False high-trust badges:** Server recomputes answers; higher-trust badges require server-verifiable evidence.
- **Email login availability:** Configure production SMTP, SPF/DKIM/DMARC, monitoring, cooldowns, and recovery before beta.
- **Privacy drift:** Keep optional communications off by default and review actual store disclosures against production behavior.
- **Unclear minor policy:** Do not invite real students until the intended minimum age and required legal/privacy workflow are approved.

## Decisions Zach should confirm before real-student testing

1. Invite-only beta or immediate public registration — **recommend invite-only beta**.
2. Passwordless email only for the first release — **recommend yes**.
3. Intended minimum age.
4. Staff roles allowed to view individual progress.
5. Detailed-attempt and inactive-account retention periods.
6. Existing project email provider or approval to provision Postmark.
7. Whether badge sharing remains private by default — **recommend yes**.
