import { ArrowLeft, BarChart3, LayoutDashboard, LockKeyhole, Settings, Table, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { navItemClass } from '@/lib/nav-styles';
import { cn } from '@/lib/utils';

interface GuildSubNavProps {
  guild: {
    name: string;
    server: string;
    region: string;
    avatar_url?: string | null;
  };
  guildId?: string | null;
  basePath: string;
  isGM: boolean;
  hasSettingsPermission?: boolean;
  hasVaultAccess?: boolean;
  activeTab: 'overview' | 'roster' | 'polls' | 'settings' | 'members' | 'wishes' | 'dashboard' | 'vault';
}

export const GuildSubNav = ({
  guild,
  guildId = null,
  basePath,
  isGM,
  hasSettingsPermission = false,
  hasVaultAccess,
  activeTab,
}: GuildSubNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id;
  const { t } = useLanguage();
  const [subNavTop, setSubNavTop] = useState<number>(64);
  const [resolvedSettingsPermission, setResolvedSettingsPermission] = useState(Boolean(hasSettingsPermission));
  const [resolvedVaultAccess, setResolvedVaultAccess] = useState(Boolean(hasVaultAccess));

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const globalNav = document.querySelector<HTMLElement>('[data-global-nav]');
        if (!globalNav) return;

        const nextTop = Math.max(0, Math.round(globalNav.offsetHeight));
        setSubNavTop((prev) => (prev === nextTop ? prev : nextTop));
      });
    };

    compute();
    window.addEventListener('resize', compute);

    const ro = new ResizeObserver(compute);
    const globalNavEl = document.querySelector<HTMLElement>('[data-global-nav]');
    if (globalNavEl) ro.observe(globalNavEl);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  // Settings is shown if user is GM OR has any settings permission
  const showSettings = isGM || resolvedSettingsPermission;
  const showVault = isGM || resolvedVaultAccess;

  useEffect(() => {
    if (typeof hasSettingsPermission === 'boolean' && hasSettingsPermission) {
      setResolvedSettingsPermission(true);
      return;
    }

    if (isGM) {
      setResolvedSettingsPermission(true);
      return;
    }

    if (!guildId || !userId) {
      setResolvedSettingsPermission(false);
      return;
    }

    let cancelled = false;

    Promise.all([
      supabase.rpc('has_guild_permission', {
        p_guild_id: guildId,
        p_permission: 'manage_rosters',
        p_user_id: userId,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: guildId,
        p_permission: 'view_activity_log',
        p_user_id: userId,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: guildId,
        p_permission: 'manage_vault',
        p_user_id: userId,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: guildId,
        p_permission: 'view_vault_audit',
        p_user_id: userId,
      }),
    ])
      .then(([rostersResult, activityResult, manageVaultResult, viewVaultAuditResult]) => {
        if (!cancelled) {
          setResolvedSettingsPermission(
            Boolean(
              rostersResult.data ||
                activityResult.data ||
                manageVaultResult.data ||
                viewVaultAuditResult.data,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedSettingsPermission(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guildId, hasSettingsPermission, isGM, userId]);

  useEffect(() => {
    if (typeof hasVaultAccess === 'boolean') {
      setResolvedVaultAccess(hasVaultAccess);
      return;
    }

    if (isGM) {
      setResolvedVaultAccess(true);
      return;
    }

    if (!guildId || !userId) {
      setResolvedVaultAccess(false);
      return;
    }

    let cancelled = false;

    supabase
      .rpc('has_any_guild_secret_access', {
        p_guild_id: guildId,
        p_user_id: userId,
      })
      .then(({ data }) => {
        if (!cancelled) {
          setResolvedVaultAccess(Boolean(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedVaultAccess(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guildId, hasVaultAccess, isGM, userId]);

  // Map legacy activeTab values
  const normalizedActiveTab = activeTab === 'dashboard' ? 'overview' : activeTab;

  const tabs = [
    {
      id: 'overview' as const,
      label: t.dashboard.overview,
      icon: LayoutDashboard,
      path: basePath,
      show: true,
    },
    {
      id: 'roster' as const,
      label: t.guildNav.wishesTable,
      icon: Table,
      path: `${basePath}/roster`,
      show: true,
    },
    {
      id: 'polls' as const,
      label: t.guildNav.polls,
      icon: BarChart3,
      path: `${basePath}/polls`,
      show: true,
    },
    {
      id: 'members' as const,
      label: t.guild.members,
      icon: Users,
      path: `${basePath}/members`,
      show: true,
    },
    {
      id: 'vault' as const,
      label: t.guildNav.vault,
      icon: LockKeyhole,
      path: `${basePath}/vault`,
      show: showVault,
    },
    {
      id: 'settings' as const,
      label: t.guildNav.settings,
      icon: Settings,
      path: `${basePath}/settings`,
      show: showSettings,
    },
  ];

  const visibleTabs = tabs.filter(tab => tab.show);

  // Determine fallback based on current page
  const getFallbackPath = () => {
    // If on wishes page, fallback to roster
    if (activeTab === 'wishes') {
      return `${basePath}/roster`;
    }
    // If on a subpage of the guild, fallback to overview
    if (location.pathname !== basePath && location.pathname.startsWith(basePath)) {
      return basePath;
    }
    // Otherwise, go to guilds list
    return '/guilds';
  };

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(getFallbackPath());
    }
  };

  return (
    <div data-guild-subnav className="sticky z-40 bg-background/80 backdrop-blur-lg border-b border-border/50 w-full" style={{ top: subNavTop }}>
      <PageContainer className="max-w-full overflow-hidden px-3 md:px-4" width="wide">
        <div className="flex items-center gap-2 py-2">
          {/* Back button - uses browser history or fallback */}
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title={t.common.back}
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Guild avatar + name */}
          <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[120px] md:max-w-none">
            {guild.avatar_url && (
              <Avatar className="h-6 w-6 md:h-7 md:w-7 border border-border/50 shrink-0">
                <AvatarImage src={guild.avatar_url} alt={guild.name} />
                <AvatarFallback className="text-[10px] md:text-xs">{guild.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <span className="font-semibold text-sm md:text-base text-foreground truncate">
              {guild.name}
            </span>
          </div>

          {/* Navigation tabs - icons only on mobile, icons + text on desktop */}
          <nav className="flex items-center gap-0.5 md:gap-1 ml-auto overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = normalizedActiveTab === tab.id || (activeTab === 'wishes' && tab.id === 'roster');

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={cn(navItemClass({ active: isActive, size: 'guild' }), 'shrink-0')}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </PageContainer>
    </div>
  );
};
