import { beforeEach, describe, expect, it, vi } from 'vitest';

import { safeStorage } from '@/lib/safeStorage';

const createStorageMock = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: vi.fn(() => map.clear()),
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(map.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => map.delete(key)),
    setItem: vi.fn((key: string, value: string) => map.set(key, value)),
  };
};

describe('safeStorage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorageMock(),
      configurable: true,
    });
  });

  it('reads, writes, and removes values without throwing', () => {
    expect(safeStorage.set('session', 'safe-storage-test', 'value')).toBe(true);
    expect(safeStorage.get('session', 'safe-storage-test')).toBe('value');

    safeStorage.remove('session', 'safe-storage-test');

    expect(safeStorage.get('session', 'safe-storage-test')).toBeNull();
  });

  it('returns null for missing values', () => {
    expect(safeStorage.get('local', 'missing-safe-storage-test')).toBeNull();
  });

  it('reports storage availability', () => {
    expect(safeStorage.isAvailable('local')).toBe(true);
    expect(safeStorage.isAvailable('session')).toBe(true);
  });
});
