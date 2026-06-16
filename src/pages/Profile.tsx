import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { getLanguageDisplayLabel, LANGUAGE_OPTIONS, isSupportedLanguage } from '@/i18n/config';
import { interpolateMessage } from '@/i18n/format';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BattleNetConnect } from '@/components/BattleNetConnect';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';

import { User, Save, Globe, Loader2, Sparkles, Upload, Trash2, ExternalLink, Shield, AlertTriangle, Settings, Info, Users, EyeOff } from 'lucide-react';

type BattletagVisibility = 'everyone' | 'guild_only' | 'nobody';

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
  const [battletagVisibility, setBattletagVisibility] = useState<BattletagVisibility>('everyone');
  const [deletionPending, setDeletionPending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;

  const ui = t.profile.ui;


  const profileSchema = z.object({
    username: z.string().min(2, t.profile.validation.usernameMin).max(30, t.profile.validation.usernameMax),
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
    const visibility = (
      profile as { battletag_visibility?: BattletagVisibility } | null
    )?.battletag_visibility;
    setBattletagVisibility(visibility || 'everyone');
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
        toast({ title: ui.setupSuccessTitle, description: ui.setupSuccessDesc });
        navigate('/guilds', { replace: true });
      } else {
        toast({ title: t.common.save, description: ui.updateSuccessDesc });
      }
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
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

  const handleBattletagVisibilityChange = async (value: BattletagVisibility) => {
    setBattletagVisibility(value);
    if (user) {
      await supabase.from('profiles').update({ battletag_visibility: value }).eq('id', user.id);
      toast({ 
        title: t.profile.battletagVisibility.saved,
      });
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
        title: ui.requestDeletionTitle,
        description: ui.requestDeletionDesc,
      });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
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
        title: ui.cancelDeletionTitle,
        description: ui.cancelDeletionDesc,
      });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: t.errors.generic, description: ui.selectImageError, variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t.errors.generic, description: ui.imageSizeError, variant: 'destructive' });
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
      toast({ title: ui.avatarUpdated });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
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
      toast({ title: ui.avatarRemoved });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
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
          <p className="text-foreground mb-2">{ui.profileNotFound}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {ui.reconnectHint}
          </p>
          <CosmicButton onClick={() => navigate('/auth')} className="w-full">
            {ui.backToLogin}
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
            <h1 className="font-display text-2xl text-foreground mb-2">{ui.welcomeTitle}</h1>
            <p className="text-muted-foreground text-sm">{ui.welcomeSubtitle}</p>
            {profile?.battletag && (
              <p className="text-xs text-muted-foreground mt-2">{interpolateMessage(ui.connectedAs, { battletag: profile.battletag })}</p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t.auth.pseudo}</FormLabel>
                  <FormControl>
                    <Input placeholder={ui.usernamePlaceholder} {...field} className="cosmic-input h-12 text-center text-lg" autoFocus />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">{ui.usernameHint}</p>
                </FormItem>
              )} />

              <div>
                <FormLabel htmlFor="profile-language-setup" className="text-foreground text-sm mb-2 block">
                  <Globe className="h-4 w-4 inline mr-2" strokeWidth={1.5} />
                  {t.profile.language}
                </FormLabel>
                <Select value={language} onValueChange={(val) => isSupportedLanguage(val) && handleLanguageChange(val)}>
                  <SelectTrigger id="profile-language-setup" className="cosmic-input">
                    <SelectValue placeholder={getLanguageDisplayLabel(language)} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>{getLanguageDisplayLabel(option.code)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <CosmicButton type="submit" className="w-full" size="lg" loading={saving}>{ui.getStarted}</CosmicButton>
            </form>
          </Form>
        </GlowCard>
      </div>
    );
  }

  // Normal profile view - modular grid layout
  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 space-y-6 py-6" width="app">
        <PageHeader
          icon={User}
          title={t.profile.title}
          description={profile.username}
          titleClassName="font-display"
          actions={(
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/u/${profile.username}`)}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ui.viewPublicProfile}
            </Button>
          )}
        />

        <div className="grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-2">
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
                    <img src={profile.avatar_url} alt={ui.avatarAlt} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-white" strokeWidth={1.5} />
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <input
                    id="profile-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="sr-only"
                    disabled={uploadingAvatar}
                  />
                  <Label
                    htmlFor="profile-avatar-upload"
                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    aria-disabled={uploadingAvatar}
                  >
                    <Upload className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    {t.profile.uploadAvatar}
                  </Label>
                  
                  {profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAvatar}
                      disabled={uploadingAvatar}
                      className="w-full text-status-error hover:text-status-error hover:bg-status-error/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      {t.profile.removeAvatar}
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 text-center">{t.profile.avatarHint}</p>
              </div>
            </GlowCard>

            {/* Profile form - Username only */}
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

                  <CosmicButton type="submit" className="w-full" loading={saving} icon={<Save className="h-4 w-4" strokeWidth={1.5} />}>
                    {ui.saveUsername}
                  </CosmicButton>
                </form>
              </Form>
            </GlowCard>

          </div>

          {/* Right column: Battle.net + Preferences + Danger Zone */}
          <div className="space-y-4">
            {/* Battle.net connection */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4">{t.profile.accountConnection}</h2>
              <BattleNetConnect />
            </GlowCard>

            {/* Preferences - Language + Privacy combined */}
            <GlowCard className="p-5" hoverable={false}>
              <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {ui.preferencesTitle}
              </h2>

              {/* Language selector */}
              <div className="mb-4 pb-4 border-b border-border">
                <Label htmlFor="profile-language" className="text-sm text-foreground flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  {t.profile.language}
                </Label>
                <Select value={language} onValueChange={(val) => isSupportedLanguage(val) && handleLanguageChange(val)}>
                  <SelectTrigger id="profile-language" className="cosmic-input mt-2">
                    <SelectValue placeholder={getLanguageDisplayLabel(language)} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>{getLanguageDisplayLabel(option.code)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t.common.savedAutomatically}
                </p>
              </div>

              {/* BattleTag visibility */}
              {profile?.battletag && (
                <div className="mb-4 pb-4 border-b border-border">
                  <Label className="text-sm text-foreground flex items-center gap-2 mb-3">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    {t.profile.battletagVisibility.label}
                  </Label>
                  <RadioGroup
                    value={battletagVisibility}
                    onValueChange={(val) => handleBattletagVisibilityChange(val as BattletagVisibility)}
                    className="space-y-2"
                  >
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="everyone" id="vis-everyone" className="mt-0.5" />
                      <Label htmlFor="vis-everyone" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-foreground">{t.profile.battletagVisibility.everyone}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.profile.battletagVisibility.everyoneDesc}</p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="guild_only" id="vis-guild" className="mt-0.5" />
                      <Label htmlFor="vis-guild" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-foreground">{t.profile.battletagVisibility.guildOnly}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.profile.battletagVisibility.guildOnlyDesc}</p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="nobody" id="vis-nobody" className="mt-0.5" />
                      <Label htmlFor="vis-nobody" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-foreground">{t.profile.battletagVisibility.nobody}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.profile.battletagVisibility.nobodyDesc}</p>
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.common.savedAutomatically}
                  </p>
                </div>
              )}

              {/* Privacy info - collapsible */}
              <details className="group">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ui.privacyTitle}
                </summary>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                    <p className="font-medium text-foreground">
                      {ui.privacyPublicTitle}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {ui.privacyPublicDesc}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                    <p className="font-medium text-foreground">
                      {ui.privacyGuildTitle}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {ui.privacyGuildDesc}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                    <p className="font-medium text-foreground">
                      {ui.privacyPrivateTitle}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {ui.privacyPrivateDesc}
                    </p>
                  </div>
                </div>
              </details>
            </GlowCard>

            {/* Danger Zone */}
            <GlowCard className="p-5 border-destructive/30" hoverable={false}>
              <h2 className="text-sm font-medium text-status-error mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-error" strokeWidth={1.5} />
                {ui.dangerZoneTitle}
              </h2>

              {deletionPending ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t.profile.deletion.pending}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDeletion}
                    className="w-full"
                  >
                    {t.profile.deletion.cancelRequest}
                  </Button>
                </div>
              ) : (
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-status-error hover:text-status-error hover:bg-status-error/10 border-status-error/30 whitespace-normal text-left h-auto py-2"
                    >
                      <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                      <span>{t.profile.deletion.requestDeletion}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">
                        {t.profile.deletion.confirmTitle}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          {t.profile.deletion.confirmDescription}
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>{t.profile.deletion.dataList.profile}</li>
                          <li>{t.profile.deletion.dataList.characters}</li>
                          <li>{t.profile.deletion.dataList.wishes}</li>
                          <li>{t.profile.deletion.dataList.contentContributions}</li>
                        </ul>
                        <div className="pt-2">
                          <Label htmlFor="confirm-delete" className="text-foreground text-sm">
                            {interpolateMessage(t.profile.deletion.typeToConfirm, { username: profile?.username || '' })}
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
                        {t.profile.deletion.confirmDeletion}
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
      </PageContainer>
    </div>
  );
};

export default Profile;
