import type { LocalProgressRepository } from './localProgressRepository';
import { SQLiteProgressRepository } from './sqliteProgressRepository';

export type ProgressRepositoryRuntime = Readonly<{
  repository: LocalProgressRepository;
  durable: boolean;
  persistenceNotice: string | null;
}>;

const repository = new SQLiteProgressRepository();
const runtime: ProgressRepositoryRuntime = Object.freeze({
  repository,
  durable: true,
  persistenceNotice: null,
});

export function createProgressRepository(): ProgressRepositoryRuntime {
  return runtime;
}
