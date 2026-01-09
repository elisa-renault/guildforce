import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, Plus, ArrowLeft, Crown } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <h1 className="text-xl font-bold">{t.guild.members}</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/guild/join')}>
              <Users className="h-4 w-4 mr-2" /> {t.guild.join}
            </Button>
            <Button size="sm" onClick={() => navigate('/guild/create')}>
              <Plus className="h-4 w-4 mr-2" /> {t.guild.create}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-muted-foreground">{t.common.loading}</div>
        ) : guilds.length === 0 ? (
          <Card className="glass max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">{t.guild.noMembers}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/guild/create')}>{t.home.createGuild}</Button>
                <Button variant="outline" onClick={() => navigate('/guild/join')}>{t.home.joinGuild}</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.map(guild => (
              <Card 
                key={guild.id} 
                className={`glass cursor-pointer hover:glow-${guild.faction === 'horde' ? 'horde' : 'alliance'} transition-all`}
                onClick={() => navigate(guild.role === 'gm' ? `/guild/${guild.id}` : `/guild/${guild.id}/wishes`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className={`h-5 w-5 ${guild.faction === 'horde' ? 'text-horde' : 'text-alliance'}`} />
                      {guild.name}
                    </CardTitle>
                    {guild.role === 'gm' && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <CardDescription>{guild.server}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={guild.faction === 'horde' ? 'border-horde text-horde' : 'border-alliance text-alliance'}>
                      {guild.faction === 'horde' ? t.guild.horde : t.guild.alliance}
                    </Badge>
                    <Badge variant="secondary">{guild.role.toUpperCase()}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuildList;
