import { describe, expect, it } from 'vitest';

import type { GuildNavigationPreference } from '@/hooks/useUserGuilds';

import {
  applyGuildPreferencePatch,
  buildGuildPreferenceUpdatePayload,
  mergeLoadedGuildPreferences,
} from '@/lib/guildNavigationPreferences';

const preference = (
  guildId: string,
  overrides: Partial<GuildNavigationPreference> = {},
): GuildNavigationPreference => ({
  user_id: 'user-1',
  guild_id: guildId,
  is_favorite: false,
  last_visited_at: null,
  created_at: '2026-06-15T09:00:00.000Z',
  updated_at: '2026-06-15T09:00:00.000Z',
  ...overrides,
});

describe('guildNavigationPreferences', () => {
  it('builds partial update payloads so recent visits do not clear favorites', () => {
    expect(buildGuildPreferenceUpdatePayload({
      last_visited_at: '2026-06-15T10:00:00.000Z',
    })).toEqual({
      last_visited_at: '2026-06-15T10:00:00.000Z',
    });
  });

  it('preserves an existing favorite when applying a recent-visit patch locally', () => {
    const next = applyGuildPreferencePatch(
      [preference('guild-1', { is_favorite: true })],
      'user-1',
      'guild-1',
      { last_visited_at: '2026-06-15T10:00:00.000Z' },
      '2026-06-15T10:00:00.000Z',
    );

    expect(next[0]).toMatchObject({
      guild_id: 'guild-1',
      is_favorite: true,
      last_visited_at: '2026-06-15T10:00:00.000Z',
    });
  });

  it('keeps optimistic local preference changes over stale loaded rows', () => {
    const loaded = [
      preference('guild-1', {
        is_favorite: false,
        updated_at: '2026-06-15T09:00:00.000Z',
      }),
    ];
    const current = [
      preference('guild-1', {
        is_favorite: true,
        updated_at: '2026-06-15T10:00:00.000Z',
      }),
    ];

    expect(mergeLoadedGuildPreferences(loaded, current)).toEqual(current);
  });
});
