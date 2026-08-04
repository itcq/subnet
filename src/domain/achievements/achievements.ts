export const LOCAL_ACHIEVEMENT_VERIFICATION = 'local-practice-not-server-verified' as const;

export type LocalTimedResult = Readonly<{
  resultId: string;
  score: number;
  elapsedSeconds: number;
  failureCount: number;
  hintsUsed: number;
  timeLimitSeconds: number;
}>;

export type LocalRank = Readonly<{
  id: 'explorer' | 'solver' | 'analyst' | 'architect';
  name: 'Explorer' | 'Solver' | 'Analyst' | 'Architect';
  minimumScore: number;
}>;

export type LocalBadgeDefinition = Readonly<{
  id: 'first-timed-solve' | 'persistent-solver' | 'hint-explorer' | 'five-timed-solves';
  name: string;
  description: string;
}>;

export type LocalBadgeAward = LocalBadgeDefinition &
  Readonly<{ verification: typeof LOCAL_ACHIEVEMENT_VERIFICATION }>;

export type LocalAchievementSummary = Readonly<{
  totalScore: number;
  completedTimedChallenges: number;
  rank: LocalRank;
  badges: readonly LocalBadgeAward[];
  verification: typeof LOCAL_ACHIEVEMENT_VERIFICATION;
}>;

function freezeRank(rank: LocalRank): LocalRank {
  return Object.freeze(rank);
}

function freezeBadge(badge: LocalBadgeDefinition): LocalBadgeDefinition {
  return Object.freeze(badge);
}

export const LOCAL_RANKS: readonly LocalRank[] = Object.freeze([
  freezeRank({ id: 'explorer', name: 'Explorer', minimumScore: 0 }),
  freezeRank({ id: 'solver', name: 'Solver', minimumScore: 2500 }),
  freezeRank({ id: 'analyst', name: 'Analyst', minimumScore: 7500 }),
  freezeRank({ id: 'architect', name: 'Architect', minimumScore: 15000 }),
]);

export const LOCAL_BADGE_DEFINITIONS: readonly LocalBadgeDefinition[] = Object.freeze([
  freezeBadge({
    id: 'first-timed-solve',
    name: 'First Timed Solve',
    description: 'Complete one timed subnet challenge.',
  }),
  freezeBadge({
    id: 'persistent-solver',
    name: 'Persistent Solver',
    description: 'Complete a timed challenge after three or more incorrect attempts.',
  }),
  freezeBadge({
    id: 'hint-explorer',
    name: 'Hint Explorer',
    description: 'Use an optional hint and complete the timed challenge.',
  }),
  freezeBadge({
    id: 'five-timed-solves',
    name: 'Five Timed Solves',
    description: 'Complete five timed challenges in local practice.',
  }),
]);

function validateSafeNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function validateResult(result: LocalTimedResult): void {
  if (typeof result.resultId !== 'string' || result.resultId.trim().length === 0) {
    throw new TypeError('resultId must be a non-empty string');
  }
  validateSafeNonNegativeInteger(result.score, 'score');
  validateSafeNonNegativeInteger(result.elapsedSeconds, 'elapsedSeconds');
  validateSafeNonNegativeInteger(result.failureCount, 'failureCount');
  validateSafeNonNegativeInteger(result.hintsUsed, 'hintsUsed');
  if (!Number.isSafeInteger(result.timeLimitSeconds) || result.timeLimitSeconds <= 0) {
    throw new Error('timeLimitSeconds must be a positive safe integer');
  }
}

function badgeIsEarned(id: LocalBadgeDefinition['id'], results: readonly LocalTimedResult[]): boolean {
  switch (id) {
    case 'first-timed-solve':
      return results.length >= 1;
    case 'persistent-solver':
      return results.some(({ failureCount }) => failureCount >= 3);
    case 'hint-explorer':
      return results.some(({ hintsUsed }) => hintsUsed >= 1);
    case 'five-timed-solves':
      return results.length >= 5;
  }
}

export function calculateAchievementSummary(
  suppliedResults: readonly LocalTimedResult[],
): LocalAchievementSummary {
  const uniqueResults = new Map<string, LocalTimedResult>();
  for (const result of suppliedResults) {
    validateResult(result);
    if (!uniqueResults.has(result.resultId)) {
      uniqueResults.set(result.resultId, result);
    }
  }

  const results = [...uniqueResults.values()];
  const totalScore = results.reduce((total, { score }) => total + score, 0);
  if (!Number.isSafeInteger(totalScore)) {
    throw new RangeError('totalScore must remain a safe integer');
  }
  const rank = [...LOCAL_RANKS]
    .reverse()
    .find(({ minimumScore }) => totalScore >= minimumScore)!;
  const badges = LOCAL_BADGE_DEFINITIONS.filter(({ id }) => badgeIsEarned(id, results)).map(
    (definition) =>
      Object.freeze({
        ...definition,
        verification: LOCAL_ACHIEVEMENT_VERIFICATION,
      }),
  );

  return Object.freeze({
    totalScore,
    completedTimedChallenges: results.length,
    rank,
    badges: Object.freeze(badges),
    verification: LOCAL_ACHIEVEMENT_VERIFICATION,
  });
}

export function buildLocalBadgeShareMessage(
  summary: LocalAchievementSummary,
  badgeId: string,
): string {
  const definition = LOCAL_BADGE_DEFINITIONS.find(({ id }) => id === badgeId);
  if (!definition) {
    throw new Error(`Unknown badge ${badgeId}`);
  }
  if (!summary.badges.some(({ id }) => id === badgeId)) {
    throw new Error(`Badge ${badgeId} has not been earned`);
  }

  return `I earned the ${definition.name} local achievement in Subnet Game. This is a local practice milestone, not a server-verified credential.`;
}
