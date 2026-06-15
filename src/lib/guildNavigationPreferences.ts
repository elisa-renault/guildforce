import type { GuildNavigationPreference } from '@/hooks/useUserGuilds';

export type GuildPreferencePatch = Partial<
  Pick<GuildNavigationPreference, 'is_favorite' | 'last_visited_at'>
>;

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const buildGuildPreferenceUpdatePayload = (patch: GuildPreferencePatch) => {
  const payload: GuildPreferencePatch = {};

  if (hasOwn(patch, 'is_favorite') && typeof patch.is_favorite === 'boolean') {
    payload.is_favorite = patch.is_favorite;
  }

  if (hasOwn(patch, 'last_visited_at') && patch.last_visited_at !== undefined) {
    payload.last_visited_at = patch.last_visited_at;
  }

  return payload;
};

export const applyGuildPreferencePatch = (
  preferences: GuildNavigationPreference[],
  userId: string,
  guildId: string,
  patch: GuildPreferencePatch,
  now: string,
) => {
  const existing = preferences.find((preference) => preference.guild_id === guildId);
  const nextPreference: GuildNavigationPreference = {
    user_id: userId,
    guild_id: guildId,
    is_favorite: patch.is_favorite ?? existing?.is_favorite ?? false,
    last_visited_at: patch.last_visited_at ?? existing?.last_visited_at ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  return [
    ...preferences.filter((preference) => preference.guild_id !== guildId),
    nextPreference,
  ];
};

export const mergeLoadedGuildPreferences = (
  loaded: GuildNavigationPreference[],
  current: GuildNavigationPreference[],
) => {
  const merged = new Map<string, GuildNavigationPreference>();

  loaded.forEach((preference) => {
    merged.set(preference.guild_id, preference);
  });

  current.forEach((preference) => {
    merged.set(preference.guild_id, preference);
  });

  return Array.from(merged.values());
};
