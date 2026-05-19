import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { mapRecentRowToCommandItem, mapServerResultToCommandItem } from './resolve';
import { dedupeCommandPaletteItems, filterLocalCommandPaletteItems, groupCommandPaletteItems } from './scoring';
import type {
  CommandPaletteGuildContext,
  CommandPaletteItem,
  CommandPaletteRecentRow,
  CommandPaletteServerResult,
} from './types';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getGuildPath } from '@/lib/guildSlug';


interface UseCommandPaletteSearchOptions {
  open: boolean;
  query: string;
  contextGuildId?: string | null;
  localItems: CommandPaletteItem[];
  userGuilds: Array<CommandPaletteGuildContext & { id: string }>;
}

type GuildPreferenceRow = {
  guild_id: string;
  last_visited_at: string | null;
  is_favorite: boolean;
};

export const useCommandPaletteSearch = ({
  open,
  query,
  contextGuildId,
  localItems,
  userGuilds,
}: UseCommandPaletteSearchOptions) => {
  const { user } = useAuth();
  const normalizedQuery = query.trim();
  const guildsById = useMemo(() => new Map(userGuilds.map((guild) => [guild.id, guild])), [userGuilds]);

  const serverResultsQuery = useQuery({
    queryKey: ['command-palette-search', normalizedQuery, contextGuildId],
    enabled: open && Boolean(user?.id) && normalizedQuery.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_command_palette', {
        p_query: normalizedQuery,
        p_context_guild_id: contextGuildId || null,
        p_limit_per_group: 6,
      });

      if (error) throw error;
      return (data || []) as CommandPaletteServerResult[];
    },
    staleTime: 15_000,
  });

  const recentItemsQuery = useQuery({
    queryKey: ['command-palette-recents', user?.id],
    enabled: open && Boolean(user?.id) && normalizedQuery.length === 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('command_palette_recent_items')
        .select('item_type, item_id, guild_id, title, subtitle, href, metadata, use_count, last_used_at')
        .order('last_used_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return (data || []) as CommandPaletteRecentRow[];
    },
    staleTime: 20_000,
  });

  const recentGuildsQuery = useQuery({
    queryKey: ['command-palette-recent-guilds', user?.id, userGuilds.map((guild) => guild.id).join(',')],
    enabled: open && Boolean(user?.id) && normalizedQuery.length === 0 && userGuilds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_guild_navigation_preferences')
        .select('guild_id, last_visited_at, is_favorite')
        .in('guild_id', userGuilds.map((guild) => guild.id))
        .not('last_visited_at', 'is', null)
        .order('last_visited_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as GuildPreferenceRow[];
    },
    staleTime: 30_000,
  });

  const groups = useMemo(() => {
    if (normalizedQuery.length === 0) {
      const recentItems = (recentItemsQuery.data || []).map(mapRecentRowToCommandItem);
      const recentGuilds: CommandPaletteItem[] = (recentGuildsQuery.data || [])
        .map((preference) => {
          const guild = guildsById.get(preference.guild_id);
          if (!guild) return null;

          return {
            id: guild.id,
            type: 'guild' as const,
            group: 'recent' as const,
            title: guild.name,
            subtitle: `${guild.server} - ${guild.region.toUpperCase()}`,
            href: getGuildPath(guild.region, guild.server, guild.name),
            guildId: guild.id,
            metadata: {
              name: guild.name,
              server: guild.server,
              region: guild.region,
              avatar_url: guild.avatarUrl,
            },
            score: preference.is_favorite ? 8 : 4,
          };
        })
        .filter((item): item is CommandPaletteItem => Boolean(item));

      const frequentActions = localItems
        .filter((item) => item.group === 'actions')
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 6);

      const starterPages = localItems
        .filter((item) => item.group === 'pages')
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);

      return groupCommandPaletteItems(
        dedupeCommandPaletteItems([...recentItems, ...recentGuilds, ...frequentActions, ...starterPages]),
      );
    }

    const localMatches = filterLocalCommandPaletteItems(localItems, normalizedQuery, contextGuildId).slice(0, 10);
    const serverMatches = (serverResultsQuery.data || [])
      .map(mapServerResultToCommandItem)
      .filter((item): item is CommandPaletteItem => Boolean(item));

    return groupCommandPaletteItems(dedupeCommandPaletteItems([...localMatches, ...serverMatches]));
  }, [
    contextGuildId,
    guildsById,
    localItems,
    normalizedQuery,
    recentGuildsQuery.data,
    recentItemsQuery.data,
    serverResultsQuery.data,
  ]);

  return {
    groups,
    loading: serverResultsQuery.isFetching || recentItemsQuery.isFetching || recentGuildsQuery.isFetching,
    error: serverResultsQuery.error || recentItemsQuery.error || recentGuildsQuery.error,
  };
};
