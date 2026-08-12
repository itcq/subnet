import { BrowserProgressRepository } from './browserProgressRepository';
import type { LocalProgressRepository } from './localProgressRepository';

export type ProgressRepositoryRuntime = Readonly<{
  repository: LocalProgressRepository;
  durable: boolean;
  persistenceNotice: string | null;
}>;

function resolveBrowserStorage(): Storage {
  const storage = globalThis.localStorage;
  if (storage === undefined) {
    throw new Error('Browser storage is unavailable.');
  }
  return storage;
}

const repository = new BrowserProgressRepository(resolveBrowserStorage);
const accountRepositories = new Map<string, LocalProgressRepository>();
const runtime: ProgressRepositoryRuntime = Object.freeze({
  repository,
  durable: true,
  persistenceNotice:
    'Journey progress is saved in this browser unless you sign in and choose to sync it.',
});

export function createProgressRepository(): ProgressRepositoryRuntime {
  return runtime;
}

const ACCOUNT_PROGRESS_STORAGE_PREFIX = 'subnet-game:account-progress:v1:';

function accountProgressStorageKey(userId: string): string {
  return `${ACCOUNT_PROGRESS_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

export function createAccountProgressRepository(
  userId: string,
): LocalProgressRepository {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('Account identity is unavailable.');

  const existing = accountRepositories.get(normalizedUserId);
  if (existing !== undefined) return existing;

  const storageKey = accountProgressStorageKey(normalizedUserId);
  const accountRepository = new BrowserProgressRepository(
    resolveBrowserStorage,
    storageKey,
  );
  accountRepositories.set(normalizedUserId, accountRepository);
  return accountRepository;
}

export function clearAccountProgressRepository(userId: string): void {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('Account identity is unavailable.');
  accountRepositories.delete(normalizedUserId);
  resolveBrowserStorage().removeItem(accountProgressStorageKey(normalizedUserId));
}
