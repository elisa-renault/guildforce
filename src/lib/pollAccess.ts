import type { GuildPoll } from '@/types/poll';

export type PollPrimaryAction = 'edit' | 'respond' | 'results' | 'none';

type PollAccessSnapshot = Pick<
  GuildPoll,
  'status' | 'viewer_can_respond' | 'viewer_can_view_results'
>;

export const canListPoll = (
  poll: PollAccessSnapshot,
  canManagePolls: boolean,
): boolean => {
  if (canManagePolls) {
    return true;
  }

  if (poll.status === 'draft') {
    return false;
  }

  if (poll.status === 'closed') {
    return poll.viewer_can_view_results === true;
  }

  return poll.viewer_can_respond === true || poll.viewer_can_view_results === true;
};

export const getPollPrimaryAction = (
  poll: PollAccessSnapshot,
  canManagePolls: boolean,
): PollPrimaryAction => {
  if (canManagePolls) {
    if (poll.status === 'draft') {
      return 'edit';
    }

    if (poll.status === 'closed') {
      return 'results';
    }

    return 'respond';
  }

  if (poll.status === 'draft') {
    return 'none';
  }

  if (poll.status === 'closed') {
    return poll.viewer_can_view_results ? 'results' : 'none';
  }

  if (poll.viewer_can_respond) {
    return 'respond';
  }

  return poll.viewer_can_view_results ? 'results' : 'none';
};
