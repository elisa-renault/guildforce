export type SafeStorageArea = 'local' | 'session';

const getStorage = (area: SafeStorageArea): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export const safeStorage = {
  get(area: SafeStorageArea, key: string): string | null {
    try {
      return getStorage(area)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  set(area: SafeStorageArea, key: string, value: string): boolean {
    try {
      const storage = getStorage(area);
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(area: SafeStorageArea, key: string): void {
    try {
      getStorage(area)?.removeItem(key);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  },
};
