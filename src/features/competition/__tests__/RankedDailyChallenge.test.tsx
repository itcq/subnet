import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { RankedCompetitionGateway } from '@/competition/supabaseCompetitionGateway';
import { RankedDailyChallenge } from '../RankedDailyChallenge';

const activeAttempt = {
  attemptId: 'attempt-1',
  challengeDate: '2026-10-20',
  targetIp: '192.168.10.73',
  prefix: 26,
  status: 'active' as const,
  expiresAt: '2026-10-20T18:02:00.000Z',
  failureCount: 0,
  score: null,
  elapsedSeconds: null,
  answerCorrect: null,
};

function gateway(overrides: Partial<RankedCompetitionGateway> = {}): RankedCompetitionGateway {
  return {
    startAttempt: jest.fn().mockImplementation(async () => ({
      ...activeAttempt,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    })),
    submitAnswer: jest.fn().mockResolvedValue({
      ...activeAttempt,
      status: 'correct',
      score: 875,
      elapsedSeconds: 25,
      answerCorrect: true,
    }),
    getLeaderboard: jest.fn().mockResolvedValue([{
      rank: 1,
      alias: 'Subnetter-A1B2C3D4',
      score: 900,
      elapsedSeconds: 20,
      completedAt: '2026-10-20T18:01:00.000Z',
      isCurrentUser: false,
    }]),
    ...overrides,
  };
}

describe('RankedDailyChallenge', () => {

  it('explains the one-attempt server-scored format and loads anonymous rankings', async () => {
    const competition = gateway();
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    expect(view.getByRole('header', { name: 'Daily Ranked Challenge' })).toBeTruthy();
    expect(view.getByText(/one ranked attempt per utc day/i)).toBeTruthy();
    expect(view.getByText(/timer starts immediately/i)).toBeTruthy();
    expect(view.getByText(/10 incorrect submissions end the attempt/i)).toBeTruthy();
    expect(view.getByText(/emails are never shown/i)).toBeTruthy();
    expect(view.getByText(/visible to signed-in players today/i)).toBeTruthy();
    expect(view.getByText(/removed when you delete your account/i)).toBeTruthy();
    await waitFor(() => expect(view.getByText('Subnetter-A1B2C3D4')).toBeTruthy());
    expect(view.queryByText(/@/)).toBeNull();
    expect(competition.getLeaderboard).toHaveBeenCalledWith('user-123');
    view.unmount();
  });

  it('starts or resumes the server attempt and supports period-key octet navigation', async () => {
    const competition = gateway();
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    await fireEvent.press(view.getByRole('button', { name: "Start today's ranked challenge" }));
    await waitFor(() => expect(view.getByText('192.168.10.73 /26')).toBeTruthy());
    expect(view.getByText(/^(1:59|2:00)$/)).toBeTruthy();
    expect(competition.startAttempt).toHaveBeenCalledWith('user-123');

    const first = view.getByLabelText('Network address octet 1');
    const second = view.getByLabelText('Network address octet 2');
    await fireEvent.changeText(first, '192');
    await fireEvent(first, 'keyPress', { nativeEvent: { key: '.' } });
    expect(second.props.accessibilityState?.focused ?? true).toBeTruthy();
    view.unmount();
  });

  it('submits only the typed address and refreshes rankings after a correct result', async () => {
    const competition = gateway();
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    await fireEvent.press(view.getByRole('button', { name: "Start today's ranked challenge" }));
    await waitFor(() => view.getByLabelText('Network address octet 1'));
    for (const [index, value] of ['192', '168', '10', '64'].entries()) {
      await fireEvent.changeText(view.getByLabelText(`Network address octet ${index + 1}`), value);
    }
    await fireEvent.press(view.getByRole('button', { name: 'Submit ranked answer' }));

    await waitFor(() => expect(view.getByText(/ranked score: 875/i)).toBeTruthy());
    expect(competition.submitAnswer).toHaveBeenCalledWith(
      'user-123',
      'attempt-1',
      '192.168.10.64',
    );
    expect(competition.getLeaderboard).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it('shows server-counted failures without calculating a score locally', async () => {
    const competition = gateway({
      submitAnswer: jest.fn().mockResolvedValue({
        ...activeAttempt,
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
        failureCount: 1,
        answerCorrect: false,
      }),
    });
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    await fireEvent.press(view.getByRole('button', { name: "Start today's ranked challenge" }));
    await waitFor(() => view.getByLabelText('Network address octet 1'));
    for (const [index, value] of ['192', '168', '10', '0'].entries()) {
      await fireEvent.changeText(view.getByLabelText(`Network address octet ${index + 1}`), value);
    }
    await fireEvent.press(view.getByRole('button', { name: 'Submit ranked answer' }));

    await waitFor(() => expect(view.getByText(/not correct.*100-point deduction/i)).toBeTruthy());
    expect(view.getByText('Incorrect answers: 1')).toBeTruthy();
    expect(view.queryByText(/available score/i)).toBeNull();
    view.unmount();
  });

  it('stops accepting answers when the displayed server deadline passes', async () => {
    const competition = gateway({
      startAttempt: jest.fn().mockImplementation(async () => ({
        ...activeAttempt,
        expiresAt: new Date(Date.now() + 20).toISOString(),
      })),
    });
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    await fireEvent.press(view.getByRole('button', { name: "Start today's ranked challenge" }));
    await waitFor(
      () => expect(view.getByText(/today's ranked attempt has ended/i)).toBeTruthy(),
      { timeout: 1_000 },
    );

    expect(view.queryByRole('button', { name: 'Submit ranked answer' })).toBeNull();
    view.unmount();
  });

  it('keeps remote failures recoverable and does not expose provider details', async () => {
    const competition = gateway({
      startAttempt: jest.fn().mockRejectedValue(new Error('private provider detail')),
    });
    const view = await render(
      <RankedDailyChallenge gateway={competition} onBack={jest.fn()} userId="user-123" />,
    );

    await fireEvent.press(view.getByRole('button', { name: "Start today's ranked challenge" }));
    await waitFor(() => expect(view.getByText(/could not start the ranked challenge/i)).toBeTruthy());
    expect(view.queryByText(/private provider detail/i)).toBeNull();
    expect(view.getByRole('button', { name: "Start today's ranked challenge" })).toBeTruthy();
    view.unmount();
  });
});
