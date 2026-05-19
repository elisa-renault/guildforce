import { describe, expect, it } from 'vitest';


import { buildCommandPaletteRegistry } from '../features/command-palette/registry';
import {
  mapRecentRowToCommandItem,
  mapServerResultToCommandItem,
  resolveCommandPaletteHref,
} from '../features/command-palette/resolve';
import {
  dedupeCommandPaletteItems,
  filterLocalCommandPaletteItems,
  groupCommandPaletteItems,
  scoreCommandPaletteItem,
} from '../features/command-palette/scoring';
import type {
  CommandPaletteGuildContext,
  CommandPaletteItem,
  CommandPaletteRecentRow,
  CommandPaletteServerResult,
} from '../features/command-palette/types';
import { translationsEn } from '../i18n/translations.en';
import type { Location } from 'react-router-dom';

const guild: CommandPaletteGuildContext = {
  id: 'guild-1',
  name: 'Midnight',
  server: 'Tarren Mill',
  region: 'eu',
  avatarUrl: null,
  basePath: '/guild/eu/tarren-mill/midnight',
};

const location = (pathname: string): Location =>
  ({
    pathname,
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }) as Location;

describe('command palette scoring', () => {
  it('boosts matching items from the active guild context', () => {
    const currentGuildItem: CommandPaletteItem = {
      id: 'current-roster',
      type: 'page',
      group: 'pages',
      title: 'Roster',
      guildId: guild.id,
    };
    const otherGuildItem: CommandPaletteItem = {
      id: 'other-roster',
      type: 'page',
      group: 'pages',
      title: 'Roster',
      guildId: 'guild-2',
    };

    expect(scoreCommandPaletteItem(currentGuildItem, 'roster', guild.id)).toBeGreaterThan(
      scoreCommandPaletteItem(otherGuildItem, 'roster', guild.id),
    );
  });

  it('groups in product order and deduplicates before rendering', () => {
    const items: CommandPaletteItem[] = [
      { id: 'polls', type: 'page', group: 'pages', title: 'Polls' },
      { id: 'create-poll', type: 'action', group: 'actions', title: 'Create poll' },
      { id: 'create-poll', type: 'action', group: 'actions', title: 'Create poll duplicate' },
      { id: 'midnight', type: 'guild', group: 'guilds', title: 'Midnight' },
    ];

    const groups = groupCommandPaletteItems(dedupeCommandPaletteItems(items));

    expect(groups.map((group) => group.id)).toEqual(['actions', 'pages', 'guilds']);
    expect(groups[0].items).toHaveLength(1);
  });

  it('keeps local page and action matching controlled by explicit keywords', () => {
    const items = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: guild,
      isAdmin: false,
      location: location(guild.basePath),
    });

    const matches = filterLocalCommandPaletteItems(items, 'wishes', guild.id);

    expect(matches[0].title).toBe(translationsEn.guildNav.wishesTable);
    expect(matches.some((item) => item.title === translationsEn.commandPalette.actions.editWishes)).toBe(true);
  });
});

describe('command palette registry', () => {
  it('exposes safe guild workflows but not direct mutations', () => {
    const items = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: guild,
      isAdmin: false,
      location: location(`${guild.basePath}/roster`),
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `action:guild:${guild.id}:create-poll`,
          href: `${guild.basePath}/polls/new`,
        }),
        expect.objectContaining({
          id: `action:guild:${guild.id}:sync-members`,
          href: `${guild.basePath}/settings?section=battlenet`,
        }),
      ]),
    );
    expect(items.some((item) => item.title.toLowerCase().includes('add member'))).toBe(false);
  });

  it('only includes admin actions for authorized users', () => {
    const userItems = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: null,
      isAdmin: false,
      location: location('/guilds'),
    });
    const adminItems = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: null,
      isAdmin: true,
      location: location('/guilds'),
    });

    expect(userItems.some((item) => item.id === 'action:open-admin')).toBe(false);
    expect(adminItems.some((item) => item.id === 'action:open-admin')).toBe(true);
  });

  it('opens the forum topic workflow when a forum category is the active context', () => {
    const items = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: null,
      isAdmin: false,
      location: location('/forum/category/general'),
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'action:forum:create-topic:general',
          href: '/forum/category/general/new',
        }),
      ]),
    );
  });
});

describe('command palette result normalization', () => {
  it('maps server member results to profile navigation when linked', () => {
    const result: CommandPaletteServerResult = {
      result_type: 'member',
      result_id: 'member-1',
      guild_id: guild.id,
      title: 'Elisara',
      subtitle: 'Midnight - Officer',
      score: 92,
      metadata: {
        username: 'Elisara',
        guild_name: guild.name,
        server: guild.server,
        region: guild.region,
        character_class_id: 5,
        rank_name: 'Officer',
        is_linked: true,
      },
    };

    const item = mapServerResultToCommandItem(result);

    expect(item).toEqual(expect.objectContaining({ type: 'member', group: 'members' }));
    expect(resolveCommandPaletteHref(item!)).toBe('/u/Elisara');
  });

  it('maps global forum topic results to topic navigation', () => {
    const result: CommandPaletteServerResult = {
      result_type: 'forum',
      result_id: 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21',
      guild_id: null,
      title: 'Le mage Arcane est le seul vrai mage',
      subtitle: 'general - Forum',
      score: 91,
      metadata: {
        category_id: 'category-general',
        category_name: 'general',
        category_slug: 'general',
        reply_count: 4,
      },
    };

    const item = mapServerResultToCommandItem(result);

    expect(item).toEqual(expect.objectContaining({ type: 'forum', group: 'forum' }));
    expect(resolveCommandPaletteHref(item!)).toBe('/forum/topic/fd9f7927-4667-46e9-aa12-74c5ceb7fc21');
  });

  it('normalizes recent rows into the recent group with frequency metadata', () => {
    const row: CommandPaletteRecentRow = {
      item_type: 'page',
      item_id: 'page:guilds',
      guild_id: null,
      title: 'My Guilds',
      subtitle: 'Recent workspace',
      href: '/guilds',
      metadata: {},
      use_count: 4,
      last_used_at: '2026-05-19T10:00:00.000Z',
    };

    expect(mapRecentRowToCommandItem(row)).toEqual(
      expect.objectContaining({
        group: 'recent',
        href: '/guilds',
        recentCount: 4,
      }),
    );
  });
});
