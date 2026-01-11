import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Crown, Loader2, Link as LinkIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { getGuildPath } from '@/lib/guildSlug';
import { toast } from 'sonner';

type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan',
};

interface GuildWithMembership {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: 'horde' | 'alliance';
  role: string;
  owner_id: string;
}

const GuildList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, session, loading: authLoading, refreshProfile } = useAuth();
  const [guilds, setGuilds] = useState<GuildWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');

  const isConnected = !!profile?.battlenet_id;

  // Handle OAuth callback - must wait for session to be available
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    if (!session?.access_token) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');
    const storedState = localStorage.getItem('battlenet_state');
    const storedRegion = localStorage.getItem('battlenet_region') as BattleNetRegion || 'eu';

    if (code && stateParam) {
      let stateMatches = false;
      try {
        const parsedState = JSON.parse(stateParam);
        stateMatches = storedState ? parsedState.state === storedState : true;
      } catch {
        stateMatches = storedState ? stateParam === storedState : true;
      }

      if (stateMatches || !storedState) {
        handleOAuthCallback(code, storedRegion);
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('battlenet_state');
        localStorage.removeItem('battlenet_region');
      }
    }
  }, [authLoading, session?.access_token]);

  const handleOAuthCallback = async (code: string, region: BattleNetRegion = 'eu') => {
    if (!session?.access_token) return;

    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        body: { code, redirectUri, region },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);
      await refreshProfile();
    } catch (error) {
      console.error('Error completing Battle.net connection:', error);
      toast.error(t.errors.generic);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!session?.access_token) {
      toast.error(t.errors.unauthorized);
      return;
    }

    setIsConnecting(true);
    try {
      const state = crypto.randomUUID();
      localStorage.setItem('battlenet_state', state);
      localStorage.setItem('battlenet_region', selectedRegion);

      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/auth-url', {
        body: { redirectUri, state, region: selectedRegion },
      });

      if (error) throw error;

      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating Battle.net connection:', error);
      toast.error(t.errors.generic);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const fetchGuilds = async () => {
      const { data: memberships } = await supabase
        .from('guild_members')
        .select('guild_id, role')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const guildIds = memberships.map(m => m.guild_id);
        const { data: guildData } = await supabase
          .from('guilds')
          .select('id, name, server, region, faction, owner_id')
          .in('id', guildIds);

        if (guildData) {
          const merged = guildData.map(g => ({
            ...g,
            region: g.region || 'eu',
            faction: g.faction as 'horde' | 'alliance',
            role: memberships.find(m => m.guild_id === g.id)?.role || 'member',
          }));
          setGuilds(merged);
        }
      }
      setLoading(false);
    };

    fetchGuilds();
  }, [authLoading, user, navigate, profile?.battlenet_id]);

  if (authLoading || (loading && !user)) {
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

      <main className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="font-display text-3xl gradient-text mb-8 text-center">{t.common.myGuilds}</h1>

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
              <Label className="text-sm text-muted-foreground mb-2 block">{t.battlenet.selectRegion}</Label>
              <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as BattleNetRegion)}>
                <SelectTrigger className="w-full cosmic-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cosmic-glass border-border/50">
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
              disabled={isConnecting}
              loading={isConnecting}
              className="w-full gap-3"
              icon={<BattleNetIcon className="h-7 w-7" />}
            >
              <span className="whitespace-nowrap">{t.battlenet.connect}</span>
            </CosmicButton>
          </GlowCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds.length > 0 ? (
              guilds.map((guild) => (
                <GlowCard 
                  key={guild.id}
                  className="p-6 cursor-pointer hover:border-primary/50"
                  onClick={() => navigate(getGuildPath(guild.region, guild.server, guild.name))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/20">
                        <Shield className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{guild.name}</h3>
                        <p className="text-sm text-muted-foreground">{guild.server}</p>
                      </div>
                    </div>
                    {guild.role === 'gm' && (
                      <Crown className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                    )}
                  </div>
                </GlowCard>
              ))
            ) : (
              <GlowCard className="col-span-full p-8 text-center">
                <Shield className="h-16 w-16 mx-auto mb-6 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-muted-foreground text-lg">{t.guild.noGuilds}</p>
              </GlowCard>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildList;
