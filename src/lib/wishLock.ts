export type WishLockReason = 'roster' | 'member' | null;

export interface WishLockState {
  isLocked: boolean;
  reason: WishLockReason;
  isScheduled: boolean;
  scheduledAt: Date | null;
}

interface WishLockOverrideInput {
  canManageWishes?: boolean;
  isReadOnly?: boolean;
}

interface ResolveWishLockStateInput {
  rosterLocked?: boolean | null;
  rosterLockAt?: string | null;
  memberLocked?: boolean | null;
  now?: Date;
}

const parseLockDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveWishLockState = ({
  rosterLocked = false,
  rosterLockAt,
  memberLocked = false,
  now = new Date(),
}: ResolveWishLockStateInput): WishLockState => {
  const scheduledAt = parseLockDate(rosterLockAt);
  const scheduleReached = scheduledAt ? scheduledAt.getTime() <= now.getTime() : false;
  const scheduleUpcoming = scheduledAt ? scheduledAt.getTime() > now.getTime() : false;
  const lockedByRoster = Boolean(rosterLocked) || scheduleReached;
  const lockedByMember = Boolean(memberLocked);

  if (lockedByRoster) {
    return {
      isLocked: true,
      reason: 'roster',
      isScheduled: false,
      scheduledAt,
    };
  }

  if (lockedByMember) {
    return {
      isLocked: true,
      reason: 'member',
      isScheduled: false,
      scheduledAt,
    };
  }

  return {
    isLocked: false,
    reason: null,
    isScheduled: scheduleUpcoming,
    scheduledAt,
  };
};

export const canOverrideWishLocks = ({
  canManageWishes = false,
  isReadOnly = false,
}: WishLockOverrideInput): boolean => canManageWishes && !isReadOnly;

export const isWishEditingLocked = ({
  lockState,
  canManageWishes = false,
  isReadOnly = false,
}: WishLockOverrideInput & { lockState: WishLockState }): boolean => {
  if (canOverrideWishLocks({ canManageWishes, isReadOnly })) {
    return false;
  }

  return lockState.isLocked;
};
