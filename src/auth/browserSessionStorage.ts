type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createBrowserSessionStorage(
  resolveStorage: () => BrowserStorage | null,
) {
  return {
    async getItem(key: string): Promise<string | null> {
      return resolveStorage()?.getItem(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      resolveStorage()?.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      resolveStorage()?.removeItem(key);
    },
  };
}

export const browserSessionStorage = createBrowserSessionStorage(
  () => globalThis.sessionStorage ?? null,
);
