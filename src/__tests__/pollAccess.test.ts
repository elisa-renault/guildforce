import { describe, expect, it } from 'vitest';

import { canListPoll, getPollPrimaryAction } from '@/lib/pollAccess';
import type { GuildPoll } from '@/types/poll';

const buildPoll = (
  overrides: Partial<GuildPoll> = {},
): GuildPoll => ({
  id: 'poll-1',
  guild_id: 'guild-1',
  roster_id: null,
  created_by: 'user-1',
  title: 'Poll',
  description: null,
  is_anonymous: false,
  allow_multiple_responses: false,
  status: 'active',
  starts_at: null,
  ends_at: null,
  created_at: '2026-03-12T00:00:00.000Z',
  updated_at: '2026-03-12T00:00:00.000Z',
  ...overrides,
});

describe('pollAccess', () => {
  it('lists active polls when the viewer can respond', () => {
    const poll = buildPoll({ viewer_can_respond: true, viewer_can_view_results: false });

    expect(canListPoll(poll, false)).toBe(true);
    expect(getPollPrimaryAction(poll, false)).toBe('respond');
  });

  it('lists active polls when the viewer can only see results', () => {
    const poll = buildPoll({ viewer_can_respond: false, viewer_can_view_results: true });

    expect(canListPoll(poll, false)).toBe(true);
    expect(getPollPrimaryAction(poll, false)).toBe('results');
  });

  it('hides active polls when the viewer can neither respond nor see results', () => {
    const poll = buildPoll({ viewer_can_respond: false, viewer_can_view_results: false });

    expect(canListPoll(poll, false)).toBe(false);
    expect(getPollPrimaryAction(poll, false)).toBe('none');
  });

  it('shows closed polls only when the viewer can see results', () => {
    const visiblePoll = buildPoll({
      status: 'closed',
      viewer_can_respond: false,
      viewer_can_view_results: true,
    });
    const hiddenPoll = buildPoll({
      status: 'closed',
      viewer_can_respond: false,
      viewer_can_view_results: false,
    });

    expect(canListPoll(visiblePoll, false)).toBe(true);
    expect(getPollPrimaryAction(visiblePoll, false)).toBe('results');
    expect(canListPoll(hiddenPoll, false)).toBe(false);
  });

  it('preserves manager defaults regardless of viewer flags', () => {
    expect(getPollPrimaryAction(buildPoll({ status: 'draft' }), true)).toBe('edit');
    expect(getPollPrimaryAction(buildPoll({ status: 'active' }), true)).toBe('respond');
    expect(getPollPrimaryAction(buildPoll({ status: 'closed' }), true)).toBe('results');
    expect(canListPoll(buildPoll({ status: 'draft' }), true)).toBe(true);
  });
});
