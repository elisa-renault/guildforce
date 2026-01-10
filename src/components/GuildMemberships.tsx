import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from './GlowCard';
import { Badge } from '@/components/ui/badge';
import { CosmicButton } from './CosmicButton';
import { Crown, Users, Shield, Loader2, Clock } from 'lucide-react';

interface GuildMembership {
  id: string;
  guild_name: string;
  guild_realm: string;
  guild_realm_slug: string;
  guild_faction: string;
  rank_index: number;
  rank_name: string | null;
  is_guild_master: boolean;
  character_id: string;
  wow_characters?: {
    name: string;
    realm: string;
    class_id: number;
  };
}

interface AppGuild {
  id: string;
  name: string;
  server: string;
  owner_id: string | null;
}

interface AppGuildMembership {
  guild_id: string;
  role: string;
  guilds: AppGuild;
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

export const GuildMemberships: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const [memberships, setMemberships] = useState<GuildMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appGuilds, setAppGuilds] = useState<Map<string, { id: string; role: string; hasOwner: boolean }>>(new Map());

  const isConnected = !!profile?.battlenet_id;

  // Fetch app guilds the user is a member of
  useEffect(() => {
    if (user?.id) {
      fetchAppGuilds();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isConnected && user?.id) {
      fetchMemberships();
    }
  }, [isConnected, user?.id]);

  const fetchAppGuilds = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('guild_members')
      .select('guild_id, role, guilds (id, name, server, owner_id)')
      .eq('user_id', user.id);
    
    if (data) {
      const guildMap = new Map(
        data.map(g => {
          const guild = g.guilds as unknown as AppGuild;
          return [`${guild.name.toLowerCase()}-${guild.server.toLowerCase()}`, { 
            id: guild.id, 
            role: g.role,
            hasOwner: guild.owner_id !== null
          }];
        })
      );
      setAppGuilds(guildMap);
    }
  };

  const fetchMemberships = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wow_guild_memberships')
        .select(`
          *,
          wow_characters (
            name,
            realm,
            class_id
          )
        `)
        .eq('user_id', user.id)
        .order('rank_index', { ascending: true });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error('Error fetching guild memberships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getClassName = (classId: number) => {
    return BATTLENET_CLASS_MAP[classId] || 'unknown';
  };

  const getAppGuildInfo = (guildName: string, guildRealm: string): { id: string; role: string; hasOwner: boolean } | null => {
    return appGuilds.get(`${guildName.toLowerCase()}-${guildRealm.toLowerCase()}`) || null;
  };

  if (!isConnected) {
    return null;
  }

  // Group memberships by guild
  const guildGroups = memberships.reduce((acc, membership) => {
    const key = `${membership.guild_name}-${membership.guild_realm_slug}`;
    if (!acc[key]) {
      acc[key] = {
        guild_name: membership.guild_name,
        guild_realm: membership.guild_realm,
        guild_faction: membership.guild_faction,
        is_gm: false,
        members: [],
      };
    }
    if (membership.is_guild_master) {
      acc[key].is_gm = true;
    }
    acc[key].members.push(membership);
    return acc;
  }, {} as Record<string, { guild_name: string; guild_realm: string; guild_faction: string; is_gm: boolean; members: GuildMembership[] }>);

  const guilds = Object.values(guildGroups);

  return (
    <GlowCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{t.guild.myGuilds}</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : guilds.length > 0 ? (
        <div className="space-y-4">
          {guilds.map((guild) => {
            const appGuildInfo = getAppGuildInfo(guild.guild_name, guild.guild_realm);
            const isInApp = !!appGuildInfo;
            const isAppGM = appGuildInfo?.role === 'gm';
            const isOrphan = appGuildInfo && !appGuildInfo.hasOwner;

            return (
              <div
                key={`${guild.guild_name}-${guild.guild_realm}`}
                className={`p-4 rounded-lg border transition-colors ${
                  isInApp
                    ? isAppGM
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-primary/50 bg-primary/10'
                    : 'border-border/50 bg-background/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {guild.is_gm ? (
                      <Crown className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <h4 className="font-semibold text-foreground">{guild.guild_name}</h4>
                      <p className="text-xs text-muted-foreground">{guild.guild_realm}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-muted-foreground border-border/50"
                    >
                      {guild.guild_faction === 'HORDE' ? 'Horde' : 'Alliance'}
                    </Badge>
                    {guild.is_gm && (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/50">
                        <Crown className="w-3 h-3 mr-1" />
                        {t.guild.guildMaster}
                      </Badge>
                    )}
                    {isOrphan && (
                      <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                        <Clock className="w-3 h-3 mr-1" />
                        {t.guild.awaitingGM}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Characters in this guild */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.guild.yourCharacters}:
                  </p>
                  {guild.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded bg-background/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-wow-${getClassName(member.wow_characters?.class_id || 0)}`}>
                          {member.wow_characters?.name || 'Unknown'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {member.is_guild_master ? (
                          <span className="text-amber-500">{t.guild.rank0}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {member.rank_name || `Rank ${member.rank_index}`}
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Actions - show access button if guild exists in app */}
                {isInApp && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <CosmicButton
                      size="sm"
                      onClick={() => navigate(isAppGM ? `/guild/${appGuildInfo.id}` : `/guild/${appGuildInfo.id}/wishes`)}
                      className="w-full"
                    >
                      <Shield className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      {t.guild.accessGuild}
                    </CosmicButton>
                  </div>
                )}

                {/* If not in app and is GM, show message that guild will be created on next sync */}
                {!isInApp && guild.is_gm && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground text-center">
                      {t.guild.pendingSync}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t.guild.noGuilds}
        </p>
      )}
    </GlowCard>
  );
};