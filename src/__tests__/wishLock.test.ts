import { describe, expect, it } from 'vitest';
import { isWishEditingLocked, resolveWishLockState } from '@/lib/wishLock';

describe('resolveWishLockState', () => {
  it('locks when roster is explicitly locked', () => {
    const state = resolveWishLockState({ rosterLocked: true, rosterLockAt: null, memberLocked: false });
    expect(state.isLocked).toBe(true);
    expect(state.reason).toBe('roster');
    expect(state.isScheduled).toBe(false);
  });

  it('locks when roster schedule is in the past', () => {
    const now = new Date('2026-02-05T20:00:00Z');
    const state = resolveWishLockState({
      rosterLocked: false,
      rosterLockAt: '2026-02-05T19:59:00Z',
      memberLocked: false,
      now,
    });
    expect(state.isLocked).toBe(true);
    expect(state.reason).toBe('roster');
  });

  it('marks schedule when roster lock is in the future', () => {
    const now = new Date('2026-02-05T20:00:00Z');
    const state = resolveWishLockState({
      rosterLocked: false,
      rosterLockAt: '2026-02-05T21:00:00Z',
      memberLocked: false,
      now,
    });
    expect(state.isLocked).toBe(false);
    expect(state.isScheduled).toBe(true);
  });

  it('locks when member is locked', () => {
    const state = resolveWishLockState({ rosterLocked: false, rosterLockAt: null, memberLocked: true });
    expect(state.isLocked).toBe(true);
    expect(state.reason).toBe('member');
  });

  it('roster lock overrides member lock reason', () => {
    const state = resolveWishLockState({ rosterLocked: true, rosterLockAt: null, memberLocked: true });
    expect(state.isLocked).toBe(true);
    expect(state.reason).toBe('roster');
  });

  it('lets wish managers bypass locks outside read-only mode', () => {
    const state = resolveWishLockState({ rosterLocked: true, rosterLockAt: null, memberLocked: true });
    expect(isWishEditingLocked({ lockState: state, canManageWishes: true })).toBe(false);
  });

  it('keeps locks enforced for read-only admins', () => {
    const state = resolveWishLockState({ rosterLocked: true, rosterLockAt: null, memberLocked: false });
    expect(isWishEditingLocked({ lockState: state, canManageWishes: true, isReadOnly: true })).toBe(true);
  });
});
