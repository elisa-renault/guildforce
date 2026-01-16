import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
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

  // Settings is shown if user is GM OR has any settings permission
  const showSettings = isGM || hasSettingsPermission;

  // Map legacy activeTab values
  const normalizedActiveTab = activeTab === 'dashboard' ? 'overview' : activeTab;

  const tabs = [
    {
      id: 'overview' as const,
      label: t.common.loading === 'Chargement...' ? 'Aperçu' : 'Overview',
      icon: LayoutDashboard,
      path: basePath,
      show: true,
    },
    {
      id: 'roster' as const,
      label: t.common.loading === 'Chargement...' ? 'Table de vœux' : 'Wishes Table',
      icon: Table,
      path: `${basePath}/roster`,
      show: true,
    },
    {
      id: 'polls' as const,
      label: t.guildNav?.polls || 'Sondages',
      icon: BarChart3,
      path: `${basePath}/polls`,
      show: true,
    },
    {
      id: 'members' as const,
      label: t.common.loading === 'Chargement...' ? 'Membres' : 'Members',
      icon: Users,
      path: `${basePath}/members`,
      show: true,
    },
    {
      id: 'settings' as const,
      label: t.guildNav?.settings || t.common.settings,
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
    <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50 w-full">
      <div className="max-w-full overflow-hidden px-3 md:container md:mx-auto md:px-4">
        <div className="flex items-center gap-2 py-2">
          {/* Back button - uses browser history or fallback */}
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
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

          {/* Divider */}
          <div className="h-5 md:h-6 w-px bg-border/50 shrink-0 hidden md:block" />

          {/* Navigation tabs - icons only on mobile, icons + text on desktop */}
          <nav className="flex items-center gap-0.5 md:gap-1 ml-auto overflow-x-auto scrollbar-hide">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = normalizedActiveTab === tab.id || (activeTab === 'wishes' && tab.id === 'roster');

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-primary/20 text-foreground ring-1 ring-primary/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
