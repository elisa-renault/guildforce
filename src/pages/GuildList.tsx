import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Crown, Loader2, Link as LinkIcon } from 'lucide-react';
import { getGuildPath } from '@/lib/guildSlug';

interface GuildWithMembership {
  id: string;
  name: string;
  server: string;
  faction: 'horde' | 'alliance';
  role: string;
  owner_id: string;
}

const GuildList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const [guilds, setGuilds] = useState<GuildWithMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const isConnected = !!profile?.battlenet_id;

  useEffect(() => {
    // Wait for auth to finish loading before doing anything
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
          .select('id, name, server, faction, owner_id')
          .in('id', guildIds);

        if (guildData) {
          const merged = guildData.map(g => ({
            ...g,
            faction: g.faction as 'horde' | 'alliance',
            role: memberships.find(m => m.guild_id === g.id)?.role || 'member',
          }));
          setGuilds(merged);
        }
      }
      setLoading(false);
    };

    fetchGuilds();
  }, [authLoading, user, navigate]);

  // Show loading while auth is initializing
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isConnected ? (
          <GlowCard className="max-w-md mx-auto p-8 text-center">
            <LinkIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-muted-foreground mb-6 text-lg">{t.guild.noGuilds}</p>
            <CosmicButton onClick={() => navigate('/profile')}>
              {t.battlenet.connect}
            </CosmicButton>
          </GlowCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds.length > 0 ? (
              guilds.map((guild) => (
                <GlowCard 
                  key={guild.id}
                  className="p-6 cursor-pointer hover:border-primary/50"
                  onClick={() => navigate(getGuildPath(guild.server, guild.name))}
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
