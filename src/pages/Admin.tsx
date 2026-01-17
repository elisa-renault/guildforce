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
import { AdminForumSection } from '@/components/admin/AdminForumSection';
import { AdminDocumentation } from '@/components/admin/AdminDocumentation';
import { Crown, Loader2 } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalGuilds: number;
  totalTopics: number;
  totalPosts: number;
  pendingReports: number;
  activeSanctions: number;
  openBugs: number;
  pendingDeletions: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isModerator, loading: rolesLoading } = useAdminRoles();
  const [stats, setStats] = useState<AdminStats | null>(null);
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
        const [
          { count: usersCount },
          { count: guildsCount },
          { count: topicsCount },
          { count: postsCount },
          { count: reportsCount },
          { count: sanctionsCount },
          { count: bugsCount },
          { count: deletionsCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('guilds').select('*', { count: 'exact', head: true }),
          supabase.from('forum_topics').select('*', { count: 'exact', head: true }),
          supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
          supabase.from('forum_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('forum_user_sanctions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('account_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        setStats({
          totalUsers: usersCount || 0,
          totalGuilds: guildsCount || 0,
          totalTopics: topicsCount || 0,
          totalPosts: postsCount || 0,
          pendingReports: reportsCount || 0,
          activeSanctions: sanctionsCount || 0,
          openBugs: bugsCount || 0,
          pendingDeletions: deletionsCount || 0
        });
      } catch (error) {
        log.error('Error fetching admin stats:', error);
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
      <div className="flex-1 flex items-center justify-center pt-16">
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
      
      case 'forum':
        return <AdminForumSection />;
      
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
    <div className="flex-1 relative pt-16 flex flex-col">
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
            <div className="container max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 ring-1 ring-primary/50">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                <h1 className="text-2xl md:text-3xl font-display text-foreground">
                  {t.admin.administration}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? t.admin.adminDashboard : t.admin.moderatorDashboard}
                </p>
              </div>
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="p-4 md:p-6 md:max-w-5xl">
            {renderSectionContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
