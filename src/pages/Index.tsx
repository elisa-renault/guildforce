import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Users, FileSpreadsheet, Globe, Zap, BarChart3, Flag } from 'lucide-react';
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
      <main className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center max-w-4xl mx-auto px-6">
          {/* Title with gradient */}
          <h1 className="font-display text-5xl md:text-7xl mb-8 animate-fade-in leading-tight" style={{
          animationDelay: '100ms'
        }}>
            <span className="text-foreground">{t.home.subtitle.split(' ').slice(0, 2).join(' ')}</span>
            {' '}
            <span className="gradient-text">{t.home.subtitle.split(' ').slice(2).join(' ')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{
          animationDelay: '200ms'
        }}>
            {t.home.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{
          animationDelay: '300ms'
        }}>
            <Flag size="lg" onClick={() => navigate(user ? '/guild/create' : '/auth')} icon={<Shield className="h-5 w-5" />}>
              {t.home.createGuild}
            </Flag>
            <CosmicButton size="lg" variant="outline" onClick={() => navigate(user ? '/guild/join' : '/auth')} icon={<Users className="h-5 w-5" />}>
              {t.home.joinGuild}
            </CosmicButton>
          </div>
        </div>
      </main>
    </div>;
};
export default Index;