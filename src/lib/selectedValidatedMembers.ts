import type { MemberWish } from '@/types/guild';

export const getSelectedValidatedMembers = (members: MemberWish[]): MemberWish[] =>
  members
    .filter((member) => {
      if (member.status !== 'confirmed') return false;
      if ((member.selectionStatus || 'undecided') !== 'selected') return false;

      return member.wishes.some(
        (wish) => !!wish.class_id && (wish.validation_status || 'pending') === 'approved',
      );
    })
    .map((member) => ({
      ...member,
      wishes: member.wishes
        .filter(
          (wish) => !!wish.class_id && (wish.validation_status || 'pending') === 'approved',
        )
        .sort((a, b) => a.choice_index - b.choice_index),
    }));
