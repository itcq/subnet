/* eslint-disable @typescript-eslint/no-require-imports -- Exact source loading verifies the web/base file instead of Jest Expo's native resolution. */
import { BrowserProgressRepository } from '../browserProgressRepository';
import type { LocalQuestionProgress } from '../localProgressRepository';

type WebFactoryModule = typeof import('../createProgressRepository');

const WEB_NOTICE =
  'Anonymous Journey progress stays in this browser. Signed-in progress syncs to your account automatically.';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function loadBaseFactory(): WebFactoryModule {
  return require('../createProgressRepository.ts') as WebFactoryModule;
}

describe('base progress repository factory', () => {
  it('uses one durable browser repository with an explicit no-sync notice', async () => {
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });

    try {
      const { clearAccountProgressRepository, createAccountProgressRepository, createProgressRepository } = loadBaseFactory();
      const first = createProgressRepository();
      const second = createProgressRepository();
      const completion: LocalQuestionProgress = {
        catalogVersion: 'catalog-v1',
        questionId: 'question-1',
        ordinal: 1,
        completedAt: '2026-08-04T04:30:00.000Z',
        attemptCount: 1,
        pendingSync: true,
      };

      expect(first).toBe(second);
      expect(first.repository).toBeInstanceOf(BrowserProgressRepository);
      expect(first.repository).toBe(second.repository);
      expect(first.durable).toBe(true);
      expect(first.persistenceNotice).toBe(WEB_NOTICE);

      await first.repository.initialize();
      await first.repository.recordCompletion(completion);
      await expect(second.repository.listCompleted('catalog-v1')).resolves.toEqual([
        completion,
      ]);

      const accountOne = createAccountProgressRepository('user-one');
      const accountOneAgain = createAccountProgressRepository('user-one');
      const accountTwo = createAccountProgressRepository('user-two');
      expect(accountOneAgain).toBe(accountOne);
      expect(accountTwo).not.toBe(accountOne);
      expect(accountOne).not.toBe(first.repository);

      await accountOne.initialize();
      await accountTwo.initialize();
      await accountOne.recordCompletion({ ...completion, questionId: 'question-2', ordinal: 2 });
      await expect(accountOne.listCompleted('catalog-v1')).resolves.toHaveLength(1);
      await expect(accountTwo.listCompleted('catalog-v1')).resolves.toEqual([]);
      await expect(first.repository.listCompleted('catalog-v1')).resolves.toEqual([completion]);

      clearAccountProgressRepository('user-one');
      expect(storage.getItem('subnet-game:account-progress:v1:user-one')).toBeNull();
      expect(createAccountProgressRepository('user-one')).not.toBe(accountOne);
      await expect(first.repository.listCompleted('catalog-v1')).resolves.toEqual([completion]);

      const accountWithBlockedStorage = createAccountProgressRepository('blocked-user');
      const removeItem = jest.spyOn(storage, 'removeItem').mockImplementationOnce(() => {
        throw new Error('storage unavailable');
      });
      expect(() => clearAccountProgressRepository('blocked-user')).toThrow('storage unavailable');
      expect(createAccountProgressRepository('blocked-user')).not.toBe(accountWithBlockedStorage);
      removeItem.mockRestore();
    } finally {
      if (originalStorage === undefined) {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      } else {
        Object.defineProperty(globalThis, 'localStorage', originalStorage);
      }
    }
  });
});
