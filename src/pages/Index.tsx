import { Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BattleNetIcon } from '@/components/BattleNetIcon';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  type BattleNetRegion,
  ALL_REGIONS,
  getRedirectUri,
  getRegionLabel,
  generateOAuthState,
} from '@/lib/battlenetOAuth';
import { splitHeroTitleForEffect } from '@/lib/heroTitle';
import log from '@/lib/logger';
import { getSupabaseUrl } from '@/lib/supabaseConfig';

const Index = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.auth.battlenetError;
  const [bnetLoading, setBnetLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');
  const heroTitle = splitHeroTitleForEffect(t.home.subtitle);

  const handleBattleNetLogin = async () => {
    setBnetLoading(true);
    try {
      const redirectUri = getRedirectUri('/auth');
      const state = generateOAuthState();

      const baseUrl = getSupabaseUrl();
      if (!baseUrl) throw new Error('Missing Supabase URL configuration');

      const response = await fetch(
        `${baseUrl}/functions/v1/battlenet-auth/auth-url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUri, state, mode: 'login', region: selectedRegion }),
        }
      );

      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error: unknown) {
      log.error('Battle.net auth error:', error);
      toast({
        title: t.auth.battlenetError,
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      setBnetLoading(false);
    }
  };

  return (
    <div className="flex-1 relative pt-20 md:pt-16 flex flex-col">
      <CosmicBackground />

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-8 md:py-0">
        <PageContainer width="full" className="text-center max-w-4xl mx-auto px-6">
          {/* Title with gradient */}
          <h1 className="font-display text-5xl md:text-7xl mb-8 leading-tight min-h-[7.5rem] md:min-h-[10rem]">
            <span className="text-foreground">{heroTitle.plain}</span>
            {' '}
            <span className="gradient-text">{heroTitle.accent}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {t.home.description}
          </p>

          {/* CTA Group */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
            {!user && (
              <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as BattleNetRegion)}>
                <SelectTrigger
                  aria-label={t.battlenet.selectRegion}
                  className="h-14 w-full max-w-[312px] bg-card/80 border-border/50 transition-colors hover:border-primary/50 md:w-36"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRegionLabel(r, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <CosmicButton
              size="lg"
              className="h-12 w-full max-w-[312px] px-7 text-base md:h-14 md:w-auto md:min-w-[170px] md:px-8 md:text-lg"
              onClick={() => user ? navigate('/guilds') : handleBattleNetLogin()}
              loading={bnetLoading}
              icon={user ? <Shield className="h-5 w-5" strokeWidth={1.5} /> : <BattleNetIcon className="h-7 w-7" />}
            >
              {user ? t.common.myGuilds : t.auth.loginWithBattleNet}
            </CosmicButton>
          </div>
        </PageContainer>
      </main>
    </div>
  );
};

export default Index;
