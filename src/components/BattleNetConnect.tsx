import React, { useState, useEffect } from 'react';
import log from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { CosmicButton } from './CosmicButton';
import { GlowCard } from './GlowCard';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, RotateCcw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { getClassNameFromBattleNet } from '@/data/battlenetClasses';
import { BattleNetIcon } from './BattleNetIcon';
import { isBattleNetResyncAlreadyRunning, readFunctionErrorPayload } from '@/lib/battlenetSync';
import {
  type BattleNetRegion,
  ALL_REGIONS,
  getRegionLabel,
  parseOAuthState,
  validateOAuthState,
  getStoredOAuthParams,
  storeOAuthParams,
  cleanupOAuthParams,
  getRedirectUri,
  generateOAuthState,
  getValidRegion,
} from '@/lib/battlenetOAuth';

interface WoWCharacter {
  id: string;
  name: string;
  realm: string;
  realm_slug: string;
  class_id: number;
  level: number;
  guild_name: string | null;
  is_main: boolean;
}

interface BattleNetConnectProps {
  embedded?: boolean;
}

export const BattleNetConnect: React.FC<BattleNetConnectProps> = ({ embedded = false }) => {
  const { profile, session, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const language = t.lang;
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language, translations: t, fallback });
  const [isLoading, setIsLoading] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [characters, setCharacters] = useState<WoWCharacter[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');
  const [connectedRegion, setConnectedRegion] = useState<BattleNetRegion | null>(null);

  const isConnected = !!profile?.battlenet_id;

  // Fetch connected region from battlenet_tokens
  useEffect(() => {
    const fetchConnectedRegion = async () => {
      if (!isConnected || !profile?.id) return;
      
      const { data } = await supabase
        .from('battlenet_tokens')
        .select('region')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (data?.region) {
        setConnectedRegion(getValidRegion(data.region));
      }
    };
    
    fetchConnectedRegion();
  }, [isConnected, profile?.id]);

  useEffect(() => {
    if (isConnected && session?.access_token) {
      fetchCharacters();
    }
  }, [isConnected, session?.access_token]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');

    if (code && stateParam) {
      const { state: storedState, region: storedRegion } = getStoredOAuthParams();
      const parsedState = parseOAuthState(stateParam);
      const stateMatches = validateOAuthState(parsedState, storedState);

      // Process callback if code exists (state validation is best-effort due to cross-domain issues)
      if (stateMatches) {
        handleOAuthCallback(code, storedRegion);
        cleanupOAuthParams();
      }
    }
  }, []);

  const fetchCharacters = async () => {
    if (!session?.access_token) return;

    setIsLoadingCharacters(true);
    try {
      const { data, error } = await supabase.functions.invoke('battlenet-auth/characters', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setCharacters(data.characters || []);
    } catch (error) {
      log.error('Error fetching characters:', error);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const handleConnect = async (regionOverride?: BattleNetRegion) => {
    if (!session?.access_token) {
      toast.error(t.errors.unauthorized);
      return;
    }

    setIsLoading(true);
    try {
      const region = regionOverride ?? selectedRegion;
      const state = generateOAuthState();
      storeOAuthParams(state, region);

      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.functions.invoke('battlenet-auth/auth-url', {
        body: { redirectUri, state, region },
      });

      if (error) throw error;

      // Redirect to Battle.net OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      log.error('Error initiating Battle.net connection:', error);
      toast.error(t.errors.generic);
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, region: BattleNetRegion = 'eu') => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { code, redirectUri, region },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);

      // Refresh profile + refetch characters from the database to ensure we use real IDs
      await refreshProfile();
      await fetchCharacters();
    } catch (error) {
      log.error('Error completing Battle.net connection:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!session?.access_token || !profile?.id) return;

    setIsLoading(true);
    try {
      // 1. Clear battlenet_id from profile (only this column exists in profiles)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ battlenet_id: null })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 2. Delete tokens from battlenet_tokens table
      await supabase
        .from('battlenet_tokens')
        .delete()
        .eq('user_id', profile.id);

      // 3. Delete guild memberships first (due to foreign key constraints)
      await supabase.from('wow_guild_memberships').delete().eq('user_id', profile.id);

      // 4. Delete characters
      await supabase.from('wow_characters').delete().eq('user_id', profile.id);

      toast.success(t.battlenet.disconnected);
      await refreshProfile();
      setCharacters([]);
      setConnectedRegion(null);
    } catch (error) {
      log.error('Error disconnecting Battle.net:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const setMainCharacter = async (character: Pick<WoWCharacter, 'name' | 'realm_slug'>) => {
    if (!profile?.id) return;

    try {
      // Use a stable identity (name + realm_slug) because background sync can recreate rows with new UUIDs
      const { error } = await supabase.rpc('set_main_character_by_key', {
        p_name: character.name,
        p_realm_slug: character.realm_slug,
      });

      if (error) throw error;

      // Refresh UI state from source of truth
      await Promise.all([fetchCharacters(), refreshProfile()]);

      toast.success(t.battlenet.mainSet);
    } catch (error) {
      log.error('Error setting main character:', error);
      toast.error(t.errors.generic);
    }
  };

  const handleResync = async () => {
    if (!session?.access_token) return;

    setIsResyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('battlenet-auth/resync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (isBattleNetResyncAlreadyRunning(error)) {
        log.debug('Manual Battle.net resync skipped: already running');
        toast(t.battlenet.syncing);
        return;
      }

      if (error) throw error;
      
      // Check if backend returned an error (403, SYNC_FAILED, etc.)
      if (data && data.success === false) {
        const errorCode = data.errorCode;
        let errorMsg = data.error || t.battlenet.resyncError;
        
        // Use specific error messages based on errorCode
        if (errorCode === 'NO_LICENSE') {
          errorMsg = t.battlenet.errorNoLicense || errorMsg;
        } else if (errorCode === 'PARENTAL_CONTROLS') {
          errorMsg = t.battlenet.errorParentalControls || errorMsg;
        } else if (errorCode === 'TOKEN_EXPIRED') {
          errorMsg = t.battlenet.errorTokenExpired || errorMsg;
        }
        
        log.error('Resync failed:', errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Update UI with detected region if it changed
      if (data?.detectedRegion) {
        const newRegion = getValidRegion(data.detectedRegion);
        setConnectedRegion(newRegion);
        if (newRegion !== connectedRegion) {
          toast.success(`${t.battlenet.resyncSuccess} (${getRegionLabel(newRegion, language)})`);
        } else {
          toast.success(t.battlenet.resyncSuccess);
        }
      } else {
        toast.success(t.battlenet.resyncSuccess);
      }
      
      await Promise.all([fetchCharacters(), refreshProfile()]);
    } catch (error) {
      const payload = await readFunctionErrorPayload(error);

      if (isBattleNetResyncAlreadyRunning(error, payload)) {
        log.debug('Manual Battle.net resync skipped: already running');
        toast(t.battlenet.syncing);
        return;
      }

      log.error('Error resyncing characters:', error);

      const backendError = payload.error || '';
      const backendErrorCode = payload.errorCode || '';

      const mustReconnect =
        backendErrorCode === 'TOKEN_EXPIRED_NO_REFRESH' ||
        backendError.toLowerCase().includes('cannot be refreshed');

      if (mustReconnect) {
        toast.error(t.battlenet.resyncTokenExpired);
        await handleDisconnect();
        await handleConnect(connectedRegion ?? selectedRegion);
        return;
      }

      toast.error(backendError || t.battlenet.resyncError);
    } finally {
      setIsResyncing(false);
    }
  };

  const getClassName = (classId: number) => {
    return getClassNameFromBattleNet(classId);
  };

  const content = (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <BattleNetIcon className="h-5 w-5 text-primary" />
        <h3 className="text-base font-medium text-foreground">{s('battlenet.connect.title')}</h3>
        {isConnected && (
          <div className="ml-auto flex items-center gap-2">
            {connectedRegion && (
              <Badge variant="outline" className="text-xs">
                {getRegionLabel(connectedRegion, language)}
              </Badge>
            )}
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">
              <CheckCircle className="w-3 h-3 mr-1" />
              {profile?.battletag}
            </Badge>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t.battlenet.connectDescription}
          </p>
          
          {/* Region selector */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">{t.battlenet.selectRegion}</Label>
            <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as BattleNetRegion)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>
                    {getRegionLabel(region, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <CosmicButton
            onClick={handleConnect}
            disabled={isLoading}
            loading={isLoading}
            className="w-full"
            icon={<BattleNetIcon className="h-7 w-7" />}
          >
            {t.battlenet.connect}
          </CosmicButton>
        </div>
      ) : (
        <div className="space-y-3">
          {isLoadingCharacters ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : characters.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                {t.battlenet.yourCharacters} ({characters.length})
              </p>
              <div
                className="max-h-56 overflow-y-auto pr-1"
                tabIndex={0}
                aria-label={t.battlenet.yourCharacters}
              >
                {[...characters].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)).map((char) => (
                  <div
                    key={char.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 border-b px-1 py-2 transition-colors last:border-b-0 ${
                      char.is_main
                        ? 'border-primary/35 bg-primary/5'
                        : 'border-border/35 hover:bg-muted/20'
                    }`}
                    onClick={() => setMainCharacter({ name: char.name, realm_slug: char.realm_slug })}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded bg-wow-${getClassName(char.class_id)}/15`}>
                        <span className={`text-xs font-bold text-wow-${getClassName(char.class_id)}`}>
                          {char.level}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium text-wow-${getClassName(char.class_id)}`}>
                          {char.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{char.realm}</p>
                      </div>
                    </div>
                    {char.is_main && (
                      <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-medium">
                        {t.battlenet.main}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {t.battlenet.noCharacters}
              </p>
              <p className="text-xs text-muted-foreground/80">
                {t.battlenet.noCharactersHint}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/45 pt-2">
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-sm text-status-error hover:underline flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              {t.battlenet.disconnect}
            </button>
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="text-sm text-status-info hover:underline flex items-center gap-1"
            >
              {isResyncing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              {t.battlenet.resync}
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="min-w-0">{content}</div>;
  }

  return (
    <GlowCard surface="section" hoverable={false}>
      {content}
    </GlowCard>
  );
};
