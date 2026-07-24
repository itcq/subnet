/* eslint-disable @typescript-eslint/no-require-imports -- Exact source loading verifies the web/base file instead of Jest Expo's native resolution. */
import type { LocalQuestionProgress } from '../localProgressRepository';

type WebFactoryModule = typeof import('../createProgressRepository');

const WEB_NOTICE =
  'Web progress is kept only for this browser session and is cleared when the page reloads.';

function loadBaseFactory(): WebFactoryModule {
  // Jest Expo prefers `.native.ts` for extensionless imports. Requiring the exact
  // source filename proves the web/base implementation instead.
  return require('../createProgressRepository.ts') as WebFactoryModule;
}

describe('base progress repository factory', () => {
  it('uses one working session-only in-memory repository with an explicit notice', async () => {
    const { createProgressRepository } = loadBaseFactory();
    const first = createProgressRepository();
    const second = createProgressRepository();
    const completion: LocalQuestionProgress = {
      catalogVersion: 'catalog-v1',
      questionId: 'question-1',
      ordinal: 1,
      completedAt: '2026-07-24T10:00:00.000Z',
      attemptCount: 1,
      pendingSync: true,
    };

    expect(first).toBe(second);
    expect(first.repository).toBe(second.repository);
    expect(first.durable).toBe(false);
    expect(first.persistenceNotice).toBe(WEB_NOTICE);

    await first.repository.initialize();
    await first.repository.recordCompletion(completion);

    await expect(second.repository.listCompleted('catalog-v1')).resolves.toEqual([
      completion,
    ]);
  });
});
