import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
              className={`text-sm hover:bg-white/5 ${
                isActive('/guilds') || location.pathname.startsWith('/guild/')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              {t.common.myGuilds}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className={`text-sm hover:bg-white/5 ${
                isActive('/profile')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              {t.profile.title}
            </Button>
          </nav>
        )}

        {/* Right side - fixed width container for language + auth */}
        <div className="flex items-center gap-2">
          {/* Language toggle - fixed width to prevent shifting */}
          <button 
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} 
            className="w-16 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Globe className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            <span className="w-6 text-center">{language.toUpperCase()}</span>
          </button>
          
          {user ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut} 
              className="text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              {t.common.logout}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/auth')} 
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <LogIn className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              {t.common.login}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
