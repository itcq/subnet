import {
  availableTimedScore,
  completeTimedAttempt,
  createTimedAttempt,
  DEFAULT_TIMED_ATTEMPT_RULES,
  recordTimedFailure,
  remainingTimedSeconds,
  revealTimedHint,
  tickTimedAttempt,
} from '../timedAttempt';

describe('timedAttempt', () => {
  it('creates an immutable active attempt with the documented alpha defaults', () => {
    const state = createTimedAttempt();

    expect(state).toEqual({
      rules: DEFAULT_TIMED_ATTEMPT_RULES,
      status: 'active',
      elapsedSeconds: 0,
      failureCount: 0,
      revealedHintIds: [],
      score: null,
    });
    expect(DEFAULT_TIMED_ATTEMPT_RULES).toEqual({
      durationSeconds: 120,
      basePoints: 1000,
      pointsPerElapsedSecond: 5,
      failuresBeforeHints: 3,
      pointsPerHint: 150,
      minimumCorrectScore: 100,
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.rules)).toBe(true);
    expect(Object.isFrozen(state.revealedHintIds)).toBe(true);
  });

  it('tracks remaining time and available score without mutating the previous state', () => {
    const initial = createTimedAttempt();
    const advanced = tickTimedAttempt(initial, 10);

    expect(remainingTimedSeconds(advanced)).toBe(110);
    expect(availableTimedScore(advanced)).toBe(950);
    expect(advanced.elapsedSeconds).toBe(10);
    expect(initial.elapsedSeconds).toBe(0);
  });

  it('unlocks hints after exactly three failures without deducting points for failure alone', () => {
    const first = recordTimedFailure(createTimedAttempt());
    const second = recordTimedFailure(first);
    const third = recordTimedFailure(second);

    expect(first.failureCount).toBe(1);
    expect(second.failureCount).toBe(2);
    expect(third.failureCount).toBe(3);
    expect(() => revealTimedHint(second, 'mask')).toThrow(
      'Hints unlock after 3 incorrect attempts',
    );
    expect(availableTimedScore(third)).toBe(1000);
  });

  it('deducts points once for each distinct revealed hint', () => {
    let state = createTimedAttempt();
    state = recordTimedFailure(state);
    state = recordTimedFailure(state);
    state = recordTimedFailure(state);

    const maskHint = revealTimedHint(state, 'mask');
    const duplicateMaskHint = revealTimedHint(maskHint, 'mask');
    const blockHint = revealTimedHint(duplicateMaskHint, 'block-size');

    expect(maskHint.revealedHintIds).toEqual(['mask']);
    expect(duplicateMaskHint).toBe(maskHint);
    expect(blockHint.revealedHintIds).toEqual(['mask', 'block-size']);
    expect(availableTimedScore(maskHint)).toBe(850);
    expect(availableTimedScore(blockHint)).toBe(700);
  });

  it('freezes the earned score when a correct answer completes an active attempt', () => {
    let state = tickTimedAttempt(createTimedAttempt(), 30);
    state = recordTimedFailure(recordTimedFailure(recordTimedFailure(state)));
    state = revealTimedHint(state, 'mask');

    const completed = completeTimedAttempt(state);
    const laterTick = tickTimedAttempt(completed, 50);

    expect(completed.status).toBe('correct');
    expect(completed.score).toBe(700);
    expect(laterTick).toBe(completed);
    expect(availableTimedScore(completed)).toBe(700);
  });

  it('expires at the time limit and awards no points', () => {
    const expired = tickTimedAttempt(createTimedAttempt(), 120);

    expect(expired.status).toBe('expired');
    expect(expired.elapsedSeconds).toBe(120);
    expect(expired.score).toBe(0);
    expect(remainingTimedSeconds(expired)).toBe(0);
    expect(availableTimedScore(expired)).toBe(0);
    expect(completeTimedAttempt(expired)).toBe(expired);
    expect(recordTimedFailure(expired)).toBe(expired);
  });

  it('never drops a correct active attempt below the minimum score', () => {
    let state = tickTimedAttempt(createTimedAttempt(), 119);
    state = recordTimedFailure(recordTimedFailure(recordTimedFailure(state)));
    state = revealTimedHint(
      revealTimedHint(revealTimedHint(state, 'mask'), 'block-size'),
      'boundary',
    );

    expect(availableTimedScore(state)).toBe(100);
    expect(completeTimedAttempt(state).score).toBe(100);
  });

  it.each([
    [-1, 'Elapsed seconds must be a non-negative safe integer'],
    [1.5, 'Elapsed seconds must be a non-negative safe integer'],
    [Number.MAX_SAFE_INTEGER + 1, 'Elapsed seconds must be a non-negative safe integer'],
  ])('rejects invalid elapsed increments: %p', (seconds, message) => {
    expect(() => tickTimedAttempt(createTimedAttempt(), seconds)).toThrow(message);
  });

  it('rejects blank hint identifiers', () => {
    let state = createTimedAttempt();
    state = recordTimedFailure(recordTimedFailure(recordTimedFailure(state)));

    expect(() => revealTimedHint(state, '  ')).toThrow('Hint id must be a non-empty string');
  });
});
