import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { CommitmentStatus } from '@/components/CommitmentToggle';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildOverviewSurface, GuildWorkspaceShell, type OverviewWishSummary } from '@/components/guild';
import { ActivePollWidget } from '@/components/polls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { getGuildRosterPath } from '@/lib/guildSlug';
import { resolveSpecOrder } from '@/lib/wishOrder';

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  activeSeasonId?: string | null;
}

const mapDbStatusToCommitment = (status?: string | null): CommitmentStatus => {
  const statusMap: Record<string, CommitmentStatus> = {
    confirmed: 'confirmed',
    potential: 'undecided',
    withdrawn: 'withdrawn',
  };

  return statusMap[status || ''] || 'undecided';
};

const Overview = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin: isGlobalAdmin, loading: adminLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(false);
  const [commitmentStatus, setCommitmentStatus] = useState<CommitmentStatus>('undecided');
  const [myWishes, setMyWishes] = useState<OverviewWishSummary[]>([]);
  const [defaultRoster, setDefaultRoster] = useState<RosterData | null>(null);
  
  // Admin read-only mode (global admin viewing guild without membership)
  const [isAdminReadOnly, setIsAdminReadOnly] = useState(false);
  
  // Mini stats
  const [totalMembers, setTotalMembers] = useState(0);
  const [confirmedMembers, setConfirmedMembers] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    // Wait for admin check to complete
    if (adminLoading) return;

    const fetchData = async () => {
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

      const foundGuildId = matchedGuild.id;
      setGuildId(foundGuildId);
      setGuild({
        name: matchedGuild.name,
        server: matchedGuild.server,
        region: matchedGuild.region || 'eu',
        faction: matchedGuild.faction,
        avatar_url: matchedGuild.avatar_url,
      });

      // Check membership and get status
      const { data: memberData, error: memberError } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Track admin read-only mode locally to avoid stale closure
      let adminReadOnly = false;
      let defaultRosterForStats: RosterData | null = null;

      // If not a member but is global admin, allow read-only access
      if (memberError || !memberData) {
        if (isGlobalAdmin) {
          adminReadOnly = true;
          setIsAdminReadOnly(true);
          setCommitmentStatus('undecided');
        } else {
          navigate('/guilds');
          return;
        }
      } else {
        setCommitmentStatus(mapDbStatusToCommitment(memberData.status));
      }

      // Check if user is GM (or global admin for settings access)
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: foundGuildId,
        p_user_id: user.id,
      });
      setIsGM(!!gmCheck);

      // Check settings permissions (global admins always have view access)
      const { data: settingsPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasSettingsPermission(!!gmCheck || !!settingsPerm || isGlobalAdmin);

      // Get default roster
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('id, name, is_default')
        .eq('guild_id', foundGuildId)
        .eq('is_default', true)
        .single();

      // Only fetch user's wishes if they are a member (not admin read-only)
      if (rostersData && !adminReadOnly) {
        const { data: activeSeason } = await supabase
          .from('roster_wish_seasons')
          .select('id')
          .eq('guild_id', foundGuildId)
          .eq('roster_id', rostersData.id)
          .eq('state', 'active')
          .order('activated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setDefaultRoster({
          ...rostersData,
          activeSeasonId: activeSeason?.id || null,
        });
        defaultRosterForStats = {
          ...rostersData,
          activeSeasonId: activeSeason?.id || null,
        };

        if (!activeSeason) {
          setMyWishes([]);
        } else {
          const { data: intentData } = await supabase
            .from('guild_season_member_intents')
            .select('commitment_status')
            .eq('guild_id', foundGuildId)
            .eq('roster_id', rostersData.id)
            .eq('season_id', activeSeason.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setCommitmentStatus(mapDbStatusToCommitment(intentData?.commitment_status));

          // Fetch my wishes for the active season of the default roster.
          const { data: wishesData } = await supabase
            .from('class_wishes')
            .select('choice_index, class_id, spec_ids, spec_order, validation_status')
            .eq('guild_id', foundGuildId)
            .eq('user_id', user.id)
            .eq('roster_id', rostersData.id)
            .eq('season_id', activeSeason.id)
            .order('choice_index');

          if (wishesData) {
            const uniqueWishes = new Map<number, OverviewWishSummary>();

            for (const wish of wishesData) {
              if (uniqueWishes.has(wish.choice_index)) continue;

              uniqueWishes.set(wish.choice_index, {
                choice_index: wish.choice_index,
                class_id: wish.class_id,
                spec_ids: resolveSpecOrder(wish.spec_ids || [], wish.spec_order),
                validation_status: wish.validation_status,
              });
            }

            setMyWishes(Array.from(uniqueWishes.values()));
          }
        }
      } else if (rostersData) {
        setDefaultRoster(rostersData);
        defaultRosterForStats = rostersData;
      }

      // Get mini stats
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId);

      if (membersData) {
        setTotalMembers(membersData.length);
        if (defaultRosterForStats?.activeSeasonId) {
          const { count: seasonConfirmedCount } = await supabase
            .from('guild_season_member_intents')
            .select('user_id', { count: 'exact', head: true })
            .eq('guild_id', foundGuildId)
            .eq('roster_id', defaultRosterForStats.id)
            .eq('season_id', defaultRosterForStats.activeSeasonId)
            .eq('commitment_status', 'confirmed');
          setConfirmedMembers(seasonConfirmedCount || 0);
        } else {
          setConfirmedMembers(membersData.filter(m => m.status === 'confirmed').length);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, navigate, adminLoading, isGlobalAdmin]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const statusLabel = t.wishes.commitment[commitmentStatus];
  const greetingName = user?.user_metadata?.username;

  if (!guild) return null;

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={hasSettingsPermission}
      activeTab="overview"
      context={{
        roster: defaultRoster?.name,
        status: statusLabel,
      }}
    >
      <GuildOverviewSurface
        guild={guild}
        greetingName={greetingName}
        commitmentStatus={commitmentStatus}
        myWishes={myWishes}
        totalMembers={totalMembers}
        confirmedMembers={confirmedMembers}
        isAdminReadOnly={isAdminReadOnly}
        pollWidget={guildId && guild ? (
          <ActivePollWidget
            guildId={guildId}
            guildSlug={`${regionSlug}/${serverSlug}/${guildSlug}`}
            isGM={isGM}
          />
        ) : null}
        onEditWishes={() => {
          const params = new URLSearchParams();
          if (defaultRoster?.id) params.set('rosterId', defaultRoster.id);
          if (defaultRoster?.activeSeasonId) params.set('seasonId', defaultRoster.activeSeasonId);
          params.set('edit', 'my-wishes');
          const query = params.toString();
          navigate(`${getGuildRosterPath(guild.region, guild.server, guild.name)}${query ? `?${query}` : ''}`);
        }}
        onOpenRoster={() => navigate(`${basePath}/roster`)}
        onOpenMembers={() => navigate(`${basePath}/members`)}
      />
    </GuildWorkspaceShell>
  );
};

export default Overview;
