import { describe, expect, it } from 'vitest';

import type { MemberWish } from '@/types/guild';

import { getSelectedValidatedMembers } from '@/lib/selectedValidatedMembers';

const makeMember = (overrides: Partial<MemberWish>): MemberWish => ({
  id: 'member-id',
  username: 'Member',
  status: 'confirmed',
  wishes: [],
  ...overrides,
});

describe('getSelectedValidatedMembers', () => {
  it('keeps only confirmed selected members with at least one approved wish, including externals', () => {
    const members: MemberWish[] = [
      makeMember({
        id: 'keep',
        username: 'Keep',
        selectionStatus: 'selected',
        wishes: [
          {
            choice_index: 2,
            class_id: 'mage',
            spec_ids: ['frost-mage'],
            comment: null,
            validation_status: 'approved',
          },
          {
            choice_index: 1,
            class_id: 'priest',
            spec_ids: ['holy-priest'],
            comment: null,
            validation_status: 'pending',
          },
          {
            choice_index: 3,
            class_id: 'druid',
            spec_ids: ['balance-druid'],
            comment: null,
            validation_status: 'approved',
          },
        ],
      }),
      makeMember({
        id: 'bench',
        username: 'Bench',
        selectionStatus: 'bench',
        wishes: [
          {
            choice_index: 1,
            class_id: 'mage',
            spec_ids: ['frost-mage'],
            comment: null,
            validation_status: 'approved',
          },
        ],
      }),
      makeMember({
        id: 'potential',
        username: 'Potential',
        status: 'potential',
        selectionStatus: 'selected',
        wishes: [
          {
            choice_index: 1,
            class_id: 'mage',
            spec_ids: ['frost-mage'],
            comment: null,
            validation_status: 'approved',
          },
        ],
      }),
      makeMember({
        id: 'no-approved',
        username: 'NoApproved',
        selectionStatus: 'selected',
        wishes: [
          {
            choice_index: 1,
            class_id: 'mage',
            spec_ids: ['frost-mage'],
            comment: null,
            validation_status: 'rejected',
          },
        ],
      }),
      makeMember({
        id: 'external',
        username: 'External',
        selectionStatus: 'selected',
        isExternal: true,
        wishes: [
          {
            choice_index: 1,
            class_id: 'mage',
            spec_ids: ['frost-mage'],
            comment: null,
            validation_status: 'approved',
          },
        ],
      }),
    ];

    const result = getSelectedValidatedMembers(members);

    expect(result).toHaveLength(2);
    expect(result.map((member) => member.id)).toEqual(['keep', 'external']);
    expect(result[0]?.wishes.map((wish) => wish.choice_index)).toEqual([2, 3]);
    expect(result[0]?.wishes.every((wish) => wish.validation_status === 'approved')).toBe(true);
    expect(result[1]?.isExternal).toBe(true);
    expect(result[1]?.wishes.map((wish) => wish.choice_index)).toEqual([1]);
  });
});
