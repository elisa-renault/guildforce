import { Shield, User, LogOut, MessageSquare, Menu, Crown, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { CosmicButton } from '@/components/CosmicButton';
import { PageContainer } from '@/components/layout/PageContainer';
import { NotificationBell } from '@/components/forum/NotificationBell';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { navItemClass } from '@/lib/nav-styles';
import { getRouteMeta } from '@/routes';
import { toast } from 'sonner';

export const GlobalNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { user, signOut, isImpersonating, impersonationTarget, restoreAdminSession } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routeMeta = getRouteMeta(location.pathname);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  if (routeMeta?.hideGlobalNav) return null;

  const isActive = (path: string) => location.pathname === path;
  const startsWithPath = (path: string) => location.pathname.startsWith(path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleRestoreAdmin = async () => {
    try {
      const restorePath = await restoreAdminSession('/admin?section=users');
      navigate(restorePath);
    } catch (error) {
      toast.error(sm('globalnav.impersonation.restore_error'));
    }
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <button
        onClick={() => handleNavigation('/guilds')}
        className={navItemClass({
          active: isActive('/guilds') || startsWithPath('/guild/'),
          hover: 'accent',
          fullWidth: mobile,
          justifyStart: mobile,
        })}
        aria-current={isActive('/guilds') || startsWithPath('/guild/') ? 'page' : undefined}
      >
        <Shield className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.common.myGuilds}</span>
      </button>
      <button
        onClick={() => handleNavigation('/forum')}
        className={navItemClass({
          active: startsWithPath('/forum'),
          hover: 'accent',
          fullWidth: mobile,
          justifyStart: mobile,
        })}
        aria-current={startsWithPath('/forum') ? 'page' : undefined}
      >
        <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.forum.title}</span>
      </button>
      <button
        onClick={() => handleNavigation('/profile')}
        className={navItemClass({
          active: isActive('/profile'),
          hover: 'accent',
          fullWidth: mobile,
          justifyStart: mobile,
        })}
        aria-current={isActive('/profile') ? 'page' : undefined}
      >
        <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.profile.title}</span>
      </button>
      {isAdmin && (
        <button
          onClick={() => handleNavigation('/admin')}
          className={navItemClass({
            active: isActive('/admin') || startsWithPath('/forum/admin'),
            hover: 'accent',
            fullWidth: mobile,
            justifyStart: mobile,
          })}
          aria-current={isActive('/admin') ? 'page' : undefined}
        >
          <Crown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>{t.common.admin}</span>
        </button>
      )}
    </>
  );

  return (
    <header data-global-nav className="fixed top-0 left-0 right-0 z-50 glass-header" role="banner">
      {isImpersonating && (
        <div className="border-b border-status-warning/30 bg-status-warning/10">
          <PageContainer className="flex min-h-11 items-center justify-between gap-3 py-2" width="wide">
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

      <PageContainer className="flex h-16 items-center justify-between" width="wide">
        {/* Left side - Logo */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="group inline-flex items-center gap-2 font-display text-lg text-foreground hover:text-primary-foreground hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
            aria-label={sm('globalnav.home.aria_label')}
          >
            <img
              src="/logos/logo-white.svg"
              alt=""
              className="h-5 w-5 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
              aria-hidden="true"
            />
            Guildforce
          </button>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-primary/35 text-primary-foreground border border-primary/50">
            Alpha
          </span>
        </div>

        {/* Center navigation - Desktop only */}
        {user && (
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label={sm('globalnav.nav.aria_label')}>
            <NavLinks />
          </nav>
        )}

        {/* Right side - notifications, auth, and mobile menu */}
        <div className="flex items-center gap-1" role="group" aria-label={sm('globalnav.auth.aria_label')}>
          {user && <NotificationBell />}
          {user ? (
            <>
              <button 
                onClick={signOut} 
                className={navItemClass({ hover: 'accent', className: 'hidden sm:flex' })}
                aria-label={t.common.logout}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden sm:inline">{t.common.logout}</span>
              </button>
              
              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button 
                    className={navItemClass({ hover: 'accent', className: 'md:hidden p-2' })}
                    aria-label={sm('globalnav.menu.aria_label')}
                  >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-background border-border/50 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-border/30">
                      <span className="font-display text-lg text-foreground">{sm('globalnav.menu.label')}</span>
                    </div>
                    <nav className="flex flex-col gap-1 p-4">
                      <NavLinks mobile />
                    </nav>
                    <div className="mt-auto p-4 border-t border-border/30">
                      <button 
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }} 
                        className={navItemClass({ hover: 'accent', fullWidth: true, justifyStart: true })}
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        <span>{t.common.logout}</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <CosmicButton 
              onClick={() => navigate('/auth')} 
              size="sm"
            >
              {t.common.login}
            </CosmicButton>
          )}
        </div>
      </PageContainer>
    </header>
  );
};
