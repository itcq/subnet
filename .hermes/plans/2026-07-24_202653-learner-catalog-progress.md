# Learner Catalog and Local Progress Implementation Plan

> **For Hermes:** Use subagent-driven development and strict TDD to implement this plan task-by-task. Require spec and code-quality reviews before commit or push.

**Goal:** Replace the five-question prototype flow with the merged 500-question catalog, clear tier checkpoints, and durable offline local progress.

**Architecture:** Keep curriculum generation and subnet calculations pure TypeScript. Extract challenge progression into a pure state module, inject question catalogs into the UI for small deterministic component tests, and persist canonical local completion records through a repository abstraction backed by Expo SQLite. The learner interface reads only the active question rather than rendering 500 components.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Expo Router, Jest, React Native Testing Library, Expo SQLite 57.

---

## Confirmed baseline

- `main` is synchronized with GitHub PR #1 at `58dc43f`.
- The 500-question catalog is merged and verified.
- New branch: `feature/learner-catalog-progress`.
- Canonical ranges:
  - Easy: 1–100
  - Intermediate: 101–299
  - Hard: 300–399
  - Hardest: 400–500
- The current UI still imports the old five-question array and stores all progression in component state.
- Expo SQLite `~57.0.1` is already installed.
- Expo SDK 57 documentation confirms `openDatabaseAsync`, parameterized `runAsync`, `getAllAsync`, WAL mode, and database persistence across app restarts.
- Web support for Expo SQLite is alpha and requires explicit WASM and COEP/COOP configuration; this milestone must not silently claim durable web support until that configuration and browser verification are complete.

## Product defaults

- Questions stay in canonical ordinal order.
- A tier unlocks after the learner correctly completes every earlier question.
- Correct answers persist completion immediately; advancing is still a separate learner action.
- Incorrect answers never advance or persist completion.
- Replaying a completed question never deletes or downgrades stored progress.
- No timer, streak pressure, leaderboard, or connectivity requirement is introduced.
- Local progress is explicitly local until the server-authoritative synchronization milestone ships.

---

## Task 1: Pure challenge-session state

**Files**
- Create: `src/features/challenge/challengeSession.ts`
- Create: `src/features/challenge/__tests__/challengeSession.test.ts`

**Contract**

```ts
export type ChallengeSessionState = {
  readonly currentOrdinal: number;
  readonly answerOctets: readonly [string, string, string, string];
  readonly feedback: null | 'correct' | 'incorrect';
  readonly completedOrdinals: readonly number[];
  readonly curriculumComplete: boolean;
};

export function createChallengeSession(
  questions: readonly SubnetQuestion[],
  completedOrdinals?: readonly number[],
): ChallengeSessionState;

export function updateAnswerOctet(
  state: ChallengeSessionState,
  index: number,
  value: string,
): ChallengeSessionState;

export function submitCurrentAnswer(
  state: ChallengeSessionState,
  questions: readonly SubnetQuestion[],
): ChallengeSessionState;

export function advanceSession(
  state: ChallengeSessionState,
  questions: readonly SubnetQuestion[],
): ChallengeSessionState;
```

**TDD behaviors**

1. Starts at the first incomplete question.
2. Starts at question 1 with no progress.
3. Sanitizes octets to 0–255.
4. Correct submission marks the ordinal complete exactly once.
5. Incorrect submission does not change completion.
6. Advancement is rejected unless feedback is correct.
7. Advancement clears answer and feedback.
8. Question 500 produces curriculum completion without wrapping.
9. Empty or noncontiguous fixture catalogs fail with descriptive errors.
10. Completed ordinals not present in the active catalog are ignored for session positioning but retained only if explicitly required by catalog-version migration; v1 should fail closed on catalog mismatch.

**Verification**

```bash
npm test -- --runInBand src/features/challenge/__tests__/challengeSession.test.ts
```

## Task 2: Local progress repository contract

**Files**
- Create: `src/progress/localProgressRepository.ts`
- Create: `src/progress/inMemoryProgressRepository.ts`
- Create: `src/progress/__tests__/localProgressRepository.test.ts`

**Contract**

```ts
export type LocalQuestionProgress = {
  readonly catalogVersion: string;
  readonly questionId: string;
  readonly ordinal: number;
  readonly completedAt: string;
  readonly attemptCount: number;
  readonly pendingSync: boolean;
};

export type LocalProgressRepository = {
  initialize(): Promise<void>;
  listCompleted(catalogVersion: string): Promise<readonly LocalQuestionProgress[]>;
  recordCompletion(input: LocalQuestionProgress): Promise<void>;
};
```

**TDD behaviors**

1. Empty repository returns no completion rows.
2. Completion is idempotent by `catalogVersion + questionId`.
3. Repeated completion retains the earliest completion timestamp.
4. Repeated completion keeps the highest attempt count.
5. Different catalog versions remain isolated.
6. Returned records cannot mutate repository state.

## Task 3: Expo SQLite progress adapter

**Files**
- Create: `src/progress/sqliteProgressRepository.ts`
- Create: `src/progress/__tests__/sqliteProgressRepository.test.ts`

**Database schema**

```sql
CREATE TABLE IF NOT EXISTS question_progress (
  catalog_version TEXT NOT NULL,
  question_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 500),
  completed_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  pending_sync INTEGER NOT NULL DEFAULT 1 CHECK (pending_sync IN (0, 1)),
  PRIMARY KEY (catalog_version, question_id)
);
```

**Implementation requirements**

- Open `subnet-progress.db` with `openDatabaseAsync`.
- Enable WAL and migrate with `PRAGMA user_version`.
- Use parameterized `runAsync`/`getAllAsync`; never interpolate record values into SQL.
- Use `INSERT ... ON CONFLICT ... DO UPDATE` so timestamp is not overwritten and attempt count only increases.
- Sort completion reads by ordinal.
- Inject the minimal database interface in tests; do not require a device-native SQLite binary in Jest.
- Do not enable SQLCipher or change native config in this milestone; these records contain curriculum state but no credentials or identity.

**Web boundary**

Do not initialize the native adapter on web until the required SDK 57 WASM and COEP/COOP setup is implemented and tested. Use an explicitly labeled in-memory fallback for web development, or defer durable web progress with a visible status note. Mobile remains the release target for durable SQLite progress.

## Task 4: Progress-loading hook

**Files**
- Create: `src/progress/useLocalProgress.ts`
- Create: `src/progress/__tests__/useLocalProgress.test.tsx`

**Behavior**

- Initialize repository once.
- Load completed rows before rendering an active challenge.
- Expose `loading`, `completedOrdinals`, `recordCompletion`, and `error`.
- Optimistically update local UI only after the repository write succeeds.
- Prevent unmounted-state updates.
- Surface a friendly retry state without discarding the active answer.

## Task 5: Connect the 500-question catalog to the UI

**Files**
- Modify: `src/features/challenge/NetworkChallenge.tsx`
- Modify: `src/features/challenge/__tests__/NetworkChallenge.test.tsx`
- Replace/remove after migration: `src/features/challenge/challenges.ts`
- Modify/remove: `src/features/challenge/__tests__/challenges.test.ts`

**Component design**

```ts
export type NetworkChallengeProps = {
  readonly questions?: readonly SubnetQuestion[];
  readonly initialCompletedOrdinals?: readonly number[];
  readonly onQuestionCompleted?: (question: SubnetQuestion) => Promise<void> | void;
};
```

Defaults use `subnetQuestionCatalog`; tests inject two- or three-question fixture catalogs.

**UI acceptance criteria**

- Displays `Question N of 500`.
- Displays tier name and progress within the current tier.
- Uses the existing four-octet answer control.
- Applies each question’s pre-answer mask and block-size hint policy.
- Reveals complete instructional feedback after submission.
- Keeps advancement locked until correct.
- Clears answer and feedback on advance.
- Uses checkpoint button labels after 100, 299, and 399.
- Question 500 displays curriculum completion and never wraps automatically.
- Only the active question is rendered.

**Targeted tests**

1. Starts at injected first incomplete question.
2. Shows ordinal, total, tier, and tier progress.
3. Hides hints according to question policy before submission.
4. Reveals explanation after incorrect/correct submission.
5. Persists only correct completion.
6. Advances and resets local answer state.
7. Shows a tier checkpoint label at a fixture tier boundary.
8. Shows final completion for the final fixture question.

## Task 6: Wire persistence at the route boundary

**Files**
- Modify: `src/app/index.tsx`
- Create: `src/progress/createProgressRepository.ts`
- Modify: `metro.config.js` only if durable web SQLite is included now
- Modify: app/hosting configuration only if COEP/COOP headers are implemented and verified

**Behavior**

- Mobile uses one SQLite repository instance.
- Route shows a lightweight loading state during progress hydration.
- Repository failure provides retry rather than resetting progress.
- Web behavior is explicit and tested; no silent persistence claim.

## Task 7: Documentation and final verification

**Files**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/DECISIONS.md`

**Required verification**

```bash
npm run check
npm run export:native
git diff --check main...HEAD
```

**Manual verification**

1. Fresh install starts at question 1.
2. Correct completion advances only after the learner presses the next action.
3. App restart resumes at the first incomplete question on Android and iOS.
4. Question/tier counts match the catalog.
5. Hidden hints become visible in feedback.
6. Tier checkpoints appear at 100, 299, and 399.
7. Question 500 completes without wrapping.
8. Offline mode does not prevent lesson play or local completion.
9. Web export still builds; persistence limitations are accurately disclosed if durable web support is deferred.

**Review gates**

- Independent spec-compliance review
- Independent code-quality/security review
- Physical-device persistence smoke test before merge
- GitHub Actions green

---

## Delivery sequence

1. Pure session state
2. Repository contract and in-memory implementation
3. SQLite adapter
4. Progress-loading hook
5. UI integration
6. Route wiring
7. Documentation, device verification, review, and pull request

The immediate implementation target is Tasks 1–2. They establish progression and persistence contracts without coupling tests to React Native or native SQLite.