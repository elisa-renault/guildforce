import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Shield, User, LogOut, MessageSquare, Menu, Crown } from 'lucide-react';
import { CosmicButton } from '@/components/CosmicButton';
import { NotificationBell } from '@/components/forum/NotificationBell';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const GlobalNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show nav on auth page
  if (location.pathname === '/auth') return null;

  const isActive = (path: string) => location.pathname === path;
  const startsWithPath = (path: string) => location.pathname.startsWith(path);

  const navButtonBase = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const navButtonInactive = "text-muted-foreground hover:text-foreground hover:bg-accent/20";
  const navButtonActive = "text-foreground bg-primary/20 ring-1 ring-primary/40";

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <button
        onClick={() => handleNavigation('/guilds')}
        className={`${navButtonBase} ${mobile ? 'w-full justify-start' : ''} ${
          isActive('/guilds') || startsWithPath('/guild/')
            ? navButtonActive
            : navButtonInactive
        }`}
        aria-current={isActive('/guilds') || startsWithPath('/guild/') ? 'page' : undefined}
      >
        <Shield className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.common.myGuilds}</span>
      </button>
      <button
        onClick={() => handleNavigation('/forum')}
        className={`${navButtonBase} ${mobile ? 'w-full justify-start' : ''} ${
          startsWithPath('/forum')
            ? navButtonActive
            : navButtonInactive
        }`}
        aria-current={startsWithPath('/forum') ? 'page' : undefined}
      >
        <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.forum.title}</span>
      </button>
      <button
        onClick={() => handleNavigation('/profile')}
        className={`${navButtonBase} ${mobile ? 'w-full justify-start' : ''} ${
          isActive('/profile')
            ? navButtonActive
            : navButtonInactive
        }`}
        aria-current={isActive('/profile') ? 'page' : undefined}
      >
        <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{t.profile.title}</span>
      </button>
      {isAdmin && (
        <button
          onClick={() => handleNavigation('/admin')}
          className={`${navButtonBase} ${mobile ? 'w-full justify-start' : ''} ${
            isActive('/admin') || startsWithPath('/forum/admin')
              ? navButtonActive
              : navButtonInactive
          }`}
          aria-current={isActive('/admin') ? 'page' : undefined}
        >
          <Crown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>{language === 'fr' ? 'Admin' : 'Admin'}</span>
        </button>
      )}
    </>
  );

  return (
    <header data-global-nav className="fixed top-0 left-0 right-0 z-50 glass-header" role="banner">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="font-display text-lg text-foreground hover:text-primary-foreground hover:drop-shadow-[0_0_12px_hsl(292,63%,50%)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
            aria-label="Accueil Guildforce"
          >
            Guildforce
          </button>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-primary/20 text-primary border border-primary/30">
            Alpha
          </span>
        </div>

        {/* Center navigation - Desktop only */}
        {user && (
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navigation principale">
            <NavLinks />
          </nav>
        )}

        {/* Right side - notifications, auth, and mobile menu */}
        <div className="flex items-center gap-1" role="group" aria-label="Authentification">
          {user && <NotificationBell />}
          {user ? (
            <>
              <button 
                onClick={signOut} 
                className={`hidden sm:flex ${navButtonBase} ${navButtonInactive}`}
                aria-label={t.common.logout}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden sm:inline">{t.common.logout}</span>
              </button>
              
              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button 
                    className={`md:hidden ${navButtonBase} ${navButtonInactive} p-2`}
                    aria-label="Menu"
                  >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-background border-border/50 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-border/30">
                      <span className="font-display text-lg text-foreground">Menu</span>
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
                        className={`w-full ${navButtonBase} ${navButtonInactive} justify-start`}
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
      </div>
    </header>
  );
};
