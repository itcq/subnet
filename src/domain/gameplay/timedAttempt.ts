export type TimedAttemptRules = Readonly<{
  durationSeconds: number;
  basePoints: number;
  pointsPerElapsedSecond: number;
  failuresBeforeHints: number;
  pointsPerHint: number;
  minimumCorrectScore: number;
}>;

export type TimedAttemptState = Readonly<{
  rules: TimedAttemptRules;
  status: 'active' | 'correct' | 'expired';
  elapsedSeconds: number;
  failureCount: number;
  revealedHintIds: readonly string[];
  score: number | null;
}>;

export const DEFAULT_TIMED_ATTEMPT_RULES: TimedAttemptRules = Object.freeze({
  durationSeconds: 120,
  basePoints: 1000,
  pointsPerElapsedSecond: 5,
  failuresBeforeHints: 3,
  pointsPerHint: 150,
  minimumCorrectScore: 100,
});

function freezeState(state: TimedAttemptState): TimedAttemptState {
  return Object.freeze({
    ...state,
    rules: state.rules,
    revealedHintIds: Object.freeze([...state.revealedHintIds]),
  });
}

export function createTimedAttempt(
  rules: TimedAttemptRules = DEFAULT_TIMED_ATTEMPT_RULES,
): TimedAttemptState {
  return freezeState({
    rules,
    status: 'active',
    elapsedSeconds: 0,
    failureCount: 0,
    revealedHintIds: [],
    score: null,
  });
}

export function remainingTimedSeconds(state: TimedAttemptState): number {
  return Math.max(0, state.rules.durationSeconds - state.elapsedSeconds);
}

export function availableTimedScore(state: TimedAttemptState): number {
  if (state.status === 'expired') {
    return 0;
  }
  if (state.status === 'correct') {
    return state.score ?? 0;
  }

  const deductions =
    state.elapsedSeconds * state.rules.pointsPerElapsedSecond +
    state.revealedHintIds.length * state.rules.pointsPerHint;
  return Math.max(state.rules.minimumCorrectScore, state.rules.basePoints - deductions);
}

export function tickTimedAttempt(
  state: TimedAttemptState,
  elapsedSeconds: number,
): TimedAttemptState {
  if (!Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Elapsed seconds must be a non-negative safe integer');
  }
  if (state.status !== 'active' || elapsedSeconds === 0) {
    return state;
  }

  const nextElapsed = Math.min(
    state.rules.durationSeconds,
    state.elapsedSeconds + elapsedSeconds,
  );
  const expired = nextElapsed >= state.rules.durationSeconds;
  return freezeState({
    ...state,
    elapsedSeconds: nextElapsed,
    status: expired ? 'expired' : 'active',
    score: expired ? 0 : null,
  });
}

export function recordTimedFailure(state: TimedAttemptState): TimedAttemptState {
  if (state.status !== 'active') {
    return state;
  }
  return freezeState({ ...state, failureCount: state.failureCount + 1 });
}

export function revealTimedHint(
  state: TimedAttemptState,
  hintId: string,
): TimedAttemptState {
  if (typeof hintId !== 'string' || hintId.trim().length === 0) {
    throw new TypeError('Hint id must be a non-empty string');
  }
  if (state.status !== 'active') {
    return state;
  }
  if (state.failureCount < state.rules.failuresBeforeHints) {
    throw new Error(`Hints unlock after ${state.rules.failuresBeforeHints} incorrect attempts`);
  }
  if (state.revealedHintIds.includes(hintId)) {
    return state;
  }
  return freezeState({
    ...state,
    revealedHintIds: [...state.revealedHintIds, hintId],
  });
}

export function completeTimedAttempt(state: TimedAttemptState): TimedAttemptState {
  if (state.status !== 'active') {
    return state;
  }
  return freezeState({
    ...state,
    status: 'correct',
    score: availableTimedScore(state),
  });
}
