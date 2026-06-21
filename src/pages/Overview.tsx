import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { GuildWorkspaceShell } from '@/components/guild';
import { ActivePollWidget } from '@/components/polls';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutDashboard, Loader2, Sparkles, Users, CheckCircle2, Shield, Heart, Swords, ChevronDown, Eye } from 'lucide-react';
import { getGuildWishesPath } from '@/lib/guildSlug';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { cn } from '@/lib/utils';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { toneCalloutClass, toneTextClass, wowClassTextClass } from '@/lib/design-tokens';

interface WishSummary {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  validation_status: string;
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
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { user, loading: authLoading } = useAuth();
  const { isAdmin: isGlobalAdmin, loading: adminLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(false);
  const [commitmentStatus, setCommitmentStatus] = useState<CommitmentStatus>('undecided');
  const [myWishes, setMyWishes] = useState<WishSummary[]>([]);
  const [defaultRoster, setDefaultRoster] = useState<RosterData | null>(null);
  
  // Admin read-only mode (global admin viewing guild without membership)
  const [isAdminReadOnly, setIsAdminReadOnly] = useState(false);
  
  // Mini stats
  const [totalMembers, setTotalMembers] = useState(0);
  const [confirmedMembers, setConfirmedMembers] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    // Wait for admin check to complete
    if (adminLoading) return;

    const fetchData = async () => {
      const matchedGuild = await findGuildByRouteSlugs({
        supabase,
        regionSlug,
        serverSlug,
        guildSlug,
      });

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
        .maybeSingle();

      // Track admin read-only mode locally to avoid stale closure
      let adminReadOnly = false;

      // If not a member but is global admin, allow read-only access
      if (memberError || !memberData) {
        if (isGlobalAdmin) {
          adminReadOnly = true;
          setIsAdminReadOnly(true);
          setCommitmentStatus('undecided');
        } else {
          navigate('/guilds');
          return;
        }
      } else {
        // Map DB status to CommitmentStatus
        const statusMap: Record<string, CommitmentStatus> = {
          'confirmed': 'confirmed',
          'potential': 'undecided',
          'withdrawn': 'withdrawn',
        };
        setCommitmentStatus(statusMap[memberData.status] || 'undecided');
      }

      // Check if user is GM (or global admin for settings access)
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: foundGuildId,
        p_user_id: user.id,
      });
      setIsGM(!!gmCheck);

      // Check settings permissions (global admins always have view access)
      const { data: settingsPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasSettingsPermission(!!gmCheck || !!settingsPerm || isGlobalAdmin);

      // Get default roster
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('id, name, is_default')
        .eq('guild_id', foundGuildId)
        .eq('is_default', true)
        .single();

      // Only fetch user's wishes if they are a member (not admin read-only)
      if (rostersData && !adminReadOnly) {
        setDefaultRoster(rostersData);

        const { data: activeSeason } = await supabase
          .from('roster_wish_seasons')
          .select('id')
          .eq('guild_id', foundGuildId)
          .eq('roster_id', rostersData.id)
          .eq('state', 'active')
          .order('activated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!activeSeason) {
          setMyWishes([]);
        } else {
          // Fetch my wishes for the active season of the default roster.
          const { data: wishesData } = await supabase
            .from('class_wishes')
            .select('choice_index, class_id, spec_ids, spec_order, validation_status')
            .eq('guild_id', foundGuildId)
            .eq('user_id', user.id)
            .eq('roster_id', rostersData.id)
            .eq('season_id', activeSeason.id)
            .order('choice_index');

          if (wishesData) {
            const uniqueWishes = new Map<number, WishSummary>();

            for (const wish of wishesData) {
              if (uniqueWishes.has(wish.choice_index)) continue;

              uniqueWishes.set(wish.choice_index, {
                choice_index: wish.choice_index,
                class_id: wish.class_id,
                spec_ids: resolveSpecOrder(wish.spec_ids || [], wish.spec_order),
                validation_status: wish.validation_status,
              });
            }

            setMyWishes(Array.from(uniqueWishes.values()));
          }
        }
      } else if (rostersData) {
        setDefaultRoster(rostersData);
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
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, navigate, adminLoading, isGlobalAdmin]);

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
          label: t.wishes.commitment.confirmed,
          color: toneTextClass('success'),
          bgColor: toneCalloutClass('success'),
          icon: CheckCircle2,
        };
      case 'withdrawn':
        return {
          label: t.wishes.commitment.withdrawn,
          color: toneTextClass('error'),
          bgColor: toneCalloutClass('error'),
          icon: Shield,
        };
      default:
        return {
          label: t.wishes.commitment.undecided,
          color: toneTextClass('warning'),
          bgColor: toneCalloutClass('warning'),
          icon: Heart,
        };
    }
  };

  const statusConfig = getStatusConfig(commitmentStatus);
  const StatusIcon = statusConfig.icon;
  const greetingName = user?.user_metadata?.username;

  if (!guild) return null;

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={hasSettingsPermission}
      activeTab="overview"
      context={{
        roster: defaultRoster?.name,
        status: statusConfig.label,
      }}
    >
      <PageContainer as="main" className="relative z-10 py-5 md:py-6" width="workspace">
        {/* Admin read-only banner */}
        {isAdminReadOnly && (
          <div className={cn("flex items-center justify-center gap-2 mb-4 p-2 rounded-lg border", toneCalloutClass('warning'))}>
            <Eye className={cn("h-4 w-4", toneTextClass('warning'))} />
            <span className={cn("text-sm font-medium", toneTextClass('warning'))}>
              {s('overview.admin_read_only')}
            </span>
          </div>
        )}

        <PageHeader
          className="mb-4"
          icon={LayoutDashboard}
          title={`${t.guildNav.welcome}${greetingName ? `, ${greetingName}` : ''}`}
          description={`${guild?.name} • ${guild?.server || ''}`}
          titleClassName="font-sans font-medium"
          bordered={false}
          meta={(
            <>
              <Badge variant="secondary" className="text-xs">
                {totalMembers} {t.guild.members}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', statusConfig.bgColor, statusConfig.color)}>
                <StatusIcon className="mr-1 h-3.5 w-3.5" />
                {statusConfig.label}
              </Badge>
            </>
          )}
        />

        <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          {/* Left Column - My Status + Wishes */}
          <div className="space-y-4 min-w-0">
            {/* My Status Card */}
            <GlowCard surface="section" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-medium text-foreground">
                  {t.guildNav.myStatus}
                </h2>
                {/* Show first approved wish if any */}
                {(() => {
                  const firstApproved = myWishes.find(w => w.validation_status === 'approved');
                  if (firstApproved) {
                    const wowClass = getClassById(firstApproved.class_id);
                    return (
                      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border shrink-0", toneCalloutClass('success'))}>
                        <CheckCircle2 className={cn("h-4 w-4", toneTextClass('success'))} />
                        <span className={cn("text-sm font-medium", toneTextClass('success'))}>
                          {t.wishes.choice} #{firstApproved.choice_index}
                          {wowClass && (
                            <span className="ml-1 opacity-80">
                              ({getLocalizedClassName(wowClass.id, language)})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30 border-border/50 shrink-0">
                      <span className="text-sm text-muted-foreground">
                        {t.guildNav.noWishApproved}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* My Wishes Summary */}
              <div className="space-y-2">
                <h3 className="text-sm text-muted-foreground mb-3">
                  {t.guildNav.myWishes}
                </h3>
                {myWishes.length > 0 ? (
                  <div className="space-y-2">
                    {/* First 3 wishes - always visible */}
                    {myWishes.slice(0, 3).map((wish, index) => {
                      const wowClass = getClassById(wish.class_id);
                      const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean);
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {wish.choice_index}
                          </div>
                          {wowClass && (
                            <span className={cn("text-sm font-medium", wowClassTextClass(wowClass.id))}>
                              {getLocalizedClassName(wowClass.id, language)}
                            </span>
                          )}
                          <div className="flex gap-1 ml-auto flex-wrap justify-end">
                            {specs.map((spec) => (
                              <Badge key={spec!.id} variant="outline" className="text-xs px-1.5 py-0.5">
                                {getLocalizedSpecName(spec!.id, language)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Wishes 4+ - collapsible */}
                    {myWishes.length > 3 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1 group">
                          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                          <span>
                            {interpolateMessage(s('overview.more_wishes'), { count: myWishes.length - 3 })}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {myWishes.slice(3).map((wish) => {
                            const wowClass = getClassById(wish.class_id);
                            const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean);
                            
                            return (
                              <div key={wish.choice_index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                  {wish.choice_index}
                                </div>
                                {wowClass && (
                                  <span className={cn("text-sm font-medium", wowClassTextClass(wowClass.id))}>
                                    {getLocalizedClassName(wowClass.id, language)}
                                  </span>
                                )}
                                <div className="flex gap-1 ml-auto flex-wrap justify-end">
                                  {specs.map((spec) => (
                                    <Badge key={spec!.id} variant="outline" className="text-xs px-1.5 py-0.5">
                                      {getLocalizedSpecName(spec!.id, language)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t.guildNav.noWishesYet}
                  </p>
                )}
              </div>

              {/* Edit Wishes Button */}
              <div className="mt-3">
                <CosmicButton
                  onClick={() => guild && navigate(getGuildWishesPath(guild.region, guild.server, guild.name))}
                  icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                  className="w-full"
                >
                  {t.wishes.editMyWishes}
                </CosmicButton>
              </div>
            </GlowCard>

            {/* Mini Stats */}
            <GlowCard surface="section">
              <h2 className="font-medium text-foreground mb-3">
                {t.guildNav.guildOverview}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-medium text-foreground">{totalMembers}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.guild.members}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-healer/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-healer" />
                  </div>
                  <div>
                    <p className="text-xl font-medium text-foreground">{confirmedMembers}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.dashboard.confirmedPlayers}
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Right Column - Active Polls */}
          <div className="space-y-4 min-w-0">
            {guildId && guild && (
              <ActivePollWidget
                guildId={guildId}
                guildSlug={`${regionSlug}/${serverSlug}/${guildSlug}`}
                isGM={isGM}
              />
            )}
            
            {/* Quick Actions */}
            <GlowCard surface="section">
              <h2 className="font-medium text-foreground mb-3">
                {t.guildNav.quickAccess}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`${basePath}/roster`)}
                  className="flex items-center gap-2 rounded border border-border/35 bg-background/25 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
                >
                  <Swords className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {t.guildNav.wishesTable}
                  </span>
                </button>
                <button
                  onClick={() => navigate(`${basePath}/members`)}
                  className="flex items-center gap-2 rounded border border-border/35 bg-background/25 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {t.guild.members}
                  </span>
                </button>
              </div>
            </GlowCard>
          </div>
        </div>
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default Overview;
