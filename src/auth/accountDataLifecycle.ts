export type AccountDataExport = Readonly<{
  schema_version: 1;
  exported_at: string;
  account: Readonly<{
    user_id: string;
    email: string;
    created_at: string;
  }>;
  synced_progress: readonly Readonly<{
    catalog_version: string;
    question_ordinal: number;
    completed_at: string;
    created_at: string;
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

function isExport(value: unknown, expectedUserId: string): value is AccountDataExport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const account = candidate.account;
  const progress = candidate.synced_progress;
  if (
    candidate.schema_version !== 1
    || !isIsoTimestamp(candidate.exported_at)
    || typeof account !== 'object'
    || account === null
    || !Array.isArray(progress)
  ) return false;

  const accountRecord = account as Record<string, unknown>;
  if (
    accountRecord.user_id !== expectedUserId
    || typeof accountRecord.email !== 'string'
    || !isIsoTimestamp(accountRecord.created_at)
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
  });
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
