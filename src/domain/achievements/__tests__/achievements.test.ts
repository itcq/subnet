import {
  buildLocalBadgeShareMessage,
  calculateAchievementSummary,
  LOCAL_BADGE_DEFINITIONS,
  LOCAL_RANKS,
  type LocalTimedResult,
} from '../achievements';

function result(overrides: Partial<LocalTimedResult> = {}): LocalTimedResult {
  return {
    resultId: 'result-1',
    score: 800,
    elapsedSeconds: 40,
    failureCount: 1,
    hintsUsed: 0,
    timeLimitSeconds: 120,
    ...overrides,
  };
}

describe('local practice achievements', () => {
  it('starts at Explorer with no badges and labels the summary as local-only', () => {
    const summary = calculateAchievementSummary([]);

    expect(summary).toEqual({
      totalScore: 0,
      completedTimedChallenges: 0,
      rank: LOCAL_RANKS[0],
      badges: [],
      verification: 'local-practice-not-server-verified',
    });
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.badges)).toBe(true);
  });

  it('calculates deterministic personal score bands from total score', () => {
    expect(calculateAchievementSummary([result({ score: 2499 })]).rank.name).toBe('Explorer');
    expect(calculateAchievementSummary([result({ score: 2500 })]).rank.name).toBe('Solver');
    expect(
      calculateAchievementSummary([
        result({ resultId: 'a', score: 4000 }),
        result({ resultId: 'b', score: 3500 }),
      ]).rank.name,
    ).toBe('Analyst');
    expect(
      calculateAchievementSummary([
        result({ resultId: 'a', score: 7500 }),
        result({ resultId: 'b', score: 7500 }),
      ]).rank.name,
    ).toBe('Architect');
  });

  it('rewards participation, persistence, and using available help', () => {
    const summary = calculateAchievementSummary([
      result({ resultId: 'first', failureCount: 3, hintsUsed: 1 }),
    ]);

    expect(summary.badges.map(({ id }) => id)).toEqual([
      'first-timed-solve',
      'persistent-solver',
      'hint-explorer',
    ]);
    expect(summary.badges.every(({ verification }) => verification === 'local-practice-not-server-verified')).toBe(true);
  });

  it('awards repeat practice after five unique timed solves', () => {
    const results = Array.from({ length: 5 }, (_, index) =>
      result({ resultId: `result-${index}`, failureCount: 0, hintsUsed: 0 }),
    );

    expect(calculateAchievementSummary(results).badges.map(({ id }) => id)).toEqual([
      'first-timed-solve',
      'five-timed-solves',
    ]);
  });

  it('deduplicates replayed result ids instead of inflating scores, ranks, or badges', () => {
    const replay = result({ resultId: 'same', score: 900, failureCount: 3, hintsUsed: 1 });
    const summary = calculateAchievementSummary([replay, replay]);

    expect(summary.totalScore).toBe(900);
    expect(summary.completedTimedChallenges).toBe(1);
    expect(summary.rank.name).toBe('Explorer');
    expect(summary.badges.map(({ id }) => id)).toEqual([
      'first-timed-solve',
      'persistent-solver',
      'hint-explorer',
    ]);
  });

  it('builds neutral share text without identity, internal ordinal, score, or verified claims', () => {
    const summary = calculateAchievementSummary([result()]);
    const message = buildLocalBadgeShareMessage(summary, 'first-timed-solve');

    expect(message).toContain('First Timed Solve');
    expect(message).toContain('Subnet Game');
    expect(message).toContain('local achievement');
    expect(message).toContain('not a server-verified credential');
    expect(message).not.toMatch(/question|ordinal|student|email|user|800/i);
  });

  it('rejects unknown or unearned badges when creating share text', () => {
    const empty = calculateAchievementSummary([]);

    expect(() => buildLocalBadgeShareMessage(empty, 'first-timed-solve')).toThrow(
      'Badge first-timed-solve has not been earned',
    );
    expect(() => buildLocalBadgeShareMessage(empty, 'unknown')).toThrow('Unknown badge unknown');
  });

  it('publishes immutable versioned rank and healthy badge definitions', () => {
    expect(LOCAL_RANKS.map(({ name, minimumScore }) => [name, minimumScore])).toEqual([
      ['Explorer', 0],
      ['Solver', 2500],
      ['Analyst', 7500],
      ['Architect', 15000],
    ]);
    expect(LOCAL_BADGE_DEFINITIONS.map(({ id }) => id)).toEqual([
      'first-timed-solve',
      'persistent-solver',
      'hint-explorer',
      'five-timed-solves',
    ]);
    expect(Object.isFrozen(LOCAL_RANKS)).toBe(true);
    expect(Object.isFrozen(LOCAL_BADGE_DEFINITIONS)).toBe(true);
  });

  it.each([
    [{ resultId: '', score: 1 }, 'resultId must be a non-empty string'],
    [{ score: -1 }, 'score must be a non-negative safe integer'],
    [{ elapsedSeconds: -1 }, 'elapsedSeconds must be a non-negative safe integer'],
    [{ failureCount: -1 }, 'failureCount must be a non-negative safe integer'],
    [{ hintsUsed: -1 }, 'hintsUsed must be a non-negative safe integer'],
    [{ timeLimitSeconds: 0 }, 'timeLimitSeconds must be a positive safe integer'],
  ])('rejects malformed result data: %p', (overrides, message) => {
    expect(() => calculateAchievementSummary([result(overrides)])).toThrow(message);
  });
});
