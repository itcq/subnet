import { createSupabaseCompetitionGateway } from '../supabaseCompetitionGateway';

const activeRow = {
  attempt_id: '11111111-1111-4111-8111-111111111111',
  challenge_date: '2026-10-20',
  target_ip: '192.168.10.73',
  prefix: 26,
  status: 'active',
  expires_at: '2026-10-20T18:02:00.000Z',
  failure_count: 0,
  score: null,
  elapsed_seconds: null,
};

describe('createSupabaseCompetitionGateway', () => {
  it('starts or resumes the expected learner daily attempt', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [activeRow], error: null });
    const gateway = createSupabaseCompetitionGateway({ rpc });

    await expect(gateway.startAttempt('user-123')).resolves.toEqual({
      attemptId: activeRow.attempt_id,
      challengeDate: activeRow.challenge_date,
      targetIp: activeRow.target_ip,
      prefix: 26,
      status: 'active',
      expiresAt: activeRow.expires_at,
      failureCount: 0,
      score: null,
      elapsedSeconds: null,
      answerCorrect: null,
    });
    expect(rpc).toHaveBeenCalledWith('start_ranked_timed_attempt', {
      expected_user_id: 'user-123',
    });
  });

  it('submits a trimmed answer without accepting client score or timing fields', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{
        ...activeRow,
        status: 'correct',
        score: 875,
        elapsed_seconds: 25,
        answer_correct: true,
      }],
      error: null,
    });
    const gateway = createSupabaseCompetitionGateway({ rpc });

    await expect(gateway.submitAnswer(
      'user-123',
      activeRow.attempt_id,
      ' 192.168.10.64 ',
    )).resolves.toMatchObject({ status: 'correct', score: 875, answerCorrect: true });
    expect(rpc).toHaveBeenCalledWith('submit_ranked_timed_answer', {
      expected_user_id: 'user-123',
      requested_attempt_id: activeRow.attempt_id,
      answer_text: '192.168.10.64',
    });
  });

  it('maps the bounded anonymous leaderboard and identifies the current learner', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{
        rank: 1,
        competition_alias: 'Subnetter-A1B2C3D4',
        score: 900,
        elapsed_seconds: 20,
        completed_at: '2026-10-20T18:01:00.000Z',
        is_current_user: true,
      }],
      error: null,
    });
    const gateway = createSupabaseCompetitionGateway({ rpc });

    await expect(gateway.getLeaderboard('user-123')).resolves.toEqual([{
      rank: 1,
      alias: 'Subnetter-A1B2C3D4',
      score: 900,
      elapsedSeconds: 20,
      completedAt: '2026-10-20T18:01:00.000Z',
      isCurrentUser: true,
    }]);
  });

  it('sanitizes remote errors and rejects missing rows', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('private database detail') })
      .mockResolvedValueOnce({ data: [], error: null });
    const gateway = createSupabaseCompetitionGateway({ rpc });

    await expect(gateway.getLeaderboard('user-123')).rejects.toThrow(
      'Ranked challenge request could not be completed. Please try again.',
    );
    await expect(gateway.startAttempt('user-123')).rejects.toThrow(
      'Ranked challenge request could not be completed. Please try again.',
    );
  });
});
