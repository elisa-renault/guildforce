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

import { User, Save, Globe, Loader2, Sparkles, Camera, Trash2 } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetupMode = searchParams.get('setup') === 'true';
  const { t, language, setLanguage } = useLanguage();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profileSchema = z.object({
    username: z.string().min(2, 'Le pseudo doit contenir au moins 2 caractères').max(30, 'Le pseudo ne peut pas dépasser 30 caractères'),
  });

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
    },
  });

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Auth is done, we can show the page
    setLoading(false);
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;

    form.reset({
      username: profile.username || '',
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.errors.generic,
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.errors.generic,
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Create file path: userId/avatar.ext
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage (will overwrite existing)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL (add cache buster)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: language === 'fr' ? 'Avatar mis à jour !' : 'Avatar updated!' });
    } catch (error: any) {
      toast({
        title: t.errors.generic,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    setUploadingAvatar(true);

    try {
      // List files in user's folder to delete all avatar variants
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }

      // Clear avatar_url in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: language === 'fr' ? 'Avatar supprimé' : 'Avatar removed' });
    } catch (error: any) {
      toast({
        title: t.errors.generic,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Show loading while auth is initializing - prevents flash
  if (authLoading || loading) {
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
        
        <GlowCard className="w-full max-w-md p-8 relative z-10" hoverable={false}>
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

      <main className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Compact header with avatar, name, and account info inline */}
        <GlowCard className="p-4 mb-4" hoverable={false}>
          <div className="flex items-center gap-4">
            {/* Avatar with upload overlay */}
            <label className="relative w-14 h-14 shrink-0 cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden">
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-white" strokeWidth={1.5} />
                )}
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
            </label>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {profile?.username || 'Player'}
              </h2>
              {user?.email && !user.email.endsWith('@battlenet.local') ? (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {t.profile.connectedViaBnet}
                </p>
              )}
            </div>
            {/* Delete avatar button */}
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={uploadingAvatar}
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                title={language === 'fr' ? 'Supprimer l\'avatar' : 'Remove avatar'}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </GlowCard>

        {/* Desktop: 2 columns / Mobile: 1 column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Profile Form */}
          <GlowCard className="p-4" hoverable={false}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
              {t.profile.editProfile}
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-xs">{t.auth.pseudo}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t.auth.pseudoPlaceholder}
                        {...field} 
                        className="cosmic-input h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div>
                  <FormLabel className="text-foreground text-xs mb-1.5 block">
                    <Globe className="h-3.5 w-3.5 inline mr-1.5" strokeWidth={1.5} />
                    {t.profile.language}
                  </FormLabel>
                  <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
                    <SelectTrigger className="cosmic-input h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <CosmicButton 
                  type="submit" 
                  className="w-full"
                  size="sm"
                  loading={saving}
                  icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
                >
                  {t.common.save}
                </CosmicButton>
              </form>
            </Form>
          </GlowCard>

          {/* Battle.net Connection */}
          <BattleNetConnect />
        </div>
      </main>
    </div>
  );
};

export default Profile;