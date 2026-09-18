import { useLayoutEffect, useRef } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import type {
  LocalProgressRepository,
  LocalQuestionProgress,
} from '../localProgressRepository';
import { useLocalProgress } from '../useLocalProgress';

function completion(ordinal: number, catalogVersion = 'catalog-v1'): LocalQuestionProgress {
  return {
    catalogVersion,
    questionId: `question-${ordinal}`,
    ordinal,
    completedAt: '2026-07-24T10:00:00.000Z',
    attemptCount: 1,
    pendingSync: true,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function repository(overrides: Partial<LocalProgressRepository> = {}): LocalProgressRepository {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    listCompleted: jest.fn().mockResolvedValue([]),
    recordCompletion: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useLocalProgress', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('initializes before hydrating and exposes a sorted unique frozen view only when ready', async () => {
    const initialization = deferred<void>();
    const rows = deferred<readonly LocalQuestionProgress[]>();
    const calls: string[] = [];
    const progressRepository = repository({
      initialize: jest.fn(async () => {
        calls.push('initialize');
        await initialization.promise;
      }),
      listCompleted: jest.fn(async (catalogVersion) => {
        calls.push(`list:${catalogVersion}`);
        return rows.promise;
      }),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.completedOrdinals).toEqual([]);
    expect(calls).toEqual(['initialize']);

    await act(async () => initialization.resolve());
    expect(calls).toEqual(['initialize', 'list:catalog-v1']);
    expect(result.current.loading).toBe(true);
    expect(result.current.completedOrdinals).toEqual([]);

    await act(async () => rows.resolve([completion(3), completion(1), completion(3)]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedOrdinals).toEqual([1, 3]);
    expect(Object.isFrozen(result.current.completedOrdinals)).toBe(true);
    expect(progressRepository.initialize).toHaveBeenCalledTimes(1);
  });

  it('adopts synchronized ordinals without re-entering the loading state', async () => {
    const progressRepository = repository({
      listCompleted: jest.fn().mockResolvedValue([completion(1)]),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.adoptCompletedOrdinals([3, 1, 2, 3]));

    expect(result.current.loading).toBe(false);
    expect(result.current.completedOrdinals).toEqual([1, 2, 3]);
    expect(Object.isFrozen(result.current.completedOrdinals)).toBe(true);
  });

  it('surfaces a friendly load error and retries hydration without remounting', async () => {
    const retryInitialization = deferred<void>();
    const progressRepository = repository({
      initialize: jest
        .fn()
        .mockRejectedValueOnce(new Error('database unavailable'))
        .mockImplementationOnce(() => retryInitialization.promise),
      listCompleted: jest.fn().mockResolvedValue([completion(2)]),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(
      new Error('Unable to load local progress. Please try again.'),
    );
    expect(result.current.failure).toEqual({
      kind: 'load',
      error: new Error('Unable to load local progress. Please try again.'),
    });
    expect(result.current.completedOrdinals).toEqual([]);

    await act(async () => result.current.retry());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.completedOrdinals).toEqual([]);
    await act(async () => retryInitialization.resolve());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedOrdinals).toEqual([2]);
    expect(result.current.error).toBeNull();
    expect(progressRepository.initialize).toHaveBeenCalledTimes(2);
  });

  it('does not repeat successful initialization when retrying a failed hydration', async () => {
    const progressRepository = repository({
      listCompleted: jest
        .fn()
        .mockRejectedValueOnce(new Error('temporary read failure'))
        .mockResolvedValueOnce([completion(2)]),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.completedOrdinals).toEqual([2]));

    expect(progressRepository.initialize).toHaveBeenCalledTimes(1);
    expect(progressRepository.listCompleted).toHaveBeenCalledTimes(2);
  });

  it('refreshes completed ordinals after an external account sync', async () => {
    let rows: readonly LocalQuestionProgress[] = [];
    const progressRepository = repository({
      listCompleted: jest.fn(async () => rows),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedOrdinals).toEqual([]);

    rows = [completion(2), completion(4)];
    await act(async () => result.current.refresh());

    await waitFor(() => expect(result.current.completedOrdinals).toEqual([2, 4]));
    expect(progressRepository.initialize).toHaveBeenCalledTimes(1);
    expect(progressRepository.listCompleted).toHaveBeenCalledTimes(2);
  });

  it('rejects writes while hydration is incomplete so an older snapshot cannot erase them', async () => {
    const rows = deferred<readonly LocalQuestionProgress[]>();
    const progressRepository = repository({
      listCompleted: jest.fn(() => rows.promise),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );

    let rejection: unknown;
    await act(async () => {
      try {
        await result.current.recordCompletion(completion(1));
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toEqual(new Error('Local progress is still loading.'));
    expect(progressRepository.recordCompletion).not.toHaveBeenCalled();
    await act(async () => rows.resolve([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('adds a completion only after persistence succeeds and keeps callbacks stable', async () => {
    const write = deferred<void>();
    const progressRepository = repository({
      recordCompletion: jest.fn(() => write.promise),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const originalRecordCompletion = result.current.recordCompletion;
    const originalRetry = result.current.retry;
    let savePromise!: Promise<void>;

    await act(async () => {
      savePromise = result.current.recordCompletion(completion(4));
    });

    expect(progressRepository.recordCompletion).toHaveBeenCalledWith(completion(4));
    expect(result.current.completedOrdinals).toEqual([]);

    await act(async () => {
      write.resolve();
      await savePromise;
    });

    expect(result.current.completedOrdinals).toEqual([4]);
    expect(Object.isFrozen(result.current.completedOrdinals)).toBe(true);
    expect(result.current.recordCompletion).toBe(originalRecordCompletion);
    expect(result.current.retry).toBe(originalRetry);
  });

  it('keeps progress unchanged, exposes a friendly error, and rejects a failed write', async () => {
    const persistenceError = new Error('disk full');
    const progressRepository = repository({
      listCompleted: jest.fn().mockResolvedValue([completion(1)]),
      recordCompletion: jest
        .fn()
        .mockRejectedValueOnce(persistenceError)
        .mockResolvedValueOnce(undefined),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    let rejection: unknown;

    await act(async () => {
      try {
        await result.current.recordCompletion(completion(2));
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toBe(persistenceError);
    expect(result.current.completedOrdinals).toEqual([1]);
    expect(result.current.error).toEqual(
      new Error('Unable to save local progress. Please try again.'),
    );

    await act(async () => result.current.retry());
    expect(result.current.loading).toBe(false);
    expect(result.current.completedOrdinals).toEqual([1]);
    expect(result.current.error).toBeNull();
    expect(progressRepository.initialize).toHaveBeenCalledTimes(1);
    expect(progressRepository.listCompleted).toHaveBeenCalledTimes(1);

    await act(async () => result.current.recordCompletion(completion(2)));

    expect(result.current.completedOrdinals).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('de-duplicates repeated and concurrent successful completions', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const progressRepository = repository({
      recordCompletion: jest
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise)
        .mockResolvedValueOnce(undefined),
    });
    const { result } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const firstSave = result.current.recordCompletion(completion(3));
    const secondSave = result.current.recordCompletion(completion(3));

    await act(async () => {
      second.resolve();
      await secondSave;
    });
    await act(async () => {
      first.resolve();
      await firstSave;
      await result.current.recordCompletion(completion(3));
    });

    expect(result.current.completedOrdinals).toEqual([3]);
    expect(progressRepository.recordCompletion).toHaveBeenCalledTimes(3);
  });

  it('ignores a stale hydration result after the catalog version changes', async () => {
    const oldRows = deferred<readonly LocalQuestionProgress[]>();
    const progressRepository = repository({
      listCompleted: jest.fn((version) =>
        version === 'catalog-v1'
          ? oldRows.promise
          : Promise.resolve([completion(2, 'catalog-v2')]),
      ),
    });
    const { result, rerender } = await renderHook(
      ({ version }: { version: string }) =>
        useLocalProgress(progressRepository, version),
      { initialProps: { version: 'catalog-v1' } },
    );

    await rerender({ version: 'catalog-v2' });
    await waitFor(() => expect(result.current.completedOrdinals).toEqual([2]));
    await act(async () => oldRows.resolve([completion(1)]));

    expect(result.current.loading).toBe(false);
    expect(result.current.completedOrdinals).toEqual([2]);
    expect(progressRepository.initialize).toHaveBeenCalledTimes(1);
  });

  it('rejects a retained callback after its catalog and repository are replaced', async () => {
    const firstRepository = repository();
    const secondRepository = repository({
      listCompleted: jest.fn().mockResolvedValue([completion(2, 'catalog-v2')]),
    });
    const { result, rerender } = await renderHook(
      ({ progressRepository, version }: {
        progressRepository: LocalProgressRepository;
        version: string;
      }) => useLocalProgress(progressRepository, version),
      {
        initialProps: {
          progressRepository: firstRepository,
          version: 'catalog-v1',
        },
      },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const staleRecordCompletion = result.current.recordCompletion;

    await rerender({
      progressRepository: secondRepository,
      version: 'catalog-v2',
    });
    await waitFor(() => expect(result.current.completedOrdinals).toEqual([2]));

    let rejection: unknown;
    await act(async () => {
      try {
        await staleRecordCompletion(completion(1));
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toEqual(new Error('Local progress context changed.'));
    expect(firstRepository.recordCompletion).not.toHaveBeenCalled();
    expect(secondRepository.recordCompletion).not.toHaveBeenCalled();
    expect(result.current.completedOrdinals).toEqual([2]);
  });

  it('invalidates a stale callback before descendant layout effects run', async () => {
    const firstRepository = repository();
    const secondRepository = repository();
    const invocation = deferred<unknown>();
    const { result, rerender } = await renderHook(
      ({ progressRepository, version }: {
        progressRepository: LocalProgressRepository;
        version: string;
      }) => {
        const progress = useLocalProgress(progressRepository, version);
        const retainedCallback = useRef(progress.recordCompletion);
        const invoked = useRef(false);

        useLayoutEffect(() => {
          if (version === 'catalog-v1') {
            retainedCallback.current = progress.recordCompletion;
          } else if (!invoked.current) {
            invoked.current = true;
            void retainedCallback.current(completion(1)).then(
              () => invocation.resolve(undefined),
              (error: unknown) => invocation.resolve(error),
            );
          }
        }, [progress.recordCompletion, version]);

        return progress;
      },
      {
        initialProps: {
          progressRepository: firstRepository,
          version: 'catalog-v1',
        },
      },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await rerender({
      progressRepository: secondRepository,
      version: 'catalog-v2',
    });
    const rejection = await invocation.promise;

    expect(rejection).toEqual(new Error('Local progress context changed.'));
    expect(firstRepository.recordCompletion).not.toHaveBeenCalled();
    expect(secondRepository.recordCompletion).not.toHaveBeenCalled();
  });

  it('does not update or warn after unmount during hydration', async () => {
    const rows = deferred<readonly LocalQuestionProgress[]>();
    const progressRepository = repository({
      listCompleted: jest.fn(() => rows.promise),
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );

    await unmount();
    await act(async () => rows.resolve([completion(1)]));

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not update or warn after unmount during a write', async () => {
    const write = deferred<void>();
    const progressRepository = repository({
      recordCompletion: jest.fn(() => write.promise),
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, unmount } = await renderHook(() =>
      useLocalProgress(progressRepository, 'catalog-v1'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const save = result.current.recordCompletion(completion(1));

    await unmount();
    await act(async () => {
      write.resolve();
      await save;
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('does not let an old-catalog write contaminate newly hydrated progress', async () => {
    const write = deferred<void>();
    const progressRepository = repository({
      listCompleted: jest.fn((version) =>
        Promise.resolve(version === 'catalog-v2' ? [completion(2, 'catalog-v2')] : []),
      ),
      recordCompletion: jest.fn(() => write.promise),
    });
    const { result, rerender } = await renderHook(
      ({ version }: { version: string }) =>
        useLocalProgress(progressRepository, version),
      { initialProps: { version: 'catalog-v1' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const oldSave = result.current.recordCompletion(completion(1));

    await rerender({ version: 'catalog-v2' });
    await waitFor(() => expect(result.current.completedOrdinals).toEqual([2]));
    await act(async () => {
      write.resolve();
      await oldSave;
    });

    expect(result.current.completedOrdinals).toEqual([2]);
  });
});
