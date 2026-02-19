import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { navItemClass } from '@/lib/nav-styles';
import { LayoutDashboard, Table, BarChart3, Settings, ArrowLeft, Users } from 'lucide-react';

interface GuildSubNavProps {
  guild: {
    name: string;
    server: string;
    region: string;
    avatar_url?: string | null;
  };
  basePath: string;
  isGM: boolean;
  hasSettingsPermission?: boolean;
  activeTab: 'overview' | 'roster' | 'polls' | 'settings' | 'members' | 'wishes' | 'dashboard';
}

export const GuildSubNav = ({
  guild,
  basePath,
  isGM,
  hasSettingsPermission = false,
  activeTab,
}: GuildSubNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [subNavTop, setSubNavTop] = useState<number>(64);

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
  const showSettings = isGM || hasSettingsPermission;

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
