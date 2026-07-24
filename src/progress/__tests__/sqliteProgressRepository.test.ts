import { openDatabaseAsync } from 'expo-sqlite';

import {
  SQLiteProgressRepository,
  type SQLiteBindValue,
  type SQLiteMigrationTransaction,
  type SQLiteProgressDatabase,
} from '../sqliteProgressRepository';
import type { LocalQuestionProgress } from '../localProgressRepository';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

const mockedOpenDatabaseAsync = jest.mocked(openDatabaseAsync);

type MockDatabase = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  closeAsync: jest.Mock<Promise<void>, []>;
  withExclusiveTransactionAsync: jest.Mock<
    Promise<void>,
    [task: (transaction: SQLiteMigrationTransaction) => Promise<void>]
  >;
  getFirstAsync: jest.Mock<
    Promise<unknown>,
    [source: string, params?: readonly SQLiteBindValue[]]
  >;
  getAllAsync: jest.Mock<
    Promise<unknown[]>,
    [source: string, params?: readonly SQLiteBindValue[]]
  >;
  runAsync: jest.Mock<
    Promise<{ readonly changes: number }>,
    [source: string, params?: readonly SQLiteBindValue[]]
  >;
};

function createDatabase(userVersion: unknown = 1): MockDatabase {
  const database = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    closeAsync: jest.fn().mockResolvedValue(undefined),
    withExclusiveTransactionAsync: jest.fn(),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: userVersion }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  } as MockDatabase;
  database.withExclusiveTransactionAsync.mockImplementation(async (task) => {
    await task(database as SQLiteMigrationTransaction);
  });
  return database;
}

function createRepository(db: MockDatabase): SQLiteProgressRepository {
  return new SQLiteProgressRepository(
    jest.fn().mockResolvedValue(db as SQLiteProgressDatabase),
  );
}

const validCompletion = Object.freeze({
  catalogVersion: 'catalog-v1',
  questionId: 'question-1',
  ordinal: 1,
  completedAt: '2026-07-24T10:00:00.123Z',
  attemptCount: 1,
  pendingSync: false,
});

describe('SQLiteProgressRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the dedicated local progress database by default', async () => {
    const db = createDatabase();
    mockedOpenDatabaseAsync.mockResolvedValue(db as never);
    const repository = new SQLiteProgressRepository();

    await repository.initialize();

    expect(mockedOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(mockedOpenDatabaseAsync).toHaveBeenCalledWith('subnet-progress.db');
  });

  it('enables WAL and accepts schema version 1 without remigrating', async () => {
    const db = createDatabase(1);
    const repository = createRepository(db);

    await repository.initialize();

    expect(db.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
    expect(db.getFirstAsync).toHaveBeenCalledWith('PRAGMA user_version;');
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('creates the v1 schema, stable ordinal index, and version from v0', async () => {
    const db = createDatabase(0);
    const repository = createRepository(db);

    await repository.initialize();

    const migrationSql = db.execAsync.mock.calls.map(([sql]) => sql).join('\n');
    expect(migrationSql).toContain('PRAGMA journal_mode = WAL;');
    expect(migrationSql).toMatch(
      /CREATE TABLE IF NOT EXISTS question_progress\s*\(\s*catalog_version TEXT NOT NULL,\s*question_id TEXT NOT NULL,\s*ordinal INTEGER NOT NULL CHECK \(ordinal BETWEEN 1 AND 500\),\s*completed_at TEXT NOT NULL,\s*attempt_count INTEGER NOT NULL CHECK \(attempt_count >= 1\),\s*pending_sync INTEGER NOT NULL DEFAULT 1 CHECK \(pending_sync IN \(0, 1\)\),\s*PRIMARY KEY \(catalog_version, question_id\)\s*\);/s,
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS \w+\s+ON question_progress \(catalog_version, ordinal\);/,
    );
    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith('PRAGMA user_version = 1;');
  });

  it('shares one concurrent idempotent initialization', async () => {
    const db = createDatabase(1);
    const opener = jest.fn().mockResolvedValue(db as SQLiteProgressDatabase);
    const repository = new SQLiteProgressRepository(opener);

    await Promise.all([
      repository.initialize(),
      repository.initialize(),
      repository.initialize(),
    ]);
    await repository.initialize();

    expect(opener).toHaveBeenCalledTimes(1);
    expect(db.execAsync).toHaveBeenCalledTimes(1);
    expect(db.getFirstAsync).toHaveBeenCalledTimes(1);
  });

  it('closes a failed connection and retries initialization later', async () => {
    const failedDatabase = createDatabase(1);
    failedDatabase.getFirstAsync.mockRejectedValueOnce(
      new Error('temporary migration read failure'),
    );
    const recoveredDatabase = createDatabase(1);
    const opener = jest
      .fn()
      .mockResolvedValueOnce(failedDatabase as SQLiteProgressDatabase)
      .mockResolvedValueOnce(recoveredDatabase as SQLiteProgressDatabase);
    const repository = new SQLiteProgressRepository(opener);

    await expect(
      Promise.all([repository.initialize(), repository.initialize()]),
    ).rejects.toThrow('temporary migration read failure');
    await expect(repository.initialize()).resolves.toBeUndefined();

    expect(opener).toHaveBeenCalledTimes(2);
    expect(failedDatabase.closeAsync).toHaveBeenCalledTimes(1);
    expect(recoveredDatabase.getFirstAsync).toHaveBeenCalledTimes(1);
  });

  it('fails closed on an unsupported future schema version', async () => {
    const db = createDatabase(2);
    const repository = createRepository(db);

    await expect(repository.initialize()).rejects.toThrow(
      'Unsupported progress database version: 2',
    );
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it.each([null, {}, { user_version: '1' }, { user_version: 1.5 }])(
    'rejects a malformed user_version row %p',
    async (versionRow) => {
      const db = createDatabase();
      db.getFirstAsync.mockResolvedValue(versionRow);

      await expect(createRepository(db).initialize()).rejects.toThrow(
        'Invalid progress database version',
      );
    },
  );

  it('binds every completion value and uses an offset-aware monotonic upsert', async () => {
    const db = createDatabase();
    const repository = createRepository(db);
    const injectionLike = {
      ...validCompletion,
      catalogVersion: "catalog-v1'; DROP TABLE question_progress; --",
      questionId: "question-1'); DELETE FROM question_progress; --",
      pendingSync: true,
    };

    await repository.recordCompletion(injectionLike);

    const [sql, bindings] = db.runAsync.mock.calls.at(-1)!;
    expect(sql).not.toContain(injectionLike.catalogVersion);
    expect(sql).not.toContain(injectionLike.questionId);
    expect(sql).toMatch(/INSERT INTO question_progress/);
    expect(sql).toMatch(
      /ON CONFLICT \(catalog_version, question_id\) DO UPDATE SET/,
    );
    expect(sql).toMatch(/julianday\(excluded\.completed_at\)/);
    expect(sql).toMatch(/julianday\(question_progress\.completed_at\)/);
    expect(sql).toMatch(
      /attempt_count = max\(question_progress\.attempt_count, excluded\.attempt_count\)/,
    );
    expect(sql).toMatch(
      /pending_sync = max\(question_progress\.pending_sync, excluded\.pending_sync\)/,
    );
    expect(sql).toMatch(
      /WHERE question_progress\.ordinal = excluded\.ordinal/,
    );
    expect(bindings).toEqual([
      injectionLike.catalogVersion,
      injectionLike.questionId,
      1,
      injectionLike.completedAt,
      1,
      1,
    ]);
  });

  it('rejects replaying a question id at a different ordinal', async () => {
    const db = createDatabase();
    db.runAsync.mockResolvedValueOnce({ changes: 0 });
    const repository = createRepository(db);

    await expect(repository.recordCompletion(validCompletion)).rejects.toThrow(
      'questionId and ordinal must keep a stable mapping',
    );
  });

  it('rejects replaying an ordinal with a different question id', async () => {
    const db = createDatabase();
    db.runAsync.mockRejectedValueOnce(
      new Error(
        'UNIQUE constraint failed: question_progress.catalog_version, question_progress.ordinal',
      ),
    );
    const repository = createRepository(db);

    await expect(repository.recordCompletion(validCompletion)).rejects.toThrow(
      'questionId and ordinal must keep a stable mapping',
    );
  });

  it.each([
    ['empty catalog version', { catalogVersion: ' ' }],
    ['empty question id', { questionId: '' }],
    ['ordinal below range', { ordinal: 0 }],
    ['ordinal above SQLite range', { ordinal: 501 }],
    ['fractional ordinal', { ordinal: 1.5 }],
    ['unsafe ordinal', { ordinal: Number.MAX_SAFE_INTEGER + 1 }],
    ['invalid timestamp', { completedAt: '2026-02-30T10:00:00Z' }],
    ['timestamp beyond milliseconds', { completedAt: '2026-07-24T10:00:00.1234Z' }],
    ['offset beyond ISO maximum', { completedAt: '2026-07-24T10:00:00+14:01' }],
    ['offset unsupported by SQLite', { completedAt: '2026-07-24T10:00:00+23:59' }],
    ['upper UTC range overflow', { completedAt: '9999-12-31T23:59:59-14:00' }],
    ['lower UTC range overflow', { completedAt: '0000-01-01T00:00:00+14:00' }],
    ['non-positive attempts', { attemptCount: 0 }],
    ['fractional attempts', { attemptCount: 1.5 }],
    ['unsafe attempts', { attemptCount: Number.MAX_SAFE_INTEGER + 1 }],
    ['non-boolean pending sync', { pendingSync: 1 }],
  ])('rejects %s before writing', async (_description, override) => {
    const db = createDatabase();
    const repository = createRepository(db);
    const input = { ...validCompletion, ...override } as LocalQuestionProgress;

    await expect(repository.recordCompletion(input)).rejects.toThrow();
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('rejects boxed strings and accepts valid offsets and leap year zero', async () => {
    const db = createDatabase();
    const repository = createRepository(db);

    await expect(
      repository.recordCompletion({
        ...validCompletion,
        completedAt: new String(validCompletion.completedAt),
      } as unknown as LocalQuestionProgress),
    ).rejects.toThrow('completedAt must be a valid ISO timestamp');
    await repository.recordCompletion({
      ...validCompletion,
      completedAt: '0000-02-29T00:00:00+00:00',
    });
    await repository.recordCompletion({
      ...validCompletion,
      questionId: 'question-2',
      ordinal: 2,
      completedAt: '2026-07-24T10:00:00+14:00',
    });

    expect(db.runAsync).toHaveBeenCalledTimes(2);
  });

  it('strips extra fields instead of sending them to SQLite', async () => {
    const db = createDatabase();
    const repository = createRepository(db);

    await repository.recordCompletion({
      ...validCompletion,
      privateNote: 'must-not-be-stored',
    } as LocalQuestionProgress);

    const bindings = db.runAsync.mock.calls.at(-1)![1];
    expect(bindings).not.toContain('must-not-be-stored');
    expect(bindings).toHaveLength(6);
  });

  it('binds the catalog filter, sorts in SQL, converts booleans, and freezes canonical output', async () => {
    const db = createDatabase();
    const catalogVersion = "catalog-v1' OR 1=1 --";
    db.getAllAsync.mockResolvedValue([
      {
        catalog_version: catalogVersion,
        question_id: 'question-1',
        ordinal: 1,
        completed_at: '2026-07-24T10:00:00Z',
        attempt_count: 3,
        pending_sync: 1,
        private_note: 'must-not-leak',
      },
      {
        catalog_version: catalogVersion,
        question_id: 'question-2',
        ordinal: 2,
        completed_at: '2026-07-24T11:00:00+01:00',
        attempt_count: 1,
        pending_sync: 0,
      },
    ]);
    const repository = createRepository(db);

    const rows = await repository.listCompleted(catalogVersion);

    const [sql, bindings] = db.getAllAsync.mock.calls.at(-1)!;
    expect(sql).not.toContain(catalogVersion);
    expect(sql).toMatch(/WHERE catalog_version = \?/);
    expect(sql).toMatch(/ORDER BY ordinal ASC/);
    expect(bindings).toEqual([catalogVersion]);
    expect(rows).toEqual([
      {
        catalogVersion,
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-07-24T10:00:00Z',
        attemptCount: 3,
        pendingSync: true,
      },
      {
        catalogVersion,
        questionId: 'question-2',
        ordinal: 2,
        completedAt: '2026-07-24T11:00:00+01:00',
        attemptCount: 1,
        pendingSync: false,
      },
    ]);
    expect(Object.isFrozen(rows)).toBe(true);
    expect(rows.every(Object.isFrozen)).toBe(true);
    expect(Object.keys(rows[0])).toEqual([
      'catalogVersion',
      'questionId',
      'ordinal',
      'completedAt',
      'attemptCount',
      'pendingSync',
    ]);
    expect(() => (rows as LocalQuestionProgress[]).push(validCompletion)).toThrow();
  });

  it('validates the catalog filter before reading', async () => {
    const db = createDatabase();

    await expect(createRepository(db).listCompleted('  ')).rejects.toThrow(
      'catalogVersion must be a non-empty string',
    );
    expect(db.getAllAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['not an object', null],
    ['empty catalog version', { catalog_version: '' }],
    ['empty question id', { question_id: '' }],
    ['bad ordinal', { ordinal: 501 }],
    ['bad timestamp', { completed_at: 'not-a-date' }],
    ['bad attempts', { attempt_count: 0 }],
    ['bad pending sync', { pending_sync: 2 }],
  ])('rejects malformed database row: %s', async (_description, override) => {
    const db = createDatabase();
    const baseRow = {
      catalog_version: 'catalog-v1',
      question_id: 'question-1',
      ordinal: 1,
      completed_at: '2026-07-24T10:00:00Z',
      attempt_count: 1,
      pending_sync: 0,
    };
    db.getAllAsync.mockResolvedValue([
      override === null ? null : { ...baseRow, ...override },
    ]);

    await expect(
      createRepository(db).listCompleted('catalog-v1'),
    ).rejects.toThrow('Malformed question_progress row');
  });
});
