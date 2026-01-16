import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { ArrowLeft, Loader2, Shield, ChevronDown, Mail } from 'lucide-react';
type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';
const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan'
};
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    t
  } = useLanguage();
  const {
    user,
    signIn,
    signUp
  } = useAuth();
  const {
    toast
  } = useToast();
  const [bnetLoading, setBnetLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [discordPseudo, setDiscordPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');
  const [emailFormOpen, setEmailFormOpen] = useState(false);

  // Check for Battle.net callback - only process once
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      // Check if we already processed this code (stored in sessionStorage)
      const processedCode = sessionStorage.getItem('bnet_processed_code');
      if (processedCode === code) {
        // Already processed, clear URL params and skip
        navigate('/auth', {
          replace: true
        });
        return;
      }

      // Mark this code as being processed
      sessionStorage.setItem('bnet_processed_code', code);
      handleBattleNetCallback(code, state);
    }
  }, [searchParams]);
  useEffect(() => {
    if (user) navigate('/guilds');
  }, [user, navigate]);
  const handleBattleNetCallback = async (code: string, stateParam: string) => {
    setBnetLoading(true);
    try {
      let parsedState: {
        state: string;
        mode: string;
        region?: string;
      };
      try {
        parsedState = JSON.parse(stateParam);
      } catch {
        parsedState = {
          state: stateParam,
          mode: 'login'
        };
      }
      const region = parsedState.region || 'eu';
      const redirectUri = `${window.location.origin}/auth`;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/battlenet-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          redirectUri,
          region
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Battle.net login failed');
      }
      if (data.verifyToken) {
        const token_hash = data.verifyToken as string;
        const type = (data.tokenType || 'magiclink') as any;
        const {
          error
        } = await supabase.auth.verifyOtp({
          token_hash,
          type
        });
        if (error) {
          throw error;
        }

        // Clear processed code from sessionStorage
        sessionStorage.removeItem('bnet_processed_code');
        toast({
          title: data.isNewUser ? t.auth.accountCreated : t.auth.welcomeBack,
          description: `${t.battlenet.connected} : ${data.battletag}`
        });

        // Redirect new users to profile setup, existing users to guilds
        if (data.isNewUser) {
          navigate('/profile?setup=true', {
            replace: true
          });
        } else {
          navigate('/guilds', {
            replace: true
          });
        }
      }
    } catch (error: any) {
      console.error('Battle.net callback error:', error);
      toast({
        title: t.auth.battlenetError,
        description: error.message,
        variant: 'destructive'
      });
      navigate('/auth', {
        replace: true
      });
    } finally {
      setBnetLoading(false);
    }
  };
  const handleBattleNetLogin = async () => {
    setBnetLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth`;
      const state = crypto.randomUUID();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/battlenet-auth/auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirectUri,
          state,
          mode: 'login',
          region: selectedRegion
        })
      });
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
        variant: 'destructive'
      });
      setBnetLoading(false);
    }
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await signIn(email, password);
        if (error) throw error;
      } else {
        const {
          error
        } = await signUp(email, password, discordPseudo, 'fr');
        if (error) throw error;
        toast({
          title: 'Compte créé',
          description: 'Vérifiez votre email'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state during Battle.net callback
  if (bnetLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">{t.battlenet.connecting}</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen flex flex-col">
      <CosmicBackground />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-20 relative z-10">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left Column - Branding (visible on lg+) */}
          <div className="hidden lg:flex flex-col items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl font-bold gradient-text">Guildforce</h1>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold text-foreground">
                {t.auth.loginTitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                {t.auth.bnetNote}
              </p>
            </div>

            
          </div>

          {/* Right Column - Auth Form */}
          <div className="flex flex-col items-center lg:items-stretch">
            
            {/* Mobile Header */}
            <div className="lg:hidden text-center space-y-2 mb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold gradient-text">Guildforce</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                {t.auth.loginTitle}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {t.auth.bnetNote}
              </p>
            </div>

            <GlowCard className="w-full max-w-md p-6 sm:p-8">
              {/* Region Selector */}
              <div className="space-y-2 mb-6">
                <Label className="text-sm text-muted-foreground">{t.battlenet.selectRegion}</Label>
                <Select value={selectedRegion} onValueChange={value => setSelectedRegion(value as BattleNetRegion)}>
                  <SelectTrigger className="w-full bg-card/60 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REGION_LABELS) as BattleNetRegion[]).map(region => <SelectItem key={region} value={region}>
                        {REGION_LABELS[region]}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Battle.net Button - Primary */}
              <CosmicButton type="button" className="w-full" size="lg" onClick={handleBattleNetLogin} disabled={bnetLoading} icon={<BattleNetIcon className="h-6 w-6" />}>
                {t.auth.loginWithBattleNet}
              </CosmicButton>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">{t.auth.orContinueWith}</span>
                </div>
              </div>

              {/* Email Form - Collapsible */}
              <Collapsible open={emailFormOpen} onOpenChange={setEmailFormOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t.common.email}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${emailFormOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-4">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.common.email}</Label>
                      <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="bg-card/60 border-border" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t.common.password}</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="bg-card/60 border-border" />
                    </div>

                    {!isLogin && <div className="space-y-2">
                        <Label htmlFor="pseudo">{t.auth.pseudo}</Label>
                        <Input id="pseudo" type="text" value={discordPseudo} onChange={e => setDiscordPseudo(e.target.value)} placeholder={t.auth.pseudoPlaceholder} required className="bg-card/60 border-border" />
                      </div>}

                    <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? t.common.login : t.common.signup}
                    </Button>

                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {isLogin ? t.auth.noAccount : t.auth.hasAccount}
                    </button>
                  </form>
                </CollapsibleContent>
              </Collapsible>
            </GlowCard>

            {/* Back Button - Outside Card */}
            <Button variant="ghost" onClick={() => navigate('/')} className="mt-4 text-muted-foreground hover:text-foreground gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
          </div>
        </div>
      </div>
    </div>;
};
export default Auth;