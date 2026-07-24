# 500 Tiered Subnet Questions Implementation Plan

> **For Hermes:** Use test-driven development and subagent-driven development to implement this plan task-by-task. Require spec and code-quality review before merging each milestone.

**Goal:** Expand the verified five-question prototype into a deterministic, locally persistent 500-question IPv4 network-address curriculum organized into four difficulty tiers.

**Architecture:** Generate the catalog from a versioned seed and tier constraints instead of hardcoding 500 records. Every generated question receives a stable ordinal, ID, tier, IP/prefix pair, and engine-derived answer. The existing pure `subnetFacts` engine remains authoritative. The UI consumes the catalog in short resumable sessions while Expo SQLite stores local progress for later backend synchronization.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Expo Router, Jest, fast-check, Expo SQLite.

---

## Requirement interpretation

The requested ranges cover 499 question numbers and leave question **300** unassigned:

- Easy: 1–100 = 100
- Intermediate: 101–299 = 199
- Hard: 301–399 = 99
- Hardest: 400–500 = 101

**Recommended default:** assign question 300 to Hard, producing:

| Tier | Ordinals | Count |
|---|---:|---:|
| Easy | 1–100 | 100 |
| Intermediate | 101–299 | 199 |
| Hard | 300–399 | 100 |
| Hardest | 400–500 | 101 |
| **Total** | **1–500** | **500** |

This preserves the requested start of the hardest tier and changes only the unassigned question.

## Scope for the first expansion

All 500 questions will use the current interaction:

> Given an IPv4 address and CIDR prefix, enter the network address.

This avoids mixing difficulty with new answer formats before the existing input and feedback system can support them. Broadcast, host-range, mask-conversion, subnet-sizing, and reverse-CIDR questions should be a later curriculum milestone with their own tested input components.

“Randomly generated” means algorithmically generated from a fixed versioned seed. The released catalog must be reproducible so bugs, support reports, progress records, and future synchronization can refer to stable question IDs. A later endless-practice mode may use new seeds without changing the canonical 500-question curriculum.

## Tier design

### Easy — questions 1–100

- Prefixes: `/24` through `/30`
- Interesting octet: fourth octet
- Address pools: private IPv4 ranges
- Show mask and block size
- Include boundary and non-boundary target addresses
- Exclude `/31` and `/32`
- Goal: identify fourth-octet block boundaries confidently

### Intermediate — questions 101–299

- Prefixes: `/16` through `/23`, plus mixed `/25` through `/30`
- Interesting octet: third or fourth octet
- Show mask; phase out the block-size hint across the tier
- Avoid excessive exact-network targets
- Goal: move between octets and calculate less obvious boundaries

### Hard — questions 300–399

- Prefixes: `/8` through `/15` and `/17` through `/23`
- Interesting octet: second or third octet
- Hide the block-size hint until after the answer is submitted
- Use non-boundary target addresses by default
- Goal: calculate multi-octet network addresses without guided boundary values

### Hardest — questions 400–500

- Prefixes: `/1` through `/32`
- Weighted toward `/1`–`/7`, octet-boundary prefixes, `/31`, and `/32`
- No mask or block-size hint before submission
- Intentionally include edge cases and exact boundaries
- Goal: demonstrate complete IPv4/CIDR network-address mastery

## Catalog invariants

The generator and CI must prove all of the following:

1. Exactly 500 questions exist.
2. Ordinals are contiguous from 1 through 500.
3. Stable IDs are unique, such as `easy-001` and `hardest-500`.
4. Every `ip/prefix` signature is unique.
5. Every answer equals `subnetFacts(ip, prefix).network`.
6. Every prefix belongs to the configured tier.
7. Every IPv4 address is valid and excludes multicast/reserved address pools selected by policy.
8. Generation is deterministic for the catalog version and seed.
9. Generation terminates within a fixed attempt limit and fails loudly if uniqueness cannot be achieved.
10. `/31` and `/32` semantics remain covered by direct tests.
11. No answer, tier, or ordinal is trusted from a future client sync payload; the server will eventually validate by stable question ID and catalog version.

---

## Task 1: Define the question and tier contracts

**Objective:** Establish one typed source of truth for question ordinals, tiers, constraints, hints, and catalog versions.

**Files:**
- Create: `src/domain/questions/types.ts`
- Create: `src/domain/questions/tierConfig.ts`
- Test: `src/domain/questions/__tests__/tierConfig.test.ts`

**Types:**

```ts
export type DifficultyTier = 'easy' | 'intermediate' | 'hard' | 'hardest';

export type SubnetQuestion = {
  id: string;
  ordinal: number;
  catalogVersion: 'ipv4-network-v1';
  tier: DifficultyTier;
  type: 'network-address';
  ip: string;
  prefix: number;
  answer: string;
  hints: {
    showMaskBeforeAnswer: boolean;
    showBlockSizeBeforeAnswer: boolean;
  };
};

export type TierConfig = {
  tier: DifficultyTier;
  start: number;
  end: number;
  prefixes: readonly number[];
  showMaskBeforeAnswer: boolean;
  showBlockSizeBeforeAnswer: boolean;
};
```

**TDD steps:**

1. Write failing tests asserting tier counts, contiguous ranges, total count 500, and question 300 mapping to `hard`.
2. Run:
   ```bash
   npm test -- --runInBand src/domain/questions/__tests__/tierConfig.test.ts
   ```
   Expected: FAIL because the configuration does not exist.
3. Implement `tierConfigs`, `getTierForOrdinal`, and `getTierConfig`.
4. Rerun the targeted test; expected: PASS.
5. Commit:
   ```bash
   git add src/domain/questions
   git commit -m "feat: define 500-question tier structure"
   ```

## Task 2: Build a deterministic random source

**Objective:** Make generated catalogs reproducible across tests, devices, and releases without using randomness for security.

**Files:**
- Create: `src/domain/questions/seededRandom.ts`
- Test: `src/domain/questions/__tests__/seededRandom.test.ts`

**Contract:**

```ts
export type RandomSource = {
  next(): number; // 0 <= value < 1
  integer(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
};

export function createSeededRandom(seed: string): RandomSource;
```

**TDD steps:**

1. Test that equal seeds produce equal sequences, different seeds produce different sequences, and integer bounds are inclusive.
2. Verify the tests fail.
3. Implement a small deterministic non-cryptographic PRNG with a string-to-32-bit seed hash. Add a code comment stating it must never be used for authentication, tokens, or security decisions.
4. Run targeted tests; expected: PASS.
5. Commit:
   ```bash
   git add src/domain/questions/seededRandom.ts src/domain/questions/__tests__/seededRandom.test.ts
   git commit -m "feat: add deterministic curriculum random source"
   ```

## Task 3: Generate one valid question from tier constraints

**Objective:** Produce a valid question whose answer is always derived from the subnet engine.

**Files:**
- Create: `src/domain/questions/generator.ts`
- Test: `src/domain/questions/__tests__/generator.test.ts`
- Reuse: `src/domain/subnet.ts`

**Generator contract:**

```ts
export function generateQuestion(
  ordinal: number,
  config: TierConfig,
  random: RandomSource,
): SubnetQuestion;
```

**Rules:**

- Never accept a precomputed answer.
- Generate the IP and prefix, then call `subnetFacts` for the answer.
- Produce the stable ID from the tier and zero-padded ordinal.
- Keep address-pool selection in a separate pure helper.
- Do not use loopback, link-local, multicast, or experimental ranges in v1.
- Hard/Hardest questions should avoid accidental exact-network addresses unless the tier explicitly requests an edge case.

**TDD steps:**

1. Write failing tests for one question from each tier.
2. Assert the ordinal, tier, prefix membership, stable ID, valid answer, and hint policy.
3. Add direct `/31` and `/32` hardest-tier fixtures.
4. Implement the smallest generator that passes.
5. Run:
   ```bash
   npm test -- --runInBand src/domain/questions/__tests__/generator.test.ts
   ```
6. Commit:
   ```bash
   git add src/domain/questions/generator.ts src/domain/questions/__tests__/generator.test.ts
   git commit -m "feat: generate tier-aware subnet questions"
   ```

## Task 4: Materialize and validate the 500-question catalog

**Objective:** Build one canonical, deterministic 500-question release catalog.

**Files:**
- Create: `src/domain/questions/catalog.ts`
- Create: `src/domain/questions/validateCatalog.ts`
- Test: `src/domain/questions/__tests__/catalog.test.ts`

**Public API:**

```ts
export const CATALOG_VERSION = 'ipv4-network-v1' as const;
export const CATALOG_SEED = 'ipv4-network-v1-release-1' as const;
export const subnetQuestionCatalog: readonly SubnetQuestion[];

export function validateCatalog(
  questions: readonly SubnetQuestion[],
): { valid: true };
```

**TDD steps:**

1. Write failing tests for all catalog invariants.
2. Add a determinism snapshot based on stable question signatures rather than a large Jest inline snapshot.
3. Add property-based validation across generated addresses and prefixes.
4. Implement generation with a `Set<string>` of `ip/prefix` signatures and a fixed maximum attempt count.
5. Fail startup/tests with a descriptive error if 500 valid unique questions cannot be generated.
6. Run targeted tests; expected: PASS with exactly 500 questions.
7. Commit:
   ```bash
   git add src/domain/questions
   git commit -m "feat: add validated 500-question catalog"
   ```

## Task 5: Extract challenge-session state from the UI

**Objective:** Replace the five-item component-local progression logic with a tested state machine capable of handling 500 questions safely.

**Files:**
- Create: `src/features/challenge/challengeSession.ts`
- Test: `src/features/challenge/__tests__/challengeSession.test.ts`
- Modify later: `src/features/challenge/NetworkChallenge.tsx`

**State contract:**

```ts
export type ChallengeSessionState = {
  currentOrdinal: number;
  answerOctets: [string, string, string, string];
  feedback: null | 'correct' | 'incorrect';
  completedOrdinals: readonly number[];
};
```

**Required behavior:**

- Start or resume at the first incomplete ordinal.
- Advancement remains unavailable until the answer is correct.
- Answer and feedback reset on advancement.
- Question 500 produces curriculum completion rather than silently wrapping to question 1.
- Restart requires an explicit action.
- Tier transitions produce checkpoint state.

**TDD steps:**

1. Write reducer/state-machine tests before implementation.
2. Verify failures.
3. Implement the pure transition functions.
4. Run targeted tests.
5. Commit:
   ```bash
   git add src/features/challenge/challengeSession.ts src/features/challenge/__tests__/challengeSession.test.ts
   git commit -m "feat: add resumable challenge session state"
   ```

## Task 6: Persist local curriculum progress

**Objective:** Ensure learners do not lose hundreds of completed questions when the app closes or connectivity fails.

**Files:**
- Create: `src/progress/localProgressRepository.ts`
- Create: `src/progress/sqliteProgressRepository.ts`
- Test: `src/progress/__tests__/localProgressRepository.test.ts`
- Modify: `src/app/_layout.tsx` only if database initialization requires it

**Record shape:**

```ts
export type LocalQuestionProgress = {
  catalogVersion: string;
  questionId: string;
  ordinal: number;
  completedAt: string;
  attemptCount: number;
  pendingSync: boolean;
};
```

**Rules:**

- Store only local curriculum progress; no identity fields are needed for this milestone.
- Use Expo SQLite, not AsyncStorage, for durable progress/outbox compatibility.
- Completion writes must be idempotent by `catalogVersion + questionId`.
- Never downgrade completed progress when replaying a question.
- Database migration tests should run against the supported Expo SQLite test abstraction.

**TDD steps:**

1. Write repository contract tests using an in-memory implementation.
2. Implement the in-memory version.
3. Add SQLite adapter tests and migration.
4. Implement the SQLite adapter.
5. Verify reload/resume and duplicate completion behavior.
6. Commit:
   ```bash
   git add src/progress src/app/_layout.tsx
   git commit -m "feat: persist local question progress"
   ```

## Task 7: Replace the five-question array in the learner experience

**Objective:** Connect the validated catalog and session state to the current answer interface.

**Files:**
- Modify: `src/features/challenge/NetworkChallenge.tsx`
- Replace or remove: `src/features/challenge/challenges.ts`
- Modify: `src/features/challenge/__tests__/NetworkChallenge.test.tsx`
- Modify: `src/features/challenge/__tests__/challenges.test.ts`

**UI behavior:**

- Display `Question N of 500` and the current tier.
- Display progress within the current tier separately from total progress.
- Keep the existing four-octet answer input.
- Apply hint visibility from the question definition.
- Preserve immediate instructional feedback.
- Show tier-completion checkpoints at 100, 299, 399, and 500 under the recommended range interpretation.
- Do not auto-run all 500 questions in one React render or preload 500 view components; select only the active question from the catalog.
- Do not reset local progress when the app restarts.

**TDD steps:**

1. Update component tests to inject a short fixture catalog instead of depending on all 500 questions.
2. Test ordinal/tier display, correct-answer gating, reset on advance, resume, tier completion, and final completion.
3. Verify tests fail before the component refactor.
4. Implement the minimal component integration.
5. Rerun component and full tests.
6. Commit:
   ```bash
   git add src/features/challenge
   git commit -m "feat: connect tiered catalog to challenge experience"
   ```

## Task 8: Add curriculum-quality reporting for reviewers

**Objective:** Make the generated bank auditable without manually reading 500 records.

**Files:**
- Create: `scripts/report-question-catalog.ts`
- Modify: `package.json`
- Create: `docs/QUESTION_CATALOG.md`

**Report output:**

- Count by tier
- Count by prefix
- Count by interesting octet
- Boundary vs non-boundary targets
- `/31` and `/32` counts
- Duplicate signature count
- First and last five IDs per tier
- Catalog version and seed

**Command:**

```bash
npm run questions:report
```

The command must return nonzero if validation fails. Do not commit a raw 500-question dump unless human review specifically requires it; the seed and generator are the source of truth.

**Commit:**

```bash
git add scripts/report-question-catalog.ts package.json docs/QUESTION_CATALOG.md
git commit -m "docs: add question catalog quality report"
```

## Task 9: Update product documentation and CI

**Objective:** Make the new curriculum behavior visible to developers and enforce it on every pull request.

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/PROJECT_OVERVIEW.md`
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/DECISIONS.md`
- Modify: `CHANGELOG.md`
- Modify: `.github/workflows/ci.yml`

**Required documentation:**

- The canonical catalog is generated, versioned, and deterministic.
- The catalog contains 500 questions with the approved ranges.
- Only network-address questions are included in this milestone.
- Local progress is durable but is not yet synchronized to a production backend.
- Changing the seed or generation rules requires a catalog-version decision and migration review.

**CI additions:**

- Run catalog validation.
- Generate the quality report in check mode.
- Keep Jest, lint, TypeScript, Expo Doctor, and native export checks.

**Commit:**

```bash
git add README.md ROADMAP.md docs CHANGELOG.md .github/workflows/ci.yml
git commit -m "docs: document tiered subnet curriculum"
```

## Task 10: Final acceptance and pull request

**Objective:** Prove the entire feature works before merging to `main`.

**Branch:**

```bash
git switch -c feature/500-tiered-subnet-questions
```

**Required verification:**

```bash
npm run check
npm run export:native
npm run questions:report
git diff --check main...HEAD
```

**Manual acceptance:**

1. Start a new learner profile and confirm question 1 is Easy.
2. Complete a question, restart the app, and confirm progress resumes.
3. Verify question 100 completes Easy.
4. Verify question 101 starts Intermediate.
5. Verify question 299 completes Intermediate.
6. Verify question 300 starts Hard under the recommended range interpretation.
7. Verify question 399 completes Hard.
8. Verify question 400 starts Hardest.
9. Verify question 500 produces final curriculum completion.
10. Verify hints become less explicit by tier.
11. Verify incorrect answers never advance progress.
12. Verify no public leaderboard, timer gate, streak pressure, or connectivity requirement was introduced.

**Review gates:**

- Independent spec-compliance review
- Independent security/code-quality review
- Physical-device smoke test before merging
- GitHub Actions green

**Merge strategy:** Squash or merge only after review approval. Tag the completed curriculum milestone after `main` is verified.

---

## Risks and mitigations

- **Random content can be inconsistent:** use a versioned seed and catalog validator.
- **Five hundred sequential questions can feel exhausting:** display tier progress and short resumable sessions; never require one sitting.
- **Difficulty may not match real learners:** generate by explicit constraints, inspect catalog reports, then calibrate with pilot data.
- **Changing generated content can corrupt progress references:** include `catalogVersion` in every question and progress record.
- **Too many question types at once increases UI and test complexity:** keep this milestone network-address-only.
- **Hardest-tier edge cases can teach disputed conventions:** document `/31` point-to-point and `/32` host-route semantics explicitly.
- **Local progress can be mistaken for verified cross-device progress:** label it local until the server-authoritative synchronization milestone ships.

## Decisions needed before implementation

1. Confirm that question **300** belongs to Hard, preserving Hardest as 400–500.
2. Confirm that the first 500-question milestone should remain **network-address questions only**.
3. Confirm whether learners must finish every earlier question to unlock the next tier, or whether a mastery threshold may unlock it.
4. Confirm whether the canonical order should remain fixed or shuffle within each tier while preserving stable question IDs.

## Recommended delivery sequence

1. **Generator vertical slice:** Tasks 1–4.
2. **Resumable learner flow:** Tasks 5–7.
3. **Curriculum QA and documentation:** Tasks 8–9.
4. **Device verification and reviewed merge:** Task 10.

The generator vertical slice is the best immediate next step because it creates the full validated 500-question bank without first coupling it to UI, accounts, or backend infrastructure.
