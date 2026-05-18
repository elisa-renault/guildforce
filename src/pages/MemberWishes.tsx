import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Heart, Swords, Crosshair, CheckCircle, HelpCircle, XCircle, Pencil, ArrowLeft, Lock, Unlock } from 'lucide-react';
import { CosmicButton } from '@/components/CosmicButton';
import { getGuildPath } from '@/lib/guildSlug';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import {
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getSpecById,
  Specialization,
} from '@/data/wowClasses';
import { WishValidationBadge } from '@/components/dashboard/WishValidationBadge';
import { RosterSelectionStatus, ValidationStatus } from '@/types/guild';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBattletagVisibility } from '@/hooks/useBattletagVisibility';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { toneBadgeClass, toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeasonSelector, SeasonStateCallout } from '@/components/seasons/SeasonSelector';
import { isSeasonFilteringEnabled, isSeasonSchemaUnavailable, type SeasonSupportMode } from '@/lib/seasonSupport';
import type { GuildSeason } from '@/types/seasons';

interface WishChoice {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  comment: string | null;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
}

// Get the appropriate icon for a spec based on role and range
const getSpecIcon = (spec: Specialization) => {
  if (spec.role === 'tank') return Shield;
  if (spec.role === 'healer') return Heart;
  return spec.range === 'ranged' ? Crosshair : Swords;
};

const roleConfig: Record<string, { color: string }> = {
  tank: { color: 'text-tank' },
  healer: { color: 'text-healer' },
  dps: { color: 'text-dps' },
};

const MemberWishes = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, memberId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<{ id: string; name: string; server: string; region: string } | null>(null);
  const [seasons, setSeasons] = useState<GuildSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonSupportMode, setSeasonSupportMode] = useState<SeasonSupportMode>('enabled');
  const [member, setMember] = useState<{ username: string; battletag: string | null; status: string; rosterDecision: RosterSelectionStatus } | null>(null);
  const [wishes, setWishes] = useState<WishChoice[]>([]);
  const [isGM, setIsGM] = useState(false);
  const [canManageWishes, setCanManageWishes] = useState(false);
  const [memberWishesLocked, setMemberWishesLocked] = useState(false);
  const [lockingMember, setLockingMember] = useState(false);
  const [validatingWish, setValidatingWish] = useState<number | null>(null);
  const [updatingRosterDecision, setUpdatingRosterDecision] = useState(false);
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;
  
  // Use the centralized hook for BattleTag visibility
  // skipSelfCheck: true ensures user sees what OTHERS would see on their member page
  const { canSeeBattletag, isLoading: battletagLoading } = useBattletagVisibility(
    memberId,
    { skipSelfCheck: true }
  );

  // Handle back navigation - use history or fallback to roster page
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (guild) {
      navigate(`${getGuildPath(guild.region, guild.server, guild.name)}/roster`);
    }
  }, [navigate, guild]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug || !memberId) {
      navigate('/auth');
      return;
    }

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
      
      setGuild({ id: matchedGuild.id, name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu' });
      const requestedSeasonId = searchParams.get('seasonId');
      let initialSeason: GuildSeason | null = null;
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('guild_seasons')
        .select('*')
        .eq('guild_id', matchedGuild.id)
        .order('state', { ascending: true })
        .order('created_at', { ascending: false });
      if (seasonsError && isSeasonSchemaUnavailable(seasonsError)) {
        setSeasonSupportMode('legacy');
        setSeasons([]);
        setSelectedSeasonId(null);
      } else {
        const nextSeasons = (seasonsData || []) as GuildSeason[];
        if (nextSeasons.length === 0) {
          setSeasonSupportMode('legacy');
          setSeasons([]);
          setSelectedSeasonId(null);
        } else {
          setSeasonSupportMode('enabled');
          setSeasons(nextSeasons);
          initialSeason =
            nextSeasons.find((season) => season.id === requestedSeasonId) ||
            nextSeasons.find((season) => season.state === 'active') ||
            nextSeasons[0] ||
            null;
          setSelectedSeasonId(initialSeason?.id || null);
        }
      }

      // Check if current user is GM
      if (user) {
        const { data: memberRole } = await supabase
          .from('guild_members')
          .select('role')
          .eq('guild_id', matchedGuild.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const userIsGM = memberRole?.role === 'gm';
        setIsGM(userIsGM);

        const { data: manageWishesPerm } = await supabase.rpc('has_guild_permission', {
          p_guild_id: matchedGuild.id,
          p_permission: 'manage_wishes',
          p_user_id: user.id,
        });
        setCanManageWishes(!!userIsGM || !!manageWishesPerm);
      }
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status, user_id, wishes_locked')
        .eq('guild_id', matchedGuild.id)
        .eq('user_id', memberId)
        .single();

      if (!memberData) {
        navigate(getGuildPath(matchedGuild.region || 'eu', matchedGuild.server, matchedGuild.name));
        return;
      }

      // Get profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, battletag')
        .eq('id', memberId)
        .single();

      if (profileData) {
        const { data: intentData } = initialSeason
          ? await supabase
              .from('guild_season_member_intents')
              .select('commitment_status')
              .eq('guild_id', matchedGuild.id)
              .eq('season_id', initialSeason.id)
              .eq('user_id', memberId)
              .maybeSingle()
          : { data: null };
        setMember({
          username: profileData.username,
          battletag: profileData.battletag,
          status: intentData?.commitment_status || memberData.status,
          rosterDecision: 'undecided',
        });
      }

      setMemberWishesLocked(!!memberData.wishes_locked);

      // Get wishes with validation info
      let wishesQuery = supabase
        .from('class_wishes')
        .select('choice_index, class_id, spec_ids, spec_order, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', matchedGuild.id)
        .eq('user_id', memberId);
      if (initialSeason?.id) {
        wishesQuery = wishesQuery.eq('season_id', initialSeason.id);
      }
      const { data: wishesData } = await wishesQuery.order('choice_index');

      if (wishesData) {
        setWishes(wishesData.map(w => ({
          choice_index: w.choice_index,
          class_id: w.class_id,
          spec_ids: resolveSpecOrder(w.spec_ids || [], w.spec_order),
          comment: w.comment,
          validation_status: (w.validation_status as ValidationStatus) || 'pending',
          validated_by: w.validated_by,
          validated_at: w.validated_at,
        })));
      }

      const rosterId = searchParams.get('rosterId');
      if (rosterId) {
        const { data: rosterInGuild } = await supabase
          .from('rosters')
          .select('id')
          .eq('id', rosterId)
          .eq('guild_id', matchedGuild.id)
          .maybeSingle();

        if (rosterInGuild) {
          const { data: selectionRows } = await supabase.rpc(
            'get_roster_member_selection',
            initialSeason?.id ? { p_roster_id: rosterId, p_season_id: initialSeason.id } : { p_roster_id: rosterId }
          );
          const memberSelection = (selectionRows || []).find((row) => row.user_id === memberId);
          if (memberSelection?.selection_status) {
            setMember((prev) => prev ? { ...prev, rosterDecision: memberSelection.selection_status as RosterSelectionStatus } : prev);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, memberId, navigate, searchParams]);

  // Handle validation
  const handleValidation = async (choiceIndex: number, status: ValidationStatus) => {
    if (!guild || !memberId || !user) return;
    if (seasonSupportMode === 'enabled' && (!selectedSeasonId || selectedSeason?.state !== 'active')) return;
    
    setValidatingWish(choiceIndex);
    
    // Optimistic update
    setWishes(prev => prev.map(w => 
      w.choice_index === choiceIndex 
        ? { ...w, validation_status: status, validated_by: user.id, validated_at: new Date().toISOString() }
        : w
    ));

    let updateQuery = supabase
      .from('class_wishes')
      .update({
        validation_status: status,
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq('guild_id', guild.id)
      .eq('user_id', memberId)
      .eq('choice_index', choiceIndex);
    if (seasonSupportMode === 'enabled' && selectedSeasonId) {
      updateQuery = updateQuery.eq('season_id', selectedSeasonId);
    }
    const { error } = await updateQuery;

    if (error) {
      toast.error(t.errors.generic);
      // Revert on error
      let reloadQuery = supabase
        .from('class_wishes')
        .select('choice_index, class_id, spec_ids, spec_order, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', guild.id)
        .eq('user_id', memberId);
      if (seasonSupportMode === 'enabled' && selectedSeasonId) {
        reloadQuery = reloadQuery.eq('season_id', selectedSeasonId);
      }
      const { data } = await reloadQuery.order('choice_index');
      if (data) {
        setWishes(data.map(w => ({
          choice_index: w.choice_index,
          class_id: w.class_id,
          spec_ids: resolveSpecOrder(w.spec_ids || [], w.spec_order),
          comment: w.comment,
          validation_status: (w.validation_status as ValidationStatus) || 'pending',
          validated_by: w.validated_by,
          validated_at: w.validated_at,
        })));
      }
    } else {
      const statusLabel = status === 'approved' 
        ? t.wishes.validation.approved
        : status === 'rejected'
        ? t.wishes.validation.rejected
        : t.wishes.validation.pending;
      toast.success(`${t.wishes.title.split(' ')[0]} ${statusLabel.toLowerCase()}`);
    }
    
    setValidatingWish(null);
  };


  const handleRosterDecisionChange = async (status: RosterSelectionStatus) => {
    if (!guild || !memberId || !user || !canManageWishes) return;
    if (seasonSupportMode === 'enabled' && (!selectedSeasonId || selectedSeason?.state !== 'active')) return;
    const rosterId = searchParams.get('rosterId');
    if (!rosterId) return;

    const previous = member?.rosterDecision || 'undecided';
    const now = new Date().toISOString();
    setUpdatingRosterDecision(true);
    setMember((prev) => (prev ? { ...prev, rosterDecision: status } : prev));

    try {
      const { error } = await supabase
        .from('roster_member_selection')
        .upsert(
          seasonSupportMode === 'enabled' && selectedSeasonId
            ? {
                roster_id: rosterId,
                season_id: selectedSeasonId,
                user_id: memberId,
                selection_status: status,
                decided_by: user.id,
                decided_at: now,
              }
            : {
                roster_id: rosterId,
                user_id: memberId,
                selection_status: status,
                decided_by: user.id,
                decided_at: now,
              },
          { onConflict: seasonSupportMode === 'enabled' ? 'roster_id,season_id,user_id' : 'roster_id,user_id' }
        );
      if (error) throw error;
    } catch (error: unknown) {
      setMember((prev) => (prev ? { ...prev, rosterDecision: previous } : prev));
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingRosterDecision(false);
    }
  };

  const handleToggleMemberLock = async () => {
    if (!guild || !memberId) return;
    setLockingMember(true);
    try {
      const { error } = await supabase.rpc('set_member_wishes_locked', {
        p_guild_id: guild.id,
        p_member_id: memberId,
        p_locked: !memberWishesLocked,
      });
      if (error) throw error;
      const nextLocked = !memberWishesLocked;
      setMemberWishesLocked(nextLocked);
      toast.success(nextLocked ? t.wishes.memberLockedToast : t.wishes.memberUnlockedToast);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLockingMember(false);
    }
  };

  const getRosterDecisionBadge = (selectionStatus: RosterSelectionStatus | undefined) => {
    switch (selectionStatus) {
      case 'selected':
        return {
          label: t.wishes.rosterDecision.selected,
          className: 'bg-healer/20 text-healer border-healer/30',
        };
      case 'bench':
        return {
          label: t.wishes.rosterDecision.bench,
          className: toneBadgeClass('warning'),
        };
      case 'not_selected':
        return {
          label: t.wishes.rosterDecision.notSelected,
          className: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      default:
        return {
          label: t.wishes.rosterDecision.undecided,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const choiceLabels = [
    t.wishes.preferredChoice,
    t.wishes.secondChoice,
    t.wishes.thirdChoice,
  ];
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const isSelectedSeasonActive = seasonSupportMode === 'legacy' || selectedSeason?.state === 'active';
  const selectSeason = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const next = new URLSearchParams(searchParams);
    next.set('seasonId', seasonId);
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {/* Header bar */}
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <PageContainer className="px-3 md:px-4 py-3 flex items-center justify-between" width="wide">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title={t.common.back}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{member?.username}</h1>
              {canSeeBattletag && member?.battletag && (
                <p className="text-xs text-muted-foreground">{member.battletag}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <SeasonSelector
              seasons={seasons}
              selectedSeasonId={selectedSeasonId}
              onSelect={selectSeason}
              emptyLabel={seasonSupportMode === 'legacy' ? t.seasons.legacyMode : undefined}
            />
            {/* Status badge */}
            {member && (
              <Badge 
                variant={member.status === 'confirmed' ? 'default' : 'outline'}
                className={cn(
                  "text-xs px-2 py-1",
                  member.status === 'confirmed' 
                    ? 'bg-healer/20 text-healer border-healer/30' 
                    : member.status === 'withdrawn'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : toneBadgeClass('warning')
                )}
              >
                {member.status === 'confirmed' ? (
                  <><CheckCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.confirmed}</>
                ) : member.status === 'withdrawn' ? (
                  <><XCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.withdrawn}</>
                ) : (
                  <><HelpCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.undecided}</>
                )}
              </Badge>
            )}

            {memberWishesLocked && (
              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-1 flex items-center gap-1", toneBadgeClass('warning'))}
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t.wishes.lockedTitle}
              </Badge>
            )}
            
            {/* Edit button for own wishes */}
            {user?.id === memberId && guild && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                disabled={!isSelectedSeasonActive}
                onClick={() => navigate(`${getGuildPath(guild.region, guild.server, guild.name)}/wishes${selectedSeasonId ? `?seasonId=${encodeURIComponent(selectedSeasonId)}` : ''}`)}
              >
                {t.common.edit}
              </CosmicButton>
            )}

            {canManageWishes && guild && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={memberWishesLocked ? <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />}
                loading={lockingMember}
                onClick={handleToggleMemberLock}
              >
                {memberWishesLocked ? t.wishes.unlockMember : t.wishes.lockMember}
              </CosmicButton>
            )}
          </div>
        </PageContainer>
      </div>

      <PageContainer as="main" className="px-3 md:px-4 py-4 relative z-10" width="wide">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-display cosmic-text">
            {user?.id === memberId 
              ? t.wishes.title 
              : `${t.wishes.wishesOf} ${member?.username || ''}`
            }
          </h2>
        </div>

        {seasonSupportMode === 'legacy' ? (
          <div className={cn('mb-4 rounded-lg border p-3 text-sm', toneCalloutClass('info'))}>
            <span className={toneTextClass('info')}>{t.seasons.legacyModeHint}</span>
          </div>
        ) : (
          selectedSeason && <SeasonStateCallout season={selectedSeason} />
        )}

        {memberWishesLocked && (
          <div className={cn("mb-4 rounded-lg border p-3 flex items-start gap-2", toneCalloutClass('warning'))}>
            <Lock className={cn("h-4 w-4 mt-0.5", toneTextClass('warning'))} />
            <div className="text-sm">
              <div className="font-medium">{t.wishes.lockedTitle}</div>
              <div className={cn("opacity-80", toneTextClass('warning'))}>{t.wishes.lockedMemberDesc}</div>
            </div>
          </div>
        )}

        <GlowCard className="p-4 mb-4" hoverable={false}>
          <div className="space-y-2">
            <div className="text-sm uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.summaryTitle}</div>
            {canManageWishes && searchParams.get('rosterId') ? (
              <Select
                value={member?.rosterDecision || 'undecided'}
                onValueChange={(value) => handleRosterDecisionChange(value as RosterSelectionStatus)}
                disabled={updatingRosterDecision || !isSelectedSeasonActive}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undecided">{t.wishes.rosterDecision.undecided}</SelectItem>
                  <SelectItem value="selected">{t.wishes.rosterDecision.selected}</SelectItem>
                  <SelectItem value="bench">{t.wishes.rosterDecision.bench}</SelectItem>
                  <SelectItem value="not_selected">{t.wishes.rosterDecision.notSelected}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant="outline"
                className={cn('text-xs px-2 py-1', getRosterDecisionBadge(member?.rosterDecision).className)}
              >
                {getRosterDecisionBadge(member?.rosterDecision).label}
              </Badge>
            )}
          </div>
        </GlowCard>

        <div className="mb-3">
          <h3 className="text-sm font-medium text-foreground">{t.wishes.rosterDecision.validationDetailsTitle}</h3>
        </div>

        {wishes.length === 0 ? (
          <GlowCard className="p-6 text-center" hoverable={false}>
            <p className="text-muted-foreground">
              {t.wishes.noWishes}
            </p>
          </GlowCard>
        ) : (
          <div className="space-y-2">
            {wishes.map((wish, index) => {
              const cls = getClassById(wish.class_id);
              const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean) as Specialization[];

              return (
                <GlowCard key={wish.choice_index} className="p-3 md:p-4" hoverable={false}>
                  <div className="grid grid-cols-1 lg:grid-cols-[40px_200px_1fr_1fr_auto] gap-3 lg:gap-4 items-center">
                    {/* Choice number */}
                    <div className="hidden lg:flex w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 items-center justify-center border border-primary/20">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* Class */}
                    {cls ? (
                      <div 
                        className="h-9 w-full rounded-md flex items-center px-3 text-sm font-medium"
                        style={{ 
                          backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                          color: `hsl(var(--class-${cls.id}))`
                        }}
                      >
                        <span className="lg:hidden mr-2 text-xs text-muted-foreground">#{index + 1}</span>
                        {getLocalizedClassName(cls.id, language)}
                      </div>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">—</span>
                      </div>
                    )}

                    {/* Specs */}
                    {specs.length > 0 ? (
                      <div className="h-9 w-full rounded-md border border-border bg-card/50 flex items-center px-3 gap-3 overflow-x-auto">
                        {specs.map((spec, idx) => {
                          const config = roleConfig[spec.role];
                          const Icon = getSpecIcon(spec);
                          return (
                            <span key={spec.id} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                              {idx > 0 && <span className="text-muted-foreground/50 mr-1">•</span>}
                              <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                              <span className="text-foreground">{getLocalizedSpecName(spec.id, language)}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground/30" />
                        <Heart className="h-4 w-4 text-muted-foreground/30" />
                        <Swords className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Comment */}
                    {wish.comment ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-9 w-full min-w-0 rounded-md border border-border bg-card/50 flex items-center px-3 overflow-hidden cursor-help">
                              <span className="text-sm text-foreground truncate">{wish.comment}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                            <p>{wish.comment}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">—</span>
                      </div>
                    )}

                    {/* Validation badge */}
                    <div className="flex justify-end lg:justify-center">
                      <WishValidationBadge
                        status={wish.validation_status}
                        validatedBy={wish.validated_by}
                        validatedAt={wish.validated_at}
                        isGM={isGM}
                        onValidate={isGM && isSelectedSeasonActive ? (status) => handleValidation(wish.choice_index, status) : undefined}
                        loading={validatingWish === wish.choice_index}
                      />
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default MemberWishes;
