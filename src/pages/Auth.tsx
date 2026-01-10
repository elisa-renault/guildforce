import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  const { t, language } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bnetLoading, setBnetLoading] = useState(false);

  // Check for Battle.net callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      handleBattleNetCallback(code, state);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) navigate('/guilds');
  }, [user, navigate]);

  const handleBattleNetCallback = async (code: string, stateParam: string) => {
    setBnetLoading(true);
    try {
      // Parse state to get the mode
      let parsedState: { state: string; mode: string };
      try {
        parsedState = JSON.parse(stateParam);
      } catch {
        parsedState = { state: stateParam, mode: 'login' };
      }

      const redirectUri = `${window.location.origin}/auth`;

      // Call the login endpoint (no auth required)
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

      // Use the magic link token to sign in
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

        // Clear URL params and redirect
        navigate('/guilds', { replace: true });
      }
    } catch (error: any) {
      console.error('Battle.net callback error:', error);
      toast({
        title: t.auth.battlenetError,
        description: error.message,
        variant: 'destructive',
      });
      // Clear the URL params
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

  const loginSchema = z.object({
    email: z.string().email(t.auth.invalidEmail),
    password: z.string().min(6, t.auth.passwordTooShort),
  });

  const signupSchema = loginSchema.extend({
    discordPseudo: z.string().min(1, 'Required'),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: t.auth.passwordsDontMatch,
    path: ['confirmPassword'],
  });

  const form = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { email: '', password: '', discordPseudo: '', confirmPassword: '' },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    try {
      const { error } = isLogin
        ? await signIn(values.email, values.password)
        : await signUp(values.email, values.password, values.discordPseudo, language);

      if (error) {
        toast({
          title: 'Error',
          description: error.message.includes('already') ? t.auth.userAlreadyExists : t.auth.invalidCredentials,
          variant: 'destructive',
        });
      } else if (!isLogin) {
        toast({ title: 'Success', description: 'Account created!' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading if processing Battle.net callback
  if (bnetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <CosmicBackground />
        <GlowCard className="w-full max-w-md p-8 relative z-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Connecting with Battle.net...</p>
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

        <div className="text-center mb-4 pt-4">
          <h2 className="font-display text-2xl font-normal gradient-text">
            {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
          </h2>
        </div>

        {/* Battle.net Login Button */}
        <div className="mb-6">
          <CosmicButton
            type="button"
            variant="outline"
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
            {isLogin ? t.auth.loginWithBattleNet : t.auth.signupWithBattleNet}
          </CosmicButton>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t.auth.orContinueWith}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {!isLogin && (
              <FormField control={form.control} name="discordPseudo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.auth.discordPseudo}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t.auth.discordPseudoPlaceholder} 
                      {...field} 
                      className="cosmic-input h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t.common.email}</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    {...field} 
                    className="cosmic-input h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t.common.password}</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field} 
                    className="cosmic-input h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {!isLogin && (
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.common.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      className="cosmic-input h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <CosmicButton 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              loading={loading}
            >
              {isLogin ? t.common.login : t.common.signup}
            </CosmicButton>
          </form>
        </Form>

        <p className="text-center text-sm mt-8 text-muted-foreground">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
          <button 
            className="text-primary hover:text-primary/80 font-medium transition-colors" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? t.common.signup : t.common.login}
          </button>
        </p>
      </GlowCard>
    </div>
  );
};

export default Auth;
