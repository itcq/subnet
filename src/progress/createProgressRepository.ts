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
const runtime: ProgressRepositoryRuntime = Object.freeze({
  repository,
  durable: true,
  persistenceNotice:
    'Journey progress is saved in this browser. It does not sync across devices yet.',
});

export function createProgressRepository(): ProgressRepositoryRuntime {
  return runtime;
}
