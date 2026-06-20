import {
  BarChart3,
  Compass,
  Crown,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Table,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { CosmicBackground } from '@/components/CosmicBackground';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { navItemClass } from '@/lib/nav-styles';
import { cn } from '@/lib/utils';

export type GuildWorkspaceTab = 'overview' | 'roster' | 'polls' | 'members' | 'atlas' | 'vault' | 'settings' | 'wishes' | 'dashboard';

export interface GuildWorkspaceContext {
  roster?: ReactNode;
  season?: ReactNode;
  status?: ReactNode;
}

export interface GuildWorkspaceShellProps {
  guild: {
    name: string;
    server: string;
    region: string;
    avatar_url?: string | null;
  };
  guildId?: string | null;
  basePath: string;
  activeTab: GuildWorkspaceTab;
  isGM: boolean;
  hasSettingsPermission?: boolean;
  hasVaultAccess?: boolean;
  context?: GuildWorkspaceContext;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface GuildWorkspaceNavItem {
  id: Exclude<GuildWorkspaceTab, 'wishes' | 'dashboard'>;
  label: string;
  icon: LucideIcon;
  path: string;
  show: boolean;
}

const DESKTOP_NAV_HEIGHT = 'calc(3.5rem + var(--global-nav-extra-offset,0px))';

const normalizeTab = (tab: GuildWorkspaceTab): GuildWorkspaceNavItem['id'] => {
  if (tab === 'dashboard') return 'overview';
  if (tab === 'wishes') return 'roster';
  return tab;
};

export const GuildWorkspaceShell = ({
  guild,
  guildId = null,
  basePath,
  activeTab,
  isGM,
  hasSettingsPermission = false,
  hasVaultAccess,
  toolbar,
  children,
  className,
}: GuildWorkspaceShellProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('guildforce:guild-sidebar-collapsed') === 'true';
  });
  const [resolvedSettingsPermission, setResolvedSettingsPermission] = useState(Boolean(hasSettingsPermission));
  const [resolvedVaultAccess, setResolvedVaultAccess] = useState(Boolean(hasVaultAccess));
  const userId = user?.id;
  const normalizedActiveTab = normalizeTab(activeTab);

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
        p_permission: 'manage_wishes',
        p_user_id: userId,
      }),
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
      .then(([wishesResult, rostersResult, activityResult, manageVaultResult, viewVaultAuditResult]) => {
        if (cancelled) return;

        setResolvedSettingsPermission(
          Boolean(
            wishesResult.data ||
              rostersResult.data ||
              activityResult.data ||
              manageVaultResult.data ||
              viewVaultAuditResult.data,
          ),
        );
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

  const showSettings = isGM || resolvedSettingsPermission;
  const showVault = isGM || resolvedVaultAccess;
  const guildLocation = [guild.server, guild.region?.toUpperCase()].filter(Boolean).join(' • ');
  const sidebarWidth = sidebarCollapsed ? 64 : 248;
  const navItems: GuildWorkspaceNavItem[] = [
    { id: 'overview', label: t.dashboard.overview, icon: LayoutDashboard, path: basePath, show: true },
    { id: 'roster', label: t.guildNav.wishesTable, icon: Table, path: `${basePath}/roster`, show: true },
    { id: 'polls', label: t.guildNav.polls, icon: BarChart3, path: `${basePath}/polls`, show: true },
    { id: 'members', label: t.guild.members, icon: Users, path: `${basePath}/members`, show: true },
    { id: 'atlas', label: t.guildNav.atlas, icon: Compass, path: `${basePath}/atlas`, show: true },
    { id: 'vault', label: t.guildNav.vault, icon: LockKeyhole, path: `${basePath}/vault`, show: showVault },
    { id: 'settings', label: t.guildNav.settings, icon: Settings, path: `${basePath}/settings`, show: showSettings },
  ];
  const visibleNavItems = navItems.filter((item) => item.show);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('guildforce:guild-sidebar-collapsed', String(next));
      return next;
    });
  };

  const expandedIdentity = (
    <div className="px-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar className="h-9 w-9 shrink-0 border border-border/45 bg-muted/30">
          {guild.avatar_url ? <AvatarImage src={guild.avatar_url} alt={guild.name} /> : null}
          <AvatarFallback className="text-sm font-semibold">{guild.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{guild.name}</p>
            {isGM ? (
              <Badge variant="outline" className="h-5 shrink-0 gap-1 border-warning/35 bg-warning/10 px-1.5 text-[10px] text-warning">
                <Crown className="h-3 w-3" />
                GM
              </Badge>
            ) : null}
          </div>
          {guildLocation ? <p className="truncate text-xs text-muted-foreground">{guildLocation}</p> : null}
        </div>
      </div>

    </div>
  );

  const expandedNavigation = (
    <nav className="flex flex-col gap-0.5" aria-label={guild.name}>
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = normalizedActiveTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavigate(item.path)}
            className={cn(
              navItemClass({
                active,
                hover: 'accent',
                fullWidth: true,
                justifyStart: true,
                className: 'h-9 rounded px-2.5 text-sm font-medium',
              }),
              active && 'relative border-l-2 border-primary bg-primary/10 pl-2 text-foreground ring-0',
            )}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const collapsedRail = (
    <div className="sticky flex h-[calc(100dvh-3.5rem-var(--global-nav-extra-offset,0px))] flex-col items-center gap-3 px-2 py-3" style={{ top: DESKTOP_NAV_HEIGHT }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => handleNavigate(basePath)}
            className="grid h-10 w-10 place-items-center rounded bg-transparent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={guild.name}
          >
            <Avatar className="h-9 w-9 border border-border/50 bg-muted/30">
              {guild.avatar_url ? <AvatarImage src={guild.avatar_url} alt={guild.name} /> : null}
              <AvatarFallback className="text-sm font-semibold">{guild.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-0.5">
            <p className="font-medium">{guild.name}</p>
            {guildLocation ? <p className="text-xs text-muted-foreground">{guildLocation}</p> : null}
          </div>
        </TooltipContent>
      </Tooltip>

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1.5" aria-label={guild.name}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = normalizedActiveTab === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'relative grid h-9 w-9 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active && 'bg-primary/10 text-foreground ring-1 ring-primary/25',
                  )}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {active ? <span className="absolute left-0 top-2 h-5 w-0.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded border border-border/35 bg-card/15 text-muted-foreground hover:bg-accent/15 hover:text-foreground"
            onClick={toggleSidebar}
            aria-label="Déployer la navigation"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Déployer la navigation</TooltipContent>
      </Tooltip>
    </div>
  );

  const expandedCollapseControl = (
    <div className="border-t border-border/35 pt-2">
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full justify-start gap-2 rounded px-2.5 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground"
        onClick={toggleSidebar}
        aria-label="Réduire la navigation"
      >
        <PanelLeftClose className="h-4 w-4 shrink-0" />
        <span>Réduire</span>
      </Button>
    </div>
  );

  return (
    <div
      className={cn('relative flex-1 pt-[calc(3.5rem+var(--global-nav-extra-offset,0px))]', className)}
      style={{ ['--guild-sidebar-width' as string]: `${sidebarWidth}px` }}
    >
      <CosmicBackground />

      <div className="relative z-10 min-h-[calc(100dvh-3.5rem-var(--global-nav-extra-offset,0px))] lg:grid lg:grid-cols-[var(--guild-sidebar-width)_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/35 bg-background/88 lg:block">
          {sidebarCollapsed ? (
            collapsedRail
          ) : (
            <div className="sticky flex h-[calc(100dvh-3.5rem-var(--global-nav-extra-offset,0px))] flex-col gap-2.5 p-2.5" style={{ top: DESKTOP_NAV_HEIGHT }}>
              {expandedIdentity}
              <div className="min-h-0 flex-1 overflow-y-auto px-1">
                {expandedNavigation}
              </div>
              {expandedCollapseControl}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div data-guild-workspace-topbar className="sticky z-40 border-b border-border/35 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 lg:hidden" style={{ top: DESKTOP_NAV_HEIGHT }}>
            <div className="flex min-h-14 items-center gap-3 px-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Navigation">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(22rem,calc(100vw-2rem))] border-border/45 bg-background/95 p-0 backdrop-blur-xl">
                  <div className="flex h-full min-h-0 flex-col p-2.5">
                    <div className="px-2 py-2 pr-12">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="h-9 w-9 shrink-0 border border-border/50 bg-muted/30">
                          {guild.avatar_url ? <AvatarImage src={guild.avatar_url} alt={guild.name} /> : null}
                          <AvatarFallback className="text-sm font-semibold">{guild.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{guild.name}</p>
                            {isGM ? (
                              <Badge variant="outline" className="h-5 shrink-0 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary">
                                GM
                              </Badge>
                            ) : null}
                          </div>
                          {guildLocation ? <p className="truncate text-xs text-muted-foreground">{guildLocation}</p> : null}
                        </div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-1 pt-1">
                      <nav className="flex flex-col gap-0.5" aria-label={guild.name}>
                        {visibleNavItems.map((item) => {
                          const Icon = item.icon;
                          const active = normalizedActiveTab === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNavigate(item.path)}
                              className={cn(
                                navItemClass({
                                  active,
                                  hover: 'accent',
                                  fullWidth: true,
                                  justifyStart: true,
                                  className: 'h-9 rounded px-2.5 text-sm font-medium',
                                }),
                                active && 'relative border-l-2 border-primary bg-primary/10 pl-2 text-foreground ring-0',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{guild.name}</p>
                  {isGM ? (
                    <Badge variant="outline" className="h-5 shrink-0 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary">
                      GM
                    </Badge>
                  ) : null}
                </div>
                {guildLocation ? <p className="truncate text-xs text-muted-foreground">{guildLocation}</p> : null}
              </div>
            </div>
          </div>

          {toolbar ? (
            <div
              data-guild-workspace-toolbar
              className="sticky top-[calc(7rem+var(--global-nav-extra-offset,0px))] z-30 border-b border-border/35 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/88 lg:top-[calc(3.5rem+var(--global-nav-extra-offset,0px))]"
            >
              {toolbar}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
