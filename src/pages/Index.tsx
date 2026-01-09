import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, FileSpreadsheet, Globe, Sparkles, Zap, BarChart3 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">{t.home.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4 mr-1" />
              {language.toUpperCase()}
            </Button>
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/guilds')} className="text-muted-foreground hover:text-foreground">
                  {t.guild.members}
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                  {t.common.logout}
                </Button>
              </>
            ) : (
              <Button size="sm" className="btn-gradient text-primary-foreground" onClick={() => navigate('/auth')}>
                {t.common.login}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8 animate-fade-in">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Next expansion roster planning</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="gradient-text animate-gradient">{t.home.subtitle.split(' ').slice(0, 3).join(' ')}</span>
            <br />
            <span className="text-foreground">{t.home.subtitle.split(' ').slice(3).join(' ')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            {t.home.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Button
              size="lg"
              className="btn-gradient text-white px-8 py-6 text-lg glow-primary"
              onClick={() => navigate(user ? '/guild/create' : '/auth')}
            >
              <Shield className="mr-2 h-5 w-5" />
              {t.home.createGuild}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass border-primary/50 hover:border-primary hover:glow-primary px-8 py-6 text-lg transition-all"
              onClick={() => navigate(user ? '/guild/join' : '/auth')}
            >
              <Users className="mr-2 h-5 w-5" />
              {t.home.joinGuild}
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Users, color: 'from-primary to-blue-400', ...t.home.features.collect },
            { icon: BarChart3, color: 'from-secondary to-purple-400', ...t.home.features.visualize },
            { icon: FileSpreadsheet, color: 'from-accent to-pink-400', ...t.home.features.export },
          ].map((feature, i) => (
            <Card 
              key={i} 
              className="glass-glow group hover:scale-[1.02] transition-all duration-300 animate-fade-in cursor-default" 
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              <CardContent className="pt-8 pb-6 px-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Decorative orbs */}
        <div className="fixed top-1/4 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
        <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </main>
    </div>
  );
};

export default Index;
