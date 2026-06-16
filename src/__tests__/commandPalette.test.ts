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

const guild: CommandPaletteGuildContext = {
  id: 'guild-1',
  name: 'Midnight',
  server: 'Tarren Mill',
  region: 'eu',
  avatarUrl: null,
  basePath: '/guild/eu/tarren-mill/midnight',
  canManageAtlas: true,
};

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
        expect.objectContaining({
          id: `page:guild:${guild.id}:atlas`,
          href: `${guild.basePath}/atlas`,
        }),
        expect.objectContaining({
          id: `action:guild:${guild.id}:create-atlas-doc`,
          href: `${guild.basePath}/atlas/new`,
        }),
      ]),
    );
    expect(items.some((item) => item.title.toLowerCase().includes('add member'))).toBe(false);
  });

  it('hides Atlas document creation for guild members without Atlas management', () => {
    const items = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: { ...guild, canManageAtlas: false },
      isAdmin: false,
    });

    expect(items.some((item) => item.id === `action:guild:${guild.id}:create-atlas-doc`)).toBe(false);
    expect(items.some((item) => item.id === `page:guild:${guild.id}:atlas`)).toBe(true);
  });

  it('only includes admin actions for authorized users', () => {
    const userItems = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: null,
      isAdmin: false,
    });
    const adminItems = buildCommandPaletteRegistry({
      t: translationsEn,
      activeGuild: null,
      isAdmin: true,
    });

    expect(userItems.some((item) => item.id === 'action:open-admin')).toBe(false);
    expect(adminItems.some((item) => item.id === 'action:open-admin')).toBe(true);
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

  it('ignores stale recent rows with unsupported item types', () => {
    const row: CommandPaletteRecentRow = {
      item_type: 'legacy',
      item_id: 'legacy:removed',
      guild_id: null,
      title: 'Removed feature action',
      subtitle: 'Old persisted shortcut',
      href: null,
      metadata: {},
      use_count: 1,
      last_used_at: '2026-05-19T10:00:00.000Z',
    };

    expect(mapRecentRowToCommandItem(row)).toBeNull();
  });
});
