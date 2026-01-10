import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { Shield } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bnetLoading, setBnetLoading] = useState(false);

  const handleBattleNetLogin = async () => {
    setBnetLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth`;
      const state = crypto.randomUUID();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/battlenet-auth/auth-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ redirectUri, state, mode: 'login' }),
        }
      );

      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error: any) {
      console.error('Battle.net auth error:', error);
      toast({
        title: t.auth.battlenetError,
        description: error.message,
        variant: 'destructive',
      });
      setBnetLoading(false);
    }
  };

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

          {/* Single CTA Button */}
          <div className="flex justify-center animate-fade-in" style={{
            animationDelay: '300ms'
          }}>
            <CosmicButton 
              size="lg" 
              onClick={() => user ? navigate('/guilds') : handleBattleNetLogin()}
              loading={bnetLoading}
              icon={user ? <Shield className="h-5 w-5" strokeWidth={1.5} /> : <BattleNetIcon className="h-7 w-7" />}
            >
              {user ? t.common.myGuilds : t.auth.loginWithBattleNet}
            </CosmicButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
