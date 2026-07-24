import type {
  LocalProgressRepository,
  LocalQuestionProgress,
} from './localProgressRepository';

function copyAndFreeze(
  progress: LocalQuestionProgress,
): LocalQuestionProgress {
  return Object.freeze({
    catalogVersion: progress.catalogVersion,
    questionId: progress.questionId,
    ordinal: progress.ordinal,
    completedAt: progress.completedAt,
    attemptCount: progress.attemptCount,
    pendingSync: progress.pendingSync,
  });
}

function validateNonEmpty(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function validateSafePositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a safe positive integer`);
  }
}

function validateIsoTimestamp(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
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
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError('completedAt must be a valid ISO timestamp');
  }
}

function validateProgress(input: LocalQuestionProgress): void {
  validateNonEmpty(input.catalogVersion, 'catalogVersion');
  validateNonEmpty(input.questionId, 'questionId');
  validateSafePositiveInteger(input.ordinal, 'ordinal');
  validateIsoTimestamp(input.completedAt);
  validateSafePositiveInteger(input.attemptCount, 'attemptCount');
  if (typeof input.pendingSync !== 'boolean') {
    throw new TypeError('pendingSync must be a boolean');
  }
}

export class InMemoryProgressRepository implements LocalProgressRepository {
  private readonly records = new Map<
    string,
    Map<string, LocalQuestionProgress>
  >();

  async initialize(): Promise<void> {}

  async listCompleted(
    catalogVersion: string,
  ): Promise<readonly LocalQuestionProgress[]> {
    validateNonEmpty(catalogVersion, 'catalogVersion');
    const records = this.records.get(catalogVersion)?.values() ?? [];
    const sortedRecords = Array.from(records).sort(
      (left, right) => left.ordinal - right.ordinal,
    );
    return Object.freeze(sortedRecords.map(copyAndFreeze));
  }

  async recordCompletion(input: LocalQuestionProgress): Promise<void> {
    validateProgress(input);
    let catalogRecords = this.records.get(input.catalogVersion);
    if (!catalogRecords) {
      catalogRecords = new Map();
      this.records.set(input.catalogVersion, catalogRecords);
    }

    const existing = catalogRecords.get(input.questionId);
    const ordinalConflict = Array.from(catalogRecords.values()).find(
      (record) =>
        record.ordinal === input.ordinal && record.questionId !== input.questionId,
    );
    if (
      (existing && existing.ordinal !== input.ordinal) ||
      ordinalConflict !== undefined
    ) {
      throw new Error('questionId and ordinal must keep a stable mapping');
    }

    const next = existing
      ? {
          ...existing,
          completedAt:
            Date.parse(input.completedAt) < Date.parse(existing.completedAt)
              ? input.completedAt
              : existing.completedAt,
          attemptCount: Math.max(existing.attemptCount, input.attemptCount),
          pendingSync: existing.pendingSync || input.pendingSync,
        }
      : input;

    catalogRecords.set(input.questionId, copyAndFreeze(next));
  }
}
