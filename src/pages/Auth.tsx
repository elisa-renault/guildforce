import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { ArrowLeft, Loader2 } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [bnetLoading, setBnetLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [discordPseudo, setDiscordPseudo] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for Battle.net callback - only process once
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      // Check if we already processed this code (stored in sessionStorage)
      const processedCode = sessionStorage.getItem('bnet_processed_code');
      if (processedCode === code) {
        // Already processed, clear URL params and skip
        navigate('/auth', { replace: true });
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
      let parsedState: { state: string; mode: string };
      try {
        parsedState = JSON.parse(stateParam);
      } catch {
        parsedState = { state: stateParam, mode: 'login' };
      }

      const redirectUri = `${window.location.origin}/auth`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/battlenet-auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, redirectUri }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Battle.net login failed');
      }

      if (data.verifyToken) {
        const token_hash = data.verifyToken as string;
        const type = (data.tokenType || 'magiclink') as any;

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (error) {
          throw error;
        }

        // Clear processed code from sessionStorage
        sessionStorage.removeItem('bnet_processed_code');

        toast({
          title: data.isNewUser ? t.auth.accountCreated : t.auth.welcomeBack,
          description: `${t.battlenet.connected} : ${data.battletag}`,
        });

        // Redirect new users to profile setup, existing users to guilds
        if (data.isNewUser) {
          navigate('/profile?setup=true', { replace: true });
        } else {
          navigate('/guilds', { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Battle.net callback error:', error);
      toast({
        title: t.auth.battlenetError,
        description: error.message,
        variant: 'destructive',
      });
      navigate('/auth', { replace: true });
    } finally {
      setBnetLoading(false);
    }
  };

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, discordPseudo, 'fr');
        if (error) throw error;
        toast({
          title: 'Compte créé',
          description: 'Vérifiez votre email',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (bnetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <CosmicBackground />
        <GlowCard className="w-full max-w-md p-8 relative z-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">{t.battlenet.connecting}</p>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <CosmicBackground />

      <GlowCard className="w-full max-w-md p-8 relative z-10 animate-scale-in">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground hover:bg-white/5" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.common.back}
        </Button>

        <div className="text-center mb-6 pt-8">
          <h2 className="font-display text-2xl font-normal gradient-text mb-2">
            {t.auth.loginTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.auth.bnetNote}</p>
        </div>

        {/* Battle.net Login Button */}
        <CosmicButton
          type="button"
          className="w-full"
          size="lg"
          onClick={handleBattleNetLogin}
          disabled={bnetLoading}
        >
          <BattleNetIcon className="h-5 w-5 mr-2" />
          {t.auth.loginWithBattleNet}
        </CosmicButton>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.common.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">{t.common.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="pseudo">{t.auth.pseudo}</Label>
              <Input
                id="pseudo"
                type="text"
                value={discordPseudo}
                onChange={(e) => setDiscordPseudo(e.target.value)}
                placeholder={t.auth.pseudoPlaceholder}
                required
              />
            </div>
          )}

          <CosmicButton 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              t.common.login
            ) : (
              t.common.signup
            )}
          </CosmicButton>
        </form>

        <p className="text-center text-sm mt-4 text-muted-foreground">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline"
          >
            {isLogin ? t.common.signup : t.common.login}
          </button>
        </p>
      </GlowCard>
    </div>
  );
};

export default Auth;
