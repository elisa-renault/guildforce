import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { GuildMemberships } from '@/components/GuildMemberships';
import { Shield, Crown, Loader2, Link as LinkIcon } from 'lucide-react';

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
  const { user, profile } = useAuth();
  const [guilds, setGuilds] = useState<GuildWithMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const isConnected = !!profile?.battlenet_id;

  useEffect(() => {
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
  }, [user, navigate]);

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
          // Not connected to Battle.net
          <GlowCard className="max-w-md mx-auto p-8 text-center animate-fade-in">
            <LinkIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-muted-foreground mb-6 text-lg">{t.guild.noGuilds}</p>
            <CosmicButton onClick={() => navigate('/profile')}>
              {t.battlenet.connect}
            </CosmicButton>
          </GlowCard>
        ) : (
          <div className="space-y-8">
            {/* WoW Guild Memberships from Battle.net */}
            <GuildMemberships />

            {/* App Guilds the user has joined */}
            {guilds.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Guildes actives dans Guildforce</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guilds.map((guild, index) => (
                    <GlowCard 
                      key={guild.id}
                      className="p-6 animate-fade-in cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                      onClick={() => navigate(guild.role === 'gm' ? `/guild/${guild.id}` : `/guild/${guild.id}/wishes`)}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildList;
