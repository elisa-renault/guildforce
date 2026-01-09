import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Shield, Users, Plus, ArrowLeft, Crown, Loader2 } from 'lucide-react';

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
  const { user } = useAuth();
  const [guilds, setGuilds] = useState<GuildWithMembership[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen relative">
      <CosmicBackground />

      <header className="sticky top-0 z-50 cosmic-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t.guild.members}</h1>
          <div className="flex gap-2">
            <CosmicButton size="sm" variant="outline" onClick={() => navigate('/guild/join')}>
              <Users className="h-4 w-4 mr-2" /> {t.guild.join}
            </CosmicButton>
            <CosmicButton size="sm" onClick={() => navigate('/guild/create')}>
              <Plus className="h-4 w-4 mr-2" /> {t.guild.create}
            </CosmicButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : guilds.length === 0 ? (
          <GlowCard className="max-w-md mx-auto p-8 text-center animate-fade-in">
            <Shield className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <p className="text-muted-foreground mb-6 text-lg">{t.guild.noMembers}</p>
            <div className="flex gap-3 justify-center">
              <CosmicButton onClick={() => navigate('/guild/create')}>
                {t.home.createGuild}
              </CosmicButton>
              <CosmicButton variant="outline" onClick={() => navigate('/guild/join')}>
                {t.home.joinGuild}
              </CosmicButton>
            </div>
          </GlowCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds.map((guild, index) => (
              <GlowCard 
                key={guild.id}
                variant={guild.faction}
                className="p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                onClick={() => navigate(guild.role === 'gm' ? `/guild/${guild.id}` : `/guild/${guild.id}/wishes`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      guild.faction === 'horde' ? 'gradient-horde' : 'gradient-alliance'
                    }`}>
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{guild.name}</h3>
                      <p className="text-sm text-muted-foreground">{guild.server}</p>
                    </div>
                  </div>
                  {guild.role === 'gm' && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={guild.faction === 'horde' 
                      ? 'border-horde/50 text-horde bg-horde/10' 
                      : 'border-alliance/50 text-alliance bg-alliance/10'
                    }
                  >
                    {guild.faction === 'horde' ? t.guild.horde : t.guild.alliance}
                  </Badge>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {guild.role.toUpperCase()}
                  </Badge>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildList;
