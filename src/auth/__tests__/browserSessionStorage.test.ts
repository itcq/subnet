import { createBrowserSessionStorage } from '../browserSessionStorage';

describe('createBrowserSessionStorage', () => {
  it('resolves browser storage lazily and forwards session operations', async () => {
    const storage = {
      getItem: jest.fn().mockReturnValue('session'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const resolver = jest.fn(() => storage);
    const adapter = createBrowserSessionStorage(resolver);

    expect(resolver).not.toHaveBeenCalled();
    await expect(adapter.getItem('auth')).resolves.toBe('session');
    await adapter.setItem('auth', 'next');
    await adapter.removeItem('auth');

    expect(storage.getItem).toHaveBeenCalledWith('auth');
    expect(storage.setItem).toHaveBeenCalledWith('auth', 'next');
    expect(storage.removeItem).toHaveBeenCalledWith('auth');
  });

  it('fails safely during static rendering when browser storage does not exist', async () => {
    const adapter = createBrowserSessionStorage(() => null);

    await expect(adapter.getItem('session')).resolves.toBeNull();
    await expect(adapter.setItem('session', 'token')).resolves.toBeUndefined();
    await expect(adapter.removeItem('session')).resolves.toBeUndefined();
  });
});
