import { useCallback, useEffect, useState } from 'react';

import type { AppGuildDiscoveryInput } from '@/lib/guildDiscovery';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildGuildDiscoveryKey, mergeGuildDiscoverySources } from '@/lib/guildDiscovery';
import log from '@/lib/logger';

export interface UserGuildSummary {
  id: string | null;
  name: string;
  server: string;
  region: string;
  faction: 'horde' | 'alliance';
  role: string | null;
  owner_id: string | null;
  memberCount?: number;
  hasMain?: boolean;
  avatar_url?: string | null;
  isDetectedOnly: boolean;
  syncedCharacterCount: number;
}

export interface GuildNavigationPreference {
  user_id: string;
  guild_id: string;
  is_favorite: boolean;
  last_visited_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseUserGuildsOptions {
  enabled?: boolean;
}

const dedupeGuildsById = <T extends { id: string }>(guilds: T[]) =>
  Array.from(new Map(guilds.map((guild) => [guild.id, guild])).values());

export const useUserGuilds = ({ enabled = true }: UseUserGuildsOptions = {}) => {
  const { user, profile } = useAuth();
  const [guilds, setGuilds] = useState<UserGuildSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const userId = user?.id;

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setGuilds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [membershipsResult, syncedMembershipsResult, mainCharResult] = await Promise.all([
        supabase
          .from('guild_members')
          .select('guild_id, role')
          .eq('user_id', userId),
        supabase
          .from('wow_guild_memberships')
          .select('character_id, guild_name, guild_realm, guild_realm_slug, guild_region, guild_faction, is_guild_master')
          .eq('user_id', userId),
        supabase
          .from('wow_characters')
          .select('id')
          .eq('user_id', userId)
          .eq('is_main', true)
          .limit(1),
      ]);

      if (membershipsResult.error) {
        throw membershipsResult.error;
      }

      const memberships = membershipsResult.data || [];
      const syncedMemberships = syncedMembershipsResult.data || [];
      const membershipGuildIds = Array.from(new Set(memberships.map((membership) => membership.guild_id)));

      const [memberGuildsResult, ownedGuildsResult] = await Promise.all([
        membershipGuildIds.length > 0
          ? supabase
              .from('guilds')
              .select('id, name, server, region, faction, owner_id, avatar_url')
              .in('id', membershipGuildIds)
          : Promise.resolve({
              data: [] as Array<{
                id: string;
                name: string;
                server: string;
                region: string | null;
                faction: string;
                owner_id: string | null;
                avatar_url: string | null;
              }>,
              error: null,
            }),
        supabase
          .from('guilds')
          .select('id, name, server, region, faction, owner_id, avatar_url')
          .eq('owner_id', userId),
      ]);

      if (memberGuildsResult.error || ownedGuildsResult.error) {
        throw memberGuildsResult.error || ownedGuildsResult.error;
      }

      const visibleGuilds = dedupeGuildsById([
        ...(memberGuildsResult.data || []),
        ...(ownedGuildsResult.data || []),
      ]);

      let appGuilds: AppGuildDiscoveryInput[] = [];

      if (visibleGuilds.length > 0) {
        const guildIds = visibleGuilds.map((guild) => guild.id);
        const guildNames = Array.from(new Set(visibleGuilds.map((guild) => guild.name)));
        const guildRegions = Array.from(new Set(visibleGuilds.map((guild) => guild.region || 'eu')));
        const [rosterCountsResult, wowMembershipCountsResult] = await Promise.all([
          supabase
            .from('guild_roster_cache')
            .select('guild_id')
            .in('guild_id', guildIds),
          supabase
            .from('wow_guild_memberships')
            .select('guild_name, guild_realm, guild_realm_slug, guild_region')
            .in('guild_name', guildNames)
            .in('guild_region', guildRegions),
        ]);

        if (rosterCountsResult.error) {
          log.warn('Unable to count guild roster cache rows:', rosterCountsResult.error);
        }

        if (wowMembershipCountsResult.error) {
          log.warn('Unable to count synced guild memberships:', wowMembershipCountsResult.error);
        }

        const membershipRoleByGuildId = new Map(
          memberships.map((membership) => [membership.guild_id, membership.role]),
        );

        const syncedGmKeySet = new Set(
          syncedMemberships
            .filter((membership) => membership.is_guild_master)
            .map((membership) =>
              buildGuildDiscoveryKey({
                region: membership.guild_region || 'eu',
                guildName: membership.guild_name,
                realmNameOrSlug: membership.guild_realm_slug || membership.guild_realm,
              }),
            ),
        );

        const memberCounts: Record<string, number> = {};
        rosterCountsResult.data?.forEach((member) => {
          memberCounts[member.guild_id] = (memberCounts[member.guild_id] || 0) + 1;
        });

        const syncedMemberCountsByGuildKey = new Map<string, number>();
        wowMembershipCountsResult.data?.forEach((membership) => {
          const guildKey = buildGuildDiscoveryKey({
            region: membership.guild_region || 'eu',
            guildName: membership.guild_name,
            realmNameOrSlug: membership.guild_realm_slug || membership.guild_realm,
          });

          syncedMemberCountsByGuildKey.set(guildKey, (syncedMemberCountsByGuildKey.get(guildKey) || 0) + 1);
        });

        appGuilds = visibleGuilds.map((guild) => {
          const guildKey = buildGuildDiscoveryKey({
            region: guild.region || 'eu',
            guildName: guild.name,
            realmNameOrSlug: guild.server,
          });

          const derivedRole =
            membershipRoleByGuildId.get(guild.id)
            || (guild.owner_id === userId ? 'gm' : null)
            || (syncedGmKeySet.has(guildKey) ? 'gm' : null)
            || 'member';

          return {
            ...guild,
            region: guild.region || 'eu',
            faction: guild.faction as 'horde' | 'alliance',
            role: derivedRole,
            memberCount: memberCounts[guild.id] || syncedMemberCountsByGuildKey.get(guildKey) || 0,
            hasMain: false,
            avatar_url: guild.avatar_url,
            isDetectedOnly: false,
            syncedCharacterCount: 0,
          };
        });
      }

      const mainGuildMembership = mainCharResult.data?.[0]
        ? syncedMemberships.find((membership) => membership.character_id === mainCharResult.data?.[0].id) || null
        : null;

      const mainGuildKey = mainGuildMembership
        ? buildGuildDiscoveryKey({
            region: mainGuildMembership.guild_region || 'eu',
            guildName: mainGuildMembership.guild_name,
            realmNameOrSlug: mainGuildMembership.guild_realm_slug || mainGuildMembership.guild_realm,
          })
        : null;

      const mergedGuilds = mergeGuildDiscoverySources({
        appGuilds,
        syncedMemberships,
      }).map((guild) => ({
        ...guild,
        hasMain:
          mainGuildKey !== null &&
          buildGuildDiscoveryKey({
            region: guild.region,
            guildName: guild.name,
            realmNameOrSlug: guild.server,
          }) === mainGuildKey,
      }));

      mergedGuilds.sort((a, b) => {
        if (a.hasMain && !b.hasMain) return -1;
        if (!a.hasMain && b.hasMain) return 1;
        if (a.isDetectedOnly !== b.isDetectedOnly) return a.isDetectedOnly ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      setGuilds(mergedGuilds as UserGuildSummary[]);
    } catch (loadError) {
      log.error('Error fetching user guilds:', loadError);
      setError(loadError);
      setGuilds([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, profile?.battlenet_id]);

  return {
    guilds,
    loading,
    error,
    refresh,
  };
};
