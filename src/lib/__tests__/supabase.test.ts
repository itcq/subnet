import { createClient } from '@supabase/supabase-js';

import { secureSessionStorage } from '../../auth/secureSessionStorage';
import { createSupabaseClient } from '../supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ kind: 'supabase-client' })),
}));

jest.mock('../../auth/secureSessionStorage', () => ({
  secureSessionStorage: { kind: 'secure-storage' },
}));

const mockedCreateClient = jest.mocked(createClient);

describe('createSupabaseClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing public configuration without constructing a client', () => {
    expect(() =>
      createSupabaseClient({ url: '', publishableKey: '' }),
    ).toThrow('Supabase public configuration is missing');
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('uses secure session persistence and PKCE without URL session detection', () => {
    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    });

    expect(client).toEqual({ kind: 'supabase-client' });
    expect(mockedCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'publishable-key',
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
          storage: secureSessionStorage,
        },
      },
    );
  });

  it('uses an explicitly supplied web session store', () => {
    const webStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    createSupabaseClient(
      { url: 'https://example.supabase.co', publishableKey: 'publishable-key' },
      webStorage,
    );

    expect(mockedCreateClient).toHaveBeenLastCalledWith(
      'https://example.supabase.co',
      'publishable-key',
      expect.objectContaining({
        auth: expect.objectContaining({ storage: webStorage }),
      }),
    );
  });
});
