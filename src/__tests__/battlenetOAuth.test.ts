import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginBattleNetCodeProcessing,
  cleanupOAuthParams,
  clearBattleNetCodeProcessing,
  completeBattleNetCodeProcessing,
  fingerprintOAuthCode,
  getRegionLabel,
  getStoredOAuthParams,
  parseOAuthState,
  storeOAuthParams,
  validateOAuthState,
} from '@/lib/battlenetOAuth';

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

describe('battlenetOAuth', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    cleanupOAuthParams();
    clearBattleNetCodeProcessing();
  });

  it('stores and restores OAuth state with flow id', () => {
    storeOAuthParams('state-1', 'eu', 'flow-1');

    expect(getStoredOAuthParams()).toEqual({
      state: 'state-1',
      region: 'eu',
      flowId: 'flow-1',
      pendingStates: [{
        state: 'state-1',
        region: 'eu',
        flowId: 'flow-1',
        createdAt: expect.any(Number),
      }],
    });
  });

  it('parses JSON OAuth state with flow id', () => {
    expect(parseOAuthState(JSON.stringify({
      state: 'state-1',
      mode: 'login',
      region: 'eu',
      flowId: 'flow-1',
    }))).toEqual({
      state: 'state-1',
      mode: 'login',
      region: 'eu',
      flowId: 'flow-1',
    });
  });

  it('validates state when a stored state exists', () => {
    expect(validateOAuthState({ state: 'expected' }, 'expected')).toBe(true);
    expect(validateOAuthState({ state: 'actual' }, 'expected')).toBe(false);
    expect(validateOAuthState({ state: 'actual' }, null)).toBe(true);
  });

  it('validates an older pending OAuth state after a newer login attempt overwrites the current state', () => {
    storeOAuthParams('first-state', 'us', 'flow-1');
    storeOAuthParams('second-state', 'eu', 'flow-2');

    const stored = getStoredOAuthParams();

    expect(stored.state).toBe('second-state');
    expect(validateOAuthState({ state: 'first-state' }, stored.state, stored.pendingStates)).toBe(true);
    expect(validateOAuthState({ state: 'unknown-state' }, stored.state, stored.pendingStates)).toBe(false);
  });

  it('localizes display labels without changing region codes', () => {
    expect(getRegionLabel('eu')).toBe('Europe');
    expect(getRegionLabel('us', 'fr')).toBe('Americas');
    expect(getRegionLabel('eu', 'zh-TW')).toBe('歐洲');
    expect(getRegionLabel('us', 'zh-TW')).toBe('美洲');
    expect(getRegionLabel('kr', 'zh-TW')).toBe('韓國');
    expect(getRegionLabel('tw', 'zh-TW')).toBe('台灣');
  });

  it('tracks processing without storing the raw OAuth code', () => {
    const code = 'very-sensitive-oauth-code';
    const first = beginBattleNetCodeProcessing(code, 'flow-1', 1000);
    const second = beginBattleNetCodeProcessing(code, 'flow-1', 1100);

    expect(first.allowed).toBe(true);
    expect(second).toEqual({ allowed: false, reason: 'already_processing' });
    expect(window.sessionStorage.getItem('bnet_processed_code')).not.toContain(code);
    expect(window.sessionStorage.getItem('bnet_processed_code')).toContain(fingerprintOAuthCode(code));
  });

  it('allows retry after clearing failed processing and blocks completed codes', () => {
    const code = 'oauth-code';

    expect(beginBattleNetCodeProcessing(code, 'flow-1', 1000).allowed).toBe(true);
    clearBattleNetCodeProcessing();
    expect(beginBattleNetCodeProcessing(code, 'flow-1', 1100).allowed).toBe(true);

    completeBattleNetCodeProcessing(code, 'flow-1', 1200);

    expect(beginBattleNetCodeProcessing(code, 'flow-1', 1300)).toEqual({
      allowed: false,
      reason: 'already_completed',
    });
  });
});
