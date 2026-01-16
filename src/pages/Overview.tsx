import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getClassById, getRolesFromSpecs } from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { GuildSubNav } from '@/components/guild';
import { ActivePollWidget } from '@/components/polls';
import { RoleBadge } from '@/components/RoleBadge';
import { Loader2, Sparkles, Users, CheckCircle2, Shield, Heart, Swords } from 'lucide-react';
import { toSlug, getGuildWishesPath } from '@/lib/guildSlug';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { cn } from '@/lib/utils';

interface WishSummary {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
}

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
}

const Overview = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(false);
  const [commitmentStatus, setCommitmentStatus] = useState<CommitmentStatus>('undecided');
  const [myWishes, setMyWishes] = useState<WishSummary[]>([]);
  const [defaultRoster, setDefaultRoster] = useState<RosterData | null>(null);
  
  // Mini stats
  const [totalMembers, setTotalMembers] = useState(0);
  const [confirmedMembers, setConfirmedMembers] = useState(0);

  useEffect(() => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Find guild by slugified region, server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction, avatar_url');

      const matchedGuild = allGuilds?.find(g =>
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug &&
        toSlug(g.name) === guildSlug
      );

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      const foundGuildId = matchedGuild.id;
      setGuildId(foundGuildId);
      setGuild({
        name: matchedGuild.name,
        server: matchedGuild.server,
        region: matchedGuild.region || 'eu',
        faction: matchedGuild.faction,
        avatar_url: matchedGuild.avatar_url,
      });

      // Check membership and get status
      const { data: memberData, error: memberError } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        navigate('/guilds');
        return;
      }

      // Map DB status to CommitmentStatus
      const statusMap: Record<string, CommitmentStatus> = {
        'confirmed': 'confirmed',
        'potential': 'undecided',
        'withdrawn': 'withdrawn',
      };
      setCommitmentStatus(statusMap[memberData.status] || 'undecided');

      // Check if user is GM
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: foundGuildId,
        p_user_id: user.id,
      });
      setIsGM(!!gmCheck);

      // Check settings permissions
      const { data: settingsPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasSettingsPermission(!!gmCheck || !!settingsPerm);

      // Get default roster
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('id, name, is_default')
        .eq('guild_id', foundGuildId)
        .eq('is_default', true)
        .single();

      if (rostersData) {
        setDefaultRoster(rostersData);

        // Fetch my wishes for the default roster
        const { data: wishesData } = await supabase
          .from('class_wishes')
          .select('choice_index, class_id, spec_ids')
          .eq('guild_id', foundGuildId)
          .eq('user_id', user.id)
          .eq('roster_id', rostersData.id)
          .order('choice_index')
          .limit(3);

        if (wishesData) {
          setMyWishes(wishesData);
        }
      }

      // Get mini stats
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId);

      if (membersData) {
        setTotalMembers(membersData.length);
        setConfirmedMembers(membersData.filter(m => m.status === 'confirmed').length);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  const getStatusConfig = (status: CommitmentStatus) => {
    switch (status) {
      case 'confirmed':
        return {
          label: t.common.loading === 'Chargement...' ? 'Confirmé' : 'Confirmed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/30',
          icon: CheckCircle2,
        };
      case 'withdrawn':
        return {
          label: t.common.loading === 'Chargement...' ? 'Retrait' : 'Withdrawn',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/30',
          icon: Shield,
        };
      default:
        return {
          label: t.common.loading === 'Chargement...' ? 'Indécis' : 'Undecided',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10 border-yellow-500/30',
          icon: Heart,
        };
    }
  };

  const statusConfig = getStatusConfig(commitmentStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {/* Guild Sub-Navigation */}
      {guild && (
        <GuildSubNav
          guild={guild}
          basePath={basePath}
          isGM={isGM}
          hasSettingsPermission={hasSettingsPermission}
          activeTab="overview"
        />
      )}

      <main className="container mx-auto px-3 md:px-4 py-6 relative z-10">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-display cosmic-text mb-2">
            {t.common.loading === 'Chargement...' ? 'Bienvenue' : 'Welcome'}, {user?.user_metadata?.username || 'Aventurier'}
          </h1>
          <p className="text-muted-foreground">
            {guild?.name} • {guild?.server ? guild.server.charAt(0).toUpperCase() + guild.server.slice(1).toLowerCase() : ''}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column - My Status + Wishes */}
          <div className="space-y-4">
            {/* My Status Card */}
            <GlowCard className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">
                  {t.common.loading === 'Chargement...' ? 'Mon statut' : 'My Status'}
                </h2>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                  statusConfig.bgColor
                )}>
                  <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                  <span className={cn("text-sm font-medium", statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* My Wishes Summary */}
              <div className="space-y-2">
                <h3 className="text-sm text-muted-foreground mb-3">
                  {t.common.loading === 'Chargement...' ? 'Mes vœux' : 'My Wishes'}
                </h3>
                {myWishes.length > 0 ? (
                  <div className="space-y-2">
                    {myWishes.map((wish, index) => {
                      const wowClass = getClassById(wish.class_id);
                      const roles = getRolesFromSpecs(wish.spec_ids);
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          {wowClass && (
                            <span className={cn("text-sm font-medium", `text-${wowClass.color}`)}>
                              {wowClass.name[language]}
                            </span>
                          )}
                          <div className="flex gap-1 ml-auto">
                            {roles.map((role, i) => (
                              <RoleBadge key={i} role={role} size="sm" />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t.common.loading === 'Chargement...' 
                      ? "Vous n'avez pas encore défini vos vœux" 
                      : "You haven't set your wishes yet"}
                  </p>
                )}
              </div>

              {/* Edit Wishes Button */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <CosmicButton
                  onClick={() => guild && navigate(getGuildWishesPath(guild.region, guild.server, guild.name))}
                  icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                  className="w-full"
                >
                  {t.wishes?.editMyWishes || 'Modifier mes vœux'}
                </CosmicButton>
              </div>
            </GlowCard>

            {/* Mini Stats */}
            <GlowCard className="p-4">
              <h2 className="font-semibold text-foreground mb-3">
                {t.common.loading === 'Chargement...' ? 'Aperçu guilde' : 'Guild Overview'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.common.loading === 'Chargement...' ? 'Membres' : 'Members'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{confirmedMembers}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.common.loading === 'Chargement...' ? 'Confirmés' : 'Confirmed'}
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Right Column - Active Polls */}
          <div className="space-y-4">
            {guildId && guild && (
              <ActivePollWidget
                guildId={guildId}
                guildSlug={`${regionSlug}/${serverSlug}/${guildSlug}`}
                isGM={isGM}
              />
            )}
            
            {/* Quick Actions */}
            <GlowCard className="p-4">
              <h2 className="font-semibold text-foreground mb-3">
                {t.common.loading === 'Chargement...' ? 'Accès rapide' : 'Quick Access'}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`${basePath}/roster`)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <Swords className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {t.common.loading === 'Chargement...' ? 'Table de vœux' : 'Wishes Table'}
                  </span>
                </button>
                <button
                  onClick={() => navigate(`${basePath}/members`)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {t.common.loading === 'Chargement...' ? 'Membres' : 'Members'}
                  </span>
                </button>
              </div>
            </GlowCard>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Overview;
