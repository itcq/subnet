import {
  createAccountRuntime,
  createPublicAccountRuntime,
} from '../accountRuntime';

describe('createAccountRuntime', () => {
  it('stays unavailable without complete public Supabase configuration', () => {
    const createClient = jest.fn();

    expect(
      createAccountRuntime({ url: '', publishableKey: '', privacyNoticeUrl: '' }, { createClient }),
    ).toEqual({ configured: false, dataService: null, privacyNoticeUrl: null, progressGateway: null, service: null });
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([
    { url: '   ', publishableKey: 'key' },
    { url: 'not-a-url', publishableKey: 'key' },
    { url: 'ftp://example.test', publishableKey: 'key' },
    { url: 'http://example.supabase.co', publishableKey: 'key' },
    { url: 'http://192.168.1.20:54321', publishableKey: 'key' },
    { url: 'https://example.supabase.co', publishableKey: '   ' },
    { url: 'https://example.supabase.co', publishableKey: 'key', privacyNoticeUrl: '' },
    { url: 'https://example.supabase.co', publishableKey: 'key', privacyNoticeUrl: 'http://example.test/privacy' },
  ])('fails closed for malformed public configuration: %p', (config) => {
    const createClient = jest.fn();

    expect(createAccountRuntime(config, { createClient })).toEqual({
      configured: false,
      dataService: null,
      privacyNoticeUrl: null,
      progressGateway: null,
      service: null,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('fails closed when the Supabase client rejects configuration', () => {
    const createClient = jest.fn(() => {
      throw new Error('provider details');
    });

    expect(
      createAccountRuntime(
        { url: 'https://example.supabase.co', publishableKey: 'key', privacyNoticeUrl: 'https://example.test/privacy' },
        { createClient },
      ),
    ).toEqual({ configured: false, dataService: null, privacyNoticeUrl: null, progressGateway: null, service: null });
  });

  it('keeps public accounts unavailable on unreviewed native platforms', () => {
    const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-test-key';

    try {
      expect(createPublicAccountRuntime('ios')).toEqual({
        configured: false,
        dataService: null,
        privacyNoticeUrl: null,
        progressGateway: null,
        service: null,
      });
    } finally {
      if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });

  it('allows plaintext HTTP only for loopback development hosts', () => {
    const client = {
      auth: {
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn(),
      },
      rpc: jest.fn(),
    };
    const createClient = jest.fn(() => client);

    for (const url of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) {
      expect(createAccountRuntime({ url, publishableKey: 'key', privacyNoticeUrl: 'https://example.test/privacy' }, { createClient }).configured).toBe(true);
    }
  });

  it('creates an account service only with complete public configuration', () => {
    const client = {
      auth: {
        signInWithOtp: jest.fn(),
        verifyOtp: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn(),
      },
      rpc: jest.fn(),
    };
    const createClient = jest.fn(() => client);
    const progressGateway = {
      syncCompleted: jest.fn(),
    };
    const createProgressGateway = jest.fn(() => progressGateway);

    const runtime = createAccountRuntime(
      {
        url: 'https://example.supabase.co',
        publishableKey: 'publishable-key',
        privacyNoticeUrl: 'https://example.test/privacy',
      },
      { createClient, createProgressGateway },
    );

    expect(runtime.configured).toBe(true);
    expect(runtime.privacyNoticeUrl).toBe('https://example.test/privacy');
    expect(runtime.service).not.toBeNull();
    expect(runtime.progressGateway).toBe(progressGateway);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createProgressGateway).toHaveBeenCalledWith(client);
  });
});
