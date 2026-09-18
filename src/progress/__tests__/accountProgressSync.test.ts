import type { LocalProgressRepository } from '../localProgressRepository';
import {
  AccountProgressSync,
  type RemoteProgressGateway,
} from '../accountProgressSync';

const localOne = {
  catalogVersion: '17dd300a',
  questionId: 'journey-1',
  ordinal: 1,
  completedAt: '2026-01-01T00:00:00.000Z',
  attemptCount: 4,
  pendingSync: true,
} as const;

function fixtures() {
  const local: LocalProgressRepository = {
    initialize: jest.fn().mockResolvedValue(undefined),
    listCompleted: jest.fn().mockResolvedValue([localOne]),
    recordCompletion: jest.fn().mockResolvedValue(undefined),
  };
  const remote: RemoteProgressGateway = {
    syncCompleted: jest.fn().mockResolvedValue([
      {
        catalogVersion: '17dd300a',
        ordinal: 1,
        completedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        catalogVersion: '17dd300a',
        ordinal: 2,
        completedAt: '2026-01-02T00:00:00.000Z',
      },
    ]),
  };
  return { local, remote };
}

describe('AccountProgressSync', () => {
  it('does not read or transmit progress without explicit consent', async () => {
    const { local, remote } = fixtures();
    const sync = new AccountProgressSync(
      'user-123',
      local,
      remote,
      (ordinal) => `journey-${ordinal}`,
    );

    await expect(sync.syncCatalog('17dd300a', false)).rejects.toThrow(
      'Progress sync requires your permission.',
    );

    expect(local.initialize).not.toHaveBeenCalled();
    expect(remote.syncCompleted).not.toHaveBeenCalled();
  });

  it('atomically syncs minimal account-local rows for the expected user', async () => {
    const { local, remote } = fixtures();
    const sync = new AccountProgressSync(
      'user-123',
      local,
      remote,
      (ordinal) => `journey-${ordinal}`,
    );

    await expect(sync.syncCatalog('17dd300a', true)).resolves.toEqual({
      completedOrdinals: [1, 2],
      localCount: 2,
      remoteCount: 2,
    });

    expect(remote.syncCompleted).toHaveBeenCalledWith(
      'user-123',
      '17dd300a',
      [
        {
          catalogVersion: '17dd300a',
          ordinal: 1,
          completedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    );
    expect(local.recordCompletion).toHaveBeenCalledWith({
      catalogVersion: '17dd300a',
      questionId: 'journey-2',
      ordinal: 2,
      completedAt: '2026-01-02T00:00:00.000Z',
      attemptCount: 1,
      pendingSync: false,
    });
  });

  it('never reads or uploads anonymous browser progress', async () => {
    const { remote } = fixtures();
    jest.mocked(remote.syncCompleted).mockResolvedValue([]);
    const account: LocalProgressRepository = {
      initialize: jest.fn().mockResolvedValue(undefined),
      listCompleted: jest.fn().mockResolvedValue([]),
      recordCompletion: jest.fn().mockResolvedValue(undefined),
    };
    const anonymous: LocalProgressRepository = {
      initialize: jest.fn().mockResolvedValue(undefined),
      listCompleted: jest.fn().mockResolvedValue([localOne]),
      recordCompletion: jest.fn().mockResolvedValue(undefined),
    };
    const sync = new AccountProgressSync(
      'user-123',
      account,
      remote,
      (ordinal) => `journey-${ordinal}`,
    );

    await expect(sync.syncCatalog('17dd300a', true)).resolves.toEqual({
      completedOrdinals: [],
      localCount: 0,
      remoteCount: 0,
    });
    expect(anonymous.initialize).not.toHaveBeenCalled();
    expect(anonymous.listCompleted).not.toHaveBeenCalled();
    expect(account.recordCompletion).not.toHaveBeenCalled();
  });

  it('does not change local progress when identity-bound remote sync fails', async () => {
    const { local, remote } = fixtures();
    jest.mocked(remote.syncCompleted).mockRejectedValue(new Error('identity changed'));
    const sync = new AccountProgressSync(
      'user-123',
      local,
      remote,
      (ordinal) => `journey-${ordinal}`,
    );

    await expect(sync.syncCatalog('17dd300a', true)).rejects.toThrow('identity changed');
    expect(local.recordCompletion).not.toHaveBeenCalled();
  });

  it('rejects malformed remote rows before changing local progress', async () => {
    const { local, remote } = fixtures();
    jest.mocked(remote.syncCompleted).mockResolvedValue([
      {
        catalogVersion: '17dd300a',
        ordinal: 501,
        completedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    const sync = new AccountProgressSync(
      'user-123',
      local,
      remote,
      (ordinal) => `journey-${ordinal}`,
    );

    await expect(sync.syncCatalog('17dd300a', true)).rejects.toThrow(
      'Remote progress is invalid.',
    );
    expect(local.recordCompletion).not.toHaveBeenCalled();
  });
});
