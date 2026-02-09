import type { SupabaseClient } from '@supabase/supabase-js';
import { toSlug } from '@/lib/guildSlug';

type GuildRow = {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url?: string | null;
};

type GuildAliasRow = {
  guild_id: string;
  old_name: string;
  server: string;
  region: string;
};

export async function findGuildByRouteSlugs(args: {
  supabase: SupabaseClient;
  regionSlug: string;
  serverSlug: string;
  guildSlug: string;
}): Promise<GuildRow | null> {
  const { supabase, regionSlug, serverSlug, guildSlug } = args;

  const { data: allGuilds } = await supabase
    .from('guilds')
    .select('id, name, server, region, faction, avatar_url');

  const matchedGuild = (allGuilds as GuildRow[] | null | undefined)?.find(g =>
    toSlug(g.region || 'eu') === regionSlug &&
    toSlug(g.server) === serverSlug &&
    toSlug(g.name) === guildSlug
  );

  if (matchedGuild) return matchedGuild;

  // Alias fallback: if a guild was renamed, keep routing stable via guild_aliases.
  const { data: aliasRows } = await supabase
    .from('guild_aliases')
    .select('guild_id, old_name, server, region')
    .ilike('region', regionSlug)
    .ilike('server', serverSlug);

  const aliasMatch = (aliasRows as GuildAliasRow[] | null | undefined)?.find(a =>
    toSlug(a.old_name) === guildSlug
  );

  if (!aliasMatch) return null;

  const aliasedGuild = (allGuilds as GuildRow[] | null | undefined)?.find(g => g.id === aliasMatch.guild_id);
  return aliasedGuild || null;
}

