export type AccountDataExport = Readonly<{
  schema_version: 2;
  exported_at: string;
  account: Readonly<{
    user_id: string;
    email: string;
    created_at: string;
    competition_alias: string;
  }>;
  synced_progress: readonly Readonly<{
    catalog_version: string;
    question_ordinal: number;
    completed_at: string;
    created_at: string;
  }>[];
  ranked_timed_attempts: readonly Readonly<{
    challenge_date: string;
    target_ip: string;
    prefix: number;
    started_at: string;
    expires_at: string;
    status: 'active' | 'correct' | 'expired';
    failure_count: number;
    score: number | null;
    elapsed_seconds: number | null;
    completed_at: string | null;
  }>[];
}>;

type RpcResult = Readonly<{ data: unknown; error: Error | null }>;
export type SupabaseAccountDataClient = Readonly<{
  rpc(functionName: string, args: Readonly<{ expected_user_id: string }>): Promise<RpcResult>;
}>;

export type AccountDataGateway = Readonly<{
  exportAccountData(expectedUserId: string): Promise<unknown>;
  deleteOwnAccount(expectedUserId: string): Promise<void>;
}>;

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

function isRankedAttempt(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const statusIsValid = record.status === 'active' || record.status === 'correct' || record.status === 'expired';
  const completionIsValid = record.status === 'correct'
    ? Number.isInteger(record.score)
      && (record.score as number) >= 100
      && isNullableInteger(record.elapsed_seconds)
      && record.elapsed_seconds !== null
      && isIsoTimestamp(record.completed_at)
    : record.score === null && record.elapsed_seconds === null && record.completed_at === null;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(record.challenge_date))
    && typeof record.target_ip === 'string'
    && record.target_ip.length > 0
    && Number.isInteger(record.prefix)
    && (record.prefix as number) >= 8
    && (record.prefix as number) <= 30
    && isIsoTimestamp(record.started_at)
    && isIsoTimestamp(record.expires_at)
    && statusIsValid
    && Number.isInteger(record.failure_count)
    && (record.failure_count as number) >= 0
    && completionIsValid;
}

function isExport(value: unknown, expectedUserId: string): value is AccountDataExport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const account = candidate.account;
  const progress = candidate.synced_progress;
  const rankedAttempts = candidate.ranked_timed_attempts;
  if (
    candidate.schema_version !== 2
    || !isIsoTimestamp(candidate.exported_at)
    || typeof account !== 'object'
    || account === null
    || !Array.isArray(progress)
    || !Array.isArray(rankedAttempts)
  ) return false;

  const accountRecord = account as Record<string, unknown>;
  if (
    accountRecord.user_id !== expectedUserId
    || typeof accountRecord.email !== 'string'
    || !isIsoTimestamp(accountRecord.created_at)
    || typeof accountRecord.competition_alias !== 'string'
    || !/^Subnetter-[A-F0-9]{8}$/.test(accountRecord.competition_alias)
  ) return false;

  return progress.every((row) => {
    if (typeof row !== 'object' || row === null) return false;
    const record = row as Record<string, unknown>;
    return record.catalog_version === '17dd300a'
      && Number.isInteger(record.question_ordinal)
      && (record.question_ordinal as number) >= 1
      && (record.question_ordinal as number) <= 500
      && isIsoTimestamp(record.completed_at)
      && isIsoTimestamp(record.created_at);
  }) && rankedAttempts.every(isRankedAttempt);
}

export function createSupabaseAccountDataGateway(
  client: SupabaseAccountDataClient,
): AccountDataGateway {
  return {
    async exportAccountData(expectedUserId) {
      const result = await client.rpc('export_account_data', {
        expected_user_id: expectedUserId,
      });
      if (result.error !== null) {
        throw new Error('Account export could not be completed. Please try again.');
      }
      return result.data;
    },
    async deleteOwnAccount(expectedUserId) {
      const result = await client.rpc('delete_own_account', {
        expected_user_id: expectedUserId,
      });
      if (result.error !== null) {
        throw new Error('Account deletion could not be completed. Please try again.');
      }
    },
  };
}

export class AccountDataService {
  constructor(private readonly gateway: AccountDataGateway) {}

  async exportAccountData(expectedUserId: string): Promise<AccountDataExport> {
    try {
      const result = await this.gateway.exportAccountData(expectedUserId);
      if (!isExport(result, expectedUserId)) throw new Error('invalid export');
      return result;
    } catch {
      throw new Error('Account export could not be completed. Please try again.');
    }
  }

  async deleteOwnAccount(expectedUserId: string): Promise<void> {
    try {
      await this.gateway.deleteOwnAccount(expectedUserId);
    } catch {
      throw new Error('Account deletion could not be completed. Please try again.');
    }
  }
}
