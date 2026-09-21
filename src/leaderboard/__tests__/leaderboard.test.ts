import {
  LeaderboardService,
  createSupabaseLeaderboardGateway,
} from '../leaderboard';

describe('LeaderboardService', () => {
  it('loads and validates public Journey rankings without email fields', async () => {
    const gateway = {
      listEntries: jest.fn().mockResolvedValue([
        { rank: 1, publicName: 'Subnet Sage', completedCount: 42 },
      ]),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
    };
    const service = new LeaderboardService(gateway);

    await expect(service.listEntries('17dd300a')).resolves.toEqual([
      { rank: 1, publicName: 'Subnet Sage', completedCount: 42 },
    ]);
  });

  it.each(['', 'ab', 'name@example.com', '<script>', 'a'.repeat(25)])(
    'rejects an unsafe or invalid public name: %s',
    async (publicName) => {
      const gateway = {
        listEntries: jest.fn(),
        getMyProfile: jest.fn(),
        updateMyProfile: jest.fn(),
      };
      const service = new LeaderboardService(gateway);

      await expect(service.updateProfile('user-1', publicName, true)).rejects.toThrow(
        'Public name must be 3–24 characters',
      );
      expect(gateway.updateMyProfile).not.toHaveBeenCalled();
    },
  );

  it('allows a signed-in learner to opt out without keeping a required public name', async () => {
    const gateway = {
      listEntries: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn().mockResolvedValue({ publicName: null, optedIn: false }),
    };
    const service = new LeaderboardService(gateway);

    await expect(service.updateProfile('user-1', '', false)).resolves.toEqual({
      publicName: null,
      optedIn: false,
    });
    expect(gateway.updateMyProfile).toHaveBeenCalledWith('user-1', null, false);
  });
});

describe('createSupabaseLeaderboardGateway', () => {
  it('maps public scoreboard rows and profile RPCs', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({
        data: [{ rank_position: 2, public_name: 'Packet Pal', completed_count: 18 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ public_name: 'Packet Pal', leaderboard_opt_in: true }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ public_name: null, leaderboard_opt_in: false }],
        error: null,
      });
    const gateway = createSupabaseLeaderboardGateway({ rpc });

    await expect(gateway.listEntries('17dd300a')).resolves.toEqual([
      { rank: 2, publicName: 'Packet Pal', completedCount: 18 },
    ]);
    await expect(gateway.getMyProfile('user-1')).resolves.toEqual({
      publicName: 'Packet Pal',
      optedIn: true,
    });
    await expect(gateway.updateMyProfile('user-1', null, false)).resolves.toEqual({
      publicName: null,
      optedIn: false,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'list_global_scoreboard', {
      requested_catalog_version: '17dd300a',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_my_leaderboard_profile', {
      expected_user_id: 'user-1',
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'update_leaderboard_profile', {
      expected_user_id: 'user-1',
      requested_opt_in: false,
      requested_public_name: null,
    });
  });
});
