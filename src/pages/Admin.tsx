import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import log from '@/lib/logger';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRoles } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildManager } from '@/components/admin/GuildManager';
import { UserManager } from '@/components/admin/UserManager';
import { LegalPagesEditor } from '@/components/admin/LegalPagesEditor';
import { PatchNotesEditor } from '@/components/admin/PatchNotesEditor';
import { BugReportsManager } from '@/components/admin/BugReportsManager';
import { DeletionRequestsManager } from '@/components/admin/DeletionRequestsManager';
import { AdminSettingsSidebar, AdminSection } from '@/components/admin/AdminSettingsSidebar';
import { AdminDashboardSection } from '@/components/admin/AdminDashboardSection';
import { AdminPermissionsManager } from '@/components/admin/AdminPermissionsManager';
import { AdminDocumentation } from '@/components/admin/AdminDocumentation';
import { AdminBackupSection } from '@/components/admin/AdminBackupSection';
import { mapAdminTimeseriesRows, type AdminTimeseriesPoint } from '@/components/admin/adminDashboardTimeseries';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Crown, Loader2 } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalGuilds: number;
  openBugs: number;
  pendingDeletions: number;
  uniqueWishUsers: number;
  totalWishes: number;
  guildsWithWishes: number;
  guildsWithRosterWishes: number;
  guildEngagementRate: number;
  guildsWithTwoMembers: number;
  guildsWithTwoWishUsers: number;
  totalPolls: number;
  activePolls: number;
  closedPolls: number;
  pollVoters: number;
  dauUsers: number;
  wauUsers: number;
  mauUsers: number;
  wauMauRatio: number | null;
  dauDeltaPct: number | null;
  wauDeltaPct: number | null;
  mauDeltaPct: number | null;
  activeUsers30d: number;
  activeUsers30dDeltaPct: number | null;
  activeGuilds30d: number;
  activeGuilds30dDeltaPct: number | null;
  retentionD7Pct: number | null;
  retentionD30Pct: number | null;
  newSignups7d: number;
  activationRate7dPct: number | null;
}

const toNullableFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ADMIN_TIMESERIES_DAYS = 84;

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isModerator, loading: rolesLoading } = useAdminRoles();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeseries, setTimeseries] = useState<AdminTimeseriesPoint[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    const section = searchParams.get('section') as AdminSection;
    return section || 'dashboard';
  });
  
  const isMobile = useIsMobile();
  const [mobileTabsHeight, setMobileTabsHeight] = useState<number>(48);
  const mobileTabsRef = useRef<HTMLDivElement>(null);

  // Calculate mobile tabs height for spacer
  useLayoutEffect(() => {
    if (!isMobile) return;

    const compute = () => {
      if (mobileTabsRef.current) {
        setMobileTabsHeight(mobileTabsRef.current.offsetHeight);
      }
    };

    requestAnimationFrame(compute);
    
    const ro = new ResizeObserver(compute);
    if (mobileTabsRef.current) ro.observe(mobileTabsRef.current);

    return () => ro.disconnect();
  }, [isMobile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!rolesLoading && !isModerator && user) {
      navigate('/');
    }
  }, [isModerator, rolesLoading, user, navigate]);

  useEffect(() => {
    async function fetchStats() {
      if (!isModerator) return;
      
      try {
        const [{ data, error }, { data: timeseriesData, error: timeseriesError }] = await Promise.all([
          supabase.rpc('get_admin_dashboard_stats'),
          supabase.rpc('get_admin_dashboard_timeseries', { p_days: ADMIN_TIMESERIES_DAYS }),
        ]);
        if (error) throw error;
        if (timeseriesError) throw timeseriesError;
        const statsRow = Array.isArray(data) ? data[0] : data;
        if (!statsRow) throw new Error('Missing admin dashboard stats');
        setTimeseries(mapAdminTimeseriesRows(timeseriesData));

        setStats({
          totalUsers: statsRow?.total_users ?? 0,
          totalGuilds: statsRow?.total_guilds ?? 0,
          openBugs: statsRow?.open_bugs ?? 0,
          pendingDeletions: statsRow?.pending_deletions ?? 0,
          uniqueWishUsers: statsRow?.unique_wish_users ?? 0,
          totalWishes: statsRow?.total_wishes ?? 0,
          guildsWithWishes: statsRow?.guilds_with_wishes ?? 0,
          guildsWithRosterWishes: statsRow?.guilds_with_roster_wishes ?? 0,
          guildEngagementRate: statsRow?.guild_engagement_rate ?? 0,
          guildsWithTwoMembers: statsRow?.guilds_with_two_members ?? 0,
          guildsWithTwoWishUsers: statsRow?.guilds_with_two_wish_users ?? 0,
          totalPolls: statsRow?.total_polls ?? 0,
          activePolls: statsRow?.active_polls ?? 0,
          closedPolls: statsRow?.closed_polls ?? 0,
          pollVoters: statsRow?.poll_voters ?? 0,
          dauUsers: statsRow?.dau_users ?? 0,
          wauUsers: statsRow?.wau_users ?? 0,
          mauUsers: statsRow?.mau_users ?? 0,
          wauMauRatio: toNullableFiniteNumber(statsRow?.wau_mau_ratio),
          dauDeltaPct: toNullableFiniteNumber(statsRow?.dau_delta_pct),
          wauDeltaPct: toNullableFiniteNumber(statsRow?.wau_delta_pct),
          mauDeltaPct: toNullableFiniteNumber(statsRow?.mau_delta_pct),
          activeUsers30d: statsRow?.active_users_30d ?? 0,
          activeUsers30dDeltaPct: toNullableFiniteNumber(statsRow?.active_users_30d_delta_pct),
          activeGuilds30d: statsRow?.active_guilds_30d ?? 0,
          activeGuilds30dDeltaPct: toNullableFiniteNumber(statsRow?.active_guilds_30d_delta_pct),
          retentionD7Pct: toNullableFiniteNumber(statsRow?.retention_d7_pct),
          retentionD30Pct: toNullableFiniteNumber(statsRow?.retention_d30_pct),
          newSignups7d: statsRow?.new_signups_7d ?? 0,
          activationRate7dPct: toNullableFiniteNumber(statsRow?.activation_rate_7d_pct),
        });
      } catch (error) {
        log.error('Error fetching admin stats:', error);
        try {
          const [
            { count: usersCount },
            { count: guildsCount },
            { count: bugsCount },
            { count: deletionsCount },
            { count: totalWishesCount },
            { data: wishesData },
            { data: guildMembersData },
            { count: totalPollsCount },
            { count: activePollsCount },
            { count: closedPollsCount },
            { data: pollVotersData }
          ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('guilds').select('*', { count: 'exact', head: true }),
            supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
            supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('class_wishes').select('*', { count: 'exact', head: true }),
            supabase.from('class_wishes').select('user_id, guild_id, roster_id'),
            supabase.from('guild_members').select('guild_id, user_id'),
            supabase.from('guild_polls').select('*', { count: 'exact', head: true }),
            supabase.from('guild_polls').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('guild_polls').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
            supabase.from('guild_poll_responses').select('user_id')
          ]);

          const wishesList = wishesData || [];
          const uniqueUserIds = new Set(wishesList.map(w => w.user_id).filter(Boolean));
          const uniqueGuildIds = new Set(wishesList.map(w => w.guild_id).filter(Boolean));
          const guildsWithRosterWishes = new Set(
            wishesList.filter(w => w.roster_id).map(w => w.guild_id).filter(Boolean),
          );

          const guildWishUsersMap = new Map<string, Set<string>>();
          wishesList
            .filter(w => w.roster_id && w.guild_id && w.user_id)
            .forEach(w => {
              const key = String(w.guild_id);
              if (!guildWishUsersMap.has(key)) {
                guildWishUsersMap.set(key, new Set());
              }
              guildWishUsersMap.get(key)?.add(String(w.user_id));
            });
          const guildsWithTwoWishUsers = [...guildWishUsersMap.values()].filter(set => set.size >= 2).length;

          const guildMembersList = guildMembersData || [];
          const guildMembersMap = new Map<string, Set<string>>();
          guildMembersList
            .filter(m => m.guild_id && m.user_id)
            .forEach(m => {
              const key = String(m.guild_id);
              if (!guildMembersMap.has(key)) {
                guildMembersMap.set(key, new Set());
              }
              guildMembersMap.get(key)?.add(String(m.user_id));
            });
          const guildsWithTwoMembers = [...guildMembersMap.values()].filter(set => set.size >= 2).length;

          const pollVoters = new Set((pollVotersData || []).map(r => r.user_id).filter(Boolean));
          const totalGuilds = guildsCount || 0;
          const guildEngagementRate = totalGuilds > 0
            ? Math.round((guildsWithRosterWishes.size / totalGuilds) * 100)
            : 0;

          setStats({
            totalUsers: usersCount || 0,
            totalGuilds: guildsCount || 0,
            openBugs: bugsCount || 0,
            pendingDeletions: deletionsCount || 0,
            uniqueWishUsers: uniqueUserIds.size,
            totalWishes: totalWishesCount || 0,
            guildsWithWishes: uniqueGuildIds.size,
            guildsWithRosterWishes: guildsWithRosterWishes.size,
            guildEngagementRate,
            guildsWithTwoMembers,
            guildsWithTwoWishUsers,
            totalPolls: totalPollsCount || 0,
            activePolls: activePollsCount || 0,
            closedPolls: closedPollsCount || 0,
            pollVoters: pollVoters.size,
            dauUsers: 0,
            wauUsers: 0,
            mauUsers: 0,
            wauMauRatio: null,
            dauDeltaPct: null,
            wauDeltaPct: null,
            mauDeltaPct: null,
            activeUsers30d: 0,
            activeUsers30dDeltaPct: null,
            activeGuilds30d: 0,
            activeGuilds30dDeltaPct: null,
            retentionD7Pct: null,
            retentionD30Pct: null,
            newSignups7d: 0,
            activationRate7dPct: null,
          });
          setTimeseries([]);
        } catch (legacyError) {
          log.error('Error fetching legacy admin stats:', legacyError);
          setTimeseries([]);
        }
      } finally {
        setLoadingStats(false);
      }
    }

    if (isModerator) {
      fetchStats();
    }
  }, [isModerator]);

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setSearchParams({ section });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isModerator) {
    return null;
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <AdminDashboardSection
            stats={stats}
            timeseries={timeseries}
            loading={loadingStats}
            isAdmin={isAdmin}
            onNavigateToSection={handleSectionChange}
          />
        );
      
      case 'docs':
        if (!isAdmin) return null;
        return <AdminDocumentation />;
      
      case 'users':
        if (!isAdmin) return null;
        return <UserManager />;
      
      case 'permissions':
        if (!isAdmin) return null;
        return <AdminPermissionsManager />;
      
      case 'guilds':
        if (!isAdmin) return null;
        return <GuildManager />;

      case 'backup':
        if (!isAdmin) return null;
        return <AdminBackupSection />;
      
      case 'legal':
        if (!isAdmin) return null;
        return <LegalPagesEditor />;
      
      case 'patchnotes':
        if (!isAdmin) return null;
        return <PatchNotesEditor />;
      
      case 'bugs':
        return <BugReportsManager />;
      
      case 'deletions':
        if (!isAdmin) return null;
        return <DeletionRequestsManager />;
      
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 relative flex flex-col">
      <CosmicBackground />

      {/* Layout with sidebar */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-x-hidden">
        <AdminSettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isAdmin={isAdmin}
          isModerator={isModerator}
          mobileTabsRef={mobileTabsRef}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden min-w-0">
          {/* Spacer for mobile fixed tabs */}
          {isMobile && <div style={{ height: mobileTabsHeight }} />}
          
          {/* Header */}
          <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <PageContainer className="py-4" width="app">
              <PageHeader
                icon={Crown}
                title={t.admin.administration}
                description={isAdmin ? t.admin.adminDashboard : t.admin.moderatorDashboard}
              />
            </PageContainer>
          </div>

          {/* Section content */}
          <PageContainer className="py-4 md:py-6" width="app">
            {renderSectionContent()}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
