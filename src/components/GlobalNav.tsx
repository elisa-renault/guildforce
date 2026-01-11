import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, User, LogOut } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CosmicButton } from '@/components/CosmicButton';

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

  const languages = [
    { code: 'fr' as const, label: 'Français' },
    { code: 'en' as const, label: 'English' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header" role="banner">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side - Logo + Language */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="font-display text-lg text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
            aria-label="Accueil Guildforce"
          >
            Guildforce
          </button>

          {/* Language select */}
          <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
            <SelectTrigger className="w-[120px] h-9 bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        {/* Right side - auth only */}
        <div className="flex items-center" role="group" aria-label="Authentification">
          {user ? (
            <button 
              onClick={signOut} 
              className={`${navButtonBase} ${navButtonInactive}`}
              aria-label={t.common.logout}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden sm:inline">{t.common.logout}</span>
            </button>
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
