import { openDatabaseAsync } from 'expo-sqlite';

import type {
  LocalProgressRepository,
  LocalQuestionProgress,
} from './localProgressRepository';

const DATABASE_NAME = 'subnet-progress.db';
const DATABASE_VERSION = 1;
const STABLE_MAPPING_ERROR =
  'questionId and ordinal must keep a stable mapping';

export type SQLiteBindValue =
  | string
  | number
  | null
  | boolean
  | Uint8Array;

export type SQLiteMigrationTransaction = {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    params?: readonly SQLiteBindValue[],
  ): Promise<{ readonly changes: number }>;
};

export type SQLiteProgressDatabase = {
  execAsync(source: string): Promise<void>;
  closeAsync(): Promise<void>;
  withExclusiveTransactionAsync(
    task: (transaction: SQLiteMigrationTransaction) => Promise<void>,
  ): Promise<void>;
  getFirstAsync(
    source: string,
    params?: readonly SQLiteBindValue[],
  ): Promise<unknown>;
  getAllAsync(
    source: string,
    params?: readonly SQLiteBindValue[],
  ): Promise<unknown[]>;
  runAsync(
    source: string,
    params?: readonly SQLiteBindValue[],
  ): Promise<{ readonly changes: number }>;
};

export type SQLiteProgressDatabaseOpener = (
  databaseName: string,
) => Promise<SQLiteProgressDatabase>;

const defaultOpenDatabase =
  openDatabaseAsync as unknown as SQLiteProgressDatabaseOpener;

const MIN_SQLITE_TIMESTAMP_MS = Date.parse('0000-01-01T00:00:00.000Z');
const MAX_SQLITE_TIMESTAMP_MS = Date.parse('9999-12-31T23:59:59.999Z');

function validateNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function validateSafePositiveInteger(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a safe positive integer`);
  }
}

function validateOrdinal(value: unknown): void {
  validateSafePositiveInteger(value, 'ordinal');
  if ((value as number) > 500) {
    throw new RangeError('ordinal must be between 1 and 500');
  }
}

function validateIsoTimestamp(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  const timestamp = Date.parse(value);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    daysInMonth === undefined ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetMinute > 59 ||
    offsetHour > 14 ||
    (offsetHour === 14 && offsetMinute !== 0) ||
    !Number.isFinite(timestamp) ||
    timestamp < MIN_SQLITE_TIMESTAMP_MS ||
    timestamp > MAX_SQLITE_TIMESTAMP_MS
  ) {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }
}

function validateProgress(input: LocalQuestionProgress): void {
  validateNonEmpty(input.catalogVersion, 'catalogVersion');
  validateNonEmpty(input.questionId, 'questionId');
  validateOrdinal(input.ordinal);
  validateIsoTimestamp(input.completedAt);
  validateSafePositiveInteger(input.attemptCount, 'attemptCount');
  if (typeof input.pendingSync !== 'boolean') {
    throw new TypeError('pendingSync must be a boolean');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapDatabaseRow(
  row: unknown,
  requestedCatalogVersion: string,
): LocalQuestionProgress {
  try {
    if (!isRecord(row) || row.catalog_version !== requestedCatalogVersion) {
      throw new TypeError('invalid row');
    }
    if (row.pending_sync !== 0 && row.pending_sync !== 1) {
      throw new TypeError('invalid pending_sync');
    }

    const progress: LocalQuestionProgress = {
      catalogVersion: row.catalog_version as string,
      questionId: row.question_id as string,
      ordinal: row.ordinal as number,
      completedAt: row.completed_at as string,
      attemptCount: row.attempt_count as number,
      pendingSync: row.pending_sync === 1,
    };
    validateProgress(progress);
    return Object.freeze(progress);
  } catch {
    throw new Error('Malformed question_progress row');
  }
}

function isStableOrdinalConstraint(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed:.*question_progress.*ordinal/i.test(error.message)
  );
}

export class SQLiteProgressRepository implements LocalProgressRepository {
  private initializePromise: Promise<void> | undefined;
  private database: SQLiteProgressDatabase | undefined;

  constructor(
    private readonly openDatabase: SQLiteProgressDatabaseOpener =
      defaultOpenDatabase,
  ) {}

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      const attempt = this.openAndMigrate();
      this.initializePromise = attempt.catch((error) => {
        this.initializePromise = undefined;
        this.database = undefined;
        throw error;
      });
    }
    return this.initializePromise;
  }

  private async openAndMigrate(): Promise<void> {
    const database = await this.openDatabase(DATABASE_NAME);
    try {
      await database.execAsync('PRAGMA journal_mode = WAL;');

      const versionRow = await database.getFirstAsync('PRAGMA user_version;');
      if (
        !isRecord(versionRow) ||
        typeof versionRow.user_version !== 'number' ||
        !Number.isInteger(versionRow.user_version) ||
        versionRow.user_version < 0
      ) {
        throw new Error('Invalid progress database version');
      }

      const version = versionRow.user_version;
      if (version > DATABASE_VERSION) {
        throw new Error(`Unsupported progress database version: ${version}`);
      }

      if (version === 0) {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.execAsync(`
CREATE TABLE IF NOT EXISTS question_progress (
  catalog_version TEXT NOT NULL,
  question_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 500),
  completed_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 1),
  pending_sync INTEGER NOT NULL DEFAULT 1 CHECK (pending_sync IN (0, 1)),
  PRIMARY KEY (catalog_version, question_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS question_progress_catalog_ordinal
  ON question_progress (catalog_version, ordinal);
`);
          await transaction.runAsync('PRAGMA user_version = 1;');
        });
      }

      this.database = database;
    } catch (error) {
      try {
        await database.closeAsync();
      } catch {
        // Preserve the initialization error; a failed close must not hide its cause.
      }
      throw error;
    }
  }

  private async getDatabase(): Promise<SQLiteProgressDatabase> {
    await this.initialize();
    if (!this.database) {
      throw new Error('Progress database failed to initialize');
    }
    return this.database;
  }

  async listCompleted(
    catalogVersion: string,
  ): Promise<readonly LocalQuestionProgress[]> {
    validateNonEmpty(catalogVersion, 'catalogVersion');
    const database = await this.getDatabase();
    const rows = await database.getAllAsync(
      `SELECT
  catalog_version,
  question_id,
  ordinal,
  completed_at,
  attempt_count,
  pending_sync
FROM question_progress
WHERE catalog_version = ?
ORDER BY ordinal ASC;`,
      [catalogVersion],
    );

    return Object.freeze(
      rows.map((row) => mapDatabaseRow(row, catalogVersion)),
    );
  }

  async recordCompletion(input: LocalQuestionProgress): Promise<void> {
    validateProgress(input);
    const database = await this.getDatabase();

    try {
      const result = await database.runAsync(
        `INSERT INTO question_progress (
  catalog_version,
  question_id,
  ordinal,
  completed_at,
  attempt_count,
  pending_sync
) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (catalog_version, question_id) DO UPDATE SET
  completed_at = CASE
    WHEN julianday(excluded.completed_at) < julianday(question_progress.completed_at)
      THEN excluded.completed_at
    ELSE question_progress.completed_at
  END,
  attempt_count = max(question_progress.attempt_count, excluded.attempt_count),
  pending_sync = max(question_progress.pending_sync, excluded.pending_sync)
WHERE question_progress.ordinal = excluded.ordinal;`,
        [
          input.catalogVersion,
          input.questionId,
          input.ordinal,
          input.completedAt,
          input.attemptCount,
          input.pendingSync ? 1 : 0,
        ],
      );

      if (result.changes === 0) {
        throw new Error(STABLE_MAPPING_ERROR);
      }
    } catch (error) {
      if (
        (error instanceof Error && error.message === STABLE_MAPPING_ERROR) ||
        isStableOrdinalConstraint(error)
      ) {
        throw new Error(STABLE_MAPPING_ERROR);
      }
      throw error;
    }
  }
}
