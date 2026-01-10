import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { ArrowLeft, Sparkles } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

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
          <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
        </Button>

        <div className="text-center mb-8 pt-4">
          <h2 className="font-display text-2xl font-normal gradient-text">
            {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
          </h2>
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
