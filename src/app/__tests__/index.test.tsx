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
const mockAccountRepository: LocalProgressRepository = {
  initialize: jest.fn().mockResolvedValue(undefined),
  listCompleted: jest.fn().mockResolvedValue([]),
  recordCompletion: jest.fn().mockResolvedValue(undefined),
};
const mockRefresh = jest.fn();
const mockAdoptCompletedOrdinals = jest.fn();
const mockRetry = jest.fn();
const mockRecordCompletion = jest.fn<Promise<void>, [unknown]>();
const mockNetworkChallenge = jest.fn((_props: unknown) => null);
const mockGuidedPractice = jest.fn((_props: unknown) => null);
const mockTimedChallenge = jest.fn((_props: unknown) => null);
const mockAccountRegistration = jest.fn((_props: unknown) => null);

const mockBackHandlerRemove = jest.fn();
let mockHardwareBackPress: (() => boolean | null | undefined) | undefined;
const mockRuntime = {
  repository: mockRepository,
  durable: true,
  persistenceNotice: null as string | null,
};
const mockProgressGateway = {
  syncCompleted: jest.fn().mockResolvedValue([]),
};
const mockAccountRuntime = {
  configured: false,
  dataService: null as null | {
    deleteOwnAccount(userId: string): Promise<void>;
    exportAccountData(userId: string): Promise<unknown>;
  },
  privacyNoticeUrl: null as string | null,
  progressGateway: null as typeof mockProgressGateway | null,
  service: null as null | {
    clearDeletedAccountSession?(expectedUserId: string): Promise<boolean>;
    getCurrentAccount(): Promise<{ userId: string; email: string } | null>;
    signOut?(): Promise<void>;
    subscribeToAccountChanges?(
      listener: (identity: { userId: string; email: string } | null) => void,
    ): () => void;
  },
};
let mockProgressState = {
  loading: true,
  completedOrdinals: [] as readonly number[],
  recordCompletion: mockRecordCompletion,
  failure: null as null | { kind: 'load' | 'save'; error: Error },
  error: null as Error | null,
  retry: mockRetry,
  adoptCompletedOrdinals: mockAdoptCompletedOrdinals,
  refresh: mockRefresh,
};

jest.mock('@/progress/createProgressRepository', () => ({
  clearAccountProgressRepository: jest.fn(),
  createAccountProgressRepository: jest.fn(() => mockAccountRepository),
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

jest.mock('@/features/learning/GuidedPractice', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    GuidedPractice: (props: unknown) => {
      mockGuidedPractice(props);
      return ReactModule.createElement(View, { testID: 'guided-practice' });
    },
  };
});

jest.mock('@/auth/accountRuntime', () => ({
  createPublicAccountRuntime: jest.fn(() => mockAccountRuntime),
}));

jest.mock('@/features/account/AccountRegistration', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    AccountRegistration: (props: unknown) => {
      mockAccountRegistration(props);
      return ReactModule.createElement(View, { testID: 'account-registration' });
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
import {
  clearAccountProgressRepository,
  createAccountProgressRepository,
  createProgressRepository,
} from '@/progress/createProgressRepository';
import { useLocalProgress } from '@/progress/useLocalProgress';

const HomeScreen = require('../index').default as typeof import('../index').default;

const WEB_NOTICE =
  'Anonymous Journey progress stays in this browser. Signed-in progress syncs to your account automatically.';
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
    adoptCompletedOrdinals: mockAdoptCompletedOrdinals,
    ...overrides,
    refresh: overrides.refresh ?? mockRefresh,
  };
}

async function startJourney(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByRole('button', { name: /CONTINUE JOURNEY|START JOURNEY/ }));
}

describe('HomeScreen launch and menu flow', () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockAdoptCompletedOrdinals.mockClear();
    mockRetry.mockClear();
    mockRecordCompletion.mockReset();
    mockNetworkChallenge.mockClear();
    mockGuidedPractice.mockClear();
    mockTimedChallenge.mockClear();
    mockAccountRegistration.mockClear();
    jest.mocked(clearAccountProgressRepository).mockReset();
    mockAccountRuntime.configured = false;
    mockAccountRuntime.dataService = null;
    mockAccountRuntime.privacyNoticeUrl = null;
    mockAccountRuntime.progressGateway = null;
    mockAccountRuntime.service = null;
    mockProgressGateway.syncCompleted.mockReset().mockResolvedValue([]);
    jest.mocked(mockAccountRepository.initialize).mockReset().mockResolvedValue(undefined);
    jest.mocked(mockAccountRepository.listCompleted).mockReset().mockResolvedValue([]);
    jest.mocked(mockAccountRepository.recordCompletion).mockReset().mockResolvedValue(undefined);
    mockBackHandlerRemove.mockClear();
    mockHardwareBackPress = undefined;
    jest.mocked(BackHandler.addEventListener).mockClear();
    jest.mocked(useLocalProgress).mockClear();
    jest.mocked(createAccountProgressRepository).mockClear();
    mockRuntime.durable = true;
    mockRuntime.persistenceNotice = null;
    mockProgressState = {
      loading: true,
      completedOrdinals: [],
      recordCompletion: mockRecordCompletion,
      failure: null,
      error: null,
      retry: mockRetry,
      adoptCompletedOrdinals: mockAdoptCompletedOrdinals,
      refresh: mockRefresh,
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

  it('opens optional account registration without blocking anonymous play', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }),
    );

    expect(screen.getByTestId('account-registration')).toBeTruthy();
    expect(mockAccountRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        service: null,
        onBack: expect.any(Function),
      }),
    );
  });

  it('switches to account-owned progress, syncs automatically, and restores anonymous state on sign out', async () => {
    hydrated();
    mockAccountRuntime.configured = true;
    mockAccountRuntime.progressGateway = mockProgressGateway;
    jest.mocked(mockRepository.initialize).mockResolvedValue(undefined);
    jest.mocked(mockRepository.listCompleted).mockResolvedValue([]);
    const screen = await render(<HomeScreen />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }),
    );

    type AccountProps = Readonly<{
      onBack(): void;
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    let props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;
    await act(async () => {
      props.onIdentityChange({ userId: 'user-123', email: 'learner@example.com' });
    });

    expect(createAccountProgressRepository).toHaveBeenCalledWith('user-123');
    expect(useLocalProgress).toHaveBeenLastCalledWith(
      mockAccountRepository,
      CATALOG_VERSION,
    );
    await act(async () => undefined);
    expect(mockProgressGateway.syncCompleted).toHaveBeenCalledWith(
      'user-123',
      CATALOG_VERSION,
      [],
    );
    expect(mockAdoptCompletedOrdinals).toHaveBeenCalledWith([]);
    expect(mockRefresh).not.toHaveBeenCalled();

    await act(async () => props.onBack());
    expect(screen.getByRole('button', { name: 'ACCOUNT: learner@example.com' })).toBeTruthy();

    await act(async () => props.onIdentityChange(null));
    expect(useLocalProgress).toHaveBeenLastCalledWith(mockRepository, CATALOG_VERSION);
  });

  it('reports confirmed backend deletion as successful even when local cleanup fails', async () => {
    hydrated();
    const deleteOwnAccount = jest.fn().mockResolvedValue(undefined);
    const signOut = jest.fn().mockRejectedValue(new Error('session already removed'));
    const clearDeletedAccountSession = jest.fn().mockRejectedValue(new Error('session cleanup unavailable'));
    mockAccountRuntime.configured = true;
    mockAccountRuntime.dataService = {
      deleteOwnAccount,
      exportAccountData: jest.fn(),
    };
    mockAccountRuntime.service = {
      clearDeletedAccountSession,
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      signOut,
    };
    jest.mocked(clearAccountProgressRepository).mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const screen = await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }));
    type AccountProps = Readonly<{
      onDeleteAccount: null | ((identity: { userId: string; email: string }) => Promise<void>);
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    let props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;
    await act(async () => props.onIdentityChange({ userId: 'user-123', email: 'learner@example.com' }));
    props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;

    await expect(props.onDeleteAccount?.({
      userId: 'user-123',
      email: 'learner@example.com',
    })).resolves.toBeUndefined();
    expect(deleteOwnAccount).toHaveBeenCalledWith('user-123');
    expect(jest.mocked(clearAccountProgressRepository)).toHaveBeenCalledWith('user-123');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not sign out a newer account after confirmed deletion of the initiating account', async () => {
    hydrated();
    let finishDeletion!: () => void;
    const deleteOwnAccount = jest.fn(() => new Promise<void>((resolve) => {
      finishDeletion = resolve;
    }));
    const signOut = jest.fn().mockResolvedValue(undefined);
    const clearDeletedAccountSession = jest.fn().mockResolvedValue(false);
    mockAccountRuntime.configured = true;
    mockAccountRuntime.dataService = {
      deleteOwnAccount,
      exportAccountData: jest.fn(),
    };
    mockAccountRuntime.service = {
      clearDeletedAccountSession,
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      signOut,
    };
    const screen = await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }));
    type AccountProps = Readonly<{
      onDeleteAccount: null | ((identity: { userId: string; email: string }) => Promise<void>);
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    let props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;
    await act(async () => props.onIdentityChange({ userId: 'user-123', email: 'one@example.com' }));
    props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;
    const deletion = props.onDeleteAccount?.({ userId: 'user-123', email: 'one@example.com' });
    await act(async () => props.onIdentityChange({ userId: 'user-456', email: 'two@example.com' }));
    await act(async () => finishDeletion());

    await expect(deletion).resolves.toBeUndefined();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not adopt an in-flight sync result after account ownership changes', async () => {
    hydrated();
    mockAccountRuntime.configured = true;
    mockAccountRuntime.progressGateway = mockProgressGateway;
    let resolveRemote!: (rows: readonly []) => void;
    mockProgressGateway.syncCompleted.mockImplementation(() => new Promise((resolve) => {
      resolveRemote = resolve;
    }));
    jest.mocked(mockAccountRepository.listCompleted).mockResolvedValue([]);
    const screen = await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }));

    type AccountProps = Readonly<{
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    let props = mockAccountRegistration.mock.calls.at(-1)?.[0] as AccountProps;
    await act(async () => props.onIdentityChange({
      userId: 'user-123',
      email: 'learner@example.com',
    }));
    await act(async () => props.onIdentityChange(null));
    await act(async () => resolveRemote([]));
    expect(mockAdoptCompletedOrdinals).not.toHaveBeenCalled();
    expect(useLocalProgress).toHaveBeenLastCalledWith(mockRepository, CATALOG_VERSION);
  });

  it('does not let a stale startup restore reactivate an account after sign out', async () => {
    hydrated();
    mockAccountRuntime.configured = true;
    let resolveRestore: ((identity: { userId: string; email: string }) => void) | undefined;
    mockAccountRuntime.service = {
      getCurrentAccount: jest.fn(() => new Promise<{
        userId: string;
        email: string;
      } | null>((resolve) => {
        resolveRestore = resolve;
      })),
    };

    const screen = await render(<HomeScreen />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }),
    );
    const props = mockAccountRegistration.mock.calls.at(-1)?.[0] as Readonly<{
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;

    await act(async () => props.onIdentityChange(null));
    await act(async () => resolveRestore?.({
      userId: 'stale-user',
      email: 'stale@example.com',
    }));

    expect(createAccountProgressRepository).not.toHaveBeenCalledWith('stale-user');
    expect(useLocalProgress).toHaveBeenLastCalledWith(mockRepository, CATALOG_VERSION);
  });

  it('returns to anonymous progress when authentication expires externally', async () => {
    hydrated();
    mockAccountRuntime.configured = true;
    let authStateListener:
      | ((identity: { userId: string; email: string } | null) => void)
      | undefined;
    const unsubscribe = jest.fn();
    mockAccountRuntime.service = {
      getCurrentAccount: jest.fn().mockResolvedValue({
        userId: 'user-123',
        email: 'learner@example.com',
      }),
      subscribeToAccountChanges: jest.fn((listener) => {
        authStateListener = listener;
        return unsubscribe;
      }),
    };

    const screen = await render(<HomeScreen />);
    await act(async () => {});
    expect(useLocalProgress).toHaveBeenLastCalledWith(
      mockAccountRepository,
      CATALOG_VERSION,
    );

    await act(async () => authStateListener?.(null));

    expect(useLocalProgress).toHaveBeenLastCalledWith(mockRepository, CATALOG_VERSION);
    await screen.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
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

  it('opens optional learning and starts dedicated practice without Journey or persistence coupling', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    expect(screen.getByRole('button', { name: 'CONTINUE JOURNEY' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));

    expect(screen.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(screen.getByText(/Optional and unscored/)).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Start guided practice' }));
    expect(screen.getByTestId('guided-practice')).toBeTruthy();
    expect(screen.queryByTestId('network-challenge')).toBeNull();
    expect(mockRecordCompletion).not.toHaveBeenCalled();

    const practiceProps = mockGuidedPractice.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(Object.keys(practiceProps)).toEqual(['onBack']);
    expect(typeof practiceProps.onBack).toBe('function');

    await act(async () => {
      (practiceProps.onBack as () => void)();
    });
    expect(screen.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
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

  it('closes the guided lesson before leaving Learn with Android hardware Back', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Start guided Bits, Bytes and Octets lesson' }),
    );
    expect(screen.getByRole('header', { name: 'Build an IPv4 Address' })).toBeTruthy();

    await act(async () => {
      expect(mockHardwareBackPress?.()).toBe(true);
    });

    expect(screen.queryByRole('header', { name: 'Build an IPv4 Address' })).toBeNull();
    expect(screen.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'LEARN SUBNETTING' })).toBeNull();

    await act(async () => {
      expect(mockHardwareBackPress?.()).toBe(true);
    });
    expect(screen.getByRole('button', { name: 'LEARN SUBNETTING' })).toBeTruthy();
  });

  it('returns from Guided Practice to Learn with Android hardware Back', async () => {
    hydrated();
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'LEARN SUBNETTING' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Start guided practice' }));
    expect(screen.getByTestId('guided-practice')).toBeTruthy();

    await act(async () => {
      expect(mockHardwareBackPress?.()).toBe(true);
    });

    expect(screen.queryByTestId('guided-practice')).toBeNull();
    expect(screen.getByRole('header', { name: 'Learn Subnetting' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'LEARN SUBNETTING' })).toBeNull();
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

  it('shows exactly one browser-storage scope notice on every hydrated local screen', async () => {
    hydrated();
    mockRuntime.durable = true;
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

  it('syncs a signed-in challenge completion automatically after saving it locally', async () => {
    hydrated({ completedOrdinals: [] });
    mockAccountRuntime.configured = true;
    mockAccountRuntime.progressGateway = mockProgressGateway;
    mockRecordCompletion.mockResolvedValue(undefined);
    const completedAt = '2026-08-13T12:00:00.000Z';
    jest.mocked(mockAccountRepository.listCompleted)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        catalogVersion: CATALOG_VERSION,
        questionId: subnetQuestionCatalog[0].id,
        ordinal: subnetQuestionCatalog[0].ordinal,
        completedAt,
        attemptCount: 1,
        pendingSync: true,
      }]);
    const screen = await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }));
    const accountProps = mockAccountRegistration.mock.calls.at(-1)?.[0] as Readonly<{
      onBack(): void;
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    await act(async () => accountProps.onIdentityChange({
      userId: 'user-123',
      email: 'learner@example.com',
    }));
    await act(async () => accountProps.onBack());
    mockProgressGateway.syncCompleted.mockClear();

    await startJourney(screen);
    const challengeProps = mockNetworkChallenge.mock.calls.at(-1)?.[0] as Readonly<{
      onQuestionCompleted(question: SubnetQuestion): Promise<void>;
    }>;
    await act(async () => challengeProps.onQuestionCompleted(subnetQuestionCatalog[0]));

    expect(mockRecordCompletion).toHaveBeenCalledTimes(1);
    expect(mockProgressGateway.syncCompleted).toHaveBeenCalledWith(
      'user-123',
      CATALOG_VERSION,
      [{
        catalogVersion: CATALOG_VERSION,
        ordinal: subnetQuestionCatalog[0].ordinal,
        completedAt,
      }],
    );
  });

  it('never regresses visible progress when an older automatic sync resolves last', async () => {
    hydrated({ completedOrdinals: [] });
    mockAccountRuntime.configured = true;
    mockAccountRuntime.progressGateway = mockProgressGateway;
    let resolveOlderSync!: (rows: readonly []) => void;
    let resolveNewerSync!: (rows: readonly [{
      catalogVersion: string;
      ordinal: number;
      completedAt: string;
    }]) => void;
    const olderSync = new Promise<readonly []>((resolve) => {
      resolveOlderSync = resolve;
    });
    const newerSync = new Promise<readonly [{
      catalogVersion: string;
      ordinal: number;
      completedAt: string;
    }]>((resolve) => {
      resolveNewerSync = resolve;
    });
    mockProgressGateway.syncCompleted
      .mockImplementationOnce(() => olderSync)
      .mockImplementationOnce(() => newerSync);
    jest.mocked(mockAccountRepository.listCompleted)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        catalogVersion: CATALOG_VERSION,
        questionId: subnetQuestionCatalog[0].id,
        ordinal: 1,
        completedAt: '2026-08-13T12:00:00.000Z',
        attemptCount: 1,
        pendingSync: true,
      }]);

    const screen = await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'CREATE OR SIGN IN TO ACCOUNT' }));
    const accountProps = mockAccountRegistration.mock.calls.at(-1)?.[0] as Readonly<{
      onBack(): void;
      onIdentityChange(identity: { userId: string; email: string } | null): void;
    }>;
    await act(async () => accountProps.onIdentityChange({
      userId: 'user-123',
      email: 'learner@example.com',
    }));
    await act(async () => accountProps.onBack());
    await startJourney(screen);
    const challengeProps = mockNetworkChallenge.mock.calls.at(-1)?.[0] as Readonly<{
      onQuestionCompleted(question: SubnetQuestion): Promise<void>;
    }>;
    const completion = challengeProps.onQuestionCompleted(subnetQuestionCatalog[0]);

    await act(async () => resolveNewerSync([{
      catalogVersion: CATALOG_VERSION,
      ordinal: 1,
      completedAt: '2026-08-13T12:00:00.000Z',
    }]));
    await completion;
    expect(mockAdoptCompletedOrdinals).toHaveBeenLastCalledWith([1]);

    await act(async () => resolveOlderSync([]));
    expect(mockAdoptCompletedOrdinals).toHaveBeenLastCalledWith([1]);
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
