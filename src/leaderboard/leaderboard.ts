export type LeaderboardEntry = Readonly<{
  rank: number;
  publicName: string;
  completedCount: number;
}>;

export type LeaderboardProfile = Readonly<{
  publicName: string | null;
  optedIn: boolean;
}>;

export type LeaderboardGateway = Readonly<{
  listEntries(catalogVersion: string): Promise<readonly LeaderboardEntry[]>;
  getMyProfile(expectedUserId: string): Promise<LeaderboardProfile>;
  updateMyProfile(
    expectedUserId: string,
    publicName: string | null,
    optedIn: boolean,
  ): Promise<LeaderboardProfile>;
}>;

type RpcResult = Readonly<{ data: unknown; error: Error | null }>;
export type SupabaseLeaderboardClient = Readonly<{
  rpc(name: string, args: Readonly<Record<string, unknown>>): Promise<RpcResult>;
}>;

const PUBLIC_NAME_PATTERN = /^[\p{L}\p{N} ._-]+$/u;

function publicNameIsValid(value: string): boolean {
  return value.length >= 3
    && value.length <= 24
    && value === value.trim()
    && PUBLIC_NAME_PATTERN.test(value)
    && !value.includes('@');
}

function profileFromUnknown(value: unknown): LeaderboardProfile {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Scoreboard profile is unavailable.');
  }
  const row = value as Record<string, unknown>;
  const publicName = row.public_name;
  const optedIn = row.leaderboard_opt_in;
  if (
    typeof optedIn !== 'boolean'
    || (publicName !== null && (typeof publicName !== 'string' || !publicNameIsValid(publicName)))
  ) {
    throw new Error('Scoreboard profile is unavailable.');
  }
  return { publicName: publicName as string | null, optedIn };
}

function firstRow(data: unknown): unknown {
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error('Scoreboard profile is unavailable.');
  }
  return data[0];
}

function throwProviderError(error: Error | null): void {
  if (error !== null) {
    throw new Error('Scoreboard request could not be completed. Please try again.');
  }
}

export function createSupabaseLeaderboardGateway(
  client: SupabaseLeaderboardClient,
): LeaderboardGateway {
  return {
    async listEntries(catalogVersion) {
      const result = await client.rpc('list_global_scoreboard', {
        requested_catalog_version: catalogVersion,
      });
      throwProviderError(result.error);
      if (!Array.isArray(result.data)) {
        throw new Error('Scoreboard data is unavailable.');
      }
      return Object.freeze(result.data.map((value) => {
        if (typeof value !== 'object' || value === null) {
          throw new Error('Scoreboard data is unavailable.');
        }
        const row = value as Record<string, unknown>;
        if (
          !Number.isInteger(row.rank_position)
          || (row.rank_position as number) < 1
          || typeof row.public_name !== 'string'
          || !publicNameIsValid(row.public_name)
          || !Number.isInteger(row.completed_count)
          || (row.completed_count as number) < 0
          || (row.completed_count as number) > 500
        ) {
          throw new Error('Scoreboard data is unavailable.');
        }
        return {
          rank: row.rank_position as number,
          publicName: row.public_name,
          completedCount: row.completed_count as number,
        };
      }));
    },
    async getMyProfile(expectedUserId) {
      const result = await client.rpc('get_my_leaderboard_profile', {
        expected_user_id: expectedUserId,
      });
      throwProviderError(result.error);
      return profileFromUnknown(firstRow(result.data));
    },
    async updateMyProfile(expectedUserId, publicName, optedIn) {
      const result = await client.rpc('update_leaderboard_profile', {
        expected_user_id: expectedUserId,
        requested_opt_in: optedIn,
        requested_public_name: publicName,
      });
      throwProviderError(result.error);
      return profileFromUnknown(firstRow(result.data));
    },
  };
}

export class LeaderboardService {
  constructor(private readonly gateway: LeaderboardGateway) {}

  async listEntries(catalogVersion: string): Promise<readonly LeaderboardEntry[]> {
    return this.gateway.listEntries(catalogVersion);
  }

  async getProfile(expectedUserId: string): Promise<LeaderboardProfile> {
    return this.gateway.getMyProfile(expectedUserId);
  }

  async updateProfile(
    expectedUserId: string,
    publicNameInput: string,
    optedIn: boolean,
  ): Promise<LeaderboardProfile> {
    const publicName = publicNameInput.trim();
    if (optedIn && !publicNameIsValid(publicName)) {
      throw new Error('Public name must be 3–24 characters using letters, numbers, spaces, periods, underscores, or hyphens. Do not use an email address.');
    }
    return this.gateway.updateMyProfile(expectedUserId, optedIn ? publicName : null, optedIn);
  }
}
