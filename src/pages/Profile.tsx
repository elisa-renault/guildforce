import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { User, Save, Globe, Loader2 } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileSchema = z.object({
    discordPseudo: z.string().min(1, 'Required'),
    mainCharacterName: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      discordPseudo: '',
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

    if (profile) {
      form.reset({
        discordPseudo: profile.discord_pseudo || '',
        mainCharacterName: profile.main_character_name || '',
      });
      setLoading(false);
    }
  }, [user, profile, navigate, form, authLoading]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          discord_pseudo: values.discordPseudo,
          main_character_name: values.mainCharacterName || null,
          preferred_language: language,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: t.common.save, description: 'Profile updated successfully!' });
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

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Profile Header */}
        <div className="text-center mb-10 animate-fade-in">
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
          <h2 className="text-2xl font-bold text-foreground">
            {profile?.battletag || profile?.discord_pseudo || 'Player'}
          </h2>
          {profile?.battletag && (
            <p className="text-muted-foreground mt-1">
              {profile.discord_pseudo}
            </p>
          )}
        </div>

        {/* Battle.net Connection */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <BattleNetConnect />
        </div>

        {/* WoW Guild Memberships */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <GuildMemberships />
        </div>

        {/* Profile Form */}
        <GlowCard className="p-6 mb-8 animate-fade-in" style={{ animationDelay: '200ms' }} hoverable={false}>
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
            {t.profile.editProfile}
          </h3>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="discordPseudo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.auth.discordPseudo}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t.auth.discordPseudoPlaceholder}
                      {...field} 
                      className="cosmic-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="mainCharacterName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.profile.mainCharacter}</FormLabel>
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

              <div>
                <FormLabel className="text-foreground mb-2 block">
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
                className="w-full mt-6"
                loading={saving}
                icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
              >
                {t.common.save}
              </CosmicButton>
            </form>
          </Form>
        </GlowCard>

        {/* Account Info */}
        <GlowCard className="p-6 animate-fade-in" style={{ animationDelay: '300ms' }} hoverable={false}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Account</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            {profile?.battletag && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">BattleTag</span>
                <span className="text-foreground">{profile.battletag}</span>
              </div>
            )}
            {profile?.battlenet_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Battle.net ID</span>
                <span className="text-foreground font-mono text-xs">{profile.battlenet_id}</span>
              </div>
            )}
          </div>
        </GlowCard>
      </main>
    </div>
  );
};

export default Profile;
