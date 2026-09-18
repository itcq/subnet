import type { LocalProgressRepository } from './localProgressRepository';

export type RemoteQuestionProgress = Readonly<{
  catalogVersion: string;
  ordinal: number;
  completedAt: string;
}>;

export type RemoteProgressGateway = Readonly<{
  syncCompleted(
    expectedUserId: string,
    catalogVersion: string,
    rows: readonly RemoteQuestionProgress[],
  ): Promise<readonly RemoteQuestionProgress[]>;
}>;

function remoteRowIsValid(
  row: RemoteQuestionProgress,
  catalogVersion: string,
): boolean {
  return (
    row.catalogVersion === catalogVersion &&
    Number.isInteger(row.ordinal) &&
    row.ordinal >= 1 &&
    row.ordinal <= 500 &&
    typeof row.completedAt === 'string' &&
    Number.isFinite(Date.parse(row.completedAt))
  );
}

export class AccountProgressSync {
  constructor(
    private readonly expectedUserId: string,
    private readonly local: LocalProgressRepository,
    private readonly remote: RemoteProgressGateway,
    private readonly resolveQuestionId: (ordinal: number) => string,
  ) {}

  async syncCatalog(
    catalogVersion: string,
    consented: boolean,
  ): Promise<Readonly<{
    completedOrdinals: readonly number[];
    localCount: number;
    remoteCount: number;
  }>> {
    if (!consented) {
      throw new Error('Progress sync requires your permission.');
    }

    await this.local.initialize();
    const localRows = await this.local.listCompleted(catalogVersion);
    const uploads = localRows.map(({ catalogVersion: version, ordinal, completedAt }) => ({
      catalogVersion: version,
      ordinal,
      completedAt,
    }));
    const remoteRows = await this.remote.syncCompleted(
      this.expectedUserId,
      catalogVersion,
      uploads,
    );

    if (remoteRows.some((row) => !remoteRowIsValid(row, catalogVersion))) {
      throw new Error('Remote progress is invalid.');
    }

    const localOrdinals = new Set(localRows.map(({ ordinal }) => ordinal));
    for (const row of remoteRows) {
      if (localOrdinals.has(row.ordinal)) continue;
      await this.local.recordCompletion({
        catalogVersion: row.catalogVersion,
        questionId: this.resolveQuestionId(row.ordinal),
        ordinal: row.ordinal,
        completedAt: new Date(row.completedAt).toISOString(),
        attemptCount: 1,
        pendingSync: false,
      });
      localOrdinals.add(row.ordinal);
    }

    return {
      completedOrdinals: Object.freeze([...localOrdinals].sort((a, b) => a - b)),
      localCount: localOrdinals.size,
      remoteCount: remoteRows.length,
    };
  }
}
