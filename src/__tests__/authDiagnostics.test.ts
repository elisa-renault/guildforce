import { describe, expect, it } from 'vitest';

import {
  buildBattleNetDebugInfo,
  sanitizeAuthDiagnosticMetadata,
} from '@/lib/authDiagnostics';

describe('authDiagnostics', () => {
  it('removes sensitive metadata recursively', () => {
    expect(sanitizeAuthDiagnosticMetadata({
      status: 400,
      code: 'oauth-code',
      state: 'raw-state',
      nested: {
        access_token: 'token',
        safe: 'value',
      },
      list: [{ refreshToken: 'secret' }, { safe: 'item' }],
    })).toEqual({
      status: 400,
      nested: { safe: 'value' },
      list: [{}, { safe: 'item' }],
    });
  });

  it('builds copyable Battle.net debug info', () => {
    expect(buildBattleNetDebugInfo({
      flowId: 'flow-1',
      step: 'login_fetch_start',
      status: 'error',
      errorMessage: 'Network failed',
    })).toContain('flow_id: flow-1');
  });
});
