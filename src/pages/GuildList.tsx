import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Crown, Loader2, Link as LinkIcon, Users, MapPin } from 'lucide-react';
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
  memberCount?: number;
  hasMain?: boolean;
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

  const loadGuilds = async (userId: string) => {
    setLoading(true);

    const { data: memberships, error: membershipsError } = await supabase
      .from('guild_members')
      .select('guild_id, role')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('Error fetching guild memberships:', membershipsError);
      setGuilds([]);
      setLoading(false);
      return;
    }

    if (memberships && memberships.length > 0) {
      const guildIds = memberships.map(m => m.guild_id);
      
      // Fetch guilds, member counts, and user's main character info
      const [guildResult, memberCountsResult, mainCharResult] = await Promise.all([
        supabase
          .from('guilds')
          .select('id, name, server, region, faction, owner_id')
          .in('id', guildIds),
        supabase
          .from('guild_members')
          .select('guild_id')
          .in('guild_id', guildIds),
        supabase
          .from('wow_characters')
          .select('id, is_main, name')
          .eq('user_id', userId)
          .eq('is_main', true)
          .limit(1)
      ]);

      if (guildResult.error) {
        console.error('Error fetching guilds:', guildResult.error);
        setGuilds([]);
        setLoading(false);
        return;
      }

      // Count members per guild
      const memberCounts: Record<string, number> = {};
      memberCountsResult.data?.forEach(m => {
        memberCounts[m.guild_id] = (memberCounts[m.guild_id] || 0) + 1;
      });

      // Check if main character is in any guild
      let mainGuildMembership: { guild_name: string; guild_realm: string } | null = null;
      if (mainCharResult.data?.[0]) {
        const mainCharId = mainCharResult.data[0].id;
        const { data: mainMembership } = await supabase
          .from('wow_guild_memberships')
          .select('guild_name, guild_realm')
          .eq('character_id', mainCharId)
          .limit(1);
        mainGuildMembership = mainMembership?.[0] || null;
      }

      if (guildResult.data) {
        const merged: GuildWithMembership[] = guildResult.data.map(g => {
          // Check if this guild matches the main's guild
          const hasMain = mainGuildMembership 
            ? mainGuildMembership.guild_name.toLowerCase() === g.name.toLowerCase() &&
              mainGuildMembership.guild_realm.toLowerCase() === g.server.toLowerCase().replace(/\s+/g, '-')
            : false;
          
          return {
            ...g,
            region: g.region || 'eu',
            faction: g.faction as 'horde' | 'alliance',
            role: memberships.find(m => m.guild_id === g.id)?.role || 'member',
            memberCount: memberCounts[g.id] || 0,
            hasMain,
          };
        });
        
        // Sort: main's guild first, then by name
        merged.sort((a, b) => {
          if (a.hasMain && !b.hasMain) return -1;
          if (!a.hasMain && b.hasMain) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setGuilds(merged);
      }
    } else {
      setGuilds([]);
    }

    setLoading(false);
  };

  // Handle OAuth callback (return from Battle.net)
  // Important: don't rely on AuthContext timing; Supabase client session is persisted and may be available
  // before our context state updates.
  useEffect(() => {
    if (authLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');
    const storedState = localStorage.getItem('battlenet_state');
    const storedRegion = (localStorage.getItem('battlenet_region') as BattleNetRegion) || 'eu';

    if (!code || !stateParam) return;

    // Parse the state JSON to extract the actual state value
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
    } else {
      toast.error(t.errors.generic);
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

      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      const { data, error } = await supabase.functions.invoke('battlenet-auth/callback', {
        body: { code, redirectUri, region },
      });

      if (error) throw error;

      toast.success(`${t.battlenet.connected} : ${data.battletag}`);
      await refreshProfile();

      if (user?.id) {
        await loadGuilds(user.id);
      }
    } catch (error) {
      console.error('Error completing Battle.net connection:', error);
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

    loadGuilds(user.id);
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
          <div className="flex flex-col gap-2">
            {guilds.length > 0 ? (
              guilds.map((guild) => (
                <div 
                  key={guild.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    guild.hasMain 
                      ? 'bg-primary/10 border-primary/30 hover:border-primary/50' 
                      : 'bg-card/50 border-border/50 hover:border-border hover:bg-card/80'
                  }`}
                  onClick={() => navigate(getGuildPath(guild.region, guild.server, guild.name))}
                >
                  {/* Faction icon */}
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                    guild.faction === 'horde' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Shield className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  
                  {/* Guild info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{guild.name}</h3>
                      {guild.hasMain && (
                        <span className="text-[10px] uppercase tracking-wider text-primary font-medium px-1.5 py-0.5 rounded bg-primary/20">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {guild.server.charAt(0).toUpperCase() + guild.server.slice(1)}
                      </span>
                      <span className="uppercase">{guild.region}</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {guild.memberCount}
                      </span>
                    </div>
                  </div>
                  
                  {/* Role badge */}
                  {guild.role === 'gm' && (
                    <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center rounded-lg border border-dashed border-border/50">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" strokeWidth={1.5} />
                <p className="text-muted-foreground">{t.guild.noGuilds}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildList;
