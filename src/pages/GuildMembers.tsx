import { Crown, Shield, Search, Users, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Check, X, Star, Eye } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild/GuildSubNav';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BATTLENET_CLASS_MAP } from '@/data/battlenetClasses';
import { getLocalizedClassName, wowClasses } from '@/data/wowClasses';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { formatDistanceFromNowLocalized } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { toneCalloutClass, toneTextClass, wowClassColorValue } from '@/lib/design-tokens';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { formatRankLabel } from '@/lib/rankLabel';
import { cn } from '@/lib/utils';

interface RosterMember {
  id: string;
  character_name: string;
  character_realm: string;
  character_realm_slug: string;
  character_class_id: number;
  character_level: number;
  rank_index: number;
  rank_name: string | null;
  is_guild_master: boolean | null;
  matched_user_id: string | null;
  matched_character_id: string | null;
  is_main_character?: boolean;
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

type WowCharacterLite = {
  name: string | null;
  realm: string | null;
  realm_slug: string | null;
  level: number | null;
  class_id: number | null;
};

interface GuildInfo {
  id: string;
  name: string;
  server: string;
  region: string;
  avatar_url: string | null;
  officer_rank_threshold: number;
}

const ITEMS_PER_PAGE = 20;

// eslint-disable-next-line complexity
const GuildMembers = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin: isGlobalAdmin, loading: adminLoading } = useIsAdmin();
  const { language, t } = useLanguage();

  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGM, setIsGM] = useState(false);
  const [isAdminReadOnly, setIsAdminReadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilters, setClassFilters] = useState<string[]>([]);
  const [rankFilters, setRankFilters] = useState<number[]>([]);
  const [guildforceFilter, setGuildforceFilter] = useState<'all' | 'guildforce' | 'not-guildforce'>('all');
  const [mainFilter, setMainFilter] = useState<'all' | 'main-only' | 'alts-only'>('all');
  const [hasRosterCache, setHasRosterCache] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  
  // Popover states
  const [classOpen, setClassOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [guildforceOpen, setGuildforceOpen] = useState(false);
  const [mainOpen, setMainOpen] = useState(false);
  const { rankLabels } = useGuildRankLabels({ guildId: guild?.id });

  const { hasPermission: hasActivityPermission } = useHasGuildPermission(guild?.id || null, 'view_activity_log');

  const memberUi = {
    adminReadOnly: resolveSemanticMessage({ key: 'guild.members.admin_read_only', language, translations: t }),
    guildMembersTitle: resolveSemanticMessage({ key: 'guild.members.title', language, translations: t }),
    syncPrefix: resolveSemanticMessage({ key: 'guild.members.sync_prefix', language, translations: t }),
    syncMissing: resolveSemanticMessage({ key: 'guild.members.sync_missing', language, translations: t }),
    searchPlaceholder: resolveSemanticMessage({ key: 'guild.members.search_placeholder', language, translations: t }),
    rankPlural: resolveSemanticMessage({ key: 'guild.members.rank_plural', language, translations: t }),
    rankSingle: resolveSemanticMessage({ key: 'guild.members.rank_single', language, translations: t }),
    rankLabel: resolveSemanticMessage({ key: 'guild.members.rank_label', language, translations: t }),
    allRanks: resolveSemanticMessage({ key: 'guild.members.all_ranks', language, translations: t }),
    guildforceLabel: resolveSemanticMessage({ key: 'guild.members.guildforce_label', language, translations: t }),
    notRegistered: resolveSemanticMessage({ key: 'guild.members.not_registered', language, translations: t }),
    notRegisteredPlural: resolveSemanticMessage({ key: 'guild.members.not_registered_plural', language, translations: t }),
    onGuildforce: resolveSemanticMessage({ key: 'guild.members.on_guildforce', language, translations: t }),
    mains: resolveSemanticMessage({ key: 'guild.members.mains', language, translations: t }),
    alts: resolveSemanticMessage({ key: 'guild.members.alts', language, translations: t }),
    mainAlt: resolveSemanticMessage({ key: 'guild.members.main_alt', language, translations: t }),
    mainsOnly: resolveSemanticMessage({ key: 'guild.members.mains_only', language, translations: t }),
    altsOnly: resolveSemanticMessage({ key: 'guild.members.alts_only', language, translations: t }),
    tableCharacter: resolveSemanticMessage({ key: 'guild.members.table_character', language, translations: t }),
    tableClass: resolveSemanticMessage({ key: 'guild.members.table_class', language, translations: t }),
    tablePlayer: resolveSemanticMessage({ key: 'guild.members.table_player', language, translations: t }),
    tableRank: resolveSemanticMessage({ key: 'guild.members.table_rank', language, translations: t }),
    noMembers: resolveSemanticMessage({ key: 'guild.members.no_members', language, translations: t }),
    pageLabel: resolveSemanticMessage({ key: 'guild.members.page_label', language, translations: t }),
    previous: resolveSemanticMessage({ key: 'guild.members.previous', language, translations: t }),
    next: resolveSemanticMessage({ key: 'guild.members.next', language, translations: t }),
  };

  const getRankLabel = (rankName: string | null, index: number) =>
    formatRankLabel({
      rankName,
      rankIndex: index,
      rankLabel: memberUi.rankLabel,
      guildMasterLabel: t.guild.rank0,
      customLabel: rankLabels[index],
    });

  // Get unique ranks for filter
  const uniqueRanks = useMemo(() => 
    Array.from(
      new Map(members.map(m => [m.rank_index, { index: m.rank_index, name: m.rank_name }])).values()
    ).sort((a, b) => a.index - b.index),
    [members]
  );

  // Get unique classes present in the guild
  const uniqueClasses = useMemo(() => {
    const classIds = new Set(members.map(m => BATTLENET_CLASS_MAP[m.character_class_id]).filter(Boolean));
    return wowClasses.filter(c => classIds.has(c.id));
  }, [members]);

  // Get class color from Battle.net class ID
  const getClassColor = (battlenetClassId: number): string => {
    const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
    if (!classKey) return 'hsl(var(--muted-foreground))';
    return wowClassColorValue(classKey);
  };

  const getClassName = (battlenetClassId: number): string => {
    const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
    if (!classKey) return 'Unknown';
    const wowClass = wowClasses.find(c => c.id === classKey);
    if (!wowClass) return 'Unknown';
    return getLocalizedClassName(wowClass.id, language);
  };

  const toggleClass = (classId: string) => {
    setClassFilters(prev => 
      prev.includes(classId) 
        ? prev.filter(c => c !== classId)
        : [...prev, classId]
    );
    setCurrentPage(1);
  };

  const toggleRank = (rankIndex: number) => {
    setRankFilters(prev => 
      prev.includes(rankIndex)
        ? prev.filter(r => r !== rankIndex)
        : [...prev, rankIndex]
    );
    setCurrentPage(1);
  };

  useEffect(() => {
    // eslint-disable-next-line complexity
    const loadData = async () => {
      if (!regionSlug || !serverSlug || !guildSlug || !user) {
        setLoading(false);
        return;
      }
      // Wait for admin check to complete
      if (adminLoading) return;

      try {
        const matchedGuild = await findGuildByRouteSlugs({
          supabase,
          regionSlug,
          serverSlug,
          guildSlug,
        });

        if (!matchedGuild) {
          navigate('/guilds');
          return;
        }

        const { data: guildData, error: guildError } = await supabase
          .from('guilds')
          .select('id, name, server, region, avatar_url, officer_rank_threshold')
          .eq('id', matchedGuild.id)
          .maybeSingle();

        if (guildError || !guildData) {
          navigate('/guilds');
          return;
        }

        setGuild(guildData);

        // Check if GM
        const { data: gmCheck } = await supabase.rpc('is_guild_owner_or_gm', {
          _guild_id: guildData.id,
        });
        setIsGM(!!gmCheck);
        
        // Check if global admin (for read-only access without membership)
        if (isGlobalAdmin && !gmCheck) {
          setIsAdminReadOnly(true);
        }

        // First try to get from roster cache (full guild roster)
        const { data: rosterCache, error: rosterError } = await supabase
          .from('guild_roster_cache')
          .select('*')
          .eq('guild_id', guildData.id)
          .order('rank_index', { ascending: true });

        if (!rosterError && rosterCache && rosterCache.length > 0) {
          setHasRosterCache(true);
          
          // Get the most recent updated_at for sync date display
          const mostRecentUpdate = rosterCache.reduce((latest, m) => {
            const current = m.updated_at ? new Date(m.updated_at).getTime() : 0;
            return current > latest ? current : latest;
          }, 0);
          if (mostRecentUpdate > 0) {
            setLastSyncDate(new Date(mostRecentUpdate).toISOString());
          }
          
          // Get profiles for matched users
          const userIds = rosterCache
            .filter(m => m.matched_user_id)
            .map(m => m.matched_user_id as string);
          
          const profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            profiles?.forEach(p => {
              profilesMap[p.id] = p;
            });
          }

          // Get main character status for matched characters
          const matchedCharIds = rosterCache
            .filter(m => m.matched_character_id)
            .map(m => m.matched_character_id as string);

          const mainCharIds = new Set<string>();
          if (matchedCharIds.length > 0) {
            const { data: mainChars } = await supabase
              .from('wow_characters')
              .select('id')
              .in('id', matchedCharIds)
              .eq('is_main', true);
            
            mainChars?.forEach(c => mainCharIds.add(c.id));
          }

          // Build member list from cache
          const memberList: RosterMember[] = rosterCache.map(m => ({
            id: m.id,
            character_name: m.character_name,
            character_realm: m.character_realm,
            character_realm_slug: m.character_realm_slug,
            character_class_id: m.character_class_id,
            character_level: m.character_level,
            rank_index: m.rank_index,
            rank_name: m.rank_name,
            is_guild_master: m.is_guild_master,
            matched_user_id: m.matched_user_id,
            matched_character_id: m.matched_character_id,
            is_main_character: m.matched_character_id ? mainCharIds.has(m.matched_character_id) : false,
            profile: m.matched_user_id ? profilesMap[m.matched_user_id] || null : null,
          }));

          setMembers(memberList);
        } else {
          // Fallback to wow_guild_memberships (only synced users)
          setHasRosterCache(false);
          
          const { data: wowMembers, error: wowError } = await supabase
            .from('wow_guild_memberships')
            .select(`
              id,
              user_id,
              character_id,
              rank_index,
              rank_name,
              is_guild_master,
              wow_characters!wow_guild_memberships_character_id_fkey (
                name,
                realm,
                realm_slug,
                level,
                class_id
              )
            `)
            .ilike('guild_name', guildData.name)
            .ilike('guild_realm_slug', guildData.server)
            .ilike('guild_region', guildData.region)
            .order('rank_index', { ascending: true });

          if (wowError) {
            return;
          }

          // Get profiles for all user_ids
          const userIds = [...new Set(wowMembers?.map(m => m.user_id) || [])];
          
          const profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            profiles?.forEach(p => {
              profilesMap[p.id] = p;
            });
          }

          // Build member list
          const memberList: RosterMember[] = (wowMembers || []).map(m => {
            const char = m.wow_characters as WowCharacterLite | null;
            return {
              id: m.id,
              character_name: char?.name || 'Unknown',
              character_realm: char?.realm || '',
              character_realm_slug: char?.realm_slug || '',
              character_class_id: char?.class_id || 0,
              character_level: char?.level || 0,
              rank_index: m.rank_index,
              rank_name: m.rank_name,
              is_guild_master: m.is_guild_master,
              matched_user_id: m.user_id,
              matched_character_id: m.character_id,
              profile: profilesMap[m.user_id] || null,
            };
          });

          setMembers(memberList);
        }
      } catch {
        // Guild members loading error handled silently
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [regionSlug, serverSlug, guildSlug, user, navigate, adminLoading, isGlobalAdmin]);

  // Filter members
  const filteredMembers = useMemo(() => {
    // eslint-disable-next-line complexity
    return members.filter(member => {
      // Search filter
      const characterName = member.character_name?.toLowerCase() || '';
      const username = member.profile?.username?.toLowerCase() || '';
      const searchLower = searchQuery.toLowerCase();
      
      if (searchQuery && !characterName.includes(searchLower) && !username.includes(searchLower)) {
        return false;
      }

      // Class filter
      if (classFilters.length > 0) {
        const memberClassKey = BATTLENET_CLASS_MAP[member.character_class_id];
        if (!memberClassKey || !classFilters.includes(memberClassKey)) {
          return false;
        }
      }

      // Rank filter
      if (rankFilters.length > 0 && !rankFilters.includes(member.rank_index)) {
        return false;
      }

      // Guildforce filter
      if (guildforceFilter === 'guildforce' && !member.matched_user_id) {
        return false;
      }
      if (guildforceFilter === 'not-guildforce' && member.matched_user_id) {
        return false;
      }

      // Main/Alt filter
      if (mainFilter === 'main-only' && !member.is_main_character) {
        return false;
      }
      if (mainFilter === 'alts-only' && member.is_main_character) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, classFilters, rankFilters, guildforceFilter, mainFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, guildforceFilter, mainFilter]);

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  const breadcrumbItems = [
    { label: t.common.myGuilds, href: '/guilds' },
    { label: guild?.name || '...', href: basePath },
    { label: t.guild.members },
  ];

  const hasClassFilters = classFilters.length > 0;
  const hasRankFilters = rankFilters.length > 0;
  const hasGuildforceFilter = guildforceFilter !== 'all';
  const hasMainFilter = mainFilter !== 'all';
  const selectedClasses = wowClasses.filter(c => classFilters.includes(c.id));

  if (loading) {
    return (
      <div className="flex-1 relative pt-16">
        <CosmicBackground />
        <PageContainer className="pt-20 pb-8" width="wide">
          <Skeleton className="h-12 w-1/3 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!guild) return null;

  const guildforceCount = members.filter(m => m.matched_user_id).length;
  const notOnGuildforceCount = members.filter(m => !m.matched_user_id).length;
  
  // Count unique Guildforce members (distinct players)
  const uniqueGuildforceMembers = new Set(
    members
      .filter(m => m.matched_user_id)
      .map(m => m.matched_user_id)
  ).size;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <GuildSubNav
        guild={guild}
        guildId={guild.id}
        basePath={basePath}
        isGM={isGM}
        hasSettingsPermission={isGM || hasActivityPermission}
        activeTab="members"
      />

      <PageContainer as="main" className="px-3 md:px-4 py-4 md:py-6" width="wide">
        {/* Admin read-only banner */}
        {isAdminReadOnly && (
          <div className={cn("flex items-center justify-center gap-2 mb-4 p-2 rounded-lg border", toneCalloutClass('warning'))}>
            <Eye className={cn("h-4 w-4", toneTextClass('warning'))} />
            <span className={cn("text-sm font-medium", toneTextClass('warning'))}>
              {memberUi.adminReadOnly}
            </span>
          </div>
        )}

        <Breadcrumbs items={breadcrumbItems} className="mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">
              {memberUi.guildMembersTitle}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </div>
          
          {hasRosterCache && lastSyncDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {memberUi.syncPrefix}{' '}
                {formatDistanceFromNowLocalized(lastSyncDate, language, true)}
              </span>
            </div>
          )}
          
          {!hasRosterCache && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>
                {memberUi.syncMissing}
              </span>
            </div>
          )}
        </div>

        {/* Filters - Dashboard style */}
        <div className="flex flex-col gap-2 mb-4">
          {/* Search - full width on mobile */}
          <div className="relative w-full md:max-w-[280px]">
            <label htmlFor="member-search" className="sr-only">
              {t.common.search}
            </label>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            <Input
              id="member-search"
              name="member-search"
              placeholder={memberUi.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 md:h-8 pl-8 text-sm cosmic-input"
            />
          </div>
          
          {/* Filters row - horizontal scroll on mobile */}
          <div className="flex gap-2 items-center overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap">
            
            {/* Class Filter */}
            <Popover open={classOpen} onOpenChange={setClassOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 md:h-8 min-w-[130px] md:min-w-[200px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80 hover:!text-foreground",
                    hasClassFilters && "!border-border/70"
                  )}
                >
                  {hasClassFilters ? (
                    <span className="flex items-center gap-1.5">
                      {selectedClasses.length <= 2 ? (
                        selectedClasses.map((cls) => (
                          <span 
                            key={cls.id} 
                            style={{ color: cls.color }}
                            className="truncate max-w-[60px] md:max-w-none"
                          >
                          {getLocalizedClassName(cls.id, language)}
                          </span>
                        ))
                      ) : (
                        <span>
                          {selectedClasses.length} {t.dashboard.classesCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-foreground/70">{t.dashboard.allClasses}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1.5 bg-card border-border z-50" align="start">
                <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
                  {hasClassFilters && (
                    <button
                      onClick={() => { setClassFilters([]); setCurrentPage(1); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{t.dashboard.clear}</span>
                    </button>
                  )}
                  {uniqueClasses.map((cls) => {
                    const isSelected = classFilters.includes(cls.id);
                    
                    return (
                      <button
                        key={cls.id}
                        onClick={() => toggleClass(cls.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                          isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                        )}
                        style={{ color: wowClassColorValue(cls.id) }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span>{getLocalizedClassName(cls.id, language)}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Rank Filter */}
            <Popover open={rankOpen} onOpenChange={setRankOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 md:h-8 min-w-[110px] md:min-w-[160px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80 hover:!text-foreground",
                    hasRankFilters && "!border-border/70"
                  )}
                >
                  {hasRankFilters ? (
                    <span>
                      {rankFilters.length}{' '}
                      {rankFilters.length > 1
                        ? memberUi.rankPlural
                        : memberUi.rankSingle}
                    </span>
                  ) : (
                    <span className="text-foreground/70">{memberUi.allRanks}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5 bg-card border-border z-50" align="start">
                <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
                  {hasRankFilters && (
                    <button
                      onClick={() => { setRankFilters([]); setCurrentPage(1); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{t.dashboard.clear}</span>
                    </button>
                  )}
                  {uniqueRanks.map((rank) => {
                    const isSelected = rankFilters.includes(rank.index);
                    const isGMRank = rank.index === 0;
                    const isOfficer = rank.index <= (guild?.officer_rank_threshold ?? 2);
                    
                    return (
                      <button
                        key={rank.index}
                        onClick={() => toggleRank(rank.index)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                          isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                        {isGMRank && <Crown className="h-3.5 w-3.5 text-warning flex-shrink-0" />}
                        {!isGMRank && isOfficer && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                        <span className={cn(
                          isGMRank && "text-warning",
                          !isGMRank && isOfficer && "text-primary"
                        )}>
                          {getRankLabel(rank.name, rank.index)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Guildforce Filter */}
            <Popover open={guildforceOpen} onOpenChange={setGuildforceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 md:h-8 min-w-[100px] md:min-w-[160px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80 hover:!text-foreground",
                    hasGuildforceFilter && "!border-border/70"
                  )}
                >
                  {guildforceFilter === 'guildforce' && (
                    <span className="flex items-center gap-1.5 text-healer">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{memberUi.guildforceLabel}</span>
                    </span>
                  )}
                  {guildforceFilter === 'not-guildforce' && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span>{memberUi.notRegistered}</span>
                    </span>
                  )}
                  {guildforceFilter === 'all' && (
                    <span className="text-foreground/70">{memberUi.guildforceLabel}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5 bg-card border-border z-50" align="start">
                <div className="flex flex-col gap-0.5">
                  {hasGuildforceFilter && (
                    <button
                      onClick={() => { setGuildforceFilter('all'); setCurrentPage(1); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{t.dashboard.clear}</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setGuildforceFilter('guildforce'); setGuildforceOpen(false); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      guildforceFilter === 'guildforce' ? "bg-primary/20" : "hover:bg-primary/10"
                    )}
                  >
                    {guildforceFilter === 'guildforce' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    <CheckCircle2 className="h-4 w-4 text-healer" />
                    <span className="text-healer">{memberUi.onGuildforce}</span>
                  </button>
                  <button
                    onClick={() => { setGuildforceFilter('not-guildforce'); setGuildforceOpen(false); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      guildforceFilter === 'not-guildforce' ? "bg-primary/20" : "hover:bg-primary/10"
                    )}
                  >
                    {guildforceFilter === 'not-guildforce' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{memberUi.notRegisteredPlural}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Main/Alt Filter */}
            <Popover open={mainOpen} onOpenChange={setMainOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 md:h-8 min-w-[100px] md:min-w-[140px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80 hover:!text-foreground",
                    hasMainFilter && "!border-border/70"
                  )}
                >
                  {mainFilter === 'main-only' && (
                    <span className="flex items-center gap-1.5 text-warning">
                      <Star className="h-4 w-4 fill-warning" />
                      <span>{memberUi.mains}</span>
                    </span>
                  )}
                  {mainFilter === 'alts-only' && (
                    <span className="text-muted-foreground">{memberUi.alts}</span>
                  )}
                  {mainFilter === 'all' && (
                    <span className="text-foreground/70">{memberUi.mainAlt}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5 bg-card border-border z-50" align="start">
                <div className="flex flex-col gap-0.5">
                  {hasMainFilter && (
                    <button
                      onClick={() => { setMainFilter('all'); setCurrentPage(1); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{t.dashboard.clear}</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setMainFilter('main-only'); setMainOpen(false); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      mainFilter === 'main-only' ? "bg-primary/20" : "hover:bg-primary/10"
                    )}
                  >
                    {mainFilter === 'main-only' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-warning">{memberUi.mainsOnly}</span>
                  </button>
                  <button
                    onClick={() => { setMainFilter('alts-only'); setMainOpen(false); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                      mainFilter === 'alts-only' ? "bg-primary/20" : "hover:bg-primary/10"
                    )}
                  >
                    {mainFilter === 'alts-only' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>{memberUi.altsOnly}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex flex-wrap gap-2 mb-4 text-sm text-muted-foreground">
          <span>
            {filteredMembers.length} {t.guild.charactersShown}
          </span>
          <span>•</span>
          <span className="text-healer">
            {uniqueGuildforceMembers} {uniqueGuildforceMembers === 1 ? t.guild.uniqueMember : t.guild.uniqueMembers}
          </span>
          <span className="text-muted-foreground/70">
            ({guildforceCount} {t.guild.characters})
          </span>
          <span>•</span>
          <span className="text-muted-foreground">
            {notOnGuildforceCount} {t.guild.charactersNotRegistered}
          </span>
        </div>

        {/* Members table */}
        <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{memberUi.tableCharacter}</TableHead>
                <TableHead className="hidden md:table-cell">{memberUi.tableClass}</TableHead>
                <TableHead>{memberUi.tablePlayer}</TableHead>
                <TableHead>{memberUi.tableRank}</TableHead>
                <TableHead className="text-center">{memberUi.guildforceLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {memberUi.noMembers}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member, index) => (
                  <TableRow
                    key={member.id}
                    className={cn(
                      "border-border/30 transition-colors",
                      member.profile && "hover:bg-primary/5 cursor-pointer"
                    )}
                    onClick={() => {
                      if (member.profile) {
                        navigate(`/u/${member.profile.username}`);
                      }
                    }}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.is_guild_master && (
                          <Crown className="h-4 w-4 text-warning" />
                        )}
                        {!member.is_guild_master && member.rank_index <= (guild?.officer_rank_threshold ?? 2) && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                        <span 
                          className="font-medium"
                          style={{ color: getClassColor(member.character_class_id) }}
                        >
                          {member.character_name}
                        </span>
                        {member.is_main_character && (
                          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        )}
                        {member.character_level > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Lv.{member.character_level}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span 
                        className="text-sm"
                        style={{ color: getClassColor(member.character_class_id) }}
                      >
                        {getClassName(member.character_class_id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.profile ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.profile.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.profile.username}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          member.is_guild_master && "bg-warning/20 text-warning border-warning/30",
                          !member.is_guild_master && member.rank_index <= (guild?.officer_rank_threshold ?? 2) && "bg-primary/20 text-primary border-primary/30"
                        )}
                      >
                        {getRankLabel(member.rank_name, member.rank_index)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {member.matched_user_id ? (
                        <CheckCircle2 className="h-4 w-4 text-healer mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="relative z-10 mt-4 pb-6">
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80"
                aria-label={memberUi.previous}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{memberUi.previous}</span>
              </Button>

              <span className="min-w-[92px] text-center text-sm text-foreground/70">
                {memberUi.pageLabel} {currentPage} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-3 !bg-input/60 backdrop-blur-sm !border-border/50 hover:!bg-input/80"
                aria-label={memberUi.next}
              >
                <span className="hidden sm:inline">{memberUi.next}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default GuildMembers;

