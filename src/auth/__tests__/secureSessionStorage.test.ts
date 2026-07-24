import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from '../secureSessionStorage';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe('secureSessionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads a stored session value from platform secure storage', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue('session-json');

    await expect(secureSessionStorage.getItem('auth-session')).resolves.toBe(
      'session-json',
    );
    expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith('auth-session');
  });

  it('stores a session value with after-first-unlock accessibility', async () => {
    await secureSessionStorage.setItem('auth-session', 'session-json');

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth-session',
      'session-json',
      { keychainAccessible: 'AFTER_FIRST_UNLOCK' },
    );
  });

  it('removes a session value idempotently', async () => {
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    await secureSessionStorage.removeItem('auth-session');
    await secureSessionStorage.removeItem('auth-session');

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(
      1,
      'auth-session',
    );
  });
});
