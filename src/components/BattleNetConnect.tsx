import React, { useState, useEffect } from 'react';
import log from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicButton } from './CosmicButton';
import { GlowCard } from './GlowCard';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, RotateCcw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { getClassNameFromBattleNet } from '@/data/battlenetClasses';
import { BattleNetIcon } from './BattleNetIcon';

type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan',
};

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

export const BattleNetConnect: React.FC = () => {
  const { profile, session, refreshProfile } = useAuth();
  const { t } = useLanguage();
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
        setConnectedRegion(data.region as BattleNetRegion);
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
    // Use localStorage instead of sessionStorage for better persistence across redirects
    const storedState = localStorage.getItem('battlenet_state');
    const storedRegion = localStorage.getItem('battlenet_region') as BattleNetRegion || 'eu';

    if (code && stateParam) {
      // Parse the state JSON to extract the actual state value
      let stateMatches = false;
      try {
        const parsedState = JSON.parse(stateParam);
        stateMatches = storedState ? parsedState.state === storedState : true;
      } catch {
        // If not JSON, try direct comparison (fallback)
        stateMatches = storedState ? stateParam === storedState : true;
      }

      // Process callback if code exists (state validation is best-effort due to cross-domain issues)
      if (stateMatches || !storedState) {
        handleOAuthCallback(code, storedRegion);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('battlenet_state');
        localStorage.removeItem('battlenet_region');
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

  const handleConnect = async () => {
    if (!session?.access_token) {
      toast.error(t.errors.unauthorized);
      return;
    }

    setIsLoading(true);
    try {
      // Generate a random state for CSRF protection
      const state = crypto.randomUUID();
      // Use localStorage for better persistence across external redirects
      localStorage.setItem('battlenet_state', state);
      localStorage.setItem('battlenet_region', selectedRegion);

      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/auth-url', {
        body: { redirectUri, state, region: selectedRegion },
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
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { code, redirectUri, region },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);

      // Refresh profile + refetch characters from the database to ensure we use real IDs
      // (the callback response does not guarantee a characters payload)
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

      if (error) throw error;
      
      // Check if backend returned an error (403, SYNC_FAILED, etc.)
      if (data && data.success === false) {
        const errorMsg = data.error || t.battlenet.resyncError;
        log.error('Resync failed:', errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Update UI with detected region if it changed
      if (data?.detectedRegion) {
        setConnectedRegion(data.detectedRegion as BattleNetRegion);
        if (data.detectedRegion !== connectedRegion) {
          toast.success(`${t.battlenet.resyncSuccess} (${REGION_LABELS[data.detectedRegion as BattleNetRegion]})`);
        } else {
          toast.success(t.battlenet.resyncSuccess);
        }
      } else {
        toast.success(t.battlenet.resyncSuccess);
      }
      
      await Promise.all([fetchCharacters(), refreshProfile()]);
    } catch (error) {
      log.error('Error resyncing characters:', error);
      toast.error(t.battlenet.resyncError);
    } finally {
      setIsResyncing(false);
    }
  };

  const getClassName = (classId: number) => {
    return getClassNameFromBattleNet(classId);
  };

  return (
    <GlowCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <BattleNetIcon className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Battle.net</h3>
        {isConnected && (
          <div className="ml-auto flex items-center gap-2">
            {connectedRegion && (
              <Badge variant="outline" className="text-xs">
                {REGION_LABELS[connectedRegion]}
              </Badge>
            )}
            <Badge variant="secondary">
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
                {(Object.keys(REGION_LABELS) as BattleNetRegion[]).map((region) => (
                  <SelectItem key={region} value={region}>
                    {REGION_LABELS[region]}
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
        <div className="space-y-4">
          {isLoadingCharacters ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : characters.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                {t.battlenet.yourCharacters} ({characters.length})
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {[...characters].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)).slice(0, 20).map((char) => (
                  <div
                    key={char.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      char.is_main 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-background/30 hover:bg-background/50'
                    }`}
                    onClick={() => setMainCharacter({ name: char.name, realm_slug: char.realm_slug })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-wow-${getClassName(char.class_id)}/20`}>
                        <span className={`text-xs font-bold text-wow-${getClassName(char.class_id)}`}>
                          {char.level}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium text-wow-${getClassName(char.class_id)}`}>
                          {char.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{char.realm}</p>
                      </div>
                    </div>
                    {char.is_main && (
                      <Badge variant="outline" className="text-xs">
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

          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              {t.battlenet.disconnect}
            </button>
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="text-sm text-primary hover:underline flex items-center gap-1"
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
    </GlowCard>
  );
};
