import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Users, FileSpreadsheet, Globe, Sparkles, Zap, BarChart3, ChevronRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 cosmic-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl cosmic-text">{t.home.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <Globe className="h-4 w-4 mr-1" />
              {language.toUpperCase()}
            </Button>
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/guilds')} 
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  {t.guild.members}
                </Button>
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
      <main className="container mx-auto px-4 pt-32 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full cosmic-glass mb-10 animate-fade-in">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Next expansion roster planning</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <span className="cosmic-text">{t.home.subtitle.split(' ').slice(0, 3).join(' ')}</span>
            <br />
            <span className="text-foreground">{t.home.subtitle.split(' ').slice(3).join(' ')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '200ms' }}>
            {t.home.description}
          </p>

          {/* CTA Buttons */}
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

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { 
              icon: Users, 
              gradient: 'from-primary/80 to-primary/60',
              glow: 'group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]',
              ...t.home.features.collect 
            },
            { 
              icon: BarChart3, 
              gradient: 'from-secondary/80 to-secondary/60',
              glow: 'group-hover:shadow-[0_0_30px_hsl(var(--secondary)/0.2)]',
              ...t.home.features.visualize 
            },
            { 
              icon: FileSpreadsheet, 
              gradient: 'from-accent/80 to-accent/60',
              glow: 'group-hover:shadow-[0_0_30px_hsl(var(--accent)/0.2)]',
              ...t.home.features.export 
            },
          ].map((feature, i) => (
            <GlowCard 
              key={i} 
              className={`p-8 group animate-fade-in ${feature.glow}`}
              hoverable
              style={{ animationDelay: `${400 + i * 100}ms` } as React.CSSProperties}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform`}>
                <feature.icon className="h-7 w-7 text-foreground/90" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </GlowCard>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
