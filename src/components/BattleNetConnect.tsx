import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicButton } from './CosmicButton';
import { GlowCard } from './GlowCard';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Gamepad2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';

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

// Map Battle.net class IDs to our class system
const BATTLENET_CLASS_MAP: Record<number, string> = {
  1: 'warrior',
  2: 'paladin',
  3: 'hunter',
  4: 'rogue',
  5: 'priest',
  6: 'death-knight',
  7: 'shaman',
  8: 'mage',
  9: 'warlock',
  10: 'monk',
  11: 'druid',
  12: 'demon-hunter',
  13: 'evoker',
};

export const BattleNetConnect: React.FC = () => {
  const { profile, session, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<WoWCharacter[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);

  const isConnected = !!profile?.battlenet_id;

  useEffect(() => {
    if (isConnected) {
      fetchCharacters();
    }
  }, [isConnected]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('battlenet_state');

    if (code && state && state === storedState) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('battlenet_state');
    }
  }, []);

  const fetchCharacters = async () => {
    if (!session?.access_token) return;

    setIsLoadingCharacters(true);
    try {
      const { data, error } = await supabase.functions.invoke('battlenet-auth/characters', {
        method: 'GET',
      });

      if (error) throw error;
      setCharacters(data.characters || []);
    } catch (error) {
      console.error('Error fetching characters:', error);
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
      sessionStorage.setItem('battlenet_state', state);

      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/auth-url', {
        body: { redirectUri, state },
      });

      if (error) throw error;

      // Redirect to Battle.net OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating Battle.net connection:', error);
      toast.error(t.errors.generic);
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        body: { code, redirectUri },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);
      
      await refreshProfile();
      setCharacters(data.characters?.map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name,
        realm: c.realm,
        realm_slug: c.realmSlug,
        class_id: c.classId,
        level: c.level,
        guild_name: c.guildName || null,
        is_main: false,
      })) || []);
    } catch (error) {
      console.error('Error completing Battle.net connection:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          battlenet_id: null,
          battlenet_token: null,
          battlenet_token_expires_at: null,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      // Delete characters
      await supabase.from('wow_characters').delete().eq('user_id', profile?.id);

      toast.success(t.battlenet.disconnected);
      await refreshProfile();
      setCharacters([]);
    } catch (error) {
      console.error('Error disconnecting Battle.net:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const setMainCharacter = async (characterId: string) => {
    try {
      // First, unset all as main
      await supabase
        .from('wow_characters')
        .update({ is_main: false })
        .eq('user_id', profile?.id);

      // Set the selected one as main
      await supabase
        .from('wow_characters')
        .update({ is_main: true })
        .eq('id', characterId);

      // Update local state
      setCharacters(chars => 
        chars.map(c => ({ ...c, is_main: c.id === characterId }))
      );

      // Update profile with main character name
      const mainChar = characters.find(c => c.id === characterId);
      if (mainChar) {
        await supabase
          .from('profiles')
          .update({ main_character_name: `${mainChar.name}-${mainChar.realm}` })
          .eq('id', profile?.id);
        await refreshProfile();
      }

      toast.success(t.battlenet.mainSet);
    } catch (error) {
      console.error('Error setting main character:', error);
      toast.error(t.errors.generic);
    }
  };

  const getClassName = (classId: number) => {
    return BATTLENET_CLASS_MAP[classId] || 'unknown';
  };

  return (
    <GlowCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Battle.net</h3>
        {isConnected && (
          <Badge variant="secondary" className="ml-auto">
            <CheckCircle className="w-3 h-3 mr-1" />
            {profile?.battletag}
          </Badge>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t.battlenet.connectDescription}
          </p>
          <CosmicButton
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.common.loading}
              </>
            ) : (
              <>
                <Gamepad2 className="w-4 h-4 mr-2" />
                {t.battlenet.connect}
              </>
            )}
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {t.battlenet.yourCharacters} ({characters.length})
                </p>
                <button
                  onClick={fetchCharacters}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t.battlenet.refresh}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {characters.slice(0, 20).map((char) => (
                  <div
                    key={char.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      char.is_main 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-background/30 hover:bg-background/50'
                    }`}
                    onClick={() => setMainCharacter(char.id)}
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
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.battlenet.noCharacters}
            </p>
          )}

          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              {t.battlenet.disconnect}
            </button>
          </div>
        </div>
      )}
    </GlowCard>
  );
};
