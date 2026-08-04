import { InMemoryProgressRepository } from './inMemoryProgressRepository';
import type {
  LocalProgressRepository,
  LocalQuestionProgress,
} from './localProgressRepository';

export const BROWSER_PROGRESS_STORAGE_KEY =
  'subnet-game:journey-progress:v1';
const BROWSER_PROGRESS_SCHEMA_VERSION = 1;

type BrowserProgressPayload = Readonly<{
  schemaVersion: typeof BROWSER_PROGRESS_SCHEMA_VERSION;
  records: readonly LocalQuestionProgress[];
}>;

export type BrowserStorageResolver = () => Storage;

function parsePayload(serialized: string): BrowserProgressPayload {
  const parsed: unknown = JSON.parse(serialized);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed) ||
    parsed.schemaVersion !== BROWSER_PROGRESS_SCHEMA_VERSION ||
    !('records' in parsed) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error('Stored browser progress uses an unsupported format.');
  }

  return {
    schemaVersion: BROWSER_PROGRESS_SCHEMA_VERSION,
    records: parsed.records as readonly LocalQuestionProgress[],
  };
}

function recordKey(record: LocalQuestionProgress): string {
  return `${record.catalogVersion}\u0000${record.questionId}`;
}

export class BrowserProgressRepository implements LocalProgressRepository {
  private memory = new InMemoryProgressRepository();
  private readonly records = new Map<string, LocalQuestionProgress>();
  private storage: Storage | null = null;
  private initialized = false;

  constructor(private readonly resolveStorage: BrowserStorageResolver) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const storage = this.resolveStorage();
    const nextMemory = new InMemoryProgressRepository();
    const nextRecords = new Map<string, LocalQuestionProgress>();
    const serialized = storage.getItem(BROWSER_PROGRESS_STORAGE_KEY);
    if (serialized !== null) {
      const payload = parsePayload(serialized);
      for (const record of payload.records) {
        await nextMemory.recordCompletion(record);
        const normalized = (await nextMemory.listCompleted(record.catalogVersion)).find(
          ({ questionId }) => questionId === record.questionId,
        );
        if (normalized !== undefined) {
          nextRecords.set(recordKey(normalized), normalized);
        }
      }
    }

    this.memory = nextMemory;
    this.records.clear();
    for (const [key, record] of nextRecords) {
      this.records.set(key, record);
    }
    this.storage = storage;
    this.initialized = true;
  }

  async listCompleted(
    catalogVersion: string,
  ): Promise<readonly LocalQuestionProgress[]> {
    this.assertInitialized();
    return this.memory.listCompleted(catalogVersion);
  }

  async recordCompletion(input: LocalQuestionProgress): Promise<void> {
    this.assertInitialized();
    await this.memory.recordCompletion(input);
    const normalized = (await this.memory.listCompleted(input.catalogVersion)).find(
      ({ questionId }) => questionId === input.questionId,
    );
    if (normalized === undefined) {
      throw new Error('Browser progress could not be normalized.');
    }

    const nextRecords = new Map(this.records);
    nextRecords.set(recordKey(normalized), normalized);
    const payload: BrowserProgressPayload = {
      schemaVersion: BROWSER_PROGRESS_SCHEMA_VERSION,
      records: [...nextRecords.values()].sort(
        (left, right) =>
          left.catalogVersion.localeCompare(right.catalogVersion) ||
          left.ordinal - right.ordinal,
      ),
    };
    this.storage?.setItem(BROWSER_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    this.records.clear();
    for (const [key, record] of nextRecords) {
      this.records.set(key, record);
    }
  }

  private assertInitialized(): void {
    if (!this.initialized || this.storage === null) {
      throw new Error('Browser progress repository is not initialized.');
    }
  }
}
