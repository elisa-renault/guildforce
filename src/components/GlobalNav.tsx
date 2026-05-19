import { Crown, LogOut, MessageSquare, Settings, Undo2, User } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { CosmicButton } from '@/components/CosmicButton';
import { NotificationBell } from '@/components/forum/NotificationBell';
import { PageContainer } from '@/components/layout/PageContainer';
import { GuildSwitcher } from '@/components/navigation/GuildSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CommandPaletteTrigger } from '@/features/command-palette';
import { useIsAdmin } from '@/hooks/useAdmin';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { navItemClass } from '@/lib/nav-styles';
import { cn } from '@/lib/utils';
import { getRouteMeta } from '@/routes';

export const GlobalNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { user, profile, signOut, isImpersonating, impersonationTarget, restoreAdminSession } = useAuth();
  const { isAdmin } = useIsAdmin();
  const headerRef = useRef<HTMLElement | null>(null);
  const routeMeta = getRouteMeta(location.pathname);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const forumActive = location.pathname.startsWith('/forum');
  const menuCopy = language === 'fr'
    ? {
        account: 'Compte',
        adminTools: 'Administration',
        preferences: 'Preferences',
      }
    : {
        account: 'Account',
        adminTools: 'Admin tools',
        preferences: 'Preferences',
      };

  useLayoutEffect(() => {
    if (routeMeta?.hideGlobalNav) {
      document.documentElement.style.setProperty('--global-nav-extra-offset', '0px');
      return;
    }

    const headerEl = headerRef.current;
    if (!headerEl) return;

    const baseNavHeight = 64;
    const updateOffset = () => {
      const measuredHeight = Math.ceil(headerEl.getBoundingClientRect().height);
      const extraOffset = Math.max(measuredHeight - baseNavHeight, 0);
      document.documentElement.style.setProperty('--global-nav-extra-offset', `${extraOffset}px`);
    };

    updateOffset();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateOffset)
      : null;

    resizeObserver?.observe(headerEl);
    window.addEventListener('resize', updateOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.setProperty('--global-nav-extra-offset', '0px');
    };
  }, [routeMeta?.hideGlobalNav, isImpersonating, impersonationTarget?.username]);

  if (routeMeta?.hideGlobalNav) return null;

  const handleRestoreAdmin = async () => {
    try {
      const restorePath = await restoreAdminSession('/admin?section=users');
      navigate(restorePath);
    } catch {
      toast.error(sm('globalnav.impersonation.restore_error'));
    }
  };

  const handleSignOut = () => {
    void signOut();
  };

  const userLabel = profile?.username || profile?.battletag || t.profile.title;

  return (
    <header ref={headerRef} data-global-nav className="fixed top-0 left-0 right-0 z-50 glass-header" role="banner">
      {isImpersonating && (
        <div className="border-b border-status-warning/30 bg-status-warning/10">
          <PageContainer className="flex min-h-11 items-center justify-between gap-3 py-2" width="app">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-status-warning">
                {sm('globalnav.impersonation.badge')}
              </p>
              <p className="truncate text-sm text-foreground">
                {interpolateMessage(sm('globalnav.impersonation.banner'), {
                  username: impersonationTarget?.username || 'user',
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-status-warning/40 bg-background/70"
              onClick={handleRestoreAdmin}
            >
              <Undo2 className="mr-1.5 h-4 w-4" />
              {sm('globalnav.impersonation.return_to_admin')}
            </Button>
          </PageContainer>
        </div>
      )}

      <PageContainer className="flex h-16 items-center gap-3 md:h-[72px] md:gap-6" width="app">
        <div className="flex shrink-0 items-center gap-2.5 lg:mr-1">
          <button
            onClick={() => navigate('/')}
            className="group inline-flex shrink-0 items-center gap-2 rounded px-1 font-display text-base text-foreground/90 transition-all duration-300 hover:text-foreground hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-lg"
            aria-label={sm('globalnav.home.aria_label')}
          >
            <img
              src="/logos/logo-white.svg"
              alt=""
              className="h-5 w-5 opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.45)]"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Guildforce</span>
          </button>
          <span className="hidden rounded border border-primary/35 bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground sm:inline-flex">
            Alpha
          </span>
        </div>

        {user ? (
          <>
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4 lg:gap-6">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <GuildSwitcher className="max-w-[196px] sm:max-w-[280px] lg:max-w-[340px]" />
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className={cn(
                  navItemClass({
                    active: forumActive,
                    hover: 'accent',
                    className: 'hidden h-10 bg-transparent px-3 text-muted-foreground/90 lg:inline-flex',
                  }),
                )}
                aria-current={forumActive ? 'page' : undefined}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{t.forum.title}</span>
              </button>
            </div>

            <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              <CommandPaletteTrigger />
            </div>
          </div>
          </>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 rounded-xl bg-card/10 px-2 py-1.5 ring-1 ring-border/10" role="group" aria-label={sm('globalnav.auth.aria_label')}>
          {user ? (
            <>
              <CommandPaletteTrigger variant="icon" className="lg:hidden" />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={navItemClass({
                      hover: 'accent',
                      className: 'h-10 max-w-[180px] bg-transparent px-3',
                    })}
                    aria-label={menuCopy.account}
                  >
                    <User className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    <span className="hidden min-w-0 truncate sm:inline">{userLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border/50 bg-background/95 backdrop-blur-xl">
                  <DropdownMenuLabel className="min-w-0">
                    <span className="block truncate text-sm">{userLabel}</span>
                    {profile?.battletag ? (
                      <span className="block truncate text-xs font-normal text-muted-foreground">{profile.battletag}</span>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/forum')} className="lg:hidden">
                    <MessageSquare className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t.forum.title}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t.profile.title}
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Crown className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {menuCopy.adminTools}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {menuCopy.preferences}
                  </DropdownMenuItem>
                  {isImpersonating ? (
                    <DropdownMenuItem onClick={handleRestoreAdmin}>
                      <Undo2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {sm('globalnav.impersonation.return_to_admin')}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {t.common.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <CosmicButton onClick={() => navigate('/auth')} size="sm">
              {t.common.login}
            </CosmicButton>
          )}
        </div>
      </PageContainer>
    </header>
  );
};
