export type RankedAttemptStatus = 'active' | 'correct' | 'expired';

export type RankedAttempt = Readonly<{
  attemptId: string;
  challengeDate: string;
  targetIp: string;
  prefix: number;
  status: RankedAttemptStatus;
  expiresAt: string;
  failureCount: number;
  score: number | null;
  elapsedSeconds: number | null;
  answerCorrect: boolean | null;
}>;

export type RankedLeaderboardEntry = Readonly<{
  rank: number;
  alias: string;
  score: number;
  elapsedSeconds: number;
  completedAt: string;
  isCurrentUser: boolean;
}>;

export type RankedCompetitionGateway = Readonly<{
  startAttempt(expectedUserId: string): Promise<RankedAttempt>;
  submitAnswer(
    expectedUserId: string,
    attemptId: string,
    answer: string,
  ): Promise<RankedAttempt>;
  getLeaderboard(expectedUserId: string): Promise<readonly RankedLeaderboardEntry[]>;
}>;

type QueryResult = Readonly<{ data: unknown; error: Error | null }>;

export type SupabaseCompetitionClient = Readonly<{
  rpc(functionName: string, args: Readonly<Record<string, unknown>>): Promise<QueryResult>;
}>;

const REQUEST_ERROR = 'Ranked challenge request could not be completed. Please try again.';
const attemptStatuses: readonly RankedAttemptStatus[] = ['active', 'correct', 'expired'];

function fail(): never {
  throw new Error(REQUEST_ERROR);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail();
  }
  return value as Record<string, unknown>;
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : fail();
}

function numberField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fail();
}

function nullableNumberField(row: Record<string, unknown>, key: string): number | null {
  return row[key] === null ? null : numberField(row, key);
}

function rows(result: QueryResult): readonly unknown[] {
  if (result.error !== null || !Array.isArray(result.data)) {
    return fail();
  }
  return result.data;
}

function mapAttempt(value: unknown, includeAnswer: boolean): RankedAttempt {
  const row = record(value);
  const status = stringField(row, 'status');
  if (!attemptStatuses.includes(status as RankedAttemptStatus)) {
    return fail();
  }

  const answerCorrect = includeAnswer
    ? (typeof row.answer_correct === 'boolean' ? row.answer_correct : fail())
    : null;

  return {
    attemptId: stringField(row, 'attempt_id'),
    challengeDate: stringField(row, 'challenge_date'),
    targetIp: stringField(row, 'target_ip'),
    prefix: numberField(row, 'prefix'),
    status: status as RankedAttemptStatus,
    expiresAt: stringField(row, 'expires_at'),
    failureCount: numberField(row, 'failure_count'),
    score: nullableNumberField(row, 'score'),
    elapsedSeconds: nullableNumberField(row, 'elapsed_seconds'),
    answerCorrect,
  };
}

function onlyAttempt(result: QueryResult, includeAnswer: boolean): RankedAttempt {
  const data = rows(result);
  if (data.length !== 1) {
    return fail();
  }
  return mapAttempt(data[0], includeAnswer);
}

export function createSupabaseCompetitionGateway(
  client: SupabaseCompetitionClient,
): RankedCompetitionGateway {
  return {
    async startAttempt(expectedUserId) {
      const result = await client.rpc('start_ranked_timed_attempt', {
        expected_user_id: expectedUserId,
      });
      return onlyAttempt(result, false);
    },

    async submitAnswer(expectedUserId, attemptId, answer) {
      const result = await client.rpc('submit_ranked_timed_answer', {
        expected_user_id: expectedUserId,
        requested_attempt_id: attemptId,
        answer_text: answer.trim(),
      });
      return onlyAttempt(result, true);
    },

    async getLeaderboard(expectedUserId) {
      const result = await client.rpc('get_ranked_timed_leaderboard', {
        expected_user_id: expectedUserId,
      });
      return rows(result).map((value): RankedLeaderboardEntry => {
        const row = record(value);
        return {
          rank: numberField(row, 'rank'),
          alias: stringField(row, 'competition_alias'),
          score: numberField(row, 'score'),
          elapsedSeconds: numberField(row, 'elapsed_seconds'),
          completedAt: stringField(row, 'completed_at'),
          isCurrentUser: typeof row.is_current_user === 'boolean'
            ? row.is_current_user
            : fail(),
        };
      });
    },
  };
}
