import { beforeEach, describe, expect, it } from 'vitest';

import {
  canImpersonateUser,
  clearAdminImpersonationTransition,
  clearStoredAdminImpersonationState,
  consumeAdminImpersonationTransition,
  readStoredAdminImpersonationState,
  setAdminImpersonationTransition,
  writeStoredAdminImpersonationState,
  type StoredAdminImpersonationState,
} from '@/lib/adminImpersonation';

const buildStoredState = (): StoredAdminImpersonationState => ({
  adminSession: {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_900_000_000,
    token_type: 'bearer',
    user: {
      id: 'admin-user',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-03-14T00:00:00.000Z',
    },
  },
  impersonationId: 'impersonation-1',
  returnPath: '/admin?section=users',
  target: {
    id: 'target-user',
    username: 'Target',
  },
});

describe('adminImpersonation', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearStoredAdminImpersonationState();
    clearAdminImpersonationTransition();
  });

  it('round-trips stored impersonation state through sessionStorage', () => {
    const state = buildStoredState();

    writeStoredAdminImpersonationState(state);

    expect(readStoredAdminImpersonationState()).toEqual(state);
  });

  it('clears malformed stored state', () => {
    window.sessionStorage.setItem('guildforce.admin_impersonation', '{"bad":true}');

    expect(readStoredAdminImpersonationState()).toBeNull();
    expect(window.sessionStorage.getItem('guildforce.admin_impersonation')).toBeNull();
  });

  it('consumes impersonation transition state once', () => {
    setAdminImpersonationTransition('start');

    expect(consumeAdminImpersonationTransition()).toBe('start');
    expect(consumeAdminImpersonationTransition()).toBeNull();
  });

  it('allows impersonation only for non-admin non-moderator targets', () => {
    expect(
      canImpersonateUser({
        currentUserId: 'admin-user',
        targetUserId: 'target-user',
        targetRoles: [],
        isImpersonating: false,
      })
    ).toBe(true);

    expect(
      canImpersonateUser({
        currentUserId: 'admin-user',
        targetUserId: 'admin-user',
        targetRoles: [],
        isImpersonating: false,
      })
    ).toBe(false);

    expect(
      canImpersonateUser({
        currentUserId: 'admin-user',
        targetUserId: 'moderator-user',
        targetRoles: ['moderator'],
        isImpersonating: false,
      })
    ).toBe(false);

    expect(
      canImpersonateUser({
        currentUserId: 'admin-user',
        targetUserId: 'member-user',
        targetRoles: [],
        isImpersonating: true,
      })
    ).toBe(false);
  });
});
