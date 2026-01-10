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

      if (data.verifyToken && data.email) {
        const { error } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.verifyToken,
          type: 'magiclink',
        });

        if (error) {
          throw error;
        }

        toast({
          title: data.isNewUser ? 'Account created!' : 'Welcome back!',
          description: `Connected as ${data.battletag}`,
        });

        navigate('/guilds', { replace: true });
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
            {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
          </h2>
        </div>

        {/* Battle.net Login Button */}
        <CosmicButton
          type="button"
          className="w-full"
          size="lg"
          onClick={handleBattleNetLogin}
          disabled={bnetLoading}
        >
          <svg 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M10.458 0C4.672 0 0 4.672 0 10.458c0 5.787 4.672 10.459 10.458 10.459 5.787 0 10.459-4.672 10.459-10.459C20.917 4.672 16.245 0 10.458 0zm0 19.48c-4.98 0-9.022-4.041-9.022-9.022 0-4.98 4.042-9.022 9.022-9.022 4.981 0 9.022 4.042 9.022 9.022 0 4.98-4.041 9.022-9.022 9.022z"/>
            <path d="M14.824 6.545c-.647-.176-1.322-.27-2.01-.27-3.066 0-5.554 2.074-5.554 4.632 0 2.559 2.488 4.633 5.554 4.633.688 0 1.363-.094 2.01-.27l.574 1.08c-.803.29-1.67.447-2.584.447-3.994 0-7.232-2.643-7.232-5.89 0-3.248 3.238-5.891 7.232-5.891.914 0 1.781.157 2.584.447l-.574 1.082z"/>
            <path d="M16.41 7.627l-.574 1.082c.647.47 1.045 1.185 1.045 1.983 0 .799-.398 1.514-1.045 1.983l.574 1.082c1.01-.73 1.658-1.879 1.658-3.065 0-1.185-.648-2.335-1.658-3.065z"/>
          </svg>
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
