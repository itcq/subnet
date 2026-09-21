import { act, fireEvent, render } from '@testing-library/react-native';

import type { LeaderboardService } from '@/leaderboard/leaderboard';
import { GlobalScoreboard } from '../GlobalScoreboard';

function service(overrides: Partial<LeaderboardService> = {}): LeaderboardService {
  return {
    getProfile: jest.fn().mockResolvedValue({ publicName: null, optedIn: false }),
    listEntries: jest.fn().mockResolvedValue([
      { rank: 1, publicName: 'Subnet Sage', completedCount: 42 },
      { rank: 2, publicName: 'Packet Pal', completedCount: 18 },
    ]),
    updateProfile: jest.fn().mockResolvedValue({ publicName: 'Learner One', optedIn: true }),
    ...overrides,
  } as unknown as LeaderboardService;
}

describe('GlobalScoreboard', () => {
  it('shows opt-in public Journey completion rankings without emails', async () => {
    const leaderboard = service();
    const screen = await render(
      <GlobalScoreboard identity={null} service={leaderboard} />,
    );
    await act(async () => undefined);

    expect(screen.getByRole('header', { name: 'Global Scoreboard' })).toBeTruthy();
    expect(screen.getByText('Subnet Sage')).toBeTruthy();
    expect(screen.getByText('42 completed')).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.getByText(/self-reported practice progress/i)).toBeTruthy();
    expect(screen.getByText(/sign in to an account/i)).toBeTruthy();
  });

  it('lets a signed-in learner choose a public name and explicitly opt in', async () => {
    const updateProfile = jest.fn().mockResolvedValue({ publicName: 'Learner One', optedIn: true });
    const leaderboard = service({ updateProfile } as Partial<LeaderboardService>);
    const screen = await render(
      <GlobalScoreboard
        identity={{ userId: 'user-1', email: 'private@example.com' }}
        service={leaderboard}
      />,
    );
    await act(async () => undefined);

    await fireEvent.changeText(screen.getByLabelText('Public scoreboard name'), 'Learner One');
    await fireEvent.press(screen.getByRole('button', { name: 'JOIN SCOREBOARD' }));
    await act(async () => undefined);

    expect(updateProfile).toHaveBeenCalledWith('user-1', 'Learner One', true);
    expect(screen.getByText(/you are visible as Learner One/i)).toBeTruthy();
    expect(screen.queryByText('private@example.com')).toBeNull();
  });

  it('lets an opted-in learner leave the public scoreboard', async () => {
    const updateProfile = jest.fn().mockResolvedValue({ publicName: null, optedIn: false });
    const leaderboard = service({
      getProfile: jest.fn().mockResolvedValue({ publicName: 'Learner One', optedIn: true }),
      updateProfile,
    } as Partial<LeaderboardService>);
    const screen = await render(
      <GlobalScoreboard
        identity={{ userId: 'user-1', email: 'private@example.com' }}
        service={leaderboard}
      />,
    );
    await act(async () => undefined);

    await fireEvent.press(screen.getByRole('button', { name: 'LEAVE SCOREBOARD' }));
    await act(async () => undefined);

    expect(updateProfile).toHaveBeenCalledWith('user-1', 'Learner One', false);
    expect(screen.getByText(/you are not listed publicly/i)).toBeTruthy();
  });
});
