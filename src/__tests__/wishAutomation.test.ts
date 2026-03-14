import { describe, expect, it } from 'vitest';

import { diffWishSlots, shouldResetRosterSelectionAfterSelfEdit } from '@/lib/wishAutomation';

describe('diffWishSlots', () => {
  const baseSlot = {
    choiceIndex: 1,
    classId: 'priest',
    specIds: ['holy'],
    comment: 'heal',
  };

  it('keeps unchanged wishes intact', () => {
    const result = diffWishSlots([baseSlot], [{ ...baseSlot }]);
    expect(result).toEqual({ changedChoiceIndices: [], hasAnyChange: false });
  });

  it('marks a slot as changed when class changes', () => {
    const result = diffWishSlots([baseSlot], [{ ...baseSlot, classId: 'paladin' }]);
    expect(result).toEqual({ changedChoiceIndices: [1], hasAnyChange: true });
  });

  it('marks a slot as changed when spec order changes', () => {
    const result = diffWishSlots(
      [{ choiceIndex: 1, classId: 'priest', specIds: ['holy', 'shadow'], comment: null }],
      [{ choiceIndex: 1, classId: 'priest', specIds: ['shadow', 'holy'], comment: null }],
    );
    expect(result).toEqual({ changedChoiceIndices: [1], hasAnyChange: true });
  });

  it('marks comment edits, additions and removals as changed', () => {
    expect(diffWishSlots([baseSlot], [{ ...baseSlot, comment: 'raid heal' }]).changedChoiceIndices).toEqual([1]);
    expect(diffWishSlots([{ ...baseSlot, comment: null }], [baseSlot]).changedChoiceIndices).toEqual([1]);
  });

  it('marks added and removed slots as changed', () => {
    const added = diffWishSlots([], [baseSlot]);
    const removed = diffWishSlots([baseSlot], []);
    expect(added).toEqual({ changedChoiceIndices: [1], hasAnyChange: true });
    expect(removed).toEqual({ changedChoiceIndices: [1], hasAnyChange: true });
  });

  it('treats reordering as a change on impacted slots', () => {
    const previous = [
      { choiceIndex: 1, classId: 'priest', specIds: ['holy'], comment: null },
      { choiceIndex: 2, classId: 'mage', specIds: ['frost'], comment: null },
    ];
    const next = [
      { choiceIndex: 1, classId: 'mage', specIds: ['frost'], comment: null },
      { choiceIndex: 2, classId: 'priest', specIds: ['holy'], comment: null },
    ];

    expect(diffWishSlots(previous, next)).toEqual({ changedChoiceIndices: [1, 2], hasAnyChange: true });
  });
});

describe('shouldResetRosterSelectionAfterSelfEdit', () => {
  it('resets any non-undecided selection when wishes changed', () => {
    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: true,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'confirmed',
      previousSelectionStatus: 'selected',
    })).toBe(true);

    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: true,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'confirmed',
      previousSelectionStatus: 'not_selected',
    })).toBe(true);
  });

  it('does not reset when nothing changed', () => {
    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: false,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'confirmed',
      previousSelectionStatus: 'selected',
    })).toBe(false);
  });

  it('resets selected and bench when leaving confirmed without changing wishes', () => {
    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: false,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'potential',
      previousSelectionStatus: 'selected',
    })).toBe(true);

    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: false,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'withdrawn',
      previousSelectionStatus: 'bench',
    })).toBe(true);
  });

  it('keeps not_selected when only commitment changes away from confirmed', () => {
    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: false,
      previousCommitmentStatus: 'confirmed',
      nextCommitmentStatus: 'potential',
      previousSelectionStatus: 'not_selected',
    })).toBe(false);
  });

  it('keeps selection when moving back to confirmed without wish changes', () => {
    expect(shouldResetRosterSelectionAfterSelfEdit({
      hasWishChange: false,
      previousCommitmentStatus: 'potential',
      nextCommitmentStatus: 'confirmed',
      previousSelectionStatus: 'bench',
    })).toBe(false);
  });
});
