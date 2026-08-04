import {
  BROWSER_PROGRESS_STORAGE_KEY,
  BrowserProgressRepository,
} from '../browserProgressRepository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('BrowserProgressRepository', () => {
  it('resolves storage lazily and lists no completions for a fresh browser', async () => {
    const storage = new MemoryStorage();
    const resolveStorage = jest.fn(() => storage);
    const repository = new BrowserProgressRepository(resolveStorage);

    expect(resolveStorage).not.toHaveBeenCalled();

    await repository.initialize();

    expect(resolveStorage).toHaveBeenCalledTimes(1);
    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([]);
  });

  it('restores a completion after a browser reload', async () => {
    const storage = new MemoryStorage();
    const completion = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-08-04T04:30:00.000Z',
      attemptCount: 2,
      pendingSync: true,
    } as const;
    const first = new BrowserProgressRepository(() => storage);
    await first.initialize();

    await first.recordCompletion(completion);

    const reloaded = new BrowserProgressRepository(() => storage);
    await reloaded.initialize();
    await expect(reloaded.listCompleted('catalog-v1')).resolves.toEqual([
      completion,
    ]);
  });

  it('stores a versioned payload containing only validated Journey fields', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProgressRepository(() => storage);
    await repository.initialize();

    await repository.recordCompletion({
      catalogVersion: 'catalog-v1',
      questionId: 'question-2',
      ordinal: 2,
      completedAt: '2026-08-04T04:31:00.000Z',
      attemptCount: 3,
      pendingSync: true,
      privateNote: 'must-not-be-stored',
    } as Parameters<typeof repository.recordCompletion>[0] & {
      privateNote: string;
    });

    expect(JSON.parse(storage.getItem(BROWSER_PROGRESS_STORAGE_KEY) ?? '')).toEqual({
      schemaVersion: 1,
      records: [
        {
          catalogVersion: 'catalog-v1',
          questionId: 'question-2',
          ordinal: 2,
          completedAt: '2026-08-04T04:31:00.000Z',
          attemptCount: 3,
          pendingSync: true,
        },
      ],
    });
  });

  it.each([
    ['malformed JSON', '{not-json'],
    ['unsupported schema', JSON.stringify({ schemaVersion: 2, records: [] })],
    ['invalid record', JSON.stringify({ schemaVersion: 1, records: [{ ordinal: 0 }] })],
  ])('fails closed for %s without deleting stored data', async (_label, serialized) => {
    const storage = new MemoryStorage();
    storage.setItem(BROWSER_PROGRESS_STORAGE_KEY, serialized);
    const repository = new BrowserProgressRepository(() => storage);

    await expect(repository.initialize()).rejects.toThrow();

    expect(storage.getItem(BROWSER_PROGRESS_STORAGE_KEY)).toBe(serialized);
  });

  it('does not retain partially hydrated rows after a failed load retry', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      BROWSER_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        records: [
          {
            catalogVersion: 'catalog-v1',
            questionId: 'question-1',
            ordinal: 1,
            completedAt: '2026-08-04T04:30:00.000Z',
            attemptCount: 1,
            pendingSync: true,
          },
          { ordinal: 0 },
        ],
      }),
    );
    const repository = new BrowserProgressRepository(() => storage);

    await expect(repository.initialize()).rejects.toThrow();
    storage.setItem(
      BROWSER_PROGRESS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, records: [] }),
    );

    await repository.initialize();
    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([]);
  });

  it('surfaces browser storage write failures without claiming persistence', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserProgressRepository(() => storage);
    await repository.initialize();
    jest.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota denied');
    });

    await expect(
      repository.recordCompletion({
        catalogVersion: 'catalog-v1',
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-08-04T04:32:00.000Z',
        attemptCount: 1,
        pendingSync: true,
      }),
    ).rejects.toThrow('quota denied');
    expect(storage.getItem(BROWSER_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('requires initialization and surfaces unavailable browser storage', async () => {
    const repository = new BrowserProgressRepository(() => {
      throw new Error('storage unavailable');
    });

    await expect(repository.listCompleted('catalog-v1')).rejects.toThrow(
      'not initialized',
    );
    await expect(repository.initialize()).rejects.toThrow('storage unavailable');
  });
});
