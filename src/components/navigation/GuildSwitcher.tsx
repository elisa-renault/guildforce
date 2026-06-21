import { ChevronDown, Crown, Search, Shield, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { GuildNavigationPreference, UserGuildSummary } from '@/hooks/useUserGuilds';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserGuilds } from '@/hooks/useUserGuilds';
import { supabase } from '@/integrations/supabase/client';
import {
  applyGuildPreferencePatch,
  buildGuildPreferenceUpdatePayload,
  type GuildPreferencePatch,
  mergeLoadedGuildPreferences,
} from '@/lib/guildNavigationPreferences';
import { getGuildPath } from '@/lib/guildSlug';
import log from '@/lib/logger';
import { cn } from '@/lib/utils';

export interface GuildSwitcherProps {
  className?: string;
}

type NavigableGuild = UserGuildSummary & { id: string };

const isNavigableGuild = (guild: UserGuildSummary): guild is NavigableGuild =>
  Boolean(guild.id) && !guild.isDetectedOnly;

const sortByName = (a: NavigableGuild, b: NavigableGuild) => a.name.localeCompare(b.name);

export const GuildSwitcher = ({ className }: GuildSwitcherProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { guilds, loading } = useUserGuilds({ enabled: Boolean(user?.id) });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [preferences, setPreferences] = useState<GuildNavigationPreference[]>([]);
  const preferenceWriteVersionRef = useRef(0);
  const userId = user?.id;

  const copy = t.guildSwitcher;

  const navigableGuilds = useMemo(
    () => guilds.filter(isNavigableGuild),
    [guilds],
  );

  const guildIdsKey = useMemo(
    () => navigableGuilds.map((guild) => guild.id).sort().join(','),
    [navigableGuilds],
  );

  const preferenceByGuildId = useMemo(
    () => new Map(preferences.map((preference) => [preference.guild_id, preference])),
    [preferences],
  );

  const activeGuild = useMemo(
    () =>
      navigableGuilds.find((guild) =>
        location.pathname.startsWith(getGuildPath(guild.region, guild.server, guild.name)),
      ) || null,
    [location.pathname, navigableGuilds],
  );

  useEffect(() => {
    if (!userId || navigableGuilds.length === 0) {
      setPreferences([]);
      return;
    }

    let cancelled = false;

    const loadWriteVersion = preferenceWriteVersionRef.current;

    supabase
      .from('user_guild_navigation_preferences')
      .select('*')
      .eq('user_id', userId)
      .in('guild_id', navigableGuilds.map((guild) => guild.id))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          log.warn('Unable to load guild navigation preferences:', error);
          setPreferences([]);
          return;
        }

        if (preferenceWriteVersionRef.current === loadWriteVersion) {
          setPreferences(data || []);
          return;
        }

        setPreferences((current) => mergeLoadedGuildPreferences(data || [], current));
      });

    return () => {
      cancelled = true;
    };
  }, [guildIdsKey, navigableGuilds, userId]);

  const upsertPreference = async (
    guild: NavigableGuild,
    patch: GuildPreferencePatch,
  ) => {
    if (!userId) return;

    const now = new Date().toISOString();
    const updatePayload = buildGuildPreferenceUpdatePayload(patch);

    if (Object.keys(updatePayload).length === 0) return;

    preferenceWriteVersionRef.current += 1;
    setPreferences((current) => applyGuildPreferencePatch(current, userId, guild.id, patch, now));

    const { data: updatedRows, error: updateError } = await supabase
      .from('user_guild_navigation_preferences')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('guild_id', guild.id)
      .select('guild_id')
      .limit(1);

    if (updateError) {
      log.warn('Unable to save guild navigation preference:', updateError);
      return;
    }

    if (updatedRows && updatedRows.length > 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from('user_guild_navigation_preferences')
      .insert({
        user_id: userId,
        guild_id: guild.id,
        is_favorite: patch.is_favorite ?? false,
        last_visited_at: patch.last_visited_at ?? null,
      });

    if (!insertError) {
      return;
    }

    if (insertError.code === '23505') {
      const { error: retryUpdateError } = await supabase
        .from('user_guild_navigation_preferences')
        .update(updatePayload)
        .eq('user_id', userId)
        .eq('guild_id', guild.id);

      if (!retryUpdateError) {
        return;
      }

      log.warn('Unable to save guild navigation preference after retry:', retryUpdateError);
      return;
    }

    log.warn('Unable to create guild navigation preference:', insertError);
  };

  useEffect(() => {
    if (activeGuild) {
      void upsertPreference(activeGuild, { last_visited_at: new Date().toISOString() });
    }
    // Preference persistence is intentionally keyed to the active route only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGuild?.id, userId]);

  const filteredGuilds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return navigableGuilds;

    return navigableGuilds.filter((guild) =>
      [guild.name, guild.server, guild.region]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [navigableGuilds, query]);

  const favoriteGuilds = filteredGuilds
    .filter((guild) => preferenceByGuildId.get(guild.id)?.is_favorite)
    .sort(sortByName);

  const recentGuilds = filteredGuilds
    .filter((guild) => {
      const preference = preferenceByGuildId.get(guild.id);
      return Boolean(preference?.last_visited_at) && !preference?.is_favorite;
    })
    .sort((a, b) => {
      const aVisited = preferenceByGuildId.get(a.id)?.last_visited_at || '';
      const bVisited = preferenceByGuildId.get(b.id)?.last_visited_at || '';
      return bVisited.localeCompare(aVisited);
    })
    .slice(0, 5);

  const allGuilds = filteredGuilds.sort(sortByName);

  const navigateToGuild = (guild: NavigableGuild) => {
    void upsertPreference(guild, { last_visited_at: new Date().toISOString() });
    navigate(getGuildPath(guild.region, guild.server, guild.name));
    setOpen(false);
  };

  const toggleFavorite = (guild: NavigableGuild) => {
    const current = Boolean(preferenceByGuildId.get(guild.id)?.is_favorite);
    void upsertPreference(guild, { is_favorite: !current });
  };

  const renderGuildRow = (guild: NavigableGuild) => {
    const active = activeGuild?.id === guild.id;
    const favorite = Boolean(preferenceByGuildId.get(guild.id)?.is_favorite);

    return (
      <div
        key={guild.id}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/20',
          active && 'bg-primary/15 ring-1 ring-primary/30',
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => navigateToGuild(guild)}
        >
          <Avatar className="h-8 w-8 shrink-0 border border-border/50 bg-muted/30">
            {guild.avatar_url ? <AvatarImage src={guild.avatar_url} alt={guild.name} /> : null}
            <AvatarFallback className="text-xs font-semibold">{guild.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">{guild.name}</span>
              {guild.role === 'gm' || guild.owner_id === userId ? (
                <Badge variant="outline" className="h-4 shrink-0 border-primary/30 bg-primary/10 px-1 text-[9px] text-primary">
                  GM
                </Badge>
              ) : null}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {guild.server} - {guild.region.toUpperCase()}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-80 transition hover:bg-muted hover:text-foreground group-hover:opacity-100',
            favorite && 'text-primary opacity-100',
          )}
          aria-label={favorite ? copy.removeFavorite : copy.addFavorite}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(guild);
          }}
        >
          <Star className={cn('h-3.5 w-3.5', favorite && 'fill-current')} strokeWidth={1.6} />
        </button>
      </div>
    );
  };

  const renderSection = (label: string, items: NavigableGuild[]) => {
    if (items.length === 0) return null;

    return (
      <div className="py-1">
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <div className="space-y-0.5">{items.map(renderGuildRow)}</div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 min-w-0 max-w-[240px] items-center gap-2 rounded border border-border/35 bg-card/20 px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-[280px]',
            className,
          )}
        >
          <Shield className="h-4 w-4 shrink-0 text-primary/90" strokeWidth={1.5} />
          <span className="min-w-0 flex-1 truncate text-left">
            {activeGuild?.name || t.common.myGuilds || copy.guilds}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(360px,calc(100vw-1.5rem))] border-border/50 bg-background/95 p-2 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto pr-1">
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{copy.loading}</p>
          ) : filteredGuilds.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            <>
              {renderSection(copy.favorites, favoriteGuilds)}
              {favoriteGuilds.length > 0 && recentGuilds.length > 0 ? <DropdownMenuSeparator /> : null}
              {renderSection(copy.recent, recentGuilds)}
              {(favoriteGuilds.length > 0 || recentGuilds.length > 0) && allGuilds.length > 0 ? <DropdownMenuSeparator /> : null}
              {renderSection(copy.guilds, allGuilds)}
            </>
          )}
        </div>

        <DropdownMenuSeparator />
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
          onClick={() => {
            navigate('/guilds');
            setOpen(false);
          }}
        >
          <span>{copy.allGuilds}</span>
          <Crown className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
