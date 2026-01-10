import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetConnect } from '@/components/BattleNetConnect';
import { GuildMemberships } from '@/components/GuildMemberships';
import { User, Save, Globe, Loader2, Sparkles } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetupMode = searchParams.get('setup') === 'true';
  const { t, language, setLanguage } = useLanguage();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileSchema = z.object({
    username: z.string().min(2, 'Le pseudo doit contenir au moins 2 caractères').max(30, 'Le pseudo ne peut pas dépasser 30 caractères'),
    mainCharacterName: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      mainCharacterName: '',
    },
  });

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Don't block the whole page on profile loading; show fallback if needed.
    setLoading(false);
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;

    form.reset({
      username: profile.username || '',
      mainCharacterName: profile.main_character_name || '',
    });
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: values.username.trim(),
          main_character_name: values.mainCharacterName?.trim() || null,
          preferred_language: language,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      if (isSetupMode) {
        toast({ title: 'Bienvenue !', description: 'Ton profil a été configuré.' });
        navigate('/guilds', { replace: true });
      } else {
        toast({ title: t.common.save, description: 'Profile updated successfully!' });
      }
    } catch (error: any) {
      toast({
        title: t.errors.generic,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: newLang })
        .eq('id', user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <CosmicBackground />
        <GlowCard className="w-full max-w-md p-8 relative z-10 text-center" hoverable={false}>
          <p className="text-foreground mb-2">Profil introuvable.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Déconnecte-toi puis reconnecte-toi via Battle.net pour finaliser la liaison.
          </p>
          <CosmicButton onClick={() => navigate('/auth')} className="w-full">
            Revenir à la connexion
          </CosmicButton>
        </GlowCard>
      </div>
    );
  }

  // Setup mode - simplified focused view for new users
  if (isSetupMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <CosmicBackground />
        
        <GlowCard className="w-full max-w-md p-8 relative z-10 animate-scale-in" hoverable={false}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl gradient-text mb-2">
              Bienvenue sur Guildforce !
            </h1>
            <p className="text-muted-foreground text-sm">
              Choisis ton pseudo pour être identifié par ta guilde
            </p>
            {profile?.battletag && (
              <p className="text-xs text-muted-foreground mt-2">
                Connecté en tant que {profile.battletag}
              </p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.auth.pseudo}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ton pseudo sur le site"
                      {...field} 
                      className="cosmic-input h-12 text-center text-lg"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    C'est le nom qui sera affiché dans ta guilde
                  </p>
                </FormItem>
              )} />

              <div>
                <FormLabel className="text-foreground text-sm mb-2 block">
                  <Globe className="h-4 w-4 inline mr-2" strokeWidth={1.5} />
                  {t.profile.language}
                </FormLabel>
                <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
                  <SelectTrigger className="cosmic-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="cosmic-glass border-border/50">
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <CosmicButton 
                type="submit" 
                className="w-full"
                size="lg"
                loading={saving}
              >
                C'est parti !
              </CosmicButton>
            </form>
          </Form>
        </GlowCard>
      </div>
    );
  }

  // Normal profile view
  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        {/* Desktop: 2 columns / Mobile: 1 column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Header & Account Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Header */}
            <GlowCard className="p-6 animate-fade-in" hoverable={false}>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {profile?.username || 'Player'}
                </h2>
                {profile?.battletag && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {profile.battletag}
                  </p>
                )}
              </div>
            </GlowCard>

            {/* Account Info */}
            <GlowCard className="p-5 animate-fade-in" style={{ animationDelay: '100ms' }} hoverable={false}>
              <h3 className="text-base font-semibold text-foreground mb-3">Account</h3>
              <div className="space-y-2 text-sm">
                {/* Only show email if it's not the technical bnet email */}
                {user?.email && !user.email.endsWith('@battlenet.local') && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Email</span>
                    <span className="text-foreground truncate">{user.email}</span>
                  </div>
                )}
                {profile?.battletag && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">BattleTag</span>
                    <span className="text-foreground">{profile.battletag}</span>
                  </div>
                )}
                {/* Show hint that they can add an email if only bnet connected */}
                {user?.email?.endsWith('@battlenet.local') && (
                  <p className="text-xs text-muted-foreground italic">
                    {t.profile.connectedViaBnet}
                  </p>
                )}
              </div>
            </GlowCard>

            {/* Battle.net Connection */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <BattleNetConnect />
            </div>
          </div>

          {/* Right Column - Form & Guilds */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Form */}
            <GlowCard className="p-6 animate-fade-in" style={{ animationDelay: '200ms' }} hoverable={false}>
              <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
                {t.profile.editProfile}
              </h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm">{t.auth.pseudo}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t.auth.pseudoPlaceholder}
                            {...field} 
                            className="cosmic-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="mainCharacterName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm">{t.profile.mainCharacter}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t.profile.mainCharacterPlaceholder}
                            {...field} 
                            className="cosmic-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <FormLabel className="text-foreground text-sm mb-2 block">
                        <Globe className="h-4 w-4 inline mr-2" strokeWidth={1.5} />
                        {t.profile.language}
                      </FormLabel>
                      <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
                        <SelectTrigger className="cosmic-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="cosmic-glass border-border/50">
                          <SelectItem value="fr">🇫🇷 Français</SelectItem>
                          <SelectItem value="en">🇬🇧 English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <CosmicButton 
                      type="submit" 
                      className="w-full"
                      loading={saving}
                      icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
                    >
                      {t.common.save}
                    </CosmicButton>
                  </div>
                </form>
              </Form>
            </GlowCard>

            {/* WoW Guild Memberships */}
            <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
              <GuildMemberships />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
