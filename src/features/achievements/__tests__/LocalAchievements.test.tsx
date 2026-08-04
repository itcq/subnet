import { fireEvent, render } from '@testing-library/react-native';
import { Share } from 'react-native';

import type { LocalTimedResult } from '@/domain/achievements/achievements';

import { LocalAchievements } from '../LocalAchievements';

const helpedResult: LocalTimedResult = {
  resultId: 'helped-result',
  score: 700,
  elapsedSeconds: 45,
  failureCount: 3,
  hintsUsed: 1,
  timeLimitSeconds: 120,
};

describe('LocalAchievements', () => {
  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows an honest empty local practice profile', async () => {
    const view = await render(<LocalAchievements results={[]} />);

    expect(view.getByRole('header', { name: 'Local Rank & Badges' })).toBeTruthy();
    expect(view.getByText('Explorer')).toBeTruthy();
    expect(view.getByText('0 local points')).toBeTruthy();
    expect(view.getByText(/not a public leaderboard or a server-verified credential/)).toBeTruthy();
    expect(view.queryAllByRole('button', { name: /Share/ })).toHaveLength(0);
  });

  it('shows earned badges, rank progress, and structured progress semantics', async () => {
    const view = await render(<LocalAchievements results={[helpedResult]} />);

    expect(view.getByText('First Timed Solve')).toBeTruthy();
    expect(view.getByText('Persistent Solver')).toBeTruthy();
    expect(view.getByText('Hint Explorer')).toBeTruthy();
    expect(view.queryByText('Five Timed Solves')).toBeNull();
    expect(view.getByRole('progressbar', { name: /Rank progress/ })).toBeTruthy();
    expect(view.getAllByRole('button', { name: /Share/ })).toHaveLength(3);
  });

  it('shares privacy-safe local badge text through the platform share sheet', async () => {
    const view = await render(<LocalAchievements results={[helpedResult]} />);

    await fireEvent.press(view.getByRole('button', { name: 'Share Hint Explorer badge' }));

    expect(Share.share).toHaveBeenCalledWith({
      message:
        'I earned the Hint Explorer local achievement in Subnet Game. This is a local practice milestone, not a server-verified credential.',
      title: 'Hint Explorer — Subnet Game',
    });
    const payload = jest.mocked(Share.share).mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toMatch(/700|question|email|student|user/i);
  });
});
