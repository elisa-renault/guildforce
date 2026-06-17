import { beforeEach, describe, expect, it } from 'vitest';

import {
  beginBattleNetCodeProcessing,
  cleanupOAuthParams,
  clearBattleNetCodeProcessing,
  completeBattleNetCodeProcessing,
  fingerprintOAuthCode,
  getStoredOAuthParams,
  parseOAuthState,
  storeOAuthParams,
  validateOAuthState,
} from '@/lib/battlenetOAuth';

describe('battlenetOAuth', () => {
  beforeEach(() => {
    cleanupOAuthParams();
    clearBattleNetCodeProcessing();
  });

  it('stores and restores OAuth state with flow id', () => {
    storeOAuthParams('state-1', 'eu', 'flow-1');

    expect(getStoredOAuthParams()).toEqual({
      state: 'state-1',
      region: 'eu',
      flowId: 'flow-1',
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

  it('tracks processing without storing the raw OAuth code', () => {
    const code = 'very-sensitive-oauth-code';
    const first = beginBattleNetCodeProcessing(code, 'flow-1', 1000);
    const second = beginBattleNetCodeProcessing(code, 'flow-1', 1100);

    expect(first.allowed).toBe(true);
    expect(second).toEqual({ allowed: false, reason: 'already_processing' });
    expect(sessionStorage.getItem('bnet_processed_code')).not.toContain(code);
    expect(sessionStorage.getItem('bnet_processed_code')).toContain(fingerprintOAuthCode(code));
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
