import { Shield, Crown, Loader2, Link as LinkIcon, Users, MapPin, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BattleNetIcon } from '@/components/BattleNetIcon';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserGuilds } from '@/hooks/useUserGuilds';
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
import { getGuildPath, getGuildSettingsPath } from '@/lib/guildSlug';
import log from '@/lib/logger';
import { cn } from '@/lib/utils';

const GuildList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { guilds, loading, refresh: refreshGuilds } = useUserGuilds({ enabled: Boolean(user?.id) });
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');

  const isConnected = !!profile?.battlenet_id;

  const handleOAuthCallback = useCallback(async (code: string, region: BattleNetRegion = 'eu') => {
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
  }, [refreshGuilds, refreshProfile, t]);

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
  }, [authLoading, handleOAuthCallback, t.errors.generic]);

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

  const renderGuildRow = (guild: (typeof guilds)[number]) => {
    const isGm = !guild.isDetectedOnly && (guild.role === 'gm' || guild.owner_id === user?.id);
    const count = guild.isDetectedOnly ? guild.syncedCharacterCount : (guild.memberCount ?? 0);
    const countLabel = guild.isDetectedOnly
      ? String(count)
      : `${count} ${count === 1 ? t.guild.member : t.guild.memberPlural}`;
    const factionClasses = guild.faction === 'horde'
      ? 'bg-horde/20 text-horde ring-horde/25'
      : 'bg-alliance/20 text-alliance ring-alliance/25';

    const avatar = (
      <Avatar
        className={cn(
          'h-9 w-9 shrink-0 ring-1',
          !guild.avatar_url ? factionClasses : 'ring-border/40',
        )}
      >
        {guild.avatar_url ? (
          <AvatarImage src={guild.avatar_url} alt={guild.name} />
        ) : (
          <AvatarFallback className={factionClasses}>
            <Shield className="h-4 w-4" strokeWidth={1.5} />
          </AvatarFallback>
        )}
      </Avatar>
    );

    const guildIdentity = (
      <div className="flex min-w-0 items-center gap-2.5">
        {avatar}
        <div className="min-w-0 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-medium text-foreground">
              {guild.name}
            </h3>
            {guild.hasMain && (
              <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Main
              </span>
            )}
            {guild.isDetectedOnly && (
              <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                {t.guild.awaitingGM}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:hidden">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{guild.server}</span>
            </span>
            <span className="uppercase">{guild.region}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {countLabel}
            </span>
          </div>
        </div>
      </div>
    );

    const desktopLocation = (
      <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{guild.server}</span>
        <span className="shrink-0 uppercase">{guild.region}</span>
      </div>
    );

    const desktopCount = (
      <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
        <Users className="h-4 w-4 shrink-0" />
        <span className="truncate">{countLabel}</span>
      </div>
    );

    return (
      <div
        key={guild.id || `${guild.region}-${guild.server}-${guild.name}`}
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border px-3 py-2 transition-colors md:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.75fr)_minmax(120px,0.45fr)_minmax(76px,auto)] md:gap-4 md:px-3',
          guild.hasMain
            ? 'border-primary/30 bg-primary/10 hover:border-primary/50'
            : 'border-border/50 bg-card/45 hover:border-border hover:bg-card/70',
          guild.isDetectedOnly && 'border-warning/20 bg-warning/5 hover:border-warning/30',
        )}
      >
        {guild.isDetectedOnly ? (
          <>
            <div className="min-w-0">{guildIdentity}</div>
            {desktopLocation}
            {desktopCount}
          </>
        ) : (
          <button
            type="button"
            className="col-span-1 grid min-w-0 grid-cols-1 items-center gap-3 rounded text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:col-span-3 md:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.75fr)_minmax(120px,0.45fr)] md:gap-4"
            onClick={() => navigate(getGuildPath(guild.region, guild.server, guild.name))}
          >
            {guildIdentity}
            {desktopLocation}
            {desktopCount}
          </button>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2">
          {isGm && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(getGuildSettingsPath(guild.region, guild.server, guild.name));
                }}
                className="flex h-7 w-7 items-center justify-center rounded bg-muted/55 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title={t.guildSettings.title}
              >
                <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <Crown className="h-4 w-4 text-warning" strokeWidth={1.5} />
            </>
          )}
        </div>
      </div>
    );
  };

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

      <PageContainer as="main" className="relative z-10 mx-auto max-w-5xl space-y-4 py-4 md:py-5" width="app">
        <PageHeader
          icon={Shield}
          title={t.common.myGuilds}
          titleClassName="font-sans font-medium"
          bordered={false}
        />

        {loading || isConnecting ? (
          <GlowCard surface="section" hoverable={false} className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </GlowCard>
        ) : !isConnected ? (
          <GlowCard surface="section" className="mx-auto max-w-md text-center">
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
        ) : guilds.length > 0 ? (
          <div className="space-y-1.5">
            {guilds.map(renderGuildRow)}
          </div>
        ) : (
          <EmptyState icon={Shield} title={t.guild.noGuilds} className="p-10" />
        )}
      </PageContainer>
    </div>
  );
};

export default GuildList;

