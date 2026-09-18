import type {
  RemoteProgressGateway,
  RemoteQuestionProgress,
} from './accountProgressSync';

type DatabaseProgressRow = Readonly<{
  catalog_version: string;
  question_ordinal: number;
  completed_at: string;
}>;
type QueryResult<T> = Readonly<{ data: T; error: Error | null }>;
export type SupabaseProgressClient = Readonly<{
  rpc(
    functionName: 'sync_account_progress',
    args: Readonly<{
      expected_user_id: string;
      requested_catalog_version: string;
      completion_rows: readonly DatabaseProgressRow[];
    }>,
  ): Promise<QueryResult<readonly DatabaseProgressRow[] | null>>;
}>;

function throwDatabaseError(error: Error | null): void {
  if (error !== null) {
    throw new Error('Synced progress request could not be completed. Please try again.');
  }
}

export function createSupabaseProgressGateway(
  client: SupabaseProgressClient,
): RemoteProgressGateway {
  return {
    async syncCompleted(expectedUserId, catalogVersion, rows) {
      const payload = rows.map<DatabaseProgressRow>((row) => ({
        catalog_version: row.catalogVersion,
        question_ordinal: row.ordinal,
        completed_at: row.completedAt,
      }));
      const result = await client.rpc('sync_account_progress', {
        expected_user_id: expectedUserId,
        requested_catalog_version: catalogVersion,
        completion_rows: payload,
      });
      throwDatabaseError(result.error);
      if (result.data === null) {
        throw new Error('Synced progress request could not be completed. Please try again.');
      }
      return result.data.map<RemoteQuestionProgress>((row) => ({
        catalogVersion: row.catalog_version,
        ordinal: row.question_ordinal,
        completedAt: row.completed_at,
      }));
    },
  };
}
