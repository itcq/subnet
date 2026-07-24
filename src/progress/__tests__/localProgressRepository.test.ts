import { InMemoryProgressRepository } from '../inMemoryProgressRepository';
import type { LocalQuestionProgress } from '../localProgressRepository';

describe('InMemoryProgressRepository', () => {
  it('returns no completion rows when empty', async () => {
    const repository = new InMemoryProgressRepository();

    await repository.initialize();

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([]);
  });

  it('records and lists a completion', async () => {
    const repository = new InMemoryProgressRepository();
    const completion = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    } as const;

    await repository.recordCompletion(completion);

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([
      completion,
    ]);
  });

  it('merges duplicate completions without downgrading progress', async () => {
    const repository = new InMemoryProgressRepository();

    await repository.recordCompletion({
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 5,
      pendingSync: false,
    });
    await repository.recordCompletion({
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T09:00:00.000Z',
      attemptCount: 3,
      pendingSync: true,
    });

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([
      {
        catalogVersion: 'catalog-v1',
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-07-24T09:00:00.000Z',
        attemptCount: 5,
        pendingSync: true,
      },
    ]);
  });

  it('rejects a question id that is replayed with a different ordinal', async () => {
    const repository = new InMemoryProgressRepository();
    const base = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    } as const;

    await repository.recordCompletion(base);

    await expect(
      repository.recordCompletion({ ...base, ordinal: 2 }),
    ).rejects.toThrow('questionId and ordinal must keep a stable mapping');
  });

  it('rejects an ordinal that is replayed with a different question id', async () => {
    const repository = new InMemoryProgressRepository();
    const base = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    } as const;

    await repository.recordCompletion(base);

    await expect(
      repository.recordCompletion({ ...base, questionId: 'question-other' }),
    ).rejects.toThrow('questionId and ordinal must keep a stable mapping');
  });

  it('isolates catalog versions and sorts each catalog by ordinal', async () => {
    const repository = new InMemoryProgressRepository();
    const completion = (
      catalogVersion: string,
      questionId: string,
      ordinal: number,
    ) => ({
      catalogVersion,
      questionId,
      ordinal,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    });

    await repository.recordCompletion(
      completion('catalog-v1', 'question-2', 2),
    );
    await repository.recordCompletion(
      completion('catalog-v2', 'question-1', 1),
    );
    await repository.recordCompletion(
      completion('catalog-v1', 'question-1', 1),
    );

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([
      completion('catalog-v1', 'question-1', 1),
      completion('catalog-v1', 'question-2', 2),
    ]);
    await expect(repository.listCompleted('catalog-v2')).resolves.toEqual([
      completion('catalog-v2', 'question-1', 1),
    ]);
  });

  it.each([
    ['empty catalog version', { catalogVersion: ' ' }],
    ['empty question id', { questionId: '' }],
    ['non-positive ordinal', { ordinal: 0 }],
    ['non-integer ordinal', { ordinal: 1.5 }],
    ['unsafe ordinal', { ordinal: Number.MAX_SAFE_INTEGER + 1 }],
    ['invalid ISO timestamp', { completedAt: '2026-02-30T10:00:00.000Z' }],
    ['non-positive attempt count', { attemptCount: 0 }],
    ['non-integer attempt count', { attemptCount: 1.5 }],
    [
      'unsafe attempt count',
      { attemptCount: Number.MAX_SAFE_INTEGER + 1 },
    ],
  ])('rejects %s', async (_description, override) => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
      ...override,
    };

    await expect(repository.recordCompletion(input)).rejects.toThrow();
  });

  it.each([undefined, 'false', 0, null])(
    'rejects non-boolean pendingSync value %p',
    async (pendingSync) => {
      const repository = new InMemoryProgressRepository();
      const input = {
        catalogVersion: 'catalog-v1',
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-07-24T10:00:00.000Z',
        attemptCount: 1,
        pendingSync,
      } as unknown as LocalQuestionProgress;

      await expect(repository.recordCompletion(input)).rejects.toThrow(
        'pendingSync must be a boolean',
      );
    },
  );

  it('rejects a coercible non-string completion timestamp', async () => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: {
        privateNote: 'must-not-be-stored',
        toString: () => '2026-07-24T10:00:00.000Z',
      },
      attemptCount: 1,
      pendingSync: false,
    } as unknown as LocalQuestionProgress;

    await expect(repository.recordCompletion(input)).rejects.toThrow(
      'completedAt must be a valid ISO timestamp',
    );
  });

  it('rejects fractional seconds beyond millisecond precision', async () => {
    const repository = new InMemoryProgressRepository();

    await expect(
      repository.recordCompletion({
        catalogVersion: 'catalog-v1',
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-07-24T10:00:00.0009Z',
        attemptCount: 1,
        pendingSync: false,
      }),
    ).rejects.toThrow('completedAt must be a valid ISO timestamp');
  });

  it.each([true, false])('accepts boolean pendingSync value %p', async (pendingSync) => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync,
    };

    await repository.recordCompletion(input);

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([input]);
  });

  it('accepts leap day in ISO year 0000', async () => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '0000-02-29T00:00:00Z',
      attemptCount: 1,
      pendingSync: false,
    } as const;

    await repository.recordCompletion(input);

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([input]);
  });

  it('rejects an empty catalog version when listing completions', async () => {
    const repository = new InMemoryProgressRepository();

    await expect(repository.listCompleted('  ')).rejects.toThrow(
      'catalogVersion',
    );
  });

  it('compares ISO timestamps chronologically across time-zone offsets', async () => {
    const repository = new InMemoryProgressRepository();
    const base = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      attemptCount: 1,
      pendingSync: false,
    };

    await repository.recordCompletion({
      ...base,
      completedAt: '2026-07-24T09:00:00-02:00',
    });
    await repository.recordCompletion({
      ...base,
      completedAt: '2026-07-24T10:00:00Z',
    });

    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([
      { ...base, completedAt: '2026-07-24T10:00:00Z' },
    ]);
  });

  it('copies and freezes stored and returned completion data', async () => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    };
    const expected = { ...input };

    await repository.recordCompletion(input);
    input.attemptCount = 99;
    const returned = await repository.listCompleted('catalog-v1');

    expect(Object.isFrozen(returned)).toBe(true);
    expect(Object.isFrozen(returned[0])).toBe(true);
    expect(() => {
      (returned as LocalQuestionProgress[]).push(expected);
    }).toThrow();
    (returned[0] as { attemptCount: number }).attemptCount = 99;
    expect(returned[0].attemptCount).toBe(1);
    await expect(repository.listCompleted('catalog-v1')).resolves.toEqual([
      expected,
    ]);
  });

  it('stores only canonical progress fields', async () => {
    const repository = new InMemoryProgressRepository();
    const input = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
      email: 'must-not-be-stored@example.com',
    };

    await repository.recordCompletion(input);
    const [stored] = await repository.listCompleted('catalog-v1');

    expect(stored).toEqual({
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    });
    expect(stored).not.toHaveProperty('email');
  });
});
