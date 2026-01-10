import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, User, LogOut, LogIn } from 'lucide-react';

export const GlobalNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  // Don't show nav on auth page
  if (location.pathname === '/auth') return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - always links to home */}
        <button 
          onClick={() => navigate('/')}
          className="font-display text-lg text-foreground hover:text-primary transition-colors"
        >
          Guildforce
        </button>

        {/* Center navigation - only when logged in */}
        {user && (
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/guilds')}
              className={`min-w-32 text-sm hover:bg-white/5 justify-center ${
                isActive('/guilds') || location.pathname.startsWith('/guild/')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4 mr-1.5 flex-shrink-0" strokeWidth={1.5} />
              {t.common.myGuilds}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className={`min-w-32 text-sm hover:bg-white/5 justify-center ${
                isActive('/profile')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4 mr-1.5 flex-shrink-0" strokeWidth={1.5} />
              {t.profile.title}
            </Button>
          </nav>
        )}

        {/* Right side - fixed width container for language + auth */}
        <div className="flex items-center gap-1">
          {/* Language toggle - icon only for stability */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} 
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <span className="text-xs font-medium">{language.toUpperCase()}</span>
          </Button>
          
          {user ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={signOut} 
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5"
              title={t.common.logout}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/auth')} 
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              title={t.common.login}
            >
              <LogIn className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
