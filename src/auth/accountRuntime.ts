import { Platform } from 'react-native';

import { browserSessionStorage } from './browserSessionStorage';
import {
  AccountDataService,
  createSupabaseAccountDataGateway,
  type SupabaseAccountDataClient,
} from './accountDataLifecycle';
import {
  AccountAuthService,
  createSupabaseAccountAuthGateway,
  type SupabaseAuthClient,
} from './accountAuth';
import { createSupabaseClient } from '../lib/supabase';
import type { RemoteProgressGateway } from '../progress/accountProgressSync';
import {
  createSupabaseProgressGateway,
  type SupabaseProgressClient,
} from '../progress/supabaseProgressGateway';
import {
  createSupabaseLeaderboardGateway,
  LeaderboardService,
} from '@/leaderboard/leaderboard';

type AccountConfig = Readonly<{
  url: string;
  publishableKey: string;
  privacyNoticeUrl?: string;
}>;
type AccountClient = SupabaseAuthClient & SupabaseProgressClient & SupabaseAccountDataClient;
export type AccountRuntime = Readonly<{
  configured: boolean;
  service: AccountAuthService | null;
  dataService: AccountDataService | null;
  leaderboardService: LeaderboardService | null;
  progressGateway: RemoteProgressGateway | null;
  privacyNoticeUrl: string | null;
}>;
type Dependencies = Readonly<{
  createClient(config: AccountConfig): AccountClient;
  createProgressGateway?: (client: AccountClient) => RemoteProgressGateway;
}>;

const defaultDependencies: Dependencies = {
  createClient(config) {
    return createSupabaseClient(
      config,
      browserSessionStorage,
    ) as unknown as AccountClient;
  },
  createProgressGateway(client) {
    return createSupabaseProgressGateway(client);
  },
};

const UNAVAILABLE_RUNTIME: AccountRuntime = Object.freeze({
  configured: false,
  service: null,
  dataService: null,
  leaderboardService: null,
  progressGateway: null,
  privacyNoticeUrl: null,
});

function configurationIsValid(config: AccountConfig): boolean {
  if (!config.publishableKey.trim()) return false;
  try {
    const url = new URL(config.url.trim());
    const backendIsValid = url.protocol === 'https:' || (
      url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
    if (!backendIsValid) return false;
    const privacyUrl = new URL(config.privacyNoticeUrl?.trim() ?? '');
    return privacyUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createAccountRuntime(
  config: AccountConfig,
  dependencies: Dependencies = defaultDependencies,
): AccountRuntime {
  if (!configurationIsValid(config)) return UNAVAILABLE_RUNTIME;

  try {
    const normalizedConfig = {
      url: config.url.trim(),
      publishableKey: config.publishableKey.trim(),
    };
    const client = dependencies.createClient(normalizedConfig);
    return {
      configured: true,
      service: new AccountAuthService(createSupabaseAccountAuthGateway(client)),
      dataService: new AccountDataService(createSupabaseAccountDataGateway(client)),
      leaderboardService: new LeaderboardService(createSupabaseLeaderboardGateway(client)),
      progressGateway: dependencies.createProgressGateway?.(client) ?? null,
      privacyNoticeUrl: config.privacyNoticeUrl?.trim() ?? null,
    };
  } catch {
    return UNAVAILABLE_RUNTIME;
  }
}

export function createPublicAccountRuntime(
  platform: string = Platform.OS,
): AccountRuntime {
  if (platform !== 'web') return UNAVAILABLE_RUNTIME;
  return createAccountRuntime({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    privacyNoticeUrl: process.env.EXPO_PUBLIC_ACCOUNT_PRIVACY_URL ?? '',
  });
}
