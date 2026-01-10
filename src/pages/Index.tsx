import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Users, FileSpreadsheet, Globe, Zap, BarChart3 } from 'lucide-react';
const Index = () => {
  const navigate = useNavigate();
  const {
    t,
    language,
    setLanguage
  } = useLanguage();
  const {
    user,
    signOut
  } = useAuth();
  return <div className="min-h-screen relative">
      <CosmicBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <span className="font-display text-lg text-foreground">{t.home.title}</span>

          {/* Navigation links */}
          

          {/* Right side - language + auth */}
          <div className="flex items-center gap-4">
            <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5">
              <Globe className="h-4 w-4" />
              {language.toUpperCase()}
            </button>
            
            {user ? <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground hover:bg-white/5">
                {t.common.logout}
              </Button> : <CosmicButton size="sm" onClick={() => navigate('/auth')}>
                {t.common.login}
              </CosmicButton>}
          </div>
        </div>
      </header>

      {/* Hero */}
      
    </div>;
};
export default Index;