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
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <span className="font-semibold text-lg text-foreground">{t.home.title}</span>

          {/* Center navigation - like reference */}
          <nav className="hidden md:flex items-center">
            <div className="glass-badge flex items-center gap-6 px-6">
              <button 
                onClick={() => navigate('/guilds')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.guild.members}
              </button>
              <button 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {language === 'fr' ? 'À propos' : 'About'}
              </button>
              <button 
                onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Globe className="h-3.5 w-3.5" />
                {language.toUpperCase()}
              </button>
            </div>
          </nav>

          {/* Right side auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut} 
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  {t.common.logout}
                </Button>
              </>
            ) : (
              <CosmicButton 
                size="sm"
                onClick={() => navigate('/auth')}
              >
                {t.common.login}
              </CosmicButton>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 pt-32 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-24">
          {/* Badge - like reference */}
          <div className="inline-flex items-center gap-2 glass-badge mb-10 animate-fade-in">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>Next expansion roster planning</span>
          </div>

          {/* Title with gradient - like reference */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 animate-fade-in leading-tight" style={{ animationDelay: '100ms' }}>
            <span className="text-foreground">{t.home.subtitle.split(' ').slice(0, 2).join(' ')}</span>
            {' '}
            <span className="gradient-text">{t.home.subtitle.split(' ').slice(2).join(' ')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '200ms' }}>
            {t.home.description}
          </p>

          {/* CTA Buttons - like reference */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CosmicButton
              size="lg"
              onClick={() => navigate(user ? '/guild/create' : '/auth')}
              icon={<Shield className="h-5 w-5" />}
            >
              {t.home.createGuild}
            </CosmicButton>
            <CosmicButton
              size="lg"
              variant="outline"
              onClick={() => navigate(user ? '/guild/join' : '/auth')}
              icon={<Users className="h-5 w-5" />}
            >
              {t.home.joinGuild}
            </CosmicButton>
          </div>
        </div>

        {/* Features - glass cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {[
            { 
              icon: Users, 
              ...t.home.features.collect 
            },
            { 
              icon: BarChart3, 
              ...t.home.features.visualize 
            },
            { 
              icon: FileSpreadsheet, 
              ...t.home.features.export 
            },
          ].map((feature, i) => (
            <GlowCard 
              key={i} 
              className="p-8 animate-fade-in"
              hoverable
              style={{ animationDelay: `${400 + i * 100}ms` } as React.CSSProperties}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </GlowCard>
          ))}
        </div>

        {/* Stats section - like reference */}
        <div className="max-w-4xl mx-auto">
          <GlowCard className="p-8 animate-fade-in" style={{ animationDelay: '700ms' } as React.CSSProperties}>
            <div className="grid grid-cols-3 gap-8 divide-x divide-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{language === 'fr' ? 'Guildes actives' : 'Active Guilds'}</p>
                <p className="text-3xl font-bold gradient-text">100+</p>
                <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Et en croissance' : 'And growing'}</p>
              </div>
              <div className="text-center pl-8">
                <p className="text-sm text-muted-foreground mb-2">{language === 'fr' ? 'Mise à jour' : 'Updates'}</p>
                <p className="text-3xl font-bold gradient-text">{language === 'fr' ? 'Temps réel' : 'Real-time'}</p>
                <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Synchronisation instantanée' : 'Instant sync'}</p>
              </div>
              <div className="text-center pl-8">
                <p className="text-sm text-muted-foreground mb-2">{language === 'fr' ? 'Fiabilité' : 'Reliability'}</p>
                <p className="text-3xl font-bold gradient-text">99%</p>
                <p className="text-xs text-muted-foreground mt-1">{language === 'fr' ? 'Disponibilité' : 'Uptime'}</p>
              </div>
            </div>
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default Index;