import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, FileSpreadsheet, Globe } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">{t.home.title}</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            >
              <Globe className="h-4 w-4 mr-2" />
              {language.toUpperCase()}
            </Button>
            {user ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/guilds')}>
                  {t.guild.members}
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  {t.common.logout}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                {t.common.login}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t.home.subtitle}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t.home.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gradient-alliance glow-alliance"
              onClick={() => navigate(user ? '/guild/create' : '/auth')}
            >
              <Shield className="mr-2 h-5 w-5" />
              {t.home.createGuild}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-horde text-horde hover:bg-horde/10"
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
            { icon: Users, ...t.home.features.collect },
            { icon: Shield, ...t.home.features.visualize },
            { icon: FileSpreadsheet, ...t.home.features.export },
          ].map((feature, i) => (
            <Card key={i} className="glass hover:glow-primary transition-all duration-300 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <CardContent className="pt-6 text-center">
                <feature.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
