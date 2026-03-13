export interface GuildRealmFieldsInput {
  realmName?: string | null;
  realmSlug?: string | null;
  fallbackRealmName?: string | null;
}

export interface GuildDiscoveryKeyInput {
  region?: string | null;
  guildName?: string | null;
  realmNameOrSlug?: string | null;
}

export interface AppGuildDiscoveryInput {
  id: string;
  name: string;
  server: string;
  region: string | null;
  faction: string;
  role?: string | null;
  owner_id?: string | null;
  memberCount?: number;
  avatar_url?: string | null;
}

export interface SyncedGuildDiscoveryInput {
  guild_name: string;
  guild_realm: string;
  guild_realm_slug: string;
  guild_region?: string | null;
  guild_faction?: string | null;
}

export interface MergedGuildDiscoveryEntry {
  id: string | null;
  name: string;
  server: string;
  region: string;
  faction: 'horde' | 'alliance';
  role: string | null;
  owner_id: string | null;
  memberCount?: number;
  avatar_url?: string | null;
  isDetectedOnly: boolean;
  syncedCharacterCount: number;
}

const APOSTROPHE_PATTERN = /['\u2019]/g;

const normalizeWords = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(APOSTROPHE_PATTERN, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

export function toNormalizedRealmSlug(value?: string | null) {
  return normalizeWords(value)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toBattleNetRealmSlug(value?: string | null) {
  return String(value ?? '')
    .trim()
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHE_PATTERN, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildBattleNetRealmSlugCandidates(...values: Array<string | null | undefined>) {
  const candidates = new Set<string>();

  values.forEach((value) => {
    const unicodeSlug = toBattleNetRealmSlug(value);
    if (unicodeSlug) {
      candidates.add(unicodeSlug);
    }

    const asciiSlug = toNormalizedRealmSlug(value);
    if (asciiSlug) {
      candidates.add(asciiSlug);
    }
  });

  return Array.from(candidates);
}

export function normalizeRealmKey(value?: string | null) {
  return toNormalizedRealmSlug(value).replace(/-/g, ' ');
}

export function normalizeGuildNameKey(value?: string | null) {
  return normalizeWords(value)
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildGuildDiscoveryKey({
  region,
  guildName,
  realmNameOrSlug,
}: GuildDiscoveryKeyInput) {
  return [
    normalizeWords(region || 'eu'),
    normalizeGuildNameKey(guildName),
    normalizeRealmKey(realmNameOrSlug),
  ].join('::');
}

export function resolveGuildRealmFields({
  realmName,
  realmSlug,
  fallbackRealmName,
}: GuildRealmFieldsInput) {
  const normalizedRealmName = String(realmName ?? '').trim();
  const normalizedFallbackRealmName = String(fallbackRealmName ?? '').trim();
  const normalizedRealmSlug = toNormalizedRealmSlug(realmSlug || normalizedRealmName || normalizedFallbackRealmName);

  return {
    realmDisplayName: normalizedRealmName || normalizedFallbackRealmName || normalizedRealmSlug,
    realmSlug: normalizedRealmSlug,
  };
}

export function shouldRepairGuildServerDisplay(currentServer?: string | null, desiredServer?: string | null) {
  const current = String(currentServer ?? '').trim();
  const desired = String(desiredServer ?? '').trim();

  if (!current || !desired) return false;
  if (current === desired) return false;

  return normalizeRealmKey(current) === normalizeRealmKey(desired);
}

const normalizeFaction = (value?: string | null): 'horde' | 'alliance' =>
  String(value ?? '').toLowerCase() === 'horde' ? 'horde' : 'alliance';

export function mergeGuildDiscoverySources(args: {
  appGuilds: AppGuildDiscoveryInput[];
  syncedMemberships: SyncedGuildDiscoveryInput[];
}) {
  const merged = new Map<string, MergedGuildDiscoveryEntry>();

  args.appGuilds.forEach((guild) => {
    const key = buildGuildDiscoveryKey({
      region: guild.region || 'eu',
      guildName: guild.name,
      realmNameOrSlug: guild.server,
    });

    merged.set(key, {
      id: guild.id,
      name: guild.name,
      server: guild.server,
      region: guild.region || 'eu',
      faction: normalizeFaction(guild.faction),
      role: guild.role || null,
      owner_id: guild.owner_id || null,
      memberCount: guild.memberCount,
      avatar_url: guild.avatar_url || null,
      isDetectedOnly: false,
      syncedCharacterCount: 0,
    });
  });

  args.syncedMemberships.forEach((membership) => {
    const key = buildGuildDiscoveryKey({
      region: membership.guild_region || 'eu',
      guildName: membership.guild_name,
      realmNameOrSlug: membership.guild_realm_slug || membership.guild_realm,
    });

    const existing = merged.get(key);
    if (existing) {
      existing.server = membership.guild_realm || existing.server;
      existing.region = membership.guild_region || existing.region;
      existing.syncedCharacterCount += 1;
      return;
    }

    merged.set(key, {
      id: null,
      name: membership.guild_name,
      server: membership.guild_realm || membership.guild_realm_slug,
      region: membership.guild_region || 'eu',
      faction: normalizeFaction(membership.guild_faction),
      role: null,
      owner_id: null,
      memberCount: undefined,
      avatar_url: null,
      isDetectedOnly: true,
      syncedCharacterCount: 1,
    });
  });

  return Array.from(merged.values());
}
