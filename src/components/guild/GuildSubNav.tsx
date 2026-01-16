import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Heart, BarChart3, Settings, ArrowLeft, Users } from 'lucide-react';

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
  activeTab: 'dashboard' | 'wishes' | 'polls' | 'settings' | 'members';
}

export const GuildSubNav = ({
  guild,
  basePath,
  isGM,
  hasSettingsPermission = false,
  activeTab,
}: GuildSubNavProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Settings is shown if user is GM OR has any settings permission
  const showSettings = isGM || hasSettingsPermission;

  const tabs = [
    {
      id: 'dashboard' as const,
      label: t.guildNav?.dashboard || 'Dashboard',
      icon: LayoutDashboard,
      path: basePath,
      show: true,
    },
    {
      id: 'wishes' as const,
      label: t.guildNav?.myWishes || t.wishes.title,
      icon: Heart,
      path: `${basePath}/wishes`,
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
      id: 'polls' as const,
      label: t.guildNav?.polls || 'Sondages',
      icon: BarChart3,
      path: `${basePath}/polls`,
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

  return (
    <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-3 py-2">
          {/* Back to guilds */}
          <button
            onClick={() => navigate('/guilds')}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
            title={t.common.back}
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Guild avatar + name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            {guild.avatar_url && (
              <Avatar className="h-6 w-6 md:h-7 md:w-7 border border-border/50">
                <AvatarImage src={guild.avatar_url} alt={guild.name} />
                <AvatarFallback className="text-[10px] md:text-xs">{guild.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <span className="font-semibold text-sm md:text-base text-foreground truncate max-w-[100px] md:max-w-[200px]">
              {guild.name}
            </span>
          </div>

          {/* Divider */}
          <div className="h-5 md:h-6 w-px bg-border/50 flex-shrink-0 hidden md:block" />

          {/* Navigation tabs - icons only on mobile, icons + text on desktop */}
          <nav className="flex items-center gap-0.5 md:gap-1 overflow-x-auto scrollbar-hide ml-auto md:ml-0">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
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
