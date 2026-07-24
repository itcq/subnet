import * as SecureStore from 'expo-secure-store';

export const secureSessionStorage = {
  getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};
