import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Crown, Loader2, Link as LinkIcon, Users, MapPin, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserGuilds } from '@/hooks/useUserGuilds';
import { getGuildPath, getGuildSettingsPath } from '@/lib/guildSlug';
import { toast } from 'sonner';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  type BattleNetRegion,
  REGION_LABELS,
  ALL_REGIONS,
  parseOAuthState,
  validateOAuthState,
  getStoredOAuthParams,
  storeOAuthParams,
  cleanupOAuthParams,
  getRedirectUri,
  generateOAuthState,
} from '@/lib/battlenetOAuth';
import log from '@/lib/logger';

const GuildList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { guilds, loading, refresh: refreshGuilds } = useUserGuilds({ enabled: Boolean(user?.id) });
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');

  const isConnected = !!profile?.battlenet_id;

  // Handle OAuth callback (return from Battle.net)
  useEffect(() => {
    if (authLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');

    if (!code || !stateParam) return;

    const { state: storedState, region: storedRegion } = getStoredOAuthParams();
    const parsedState = parseOAuthState(stateParam);
    const stateMatches = validateOAuthState(parsedState, storedState);

    if (stateMatches) {
      handleOAuthCallback(code, storedRegion);
      cleanupOAuthParams();
    } else {
      toast.error(t.errors.generic);
      cleanupOAuthParams();
    }
  }, [authLoading]);

  const handleOAuthCallback = async (code: string, region: BattleNetRegion = 'eu') => {
    setIsConnecting(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        toast.error(t.errors.unauthorized);
        return;
      }

      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        body: { code, redirectUri, region },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);
      await refreshProfile();
      await refreshGuilds();
    } catch (error) {
      log.error('Error completing Battle.net connection:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      toast.error(t.errors.unauthorized);
      return;
    }

    setIsConnecting(true);
    try {
      const state = generateOAuthState();
      storeOAuthParams(state, selectedRegion);

      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.functions.invoke('battlenet-auth/auth-url', {
        body: { redirectUri, state, region: selectedRegion },
      });

      if (error) throw error;

      window.location.href = data.authUrl;
    } catch (error) {
      log.error('Error initiating Battle.net connection:', error);
      toast.error(t.errors.generic);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading || (loading && !user)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 space-y-6 py-8" width="app">
        <PageHeader
          icon={Shield}
          title={t.common.myGuilds}
          description={profile?.battletag || profile?.username}
          titleClassName="font-display"
        />

        {loading || isConnecting ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isConnected ? (
          <GlowCard className="max-w-md mx-auto p-8 text-center">
            <LinkIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-muted-foreground mb-6 text-lg">{t.guild.noGuilds}</p>
            
            {/* Region selector */}
            <div className="mb-4 text-left">
              <Label htmlFor="guilds-region" className="text-sm text-muted-foreground mb-2 block">{t.battlenet.selectRegion}</Label>
              <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as BattleNetRegion)}>
                <SelectTrigger id="guilds-region" className="w-full cosmic-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cosmic-glass border-border/50">
                  {ALL_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {REGION_LABELS[region]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <CosmicButton
              onClick={handleConnect}
              disabled={isConnecting}
              loading={isConnecting}
              className="w-full gap-3"
              icon={<BattleNetIcon className="h-7 w-7" />}
            >
              <span className="whitespace-nowrap">{t.battlenet.connect}</span>
            </CosmicButton>
          </GlowCard>
        ) : (
          <div className="flex max-w-5xl flex-col gap-2">
            {guilds.length > 0 ? (
              guilds.map((guild) => (
                <div 
                  key={guild.id || `${guild.region}-${guild.server}-${guild.name}`}
                  className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto] items-center gap-3 md:gap-6 px-4 py-3 rounded-lg border transition-colors ${
                    guild.hasMain 
                      ? 'bg-primary/10 border-primary/30 hover:border-primary/50' 
                      : 'bg-card/50 border-border/50 hover:border-border hover:bg-card/80'
                  }`}
                >
                  {guild.isDetectedOnly ? (
                    <div className="col-span-2 md:col-span-3 grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6">
                      <Avatar className={`h-10 w-10 flex-shrink-0 ${
                        guild.faction === 'horde' ? 'bg-horde/20' : 'bg-alliance/20'
                      }`}>
                        <AvatarFallback className={`${
                          guild.faction === 'horde'
                            ? 'bg-horde/20 text-horde'
                            : 'bg-alliance/20 text-alliance'
                        }`}>
                          <Shield className="h-5 w-5" strokeWidth={1.5} />
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{guild.name}</h3>
                          {guild.hasMain && (
                            <span className="text-[10px] uppercase tracking-wider text-primary font-medium px-1.5 py-0.5 rounded bg-primary/20 flex-shrink-0">
                              Main
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-wider text-warning font-medium px-1.5 py-0.5 rounded bg-warning/20 flex-shrink-0">
                            {t.guild.awaitingGM}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {guild.server}
                          </span>
                          <span className="uppercase">{guild.region}</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-[60px]">
                        <Users className="h-4 w-4" />
                        <span>{guild.syncedCharacterCount}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="col-span-2 md:col-span-3 grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => navigate(getGuildPath(guild.region, guild.server, guild.name))}
                    >
                      <Avatar className={`h-10 w-10 flex-shrink-0 ${
                        !guild.avatar_url ? (guild.faction === 'horde'
                          ? 'bg-horde/20'
                          : 'bg-alliance/20') : ''
                      }`}>
                        {guild.avatar_url ? (
                          <AvatarImage src={guild.avatar_url} alt={guild.name} />
                        ) : (
                          <AvatarFallback className={`${
                            guild.faction === 'horde'
                              ? 'bg-horde/20 text-horde'
                              : 'bg-alliance/20 text-alliance'
                          }`}>
                            <Shield className="h-5 w-5" strokeWidth={1.5} />
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{guild.name}</h3>
                          {guild.hasMain && (
                            <span className="text-[10px] uppercase tracking-wider text-primary font-medium px-1.5 py-0.5 rounded bg-primary/20 flex-shrink-0">
                              Main
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {guild.server}
                          </span>
                          <span className="uppercase">{guild.region}</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-[60px]">
                        <Users className="h-4 w-4" />
                        <span>{guild.memberCount} {guild.memberCount === 1 ? t.guild.member : t.guild.memberPlural}</span>
                      </div>
                    </button>
                  )}
                  
                  {/* Role badge and settings */}
                  <div className="col-span-1 flex items-center justify-end gap-2 flex-shrink-0">
                    <span className="md:hidden flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {guild.isDetectedOnly ? guild.syncedCharacterCount : guild.memberCount}
                    </span>
                    {!guild.isDetectedOnly && (guild.role === 'gm' || guild.owner_id === user?.id) && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getGuildSettingsPath(guild.region, guild.server, guild.name));
                          }}
                          className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          title={t.guildSettings.title}
                        >
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        </button>
                        <Crown className="h-4 w-4 text-warning" strokeWidth={1.5} />
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Shield} title={t.guild.noGuilds} />
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default GuildList;

