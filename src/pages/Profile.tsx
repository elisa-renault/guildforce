import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetConnect } from '@/components/BattleNetConnect';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';

import { User, Save, Globe, Loader2, Sparkles, Upload, Trash2, ExternalLink, Shield, AlertTriangle } from 'lucide-react';

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
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [showBattletag, setShowBattletag] = useState(true);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

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
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(false);
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    form.reset({ username: profile.username || '' });
    // @ts-ignore - show_battletag may not be in type yet
    setShowBattletag(profile.show_battletag !== false);
  }, [profile, form]);

  // Check for pending deletion request
  useEffect(() => {
    async function checkDeletionRequest() {
      if (!user) return;
      const { data } = await supabase
        .from('account_deletion_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setDeletionPending(!!data);
    }
    checkDeletionRequest();
  }, [user]);

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
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    if (user) {
      await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', user.id);
    }
  };

  const handleBattletagVisibilityChange = async (checked: boolean) => {
    setShowBattletag(checked);
    if (user) {
      await supabase.from('profiles').update({ show_battletag: checked }).eq('id', user.id);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user || deleteConfirmText !== profile?.username) return;
    setRequestingDeletion(true);

    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({ user_id: user.id });

      if (error) throw error;

      setDeletionPending(true);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
      toast({
        title: language === 'fr' ? 'Demande enregistrée' : 'Request submitted',
        description: language === 'fr' 
          ? 'Ta demande de suppression a été enregistrée. Un administrateur la traitera sous 30 jours.'
          : 'Your deletion request has been submitted. An admin will process it within 30 days.',
      });
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setDeletionPending(false);
      toast({
        title: language === 'fr' ? 'Demande annulée' : 'Request cancelled',
        description: language === 'fr' 
          ? 'Ta demande de suppression a été annulée.'
          : 'Your deletion request has been cancelled.',
      });
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: t.errors.generic, description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t.errors.generic, description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    // Create object URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);

    try {
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setCropDialogOpen(false);
      setSelectedImageSrc(null);
      toast({ title: language === 'fr' ? 'Avatar mis à jour !' : 'Avatar updated!' });
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setUploadingAvatar(true);

    try {
      const { data: files } = await supabase.storage.from('avatars').list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: language === 'fr' ? 'Avatar supprimé' : 'Avatar removed' });
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 relative">
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

  // Setup mode
  if (isSetupMode) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <CosmicBackground />
        <GlowCard className="w-full max-w-md p-8 relative z-10" hoverable={false}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-2">Bienvenue sur Guildforce !</h1>
            <p className="text-muted-foreground text-sm">Choisis ton pseudo pour être identifié par ta guilde</p>
            {profile?.battletag && (
              <p className="text-xs text-muted-foreground mt-2">Connecté en tant que {profile.battletag}</p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.auth.pseudo}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ton pseudo sur le site" {...field} className="cosmic-input h-12 text-center text-lg" autoFocus />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">C'est le nom qui sera affiché dans ta guilde</p>
                </FormItem>
              )} />

              <div>
                <FormLabel className="text-foreground text-sm mb-2 block">
                  <Globe className="h-4 w-4 inline mr-2" strokeWidth={1.5} />
                  {t.profile.language}
                </FormLabel>
                <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
                  <SelectTrigger className="cosmic-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <CosmicButton type="submit" className="w-full" size="lg" loading={saving}>C'est parti !</CosmicButton>
            </form>
          </Form>
        </GlowCard>
      </div>
    );
  }

  // Normal profile view - modular grid layout
  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <h1 className="font-display text-2xl text-foreground">{t.profile.title}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/u/${profile.username}`)}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            {language === 'fr' ? 'Voir mon profil public' : 'View public profile'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Left column: Avatar + Profile stacked */}
          <div className="space-y-4">
            {/* Avatar */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4">{t.profile.avatar}</h2>
              
              <div className="flex flex-col items-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden mb-4">
                  {uploadingAvatar ? (
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-white" strokeWidth={1.5} />
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <Button type="button" variant="outline" size="sm" className="relative w-full" disabled={uploadingAvatar}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingAvatar}
                    />
                    <Upload className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    {t.profile.uploadAvatar}
                  </Button>
                  
                  {profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAvatar}
                      disabled={uploadingAvatar}
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      {t.profile.removeAvatar}
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 text-center">{t.profile.avatarHint}</p>
              </div>
            </GlowCard>

            {/* Profile form */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {t.profile.profileInfo}
              </h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm">{t.auth.pseudo}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.auth.pseudoPlaceholder} {...field} className="cosmic-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div>
                    <FormLabel className="text-foreground text-sm mb-2 block">
                      <Globe className="h-4 w-4 inline mr-2" strokeWidth={1.5} />
                      {t.profile.language}
                    </FormLabel>
                    <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
                      <SelectTrigger className="cosmic-input"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <CosmicButton type="submit" className="w-full" loading={saving} icon={<Save className="h-4 w-4" strokeWidth={1.5} />}>
                    {t.common.save}
                  </CosmicButton>
                </form>
              </Form>
            </GlowCard>
          </div>

          {/* Right column: Battle.net + Privacy + Danger Zone */}
          <div className="space-y-4">
            {/* Battle.net connection */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4">{t.profile.accountConnection}</h2>
              <BattleNetConnect />
            </GlowCard>

            {/* Privacy section */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {language === 'fr' ? 'Confidentialité' : 'Privacy'}
              </h2>

              {/* BattleTag visibility toggle */}
              {profile?.battletag && (
                <div className="flex items-center justify-between py-2 mb-4">
                  <Label htmlFor="show-battletag" className="text-sm text-foreground cursor-pointer">
                    {language === 'fr' ? 'Afficher mon BattleTag sur le profil public' : 'Show BattleTag on public profile'}
                  </Label>
                  <Switch
                    id="show-battletag"
                    checked={showBattletag}
                    onCheckedChange={handleBattletagVisibilityChange}
                  />
                </div>
              )}

              {/* Privacy info */}
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    {language === 'fr' ? 'Données publiques' : 'Public data'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {language === 'fr' 
                      ? 'Ton pseudo et avatar sont visibles sur ton profil public.'
                      : 'Your username and avatar are visible on your public profile.'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    {language === 'fr' ? 'Données de guilde' : 'Guild data'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {language === 'fr' 
                      ? 'Tes personnages WoW et vœux de classe sont visibles uniquement par les membres de ta guilde.'
                      : 'Your WoW characters and class wishes are only visible to your guild members.'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    {language === 'fr' ? 'Données privées' : 'Private data'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {language === 'fr' 
                      ? 'Ton email et tes tokens Battle.net ne sont jamais partagés.'
                      : 'Your email and Battle.net tokens are never shared.'}
                  </p>
                </div>
              </div>
            </GlowCard>

            {/* Danger Zone */}
            <GlowCard className="p-5 border-destructive/30" hoverable={false}>
              <h2 className="text-sm font-medium text-destructive mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                {language === 'fr' ? 'Zone de danger' : 'Danger Zone'}
              </h2>

              {deletionPending ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' 
                      ? 'Une demande de suppression est en cours de traitement.'
                      : 'A deletion request is pending processing.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDeletion}
                    className="w-full"
                  >
                    {language === 'fr' ? 'Annuler la demande' : 'Cancel request'}
                  </Button>
                </div>
              ) : (
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 whitespace-normal text-left h-auto py-2"
                    >
                      <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                      <span>{language === 'fr' ? 'Demander la suppression de mon compte' : 'Request account deletion'}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">
                        {language === 'fr' ? 'Supprimer ton compte ?' : 'Delete your account?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          {language === 'fr' 
                            ? 'Cette action est irréversible. Toutes tes données seront définitivement supprimées :'
                            : 'This action is irreversible. All your data will be permanently deleted:'}
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>{language === 'fr' ? 'Ton profil et avatar' : 'Your profile and avatar'}</li>
                          <li>{language === 'fr' ? 'Tes personnages WoW' : 'Your WoW characters'}</li>
                          <li>{language === 'fr' ? 'Tes vœux de classe' : 'Your class wishes'}</li>
                          <li>{language === 'fr' ? 'Tes messages sur le forum' : 'Your forum posts'}</li>
                        </ul>
                        <div className="pt-2">
                          <Label htmlFor="confirm-delete" className="text-foreground text-sm">
                            {language === 'fr' 
                              ? `Tape "${profile?.username}" pour confirmer`
                              : `Type "${profile?.username}" to confirm`}
                          </Label>
                          <Input
                            id="confirm-delete"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="mt-2 cosmic-input"
                            placeholder={profile?.username || ''}
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-muted">
                        {t.common.cancel}
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleRequestDeletion}
                        disabled={deleteConfirmText !== profile?.username || requestingDeletion}
                      >
                        {requestingDeletion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </GlowCard>
          </div>
        </div>

        {/* Avatar Crop Dialog */}
        {selectedImageSrc && (
          <AvatarCropDialog
            open={cropDialogOpen}
            onOpenChange={(open) => {
              setCropDialogOpen(open);
              if (!open) setSelectedImageSrc(null);
            }}
            imageSrc={selectedImageSrc}
            onCropComplete={handleCropComplete}
            loading={uploadingAvatar}
          />
        )}
      </main>
    </div>
  );
};

export default Profile;
