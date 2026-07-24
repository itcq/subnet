import { InMemoryProgressRepository } from './inMemoryProgressRepository';
import type { LocalProgressRepository } from './localProgressRepository';

export type ProgressRepositoryRuntime = Readonly<{
  repository: LocalProgressRepository;
  durable: boolean;
  persistenceNotice: string | null;
}>;

const repository = new InMemoryProgressRepository();
const runtime: ProgressRepositoryRuntime = Object.freeze({
  repository,
  durable: false,
  persistenceNotice:
    'Web progress is kept only for this browser session and is cleared when the page reloads.',
});

export function createProgressRepository(): ProgressRepositoryRuntime {
  return runtime;
}
