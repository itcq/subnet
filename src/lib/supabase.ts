import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { secureSessionStorage } from '../auth/secureSessionStorage';

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function createSupabaseClient({
  url,
  publishableKey,
}: SupabasePublicConfig) {
  if (!url || !publishableKey) {
    throw new Error('Supabase public configuration is missing');
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: secureSessionStorage,
    },
  });
}
