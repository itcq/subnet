/* eslint-disable @typescript-eslint/no-require-imports, import/first -- The route creates its repository at module load, so tests must install mocks before requiring it. */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import type { LocalTimedResult } from '@/domain/achievements/achievements';
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
const mockTimedChallenge = jest.fn((_props: unknown) => null);
const mockBackHandlerRemove = jest.fn();
let mockHardwareBackPress: (() => boolean | null | undefined) | undefined;
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

jest.mock('@/features/timed/TimedChallenge', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    TimedChallenge: (props: unknown) => {
      mockTimedChallenge(props);
      return ReactModule.createElement(View, { testID: 'timed-challenge' });
    },
  };
});

import { CATALOG_VERSION, subnetQuestionCatalog } from '@/domain/questions/catalog';
import { createProgressRepository } from '@/progress/createProgressRepository';
import { useLocalProgress } from '@/progress/useLocalProgress';

const HomeScreen = require('../index').default as typeof import('../index').default;

const WEB_NOTICE =
  'Web progress is kept only for this browser session and is cleared when the page reloads.';
const TAGLINE = 'Learn subnetting one short lesson at a time.';

jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_eventName, handler) => {
  mockHardwareBackPress = () => handler(undefined as never);
  return { remove: mockBackHandlerRemove };
});

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

async function startJourney(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByRole('button', { name: /CONTINUE JOURNEY|START JOURNEY/ }));
}

describe('HomeScreen launch and menu flow', () => {
  beforeEach(() => {
    mockRetry.mockClear();
    mockRecordCompletion.mockReset();
    mockNetworkChallenge.mockClear();
    mockTimedChallenge.mockClear();
    mockBackHandlerRemove.mockClear();
    mockHardwareBackPress = undefined;
    jest.mocked(BackHandler.addEventListener).mockClear();
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

  it('shows a branded-neutral accessible launch state and hides menu and challenge during hydration', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Subnet Game')).toBeTruthy();
    expect(screen.getByText(TAGLINE)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Preparing your journey' })).toBeTruthy();
    expect(screen.getByText('Loading saved progress…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'START JOURNEY' })).toBeNull();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(useLocalProgress).toHaveBeenCalledWith(mockRepository, CATALOG_VERSION);
    expect(createProgressRepository).toHaveBeenCalledTimes(1);
  });

  it('shows a coherent load error with one accessible retry and no menu or challenge', async () => {
    mockProgressState = {
      ...mockProgressState,
      loading: false,
      failure: { kind: 'load', error: new Error('read failed') },
      error: new Error('read failed'),
    };
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Subnet Game')).toBeTruthy();
    expect(screen.getByText(TAGLINE)).toBeTruthy();
    expect(screen.getByText('We could not load your saved progress.')).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(screen.queryByRole('button', { name: 'START JOURNEY' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry loading saved progress' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('defaults to a focused journey after hydration without exposing the global catalog size', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(screen.getByTestId('main-menu-scroll')).toBeTruthy();
    expect(screen.getByText('Subnet Game')).toBeTruthy();
    expect(screen.getByText('YOUR SUBNET JOURNEY')).toBeTruthy();
    expect(screen.getByText('Foundations')).toBeTruthy();
    expect(screen.getByText('Unit 1 · Lesson 1')).toBeTruthy();
    expect(screen.getByText('Challenge 2 is ready')).toBeTruthy();
    expect(screen.getByText('● Foundations · Current')).toBeTruthy();
    expect(screen.getByText('🔒 Builder · Locked')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'LEARN SUBNETTING' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PLAY TIMED MODE' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'LOCAL RANK & BADGES' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HOW TO PLAY' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'VIEW JOURNEY' })).toBeTruthy();
    expect(screen.queryByText(/500/)).toBeNull();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
  });

  it('uses accurate primary actions and opens a completed-journey celebration', async () => {
    hydrated({ completedOrdinals: [] });
    const untouched = await render(<HomeScreen />);
    expect(untouched.getByRole('button', { name: 'START JOURNEY' })).toBeTruthy();
    await untouched.unmount();

    hydrated({ completedOrdinals: subnetQuestionCatalog.map((question) => question.ordinal) });
    const completed = await render(<HomeScreen />);
    await fireEvent.press(completed.getByRole('button', { name: 'VIEW COMPLETED JOURNEY' }));

    expect(completed.getByRole('header', { name: 'Journey Complete' })).toBeTruthy();
    expect(completed.getByText('Subnet Mastery achieved')).toBeTruthy();
    expect(completed.getByText('You completed every stage of the subnet journey.')).toBeTruthy();
    expect(completed.queryByText(/500/)).toBeNull();
    expect(completed.queryByTestId('network-challenge')).toBeNull();

    await fireEvent.press(completed.getByRole('button', { name: 'Back to main menu' }));
    expect(completed.getByRole('button', { name: 'VIEW COMPLETED JOURNEY' })).toBeTruthy();
  });

  it('opens optional learning, returns to the menu, and starts untimed practice without gating the Journey', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));

    expect(screen.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(screen.getByText(/This section is optional/)).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Practice this concept' }));
    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(screen.getByText('Practice only — this does not change your Journey progress.')).toBeTruthy();

    const practiceProps = mockNetworkChallenge.mock.calls.at(-1)?.[0] as {
      initialCompletedOrdinals: readonly number[];
      onQuestionCompleted(question: SubnetQuestion): Promise<void> | void;
    };
    expect(practiceProps.initialCompletedOrdinals).toEqual([]);
    await practiceProps.onQuestionCompleted(subnetQuestionCatalog[0]);
    expect(mockRecordCompletion).not.toHaveBeenCalled();
  });

  it('runs optional timed practice separately and shows earned local ranks and badges', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'PLAY TIMED MODE' }));
    expect(screen.getByRole('header', { name: 'Choose Your Play Style' })).toBeTruthy();
    expect(screen.queryByTestId('timed-challenge')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'START 2-MINUTE MODE' }));
    expect(screen.getByTestId('timed-challenge')).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();

    const props = mockTimedChallenge.mock.calls.at(-1)?.[0] as {
      durationSeconds: number;
      onCompleted: (result: LocalTimedResult) => void;
    };
    expect(props.durationSeconds).toBe(120);
    await act(async () => {
      props.onCompleted({
        resultId: 'timed-route-result',
        score: 700,
        elapsedSeconds: 45,
        failureCount: 3,
        hintsUsed: 1,
        timeLimitSeconds: 120,
      });
    });
    expect(mockRecordCompletion).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));
    await fireEvent.press(screen.getByRole('button', { name: 'LOCAL RANK & BADGES' }));

    expect(screen.getByRole('header', { name: 'Local Rank & Badges' })).toBeTruthy();
    expect(screen.getByText('700 local points')).toBeTruthy();
    expect(screen.getByText('Persistent Solver')).toBeTruthy();
  });

  it('opens the challenge from the menu and returns to the menu', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'CONTINUE JOURNEY' }));
    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'HOW TO PLAY' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();
  });

  it('uses current Android hardware Back behavior and removes replaced listeners', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(mockHardwareBackPress?.()).toBe(false);
    expect(BackHandler.addEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    await fireEvent.press(screen.getByRole('button', { name: 'CONTINUE JOURNEY' }));
    const challengeBackPress = mockHardwareBackPress;

    expect(challengeBackPress).toBeDefined();
    await act(async () => {
      expect(challengeBackPress?.()).toBe(true);
    });

    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();
    expect(mockHardwareBackPress).not.toBe(challengeBackPress);
    expect(mockHardwareBackPress?.()).toBe(false);
    expect(mockBackHandlerRemove).toHaveBeenCalledTimes(2);

    await screen.unmount();
    expect(mockBackHandlerRemove).toHaveBeenCalledTimes(3);
  });

  it('returns from an info screen with Android hardware Back', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'HOW TO PLAY' }));
    const infoBackPress = mockHardwareBackPress;

    await act(async () => {
      expect(infoBackPress?.()).toBe(true);
    });

    expect(screen.queryByRole('header', { name: 'How to Play' })).toBeNull();
    expect(screen.getByRole('button', { name: 'HOW TO PLAY' })).toBeTruthy();
    expect(mockHardwareBackPress?.()).toBe(false);
  });

  it('roundtrips through practical How to Play instructions', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'HOW TO PLAY' }));
    expect(screen.getByTestId('info-scroll')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'How to Play' })).toBeTruthy();
    expect(screen.getByText('1. Read the network and prefix-length prompt.')).toBeTruthy();
    expect(
      screen.getByText('2. Enter your answer as four decimal octets (for example, 192.168.1.0).'),
    ).toBeTruthy();
    expect(screen.getByText('3. Submit your answer. Retries are expected and useful.')).toBeTruthy();
    expect(
      screen.getByText('Completed challenges are saved according to the progress notice shown in this app.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Only completed challenges are saved; unfinished answers are discarded when you leave.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.getByRole('button', { name: 'HOW TO PLAY' })).toBeTruthy();
  });

  it('shows stage states and descriptions in the journey map without ordinal ranges', async () => {
    hydrated({ completedOrdinals: Array.from({ length: 100 }, (_, index) => index + 1) });
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Builder')).toBeTruthy();
    expect(screen.getByText('Unit 1 · Lesson 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'VIEW JOURNEY' }));
    expect(screen.getByRole('header', { name: 'Your Journey' })).toBeTruthy();
    expect(screen.getByText('✓ Foundations · Complete')).toBeTruthy();
    expect(screen.getByText('● Builder · Current')).toBeTruthy();
    expect(screen.getByText('🔒 Advanced · Locked')).toBeTruthy();
    expect(screen.getByText('🔒 Mastery · Locked')).toBeTruthy();
    expect(screen.getByText('Master edge cases, including point-to-point and host routes.')).toBeTruthy();
    expect(screen.queryByText(/500|1–100|101–299|300–399|400–500/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.getByRole('button', { name: 'VIEW JOURNEY' })).toBeTruthy();
  });

  it('shows exactly one web persistence notice on every hydrated local screen', async () => {
    hydrated();
    mockRuntime.durable = false;
    mockRuntime.persistenceNotice = WEB_NOTICE;
    const screen = await render(<HomeScreen />);

    expect(screen.getAllByText(WEB_NOTICE)).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));
    expect(screen.getAllByText(WEB_NOTICE)).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));

    await fireEvent.press(screen.getByRole('button', { name: 'HOW TO PLAY' }));
    expect(screen.getAllByText(WEB_NOTICE)).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));

    await fireEvent.press(screen.getByRole('button', { name: 'VIEW JOURNEY' }));
    expect(screen.getAllByText(WEB_NOTICE)).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to main menu' }));

    await startJourney(screen);
    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(screen.getAllByText(WEB_NOTICE)).toHaveLength(1);
    await screen.unmount();

    hydrated({ completedOrdinals: subnetQuestionCatalog.map((question) => question.ordinal) });
    const completed = await render(<HomeScreen />);
    expect(completed.getAllByText(WEB_NOTICE)).toHaveLength(1);
    await fireEvent.press(completed.getByRole('button', { name: 'VIEW COMPLETED JOURNEY' }));
    expect(completed.getAllByText(WEB_NOTICE)).toHaveLength(1);
  });

  it('keeps the challenge rendered when the latest failure was a save', async () => {
    hydrated({
      failure: { kind: 'save', error: new Error('write failed') },
      error: new Error('write failed'),
    });
    const screen = await render(<HomeScreen />);

    await startJourney(screen);
    expect(screen.getByTestId('network-challenge')).toBeTruthy();
    expect(screen.queryByText('We could not load your saved progress.')).toBeNull();
  });

  it('records stable question fields with a deterministic completion timestamp', async () => {
    hydrated();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T12:34:56.789Z'));
    mockRecordCompletion.mockResolvedValueOnce(undefined);

    try {
      const screen = await render(<HomeScreen />);
      await startJourney(screen);
      const props = mockNetworkChallenge.mock.calls.at(-1)?.[0] as {
        onQuestionCompleted(question: SubnetQuestion): Promise<void>;
      };
      const question = subnetQuestionCatalog[7];

      await props.onQuestionCompleted(question);

      expect(mockNetworkChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          questions: subnetQuestionCatalog,
          initialCompletedOrdinals: [1, 3],
          onQuestionCompleted: expect.any(Function),
        }),
      );
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
