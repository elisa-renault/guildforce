import { describe, expect, it } from 'vitest';

import { safeStorage } from '@/lib/safeStorage';

describe('safeStorage', () => {
  it('reads, writes, and removes values without throwing', () => {
    expect(safeStorage.set('session', 'safe-storage-test', 'value')).toBe(true);
    expect(safeStorage.get('session', 'safe-storage-test')).toBe('value');

    safeStorage.remove('session', 'safe-storage-test');

    expect(safeStorage.get('session', 'safe-storage-test')).toBeNull();
  });

  it('returns null for missing values', () => {
    expect(safeStorage.get('local', 'missing-safe-storage-test')).toBeNull();
  });
});
