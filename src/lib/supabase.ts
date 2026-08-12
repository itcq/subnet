import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { secureSessionStorage } from '../auth/secureSessionStorage';

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

type SessionStorage = Readonly<{
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}>;

export function createSupabaseClient(
  {
    url,
    publishableKey,
  }: SupabasePublicConfig,
  sessionStorage: SessionStorage = secureSessionStorage,
) {
  if (!url || !publishableKey) {
    throw new Error('Supabase public configuration is missing');
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: sessionStorage,
    },
  });
}
