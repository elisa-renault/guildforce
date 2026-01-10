import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, User, LogOut, LogIn, Globe } from 'lucide-react';

export const GlobalNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  // Don't show nav on auth page
  if (location.pathname === '/auth') return null;

  const isActive = (path: string) => location.pathname === path;

  const navButtonBase = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const navButtonInactive = "text-muted-foreground hover:text-foreground hover:bg-white/5";
  const navButtonActive = "text-primary bg-primary/10";

  const iconButtonBase = "inline-flex items-center justify-center h-9 w-9 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header" role="banner">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - always links to home */}
        <button 
          onClick={() => navigate('/')}
          className="font-display text-lg text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
          aria-label="Accueil Guildforce"
        >
          Guildforce
        </button>

        {/* Center navigation - only when logged in */}
        {user && (
          <nav className="flex items-center gap-1" role="navigation" aria-label="Navigation principale">
            <button
              onClick={() => navigate('/guilds')}
              className={`${navButtonBase} ${
                isActive('/guilds') || location.pathname.startsWith('/guild/')
                  ? navButtonActive
                  : navButtonInactive
              }`}
              aria-current={isActive('/guilds') || location.pathname.startsWith('/guild/') ? 'page' : undefined}
            >
              <Shield className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{t.common.myGuilds}</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={`${navButtonBase} ${
                isActive('/profile')
                  ? navButtonActive
                  : navButtonInactive
              }`}
              aria-current={isActive('/profile') ? 'page' : undefined}
            >
              <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{t.profile.title}</span>
            </button>
          </nav>
        )}

        {/* Right side - language + auth */}
        <div className="flex items-center gap-1" role="group" aria-label="Actions utilisateur">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} 
            className={`${iconButtonBase} text-muted-foreground hover:text-foreground hover:bg-white/5`}
            aria-label={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
            title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
          >
            <Globe className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          
          {user ? (
            <button 
              onClick={signOut} 
              className={`${iconButtonBase} text-muted-foreground hover:text-foreground hover:bg-white/5`}
              aria-label={t.common.logout}
              title={t.common.logout}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/auth')} 
              className={`${iconButtonBase} text-primary hover:text-primary hover:bg-primary/10`}
              aria-label={t.common.login}
              title={t.common.login}
            >
              <LogIn className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
