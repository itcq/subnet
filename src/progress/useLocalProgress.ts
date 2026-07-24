import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  LocalProgressRepository,
  LocalQuestionProgress,
} from './localProgressRepository';

export type LocalProgressState = Readonly<{
  loading: boolean;
  completedOrdinals: readonly number[];
  recordCompletion(input: LocalQuestionProgress): Promise<void>;
  error: Error | null;
  retry(): void;
}>;

type ProgressFailure = Readonly<{
  kind: 'load' | 'save';
  error: Error;
}>;

type ProgressContext = Readonly<{
  repository: LocalProgressRepository;
  catalogVersion: string;
}>;

type HydratedRequest = Readonly<{
  context: ProgressContext;
  loadAttempt: number;
}>;

const EMPTY_ORDINALS: readonly number[] = Object.freeze([]);

function sortedUniqueOrdinals(rows: readonly LocalQuestionProgress[]): readonly number[] {
  return Object.freeze([...new Set(rows.map(({ ordinal }) => ordinal))].sort((a, b) => a - b));
}

export function useLocalProgress(
  repository: LocalProgressRepository,
  catalogVersion: string,
): LocalProgressState {
  const [loading, setLoading] = useState(true);
  const [completedOrdinals, setCompletedOrdinals] =
    useState<readonly number[]>(EMPTY_ORDINALS);
  const [failure, setFailure] = useState<ProgressFailure | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [hydratedRequest, setHydratedRequest] =
    useState<HydratedRequest | null>(null);
  const generation = useRef(0);
  const latestWrite = useRef(0);
  const failureKind = useRef<ProgressFailure['kind'] | null>(null);
  const activeContext = useRef<ProgressContext | null>(null);
  const initializationPromises = useRef(
    new WeakMap<LocalProgressRepository, Promise<void>>(),
  );
  const context = useMemo<ProgressContext>(
    () => ({ repository, catalogVersion }),
    [catalogVersion, repository],
  );

  useLayoutEffect(() => {
    activeContext.current = context;
    return () => {
      if (activeContext.current === context) {
        activeContext.current = null;
      }
    };
  }, [context]);

  const retry = useCallback(() => {
    if (failureKind.current === 'load') {
      failureKind.current = null;
      setFailure(null);
      setLoading(true);
      setCompletedOrdinals(EMPTY_ORDINALS);
      setLoadAttempt((attempt) => attempt + 1);
      return;
    }

    failureKind.current = null;
    setFailure(null);
  }, []);

  useEffect(() => {
    const requestGeneration = ++generation.current;

    void (async () => {
      try {
        let initialization = initializationPromises.current.get(repository);
        if (!initialization) {
          initialization = repository.initialize();
          initializationPromises.current.set(repository, initialization);
        }

        try {
          await initialization;
        } catch (cause) {
          if (initializationPromises.current.get(repository) === initialization) {
            initializationPromises.current.delete(repository);
          }
          throw cause;
        }

        const rows = await repository.listCompleted(catalogVersion);
        if (
          generation.current === requestGeneration &&
          activeContext.current === context
        ) {
          failureKind.current = null;
          setCompletedOrdinals(sortedUniqueOrdinals(rows));
          setFailure(null);
          setLoading(false);
          setHydratedRequest({ context, loadAttempt });
        }
      } catch {
        if (
          generation.current === requestGeneration &&
          activeContext.current === context
        ) {
          failureKind.current = 'load';
          setCompletedOrdinals(EMPTY_ORDINALS);
          setFailure({
            kind: 'load',
            error: new Error('Unable to load local progress. Please try again.'),
          });
          setLoading(false);
          setHydratedRequest({ context, loadAttempt });
        }
      }
    })();

    return () => {
      if (generation.current === requestGeneration) {
        generation.current += 1;
      }
    };
  }, [catalogVersion, context, loadAttempt, repository]);

  const hydrationIsCurrent =
    hydratedRequest?.context === context &&
    hydratedRequest.loadAttempt === loadAttempt;
  const canRecordCompletion =
    hydrationIsCurrent && !loading && failure?.kind !== 'load';

  const recordCompletion = useCallback(
    async (input: LocalQuestionProgress) => {
      if (
        activeContext.current !== context ||
        input.catalogVersion !== catalogVersion
      ) {
        throw new Error('Local progress context changed.');
      }
      if (!canRecordCompletion) {
        throw new Error('Local progress is still loading.');
      }

      const write = ++latestWrite.current;
      try {
        await repository.recordCompletion(input);
      } catch (cause) {
        if (
          activeContext.current === context &&
          latestWrite.current === write
        ) {
          failureKind.current = 'save';
          setFailure({
            kind: 'save',
            error: new Error('Unable to save local progress. Please try again.'),
          });
        }
        throw cause;
      }

      if (activeContext.current === context) {
        setCompletedOrdinals((ordinals) => {
          if (ordinals.includes(input.ordinal)) {
            return ordinals;
          }
          return Object.freeze([...ordinals, input.ordinal].sort((a, b) => a - b));
        });
        if (latestWrite.current === write) {
          failureKind.current = null;
          setFailure(null);
        }
      }
    },
    [canRecordCompletion, catalogVersion, context, repository],
  );

  return {
    loading: hydrationIsCurrent ? loading : true,
    completedOrdinals: hydrationIsCurrent
      ? completedOrdinals
      : EMPTY_ORDINALS,
    recordCompletion,
    error: hydrationIsCurrent ? failure?.error ?? null : null,
    retry,
  };
}
