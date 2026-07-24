/* eslint-disable @typescript-eslint/no-require-imports -- Exact source loading verifies the native platform file. */
const mockSqliteConstructor = jest.fn();

jest.mock('../sqliteProgressRepository', () => ({
  SQLiteProgressRepository: class MockSQLiteProgressRepository {
    initialize = jest.fn();
    listCompleted = jest.fn();
    recordCompletion = jest.fn();

    constructor() {
      mockSqliteConstructor();
    }
  },
}));

type NativeFactoryModule = typeof import('../createProgressRepository');

function loadNativeFactory(): NativeFactoryModule {
  return require('../createProgressRepository.native.ts') as NativeFactoryModule;
}

describe('native progress repository factory', () => {
  it('uses one durable SQLite repository with lazy database opening and no notice', () => {
    const { createProgressRepository } = loadNativeFactory();
    const first = createProgressRepository();
    const second = createProgressRepository();

    expect(first).toBe(second);
    expect(first.repository).toBe(second.repository);
    expect(first.durable).toBe(true);
    expect(first.persistenceNotice).toBeNull();
    expect(mockSqliteConstructor).toHaveBeenCalledTimes(1);
    expect(first.repository.initialize).not.toHaveBeenCalled();
  });
});
