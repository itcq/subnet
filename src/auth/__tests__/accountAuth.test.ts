import {
  AccountAuthService,
  createSupabaseAccountAuthGateway,
  type AccountAuthGateway,
  type AccountIdentity,
} from '../accountAuth';

describe('AccountAuthService', () => {
  it('normalizes an email and requests a public registration code', async () => {
    const gateway: AccountAuthGateway = {
      requestEmailCode: jest.fn().mockResolvedValue(undefined),
      verifyEmailCode: jest.fn(),
      getCurrentIdentity: jest.fn().mockResolvedValue(null),
      subscribeIdentity: jest.fn(() => jest.fn()),
      signOut: jest.fn(),
      clearDeletedIdentitySession: jest.fn(),
    };
    const service = new AccountAuthService(gateway);

    await service.requestRegistrationCode('  Learner@Example.COM  ');

    expect(gateway.requestEmailCode).toHaveBeenCalledWith('learner@example.com', true);
  });

  it('rejects an invalid email before contacting authentication', async () => {
    const gateway: AccountAuthGateway = {
      requestEmailCode: jest.fn(),
      verifyEmailCode: jest.fn(),
      getCurrentIdentity: jest.fn().mockResolvedValue(null),
      subscribeIdentity: jest.fn(() => jest.fn()),
      signOut: jest.fn(),
      clearDeletedIdentitySession: jest.fn(),
    };
    const service = new AccountAuthService(gateway);

    await expect(service.requestRegistrationCode('not-an-email')).rejects.toThrow(
      'Enter a valid email address.',
    );
    expect(gateway.requestEmailCode).not.toHaveBeenCalled();
  });

  it('verifies a six-digit email code for the normalized address', async () => {
    const gateway: AccountAuthGateway = {
      requestEmailCode: jest.fn(),
      verifyEmailCode: jest.fn().mockResolvedValue({
        userId: 'user-123',
        email: 'learner@example.com',
      }),
      getCurrentIdentity: jest.fn().mockResolvedValue(null),
      subscribeIdentity: jest.fn(() => jest.fn()),
      signOut: jest.fn(),
      clearDeletedIdentitySession: jest.fn(),
    };
    const service = new AccountAuthService(gateway);

    await expect(
      service.verifyRegistrationCode(' Learner@Example.com ', '123456'),
    ).resolves.toEqual({ userId: 'user-123', email: 'learner@example.com' });
    expect(gateway.verifyEmailCode).toHaveBeenCalledWith(
      'learner@example.com',
      '123456',
    );
  });

  it('restores the current account and signs out explicitly', async () => {
    const identity = { userId: 'user-123', email: 'learner@example.com' };
    const gateway: AccountAuthGateway = {
      requestEmailCode: jest.fn(),
      verifyEmailCode: jest.fn(),
      getCurrentIdentity: jest.fn().mockResolvedValue(identity),
      subscribeIdentity: jest.fn(() => jest.fn()),
      signOut: jest.fn().mockResolvedValue(undefined),
      clearDeletedIdentitySession: jest.fn(),
    };
    const service = new AccountAuthService(gateway);

    await expect(service.getCurrentAccount()).resolves.toEqual(identity);
    await service.signOut();

    expect(gateway.getCurrentIdentity).toHaveBeenCalledTimes(1);
    expect(gateway.signOut).toHaveBeenCalledTimes(1);
  });

  it('maps public registration and verification to Supabase Auth', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });
    const verifyOtp = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'learner@example.com' } },
      error: null,
    });
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-123', email: 'learner@example.com' } } },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const unsubscribe = jest.fn();
    let authStateListener:
      | ((event: string, session: { user: { id: string; email?: string } } | null) => void)
      | undefined;
    const onAuthStateChange = jest.fn((listener) => {
      authStateListener = listener;
      return { data: { subscription: { unsubscribe } } };
    });
    const gateway = createSupabaseAccountAuthGateway({
      auth: { signInWithOtp, verifyOtp, getSession, signOut, onAuthStateChange },
    });

    await gateway.requestEmailCode('learner@example.com', true);
    await expect(
      gateway.verifyEmailCode('learner@example.com', '123456'),
    ).resolves.toEqual({ userId: 'user-123', email: 'learner@example.com' });

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'learner@example.com',
      options: { shouldCreateUser: true },
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'learner@example.com',
      token: '123456',
      type: 'email',
    });

    const identityChanges: (AccountIdentity | null)[] = [];
    const stopListening = gateway.subscribeIdentity((identity) => {
      identityChanges.push(identity);
    });
    authStateListener?.('SIGNED_IN', {
      user: { id: 'user-456', email: 'second@example.com' },
    });
    authStateListener?.('SIGNED_OUT', null);
    stopListening();

    expect(identityChanges).toEqual([
      { userId: 'user-456', email: 'second@example.com' },
      null,
    ]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears the deleted identity session only when that identity is still current', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'deleted-user', email: 'deleted@example.com' } } },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const gateway = createSupabaseAccountAuthGateway({
      auth: {
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        getSession,
        signOut,
      },
    });

    await expect(gateway.clearDeletedIdentitySession('deleted-user')).resolves.toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('preserves a newer session while cleaning up a deleted identity', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'new-user', email: 'new@example.com' } } },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const gateway = createSupabaseAccountAuthGateway({
      auth: {
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        getSession,
        signOut,
      },
    });

    await expect(gateway.clearDeletedIdentitySession('deleted-user')).resolves.toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('sanitizes rejected Supabase authentication operations', async () => {
    const providerFailure = new Error('provider URL and token details');
    const gateway = createSupabaseAccountAuthGateway({
      auth: {
        signInWithOtp: jest.fn().mockRejectedValue(providerFailure),
        verifyOtp: jest.fn().mockRejectedValue(providerFailure),
        getSession: jest.fn().mockRejectedValue(providerFailure),
        signOut: jest.fn().mockRejectedValue(providerFailure),
      },
    });

    await expect(
      gateway.requestEmailCode('learner@example.com', true),
    ).rejects.toThrow('Account request could not be completed. Please try again.');
    await expect(
      gateway.verifyEmailCode('learner@example.com', '123456'),
    ).rejects.toThrow('Account request could not be completed. Please try again.');
    await expect(gateway.signOut()).rejects.toThrow(
      'Account request could not be completed. Please try again.',
    );
  });
});
