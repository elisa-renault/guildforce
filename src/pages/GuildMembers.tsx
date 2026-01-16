import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GuildSubNav } from '@/components/guild/GuildSubNav';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CosmicBackground } from '@/components/CosmicBackground';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Crown, Shield, Search, Users, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { wowClasses } from '@/data/wowClasses';
import { BATTLENET_CLASS_MAP } from '@/data/battlenetClasses';

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
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface GuildInfo {
  id: string;
  name: string;
  server: string;
  region: string;
  avatar_url: string | null;
  officer_rank_threshold: number;
}

const GuildMembers = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGM, setIsGM] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [guildforceFilter, setGuildforceFilter] = useState<string>('all');
  const [hasRosterCache, setHasRosterCache] = useState(false);

  const { hasPermission: hasActivityPermission } = useHasGuildPermission(guild?.id || null, 'view_activity_log');

  // Get unique ranks for filter
  const uniqueRanks = Array.from(
    new Map(members.map(m => [m.rank_index, { index: m.rank_index, name: m.rank_name }])).values()
  ).sort((a, b) => a.index - b.index);

  // Get class color from Battle.net class ID
  const getClassColor = (battlenetClassId: number): string => {
    const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
    if (!classKey) return 'hsl(var(--muted-foreground))';
    const wowClass = wowClasses.find(c => c.id === classKey);
    return wowClass?.color || 'hsl(var(--muted-foreground))';
  };

  const getClassName = (battlenetClassId: number): string => {
    const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
    if (!classKey) return 'Unknown';
    const wowClass = wowClasses.find(c => c.id === classKey);
    if (!wowClass) return 'Unknown';
    // wowClass.name is an object with { en, fr } keys
    const name = wowClass.name as unknown as { en: string; fr: string };
    return name[language] || name.en || 'Unknown';
  };

  useEffect(() => {
    const loadData = async () => {
      if (!regionSlug || !serverSlug || !guildSlug || !user) {
        setLoading(false);
        return;
      }

      try {
        // Get guild info using ilike matching on slugs
        const { data: guildData, error: guildError } = await supabase
          .from('guilds')
          .select('id, name, server, region, avatar_url, officer_rank_threshold')
          .ilike('region', regionSlug)
          .ilike('server', serverSlug.replace(/-/g, '%'))
          .ilike('name', guildSlug.replace(/-/g, '%'))
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

        // First try to get from roster cache (full guild roster)
        const { data: rosterCache, error: rosterError } = await supabase
          .from('guild_roster_cache')
          .select('*')
          .eq('guild_id', guildData.id)
          .order('rank_index', { ascending: true });

        if (!rosterError && rosterCache && rosterCache.length > 0) {
          setHasRosterCache(true);
          
          // Get profiles for matched users
          const userIds = rosterCache
            .filter(m => m.matched_user_id)
            .map(m => m.matched_user_id as string);
          
          let profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            profiles?.forEach(p => {
              profilesMap[p.id] = p;
            });
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
            console.error('Error loading WoW members:', wowError);
            return;
          }

          // Get profiles for all user_ids
          const userIds = [...new Set(wowMembers?.map(m => m.user_id) || [])];
          
          let profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};
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
            const char = m.wow_characters as any;
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
      } catch (error) {
        console.error('Error loading guild members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [regionSlug, serverSlug, guildSlug, user, navigate]);

  // Filter members
  const filteredMembers = members.filter(member => {
    // Search filter
    const characterName = member.character_name?.toLowerCase() || '';
    const username = member.profile?.username?.toLowerCase() || '';
    const searchLower = searchQuery.toLowerCase();
    
    if (searchQuery && !characterName.includes(searchLower) && !username.includes(searchLower)) {
      return false;
    }

    // Rank filter
    if (rankFilter !== 'all' && member.rank_index !== parseInt(rankFilter)) {
      return false;
    }

    // Guildforce filter
    if (guildforceFilter === 'guildforce' && !member.matched_user_id) {
      return false;
    }
    if (guildforceFilter === 'not-guildforce' && member.matched_user_id) {
      return false;
    }

    return true;
  });

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  const breadcrumbItems = [
    { label: language === 'fr' ? 'Guildes' : 'Guilds', href: '/guilds' },
    { label: guild?.name || '...', href: basePath },
    { label: language === 'fr' ? 'Membres' : 'Members' },
  ];

  if (loading) {
    return (
      <div className="flex-1 relative">
        <CosmicBackground />
        <div className="container mx-auto px-4 pt-20 pb-8">
          <Skeleton className="h-12 w-1/3 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!guild) return null;

  const guildforceCount = members.filter(m => m.matched_user_id).length;
  const notOnGuildforceCount = members.filter(m => !m.matched_user_id).length;

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <GuildSubNav
        guild={guild}
        basePath={basePath}
        isGM={isGM}
        hasActivityPermission={hasActivityPermission}
        activeTab="members"
      />

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">
              {language === 'fr' ? 'Membres de la guilde' : 'Guild Members'}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </div>
          
          {!hasRosterCache && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>
                {language === 'fr' 
                  ? 'Sync Battle.net pour voir tous les membres' 
                  : 'Sync Battle.net to see all members'}
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher un personnage ou joueur...' : 'Search character or player...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          
          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
              <SelectValue placeholder={language === 'fr' ? 'Tous les rangs' : 'All ranks'} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">
                {language === 'fr' ? 'Tous les rangs' : 'All ranks'}
              </SelectItem>
              {uniqueRanks.map((rank) => (
                <SelectItem key={rank.index} value={rank.index.toString()}>
                  {rank.name || `Rank ${rank.index}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={guildforceFilter} onValueChange={setGuildforceFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">
                {language === 'fr' ? 'Tous' : 'All'}
              </SelectItem>
              <SelectItem value="guildforce">
                {language === 'fr' ? 'Sur Guildforce' : 'On Guildforce'}
              </SelectItem>
              <SelectItem value="not-guildforce">
                {language === 'fr' ? 'Pas sur Guildforce' : 'Not on Guildforce'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats summary */}
        <div className="flex flex-wrap gap-2 mb-4 text-sm text-muted-foreground">
          <span>
            {filteredMembers.length} {language === 'fr' ? 'affichés' : 'shown'}
          </span>
          <span>•</span>
          <span className="text-healer">
            {guildforceCount} {language === 'fr' ? 'sur Guildforce' : 'on Guildforce'}
          </span>
          <span>•</span>
          <span className="text-muted-foreground">
            {notOnGuildforceCount} {language === 'fr' ? 'non inscrits' : 'not registered'}
          </span>
        </div>

        {/* Members table */}
        <div className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{language === 'fr' ? 'Personnage' : 'Character'}</TableHead>
                <TableHead className="hidden md:table-cell">{language === 'fr' ? 'Classe' : 'Class'}</TableHead>
                <TableHead>{language === 'fr' ? 'Joueur' : 'Player'}</TableHead>
                <TableHead>{language === 'fr' ? 'Rang' : 'Rank'}</TableHead>
                <TableHead className="text-center">Guildforce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {language === 'fr' ? 'Aucun membre trouvé' : 'No members found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member, index) => (
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
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.is_guild_master && (
                          <Crown className="h-4 w-4 text-amber-400" />
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
                          member.is_guild_master && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                          !member.is_guild_master && member.rank_index <= (guild?.officer_rank_threshold ?? 2) && "bg-primary/20 text-primary border-primary/30"
                        )}
                      >
                        {member.rank_name || `Rank ${member.rank_index}`}
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
      </main>
    </div>
  );
};

export default GuildMembers;