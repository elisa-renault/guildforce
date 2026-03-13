import { describe, expect, it } from 'vitest';

import {
  buildBattleNetRealmSlugCandidates,
  buildGuildDiscoveryKey,
  mergeGuildDiscoverySources,
  normalizeRealmKey,
  resolveGuildRealmFields,
  shouldRepairGuildServerDisplay,
  toBattleNetRealmSlug,
  toNormalizedRealmSlug,
} from '@/lib/guildDiscovery';

describe('guildDiscovery', () => {
  it('treats straight and curly apostrophes as the same realm key', () => {
    expect(normalizeRealmKey("Pozzo dell'Eternità")).toBe(normalizeRealmKey('Pozzo dell’Eternità'));
    expect(toNormalizedRealmSlug("Pozzo dell'Eternità")).toBe('pozzo-delleternita');
  });

  it('stores realm display name separately from the realm slug', () => {
    expect(resolveGuildRealmFields({
      realmName: 'Pozzo dell’Eternità',
      realmSlug: 'pozzo-delleternita',
    })).toEqual({
      realmDisplayName: 'Pozzo dell’Eternità',
      realmSlug: 'pozzo-delleternita',
    });
  });

  it('marks malformed guild server values for repair when only formatting differs', () => {
    expect(shouldRepairGuildServerDisplay('pozzo-delleternita', 'Pozzo dell’Eternità')).toBe(true);
    expect(shouldRepairGuildServerDisplay('Pozzo dell’Eternità', 'Pozzo dell’Eternità')).toBe(false);
  });

  it('merges an app guild row and synced membership even when one side uses a slug-like realm', () => {
    const merged = mergeGuildDiscoverySources({
      appGuilds: [
        {
          id: 'guild-1',
          name: 'Release Spirit',
          server: 'Pozzo Delleternita',
          region: 'eu',
          faction: 'alliance',
          role: 'member',
          owner_id: null,
          memberCount: 42,
          avatar_url: null,
        },
      ],
      syncedMemberships: [
        {
          guild_name: 'Release Spirit',
          guild_realm: 'Pozzo dell’Eternità',
          guild_realm_slug: 'pozzo-delleternita',
          guild_region: 'eu',
          guild_faction: 'ALLIANCE',
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 'guild-1',
      server: 'Pozzo dell’Eternità',
      isDetectedOnly: false,
      syncedCharacterCount: 1,
    });
  });

  it('keeps synced guilds visible when no app membership exists', () => {
    const merged = mergeGuildDiscoverySources({
      appGuilds: [],
      syncedMemberships: [
        {
          guild_name: 'Release Spirit',
          guild_realm: 'Pozzo dell’Eternità',
          guild_realm_slug: 'pozzo-delleternita',
          guild_region: 'eu',
          guild_faction: 'ALLIANCE',
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: null,
      isDetectedOnly: true,
      server: 'Pozzo dell’Eternità',
    });
  });

  it('collapses multiple synced characters from the same guild into one discovery entry', () => {
    const merged = mergeGuildDiscoverySources({
      appGuilds: [],
      syncedMemberships: [
        {
          guild_name: 'Release Spirit',
          guild_realm: 'Pozzo dell’Eternità',
          guild_realm_slug: 'pozzo-delleternita',
          guild_region: 'eu',
          guild_faction: 'ALLIANCE',
        },
        {
          guild_name: 'Release Spirit',
          guild_realm: "Pozzo dell'Eternità",
          guild_realm_slug: 'pozzo-delleternita',
          guild_region: 'eu',
          guild_faction: 'ALLIANCE',
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].syncedCharacterCount).toBe(2);
    expect(
      buildGuildDiscoveryKey({
        region: merged[0].region,
        guildName: merged[0].name,
        realmNameOrSlug: merged[0].server,
      })
    ).toBe(
      buildGuildDiscoveryKey({
        region: 'eu',
        guildName: 'Release Spirit',
        realmNameOrSlug: 'pozzo-delleternita',
      })
    );
  });

  it('preserves accented Blizzard realm slugs for API calls', () => {
    expect(toBattleNetRealmSlug('Pozzo dell\'Eternit\u00E0')).toBe('pozzo-delleternit\u00E0');
    expect(toBattleNetRealmSlug('pozzo-delleternit\u00E0')).toBe('pozzo-delleternit\u00E0');
  });

  it('tries the accented Blizzard slug before the ASCII fallback', () => {
    expect(buildBattleNetRealmSlugCandidates('Pozzo dell\'Eternit\u00E0')).toEqual([
      'pozzo-delleternit\u00E0',
      'pozzo-delleternita',
    ]);
  });
});
