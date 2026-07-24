/* eslint-disable @typescript-eslint/no-require-imports, import/first -- The route creates its repository at module load, so tests must install mocks before requiring it. */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { SubnetQuestion } from '@/domain/questions/types';
import type { LocalProgressRepository } from '@/progress/localProgressRepository';

const mockRepository: LocalProgressRepository = {
  initialize: jest.fn(),
  listCompleted: jest.fn(),
  recordCompletion: jest.fn(),
};
const mockRetry = jest.fn();
const mockRecordCompletion = jest.fn<Promise<void>, [unknown]>();
const mockNetworkChallenge = jest.fn((_props: unknown) => null);
const mockRuntime = {
  repository: mockRepository,
  durable: true,
  persistenceNotice: null as string | null,
};
let mockProgressState = {
  loading: true,
  completedOrdinals: [] as readonly number[],
  recordCompletion: mockRecordCompletion,
  failure: null as null | { kind: 'load' | 'save'; error: Error },
  error: null as Error | null,
  retry: mockRetry,
};

jest.mock('@/progress/createProgressRepository', () => ({
  createProgressRepository: jest.fn(() => mockRuntime),
}));

jest.mock('@/progress/useLocalProgress', () => ({
  useLocalProgress: jest.fn(() => mockProgressState),
}));

jest.mock('@/features/challenge/NetworkChallenge', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    NetworkChallenge: (props: unknown) => {
      mockNetworkChallenge(props);
      return ReactModule.createElement(View, { testID: 'network-challenge' });
    },
  };
});

import { CATALOG_VERSION, subnetQuestionCatalog } from '@/domain/questions/catalog';
import { createProgressRepository } from '@/progress/createProgressRepository';
import { useLocalProgress } from '@/progress/useLocalProgress';

const HomeScreen = require('../index').default as typeof import('../index').default;

const WEB_NOTICE =
  'Web progress is kept only for this browser session and is cleared when the page reloads.';

function hydrated(overrides: Partial<typeof mockProgressState> = {}) {
  mockProgressState = {
    loading: false,
    completedOrdinals: [1, 3],
    recordCompletion: mockRecordCompletion,
    failure: null,
    error: null,
    retry: mockRetry,
    ...overrides,
  };
}

describe('HomeScreen progress hydration', () => {
  beforeEach(() => {
    mockRetry.mockClear();
    mockRecordCompletion.mockReset();
    mockNetworkChallenge.mockClear();
    jest.mocked(useLocalProgress).mockClear();
    mockRuntime.durable = true;
    mockRuntime.persistenceNotice = null;
    mockProgressState = {
      loading: true,
      completedOrdinals: [],
      recordCompletion: mockRecordCompletion,
      failure: null,
      error: null,
      retry: mockRetry,
    };
  });

  it('shows an accessible loading state and hides the challenge during hydration', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Loading saved progress…')).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(useLocalProgress).toHaveBeenCalledWith(mockRepository, CATALOG_VERSION);
    expect(createProgressRepository).toHaveBeenCalledTimes(1);
  });

  it('shows a load error with one retry action and hides the challenge', async () => {
    mockProgressState = {
      ...mockProgressState,
      loading: false,
      failure: { kind: 'load', error: new Error('read failed') },
      error: new Error('read failed'),
    };
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('We could not load your saved progress.')).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Retry loading saved progress' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the hydrated catalog and ordinals without a durable persistence notice', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(mockNetworkChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        questions: subnetQuestionCatalog,
        initialCompletedOrdinals: [1, 3],
        onQuestionCompleted: expect.any(Function),
      }),
    );
    expect(screen.queryByText(WEB_NOTICE)).toBeNull();
  });

  it('shows the exact session-only notice for the web runtime', async () => {
    hydrated();
    mockRuntime.durable = false;
    mockRuntime.persistenceNotice = WEB_NOTICE;

    const screen = await render(<HomeScreen />);

    expect(screen.getByText(WEB_NOTICE)).toBeTruthy();
    expect(screen.getByTestId('network-challenge')).toBeTruthy();
  });

  it('keeps the challenge rendered when the latest failure was a save', async () => {
    hydrated({
      failure: { kind: 'save', error: new Error('write failed') },
      error: new Error('write failed'),
    });

    const screen = await render(<HomeScreen />);

    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(screen.queryByText('We could not load your saved progress.')).toBeNull();
  });

  it('records stable question fields with a deterministic completion timestamp', async () => {
    hydrated();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T12:34:56.789Z'));
    mockRecordCompletion.mockResolvedValueOnce(undefined);

    try {
      await render(<HomeScreen />);
      const props = mockNetworkChallenge.mock.calls.at(-1)?.[0] as {
        onQuestionCompleted(question: SubnetQuestion): Promise<void>;
      };
      const question = subnetQuestionCatalog[7];

      await props.onQuestionCompleted(question);

      expect(mockRecordCompletion).toHaveBeenCalledWith({
        catalogVersion: question.catalogVersion,
        questionId: question.id,
        ordinal: question.ordinal,
        completedAt: '2026-07-24T12:34:56.789Z',
        attemptCount: 1,
        pendingSync: true,
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
