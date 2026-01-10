import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Flag, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      {/* Hero */}
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative z-10">
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
            <CosmicButton size="lg" onClick={() => navigate(user ? '/guild/create' : '/auth')} icon={<Flag className="h-5 w-5" strokeWidth={1.5} />}>
              {t.home.createGuild}
            </CosmicButton>
            <CosmicButton size="lg" variant="outline" onClick={() => navigate(user ? '/guild/join' : '/auth')} icon={<Users className="h-5 w-5" strokeWidth={1.5} />}>
              {t.home.joinGuild}
            </CosmicButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;