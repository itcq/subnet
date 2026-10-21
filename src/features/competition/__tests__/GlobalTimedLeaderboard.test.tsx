import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { RankedCompetitionGateway } from '@/competition/supabaseCompetitionGateway';
import { GlobalTimedLeaderboard } from '../GlobalTimedLeaderboard';

function gateway(overrides: Partial<RankedCompetitionGateway> = {}): RankedCompetitionGateway {
  return {
    startAttempt: jest.fn(),
    submitAnswer: jest.fn(),
    getLeaderboard: jest.fn().mockResolvedValue([{
      rank: 1,
      alias: 'Subnetter-A1B2C3D4',
      score: 900,
      elapsedSeconds: 20,
      completedAt: '2026-10-21T18:01:00.000Z',
      isCurrentUser: false,
    }]),
    ...overrides,
  };
}

describe('GlobalTimedLeaderboard', () => {
  it('loads the server-authoritative daily scoreboard for the active account', async () => {
    const competition = gateway();
    const view = await render(
      <GlobalTimedLeaderboard gateway={competition} userId="user-123" />,
    );

    expect(view.getByRole('header', { name: 'Global Timed Scoreboard' })).toBeTruthy();
    expect(view.getByText(/signed-in daily ranked results/i)).toBeTruthy();
    await waitFor(() => expect(view.getByText('Subnetter-A1B2C3D4')).toBeTruthy());
    expect(view.getByText('#1')).toBeTruthy();
    expect(view.getByText('900')).toBeTruthy();
    expect(view.getByText('20s')).toBeTruthy();
    expect(competition.getLeaderboard).toHaveBeenCalledWith('user-123');
  });

  it('keeps failures private and provides a retry', async () => {
    const getLeaderboard = jest.fn()
      .mockRejectedValueOnce(new Error('private provider detail'))
      .mockResolvedValueOnce([]);
    const view = await render(
      <GlobalTimedLeaderboard gateway={gateway({ getLeaderboard })} userId="user-123" />,
    );

    await waitFor(() => expect(view.getByText(/could not be loaded/i)).toBeTruthy());
    expect(view.queryByText(/private provider detail/i)).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Retry global timed scoreboard' }));
    await waitFor(() => expect(view.getByText(/no completed ranked attempts yet today/i)).toBeTruthy());
    expect(getLeaderboard).toHaveBeenCalledTimes(2);
  });
});
