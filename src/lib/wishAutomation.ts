import type { RosterSelectionStatus } from '@/types/guild';

export type WishAutomationCommitmentStatus = 'confirmed' | 'potential' | 'withdrawn';

export interface WishAutomationSlot {
  choiceIndex: number;
  classId: string;
  specIds: string[];
  comment: string | null;
}

const normalizeComment = (comment: string | null | undefined): string | null => {
  if (!comment) return null;
  const trimmed = comment.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const areSpecListsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const areSlotsEqual = (left: WishAutomationSlot | undefined, right: WishAutomationSlot | undefined): boolean => {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return left.classId === right.classId
    && areSpecListsEqual(left.specIds, right.specIds)
    && normalizeComment(left.comment) === normalizeComment(right.comment);
};

export const diffWishSlots = (
  previous: WishAutomationSlot[],
  next: WishAutomationSlot[],
): { changedChoiceIndices: number[]; hasAnyChange: boolean } => {
  const previousByIndex = new Map(previous.map((slot) => [slot.choiceIndex, slot]));
  const nextByIndex = new Map(next.map((slot) => [slot.choiceIndex, slot]));
  const indices = new Set([...previousByIndex.keys(), ...nextByIndex.keys()]);
  const changedChoiceIndices = Array.from(indices)
    .filter((choiceIndex) => !areSlotsEqual(previousByIndex.get(choiceIndex), nextByIndex.get(choiceIndex)))
    .sort((left, right) => left - right);

  return {
    changedChoiceIndices,
    hasAnyChange: changedChoiceIndices.length > 0,
  };
};

export const shouldResetRosterSelectionAfterSelfEdit = ({
  hasWishChange,
  previousCommitmentStatus,
  nextCommitmentStatus,
  previousSelectionStatus,
}: {
  hasWishChange: boolean;
  previousCommitmentStatus: WishAutomationCommitmentStatus;
  nextCommitmentStatus: WishAutomationCommitmentStatus;
  previousSelectionStatus: RosterSelectionStatus;
}): boolean => {
  if (hasWishChange) {
    return previousSelectionStatus !== 'undecided';
  }

  if (
    previousCommitmentStatus === 'confirmed'
    && nextCommitmentStatus !== 'confirmed'
    && (previousSelectionStatus === 'selected' || previousSelectionStatus === 'bench')
  ) {
    return true;
  }

  return false;
};
