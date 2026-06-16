import { describe, expect, it } from 'vitest';

import {
  getFunctionErrorStatus,
  isBattleNetResyncAlreadyRunning,
  readFunctionErrorPayload,
} from '@/lib/battlenetSync';

describe('battlenetSync helpers', () => {
  it('detects a resync already-running response by HTTP status', () => {
    const error = { context: new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 }) };

    expect(getFunctionErrorStatus(error)).toBe(409);
    expect(isBattleNetResyncAlreadyRunning(error)).toBe(true);
  });

  it('detects a resync already-running response by message payload', () => {
    const error = new Error('Function returned an error');

    expect(isBattleNetResyncAlreadyRunning(error, { error: 'Resync already in progress' })).toBe(true);
  });

  it('reads JSON function error payloads without consuming the original response', async () => {
    const error = {
      context: new Response(JSON.stringify({
        error: 'Battle.net session expired',
        errorCode: 'TOKEN_EXPIRED',
      }), { status: 401 }),
    };

    await expect(readFunctionErrorPayload(error)).resolves.toEqual({
      error: 'Battle.net session expired',
      errorCode: 'TOKEN_EXPIRED',
    });
    await expect(error.context.json()).resolves.toEqual({
      error: 'Battle.net session expired',
      errorCode: 'TOKEN_EXPIRED',
    });
  });
});
