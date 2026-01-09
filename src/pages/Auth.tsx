import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md glass">
        <CardHeader>
          <Button variant="ghost" size="sm" className="w-fit mb-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <CardTitle>{isLogin ? t.auth.loginTitle : t.auth.signupTitle}</CardTitle>
          <CardDescription>{isLogin ? t.auth.loginDescription : t.auth.signupDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isLogin && (
                <FormField control={form.control} name="discordPseudo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.discordPseudo}</FormLabel>
                    <FormControl><Input placeholder={t.auth.discordPseudoPlaceholder} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.common.email}</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.common.password}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {!isLogin && (
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.common.confirmPassword}</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? t.common.login : t.common.signup}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
            <button className="text-primary underline" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? t.common.signup : t.common.login}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
