import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan',
};

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bnetLoading, setBnetLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');

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
          body: JSON.stringify({ redirectUri, state, mode: 'login', region: selectedRegion }),
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
    <div className="flex-1 relative pt-20 md:pt-16 flex flex-col">
      <CosmicBackground />

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-8 md:py-0">
        <div className="text-center max-w-4xl mx-auto px-6">
          {/* Title with gradient */}
          <h1 className="font-display text-5xl md:text-7xl mb-8 leading-tight">
            <span className="text-foreground">{t.home.subtitle.split(' ').slice(0, 2).join(' ')}</span>
            {' '}
            <span className="gradient-text">{t.home.subtitle.split(' ').slice(2).join(' ')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {t.home.description}
          </p>

          {/* CTA Group */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
            {!user && (
              <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as BattleNetRegion)}>
                <SelectTrigger className="w-full md:w-36 h-14 bg-card/80 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REGION_LABELS) as BattleNetRegion[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {REGION_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <CosmicButton
              size="lg"
              className="h-auto md:h-14"
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
