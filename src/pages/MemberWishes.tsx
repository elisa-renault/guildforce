import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildWorkspaceShell } from '@/components/guild/GuildWorkspaceShell';
import { ContextualToolbar } from '@/components/layout/ContextualToolbar';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Heart, Swords, Crosshair, CheckCircle2, XCircle, Pencil, ArrowLeft, Lock, Unlock, History, UserCheck, UserMinus, UserX, Armchair, Clock } from 'lucide-react';
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
import { MemberWishEditor } from '@/components/dashboard/MemberWishEditor';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { RosterSeasonOutcome, RosterSelectionStatus, ValidationStatus, WishData } from '@/types/guild';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBattletagVisibility } from '@/hooks/useBattletagVisibility';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { commitmentBadgeClass, toneBadgeClass, toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeasonSelector, SeasonStateCallout } from '@/components/seasons/SeasonSelector';
import { isSeasonSchemaUnavailable, type SeasonSupportMode } from '@/lib/seasonSupport';
import type { GuildSeason } from '@/types/seasons';
import { interpolateMessage } from '@/i18n/format';
import { resolveWishLockState } from '@/lib/wishLock';

interface WishChoice {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  comment: string | null;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
}

interface SeasonMemberDetails {
  seasonMemberId: string | null;
  rosterCacheId: string | null;
  displayName: string | null;
  characterName: string | null;
  realm: string | null;
  rankIndex: number | null;
  source: string | null;
  seasonStatus: string | null;
  locked: boolean;
  selectionStatus: RosterSelectionStatus;
  selectionReasonCode: string | null;
  selectionComment: string | null;
  selectionDecidedBy: string | null;
  selectionDecidedAt: string | null;
  selectionUpdatedAt: string | null;
  outcome: RosterSeasonOutcome | null;
}

interface RosterSeasonTableRow {
  season_member_id: string;
  user_id: string | null;
  roster_cache_id: string | null;
  display_name: string;
  character_name: string | null;
  realm: string | null;
  rank_index: number | null;
  source: string;
  season_status: string;
  locked: boolean;
  wishes: unknown;
  selection_status: RosterSelectionStatus;
  selection_reason_code: string | null;
  selection_comment: string | null;
  selection_decided_by: string | null;
  selection_decided_at: string | null;
  selection_updated_at: string | null;
  outcome: RosterSeasonOutcome | null;
}

interface WishActivityLogRow {
  id: string;
  created_at: string;
  action_type: 'wish_created' | 'wish_updated' | 'wish_deleted' | 'wish_validation' | 'roster_selection_changed' | string;
  action_details: Record<string, unknown> | null;
  user_id: string | null;
  target_user_id: string | null;
  season_id: string | null;
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

const normalizeDbStatus = (status: CommitmentStatus) => (
  status === 'withdrawn' ? 'withdrawn' : status === 'confirmed' ? 'confirmed' : 'potential'
);

const toCommitmentStatus = (status: string | null | undefined): CommitmentStatus => {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'withdrawn') return 'withdrawn';
  return 'undecided';
};

const normalizeWishSnapshot = (wishes: WishData[]) => (
  wishes
    .filter((wish) => !!wish.classId)
    .map((wish) => ({
      classId: wish.classId,
      specIds: [...wish.specIds],
      comment: wish.comment?.trim() || '',
    }))
);

const getWishSnapshot = (wishes: WishChoice[]) => (
  wishes
    .filter((wish) => !!wish.class_id)
    .sort((a, b) => a.choice_index - b.choice_index)
    .map((wish) => ({
      classId: wish.class_id,
      specIds: [...(wish.spec_ids || [])],
      comment: wish.comment?.trim() || '',
    }))
);

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
  const [seasonMember, setSeasonMember] = useState<SeasonMemberDetails | null>(null);
  const [wishHistoryRows, setWishHistoryRows] = useState<WishActivityLogRow[]>([]);
  const [wishHistoryActors, setWishHistoryActors] = useState<Record<string, string>>({});
  const [wishes, setWishes] = useState<WishChoice[]>([]);
  const [canManageWishes, setCanManageWishes] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [memberWishesLocked, setMemberWishesLocked] = useState(false);
  const [lockingMember, setLockingMember] = useState(false);
  const [validatingWish, setValidatingWish] = useState<number | null>(null);
  const [updatingRosterDecision, setUpdatingRosterDecision] = useState(false);
  const [editingWishes, setEditingWishes] = useState(false);
  const [editWishes, setEditWishes] = useState<WishData[]>([]);
  const [editStatus, setEditStatus] = useState<CommitmentStatus>('undecided');
  const [savingWishes, setSavingWishes] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error) {
      const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
      return [candidate.message, candidate.details, candidate.hint].filter(Boolean).map(String).join(' ') || t.errors.generic;
    }
    return t.errors.generic;
  };
  
  // Use the centralized hook for BattleTag visibility
  // skipSelfCheck: true ensures user sees what OTHERS would see on their member page
  const { canSeeBattletag } = useBattletagVisibility(
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
      setLoading(true);
      let userCanManageWishes = false;
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
      const rosterId = searchParams.get('rosterId');
      let initialSeason: GuildSeason | null = null;
      if (rosterId) {
        const { data: seasonsData, error: seasonsError } = await supabase
          .from('roster_wish_seasons')
          .select('*')
          .eq('guild_id', matchedGuild.id)
          .eq('roster_id', rosterId)
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
        userCanManageWishes = !!userIsGM || !!manageWishesPerm;
        setCanManageWishes(userCanManageWishes);
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
        const { data: intentData } = initialSeason && rosterId
          ? await supabase
              .from('guild_season_member_intents')
              .select('commitment_status')
              .eq('guild_id', matchedGuild.id)
              .eq('roster_id', rosterId)
              .eq('season_id', initialSeason.id)
              .eq('user_id', memberId)
              .maybeSingle()
          : { data: null };
        setMember({
          username: profileData.username,
          battletag: profileData.battletag,
          status: intentData?.commitment_status || (initialSeason && rosterId ? 'undecided' : memberData.status),
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
      if (rosterId) {
        wishesQuery = wishesQuery.eq('roster_id', rosterId);
      }
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

      if (rosterId && initialSeason?.id) {
        const { data: seasonTableData } = await supabase.rpc('get_roster_season_table', {
          p_roster_id: rosterId,
          p_season_id: initialSeason.id,
        });
        const seasonRow = ((seasonTableData || []) as RosterSeasonTableRow[]).find((row) => row.user_id === memberId) || null;
        if (seasonRow) {
          const rowWishes = Array.isArray(seasonRow.wishes) ? seasonRow.wishes as Array<{
            choice_index?: number;
            class_id?: string;
            spec_ids?: string[];
            spec_order?: string[];
            comment?: string | null;
            validation_status?: ValidationStatus;
            validated_by?: string | null;
            validated_at?: string | null;
          }> : [];
          if (rowWishes.length > 0) {
            setWishes(rowWishes.map((wish, index) => ({
              choice_index: wish.choice_index || index + 1,
              class_id: wish.class_id || '',
              spec_ids: resolveSpecOrder(wish.spec_ids || [], wish.spec_order),
              comment: wish.comment || null,
              validation_status: wish.validation_status || 'pending',
              validated_by: wish.validated_by || null,
              validated_at: wish.validated_at || null,
            })).sort((a, b) => a.choice_index - b.choice_index));
          }
          setSeasonMember({
            seasonMemberId: seasonRow.season_member_id,
            rosterCacheId: seasonRow.roster_cache_id,
            displayName: seasonRow.display_name,
            characterName: seasonRow.character_name,
            realm: seasonRow.realm,
            rankIndex: seasonRow.rank_index,
            source: seasonRow.source,
            seasonStatus: seasonRow.season_status,
            locked: seasonRow.locked,
            selectionStatus: seasonRow.selection_status || 'undecided',
            selectionReasonCode: seasonRow.selection_reason_code,
            selectionComment: seasonRow.selection_comment,
            selectionDecidedBy: seasonRow.selection_decided_by,
            selectionDecidedAt: seasonRow.selection_decided_at,
            selectionUpdatedAt: seasonRow.selection_updated_at,
            outcome: seasonRow.outcome,
          });
          setMember((prev) => prev ? {
            ...prev,
            rosterDecision: seasonRow.selection_status || prev.rosterDecision,
          } : prev);

          const canViewWishHistory = user.id === memberId || userCanManageWishes;
          if (canViewWishHistory) {
            let historyQuery = supabase
              .from('guild_activity_logs')
              .select('id, created_at, action_type, action_details, user_id, target_user_id, season_id')
              .eq('guild_id', matchedGuild.id)
              .eq('season_id', initialSeason.id)
              .eq('target_user_id', memberId)
              .in('action_type', ['wish_created', 'wish_updated', 'wish_deleted', 'wish_validation', 'roster_selection_changed'])
              .order('created_at', { ascending: false })
              .limit(30);

            if (rosterId) {
              historyQuery = historyQuery.eq('roster_id', rosterId);
            }

            const { data: historyData } = await historyQuery;
            const nextHistoryRows = (historyData || []) as WishActivityLogRow[];
            setWishHistoryRows(nextHistoryRows);

            const actorIds = Array.from(new Set(nextHistoryRows.map((row) => row.user_id).filter(Boolean))) as string[];
            if (actorIds.length > 0) {
              const { data: actorData } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', actorIds);
              setWishHistoryActors(Object.fromEntries((actorData || []).map((actor) => [actor.id, actor.username])));
            } else {
              setWishHistoryActors({});
            }
          } else {
            setWishHistoryRows([]);
            setWishHistoryActors({});
          }
        } else {
          setSeasonMember(null);
          setWishHistoryRows([]);
          setWishHistoryActors({});
        }
      } else {
        setSeasonMember(null);
        setWishHistoryRows([]);
        setWishHistoryActors({});
      }

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
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, memberId, navigate, searchParams, refreshNonce]);

  // Handle validation
  const handleValidation = async (choiceIndex: number, status: ValidationStatus) => {
    if (!guild || !memberId || !user || !canManageWishes) return;
    const rosterId = searchParams.get('rosterId');
    
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
    if (rosterId) {
      updateQuery = updateQuery.eq('roster_id', rosterId);
    }
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
      if (rosterId) {
        reloadQuery = reloadQuery.eq('roster_id', rosterId);
      }
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
      toast.success(statusLabel);
    }
    
    setValidatingWish(null);
  };


  const handleRosterDecisionChange = async (status: RosterSelectionStatus) => {
    if (!guild || !memberId || !user || !canManageWishes) return;
    const rosterId = searchParams.get('rosterId');
    if (!rosterId) return;

    const previous = member?.rosterDecision || 'undecided';
    setUpdatingRosterDecision(true);
    setMember((prev) => (prev ? { ...prev, rosterDecision: status } : prev));

    try {
      const { error } = await supabase.rpc('set_roster_member_selection', {
        p_roster_id: rosterId,
        p_selection_status: status,
        p_user_id: memberId,
        p_roster_cache_id: null,
        p_season_id: seasonSupportMode === 'enabled' ? selectedSeasonId : null,
        p_reason_code: seasonMember?.selectionReasonCode || null,
        p_comment: seasonMember?.selectionComment || null,
      });
      if (error) throw error;
      setRefreshNonce((value) => value + 1);
    } catch (error: unknown) {
      setMember((prev) => (prev ? { ...prev, rosterDecision: previous } : prev));
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingRosterDecision(false);
    }
  };

  const getEditWishRows = () => {
    const rows = wishes
      .sort((a, b) => a.choice_index - b.choice_index)
      .map((wish) => ({
        classId: wish.class_id,
        specIds: [...(wish.spec_ids || [])],
        comment: wish.comment || '',
      }));
    while (rows.length < 3) {
      rows.push({ classId: '', specIds: [], comment: '' });
    }
    return rows.slice(0, 13);
  };

  const startWishEditing = () => {
    setEditWishes(getEditWishRows());
    setEditStatus(toCommitmentStatus(member?.status));
    setEditingWishes(true);
  };

  const handleEditWishChange = (index: number, field: keyof WishData, value: WishData[keyof WishData]) => {
    setEditWishes((prev) => prev.map((wish, wishIndex) => (
      wishIndex === index ? { ...wish, [field]: value } : wish
    )));
  };

  const saveWishEditing = async () => {
    if (!guild || !memberId || !user) return;
    const rosterId = searchParams.get('rosterId');
    if (!rosterId) {
      toast.error(t.wishes.noRosterSelected);
      return;
    }
    const isSelfEdit = user.id === memberId;
    const canEditArchivedSeasonAsManager = canManageWishes && selectedSeason?.state === 'archived';
    const canEditAsManager = canManageWishes && (!isSelfEdit || canEditArchivedSeasonAsManager);
    if (!isSelfEdit && !canEditAsManager) return;
    if (isSelfEdit && seasonSupportMode === 'enabled' && (!selectedSeasonId || selectedSeason?.state !== 'active') && !canEditArchivedSeasonAsManager) {
      toast.error(selectedSeason?.state === 'draft' ? t.seasons.draftHint : t.seasons.archivedHint);
      return;
    }

    const lockState = resolveWishLockState({
      rosterLocked: false,
      rosterLockAt: null,
      memberLocked: memberWishesLocked,
    });
    if (!canEditAsManager && lockState.isLocked) {
      toast.error(lockState.reason === 'member' ? t.wishes.lockedMemberDesc : t.wishes.lockedRosterDesc);
      return;
    }

    const invalidWish = editWishes.find((wish) => wish.classId && wish.specIds.length === 0);
    if (invalidWish) {
      const cls = getClassById(invalidWish.classId);
      toast.error(interpolateMessage(t.wishes.specRequiredDesc, {
        class: cls ? getLocalizedClassName(cls.id, language) : '',
      }));
      return;
    }

    const nextStatus = normalizeDbStatus(editStatus);
    const hasWishChanges = JSON.stringify(getWishSnapshot(wishes)) !== JSON.stringify(normalizeWishSnapshot(editWishes));
    const hasStatusChanges = (member?.status || 'potential') !== nextStatus;
    if (!hasWishChanges && !hasStatusChanges) {
      setEditingWishes(false);
      toast(t.wishes.noChangesToSave);
      return;
    }

    setSavingWishes(true);
    try {
      const payload: Record<string, unknown> = {
        p_guild_id: guild.id,
        p_roster_id: rosterId,
        p_member_id: memberId,
        p_commitment_status: nextStatus,
        p_wishes: editWishes
          .filter((wish) => !!wish.classId)
          .map((wish) => ({
            class_id: wish.classId,
            spec_ids: wish.specIds,
            comment: wish.comment || null,
          })),
        p_manager_edit: canEditAsManager,
      };
      if (seasonSupportMode === 'enabled' && selectedSeasonId) {
        payload.p_season_id = selectedSeasonId;
      }
      const { error } = await supabase.rpc('upsert_member_roster_wishes', payload);
      if (error) throw error;

      setEditingWishes(false);
      toast.success(isSelfEdit ? t.wishes.wishesSaved : interpolateMessage(t.wishes.wishesSavedForMember, { member: member?.username || '' }));
      setRefreshNonce((value) => value + 1);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingWishes(false);
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
          icon: CheckCircle2,
          className: 'bg-healer/20 text-healer border-healer/30',
        };
      case 'bench':
        return {
          label: t.wishes.rosterDecision.bench,
          icon: Armchair,
          className: toneBadgeClass('warning'),
        };
      case 'not_selected':
        return {
          label: t.wishes.rosterDecision.notSelected,
          icon: XCircle,
          className: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      default:
        return {
          label: t.wishes.rosterDecision.undecided,
          icon: Clock,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const getCommitmentBadge = (status: string | null | undefined) => {
    if (status === 'confirmed') {
      return {
        label: t.wishes.commitment.confirmed,
        icon: UserCheck,
        className: commitmentBadgeClass('confirmed'),
      };
    }
    if (status === 'withdrawn') {
      return {
        label: t.wishes.commitment.withdrawn,
        icon: UserX,
        className: commitmentBadgeClass('withdrawn'),
      };
    }
    return {
      label: t.wishes.commitment.undecided,
      icon: UserMinus,
      className: commitmentBadgeClass('undecided'),
    };
  };

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const isSelectedSeasonActive = seasonSupportMode === 'legacy' || selectedSeason?.state === 'active';
  const isSelfPage = user?.id === memberId;
  const memberDetailText = t.wishes.memberDetail;
  const canEditWishesHere = !!user && (canManageWishes || (isSelfPage && isSelectedSeasonActive && !memberWishesLocked));
  const canSeeWishHistory = isSelfPage || canManageWishes;
  const getValidationStatusLabel = (status: unknown) => {
    if (status === 'approved') return t.wishes.validation.approved;
    if (status === 'rejected') return t.wishes.validation.rejected;
    return t.wishes.validation.pending;
  };
  const getWishHistoryEventLabel = (eventType: string) => {
    const eventLabels = memberDetailText.historyEvent;
    switch (eventType) {
      case 'wish_created':
        return eventLabels.wishCreated;
      case 'wish_updated':
        return eventLabels.wishUpdated;
      case 'wish_deleted':
        return eventLabels.wishDeleted;
      case 'wish_validation':
        return eventLabels.wishValidation;
      case 'roster_selection_changed':
        return eventLabels.selectionChanged;
      default:
        return eventLabels.wishesChanged;
    }
  };
  const getLocalizedClassLabel = (classId: unknown) => {
    if (typeof classId !== 'string') return null;
    const cls = getClassById(classId);
    return cls ? getLocalizedClassName(cls.id, language) : classId;
  };
  const getLocalizedSpecLabels = (specIds: unknown) => (
    Array.isArray(specIds)
      ? specIds
          .filter((specId): specId is string => typeof specId === 'string')
          .map((specId) => getSpecById(specId))
          .filter(Boolean)
          .map((spec) => getLocalizedSpecName(spec!.id, language))
      : []
  );
  const getWishHistorySummary = (row: WishActivityLogRow) => {
    const details = row.action_details || {};
    const choiceIndex = details.choice_index || details.new_choice_index || details.old_choice_index;
    const choiceLabel = typeof choiceIndex === 'number' ? `#${choiceIndex}` : null;
    const classId = details.new_class_id || details.class_id;
    const previousClassId = details.old_class_id;
    const classLabel = getLocalizedClassLabel(classId);
    const previousClassLabel = getLocalizedClassLabel(previousClassId);
    const specLabels = getLocalizedSpecLabels(details.new_spec_ids || details.spec_ids);
    const previousSpecLabels = getLocalizedSpecLabels(details.old_spec_ids);
    const parts: string[] = [];

    if (choiceLabel) parts.push(choiceLabel);
    if (row.action_type === 'wish_updated' && previousClassLabel && classLabel && previousClassLabel !== classLabel) {
      parts.push(`${previousClassLabel} -> ${classLabel}`);
    } else if (classLabel) {
      parts.push(classLabel);
    }
    if (row.action_type === 'wish_updated' && previousSpecLabels.length > 0 && specLabels.length > 0 && previousSpecLabels.join(', ') !== specLabels.join(', ')) {
      parts.push(`${previousSpecLabels.join(', ')} -> ${specLabels.join(', ')}`);
    } else if (specLabels.length > 0) {
      parts.push(specLabels.join(', '));
    }
    if (row.action_type === 'wish_validation') {
      parts.push(`${getValidationStatusLabel(details.old_status)} -> ${getValidationStatusLabel(details.new_status)}`);
    }
    if (row.action_type === 'roster_selection_changed') {
      parts.push(`${getRosterDecisionBadge(details.old_selection_status as RosterSelectionStatus).label} -> ${getRosterDecisionBadge(details.new_selection_status as RosterSelectionStatus).label}`);
    }

    return parts.join(' · ');
  };
  const selectSeason = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const next = new URLSearchParams(searchParams);
    next.set('seasonId', seasonId);
    setSearchParams(next, { replace: true });
  };
  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild) return null;

  const workspaceToolbar = (
    <PageContainer className="py-2" width="workspace">
      <ContextualToolbar
        className="rounded-none border-none bg-transparent p-0 backdrop-blur-none"
        leading={(
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              onClick={handleBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted/50 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title={t.common.back}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground">{member?.username}</h1>
              {canSeeBattletag && member?.battletag && (
                <p className="truncate text-xs text-muted-foreground">{member.battletag}</p>
              )}
            </div>
          </div>
        )}
        trailing={(
          <>
            <SeasonSelector
              seasons={seasons}
              selectedSeasonId={selectedSeasonId}
              onSelect={selectSeason}
              emptyLabel={seasonSupportMode === 'legacy' ? t.seasons.legacyMode : undefined}
            />

            {memberWishesLocked && (
              <Badge
                variant="outline"
                className={cn("hidden text-xs px-2 py-1 items-center gap-1 sm:flex", toneBadgeClass('warning'))}
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t.wishes.lockedTitle}
              </Badge>
            )}

            {canEditWishesHere && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                disabled={editingWishes}
                onClick={startWishEditing}
                className="h-8"
              >
                {t.common.edit}
              </CosmicButton>
            )}

            {canManageWishes && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={memberWishesLocked ? <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />}
                loading={lockingMember}
                onClick={handleToggleMemberLock}
                className="h-8"
              >
                {memberWishesLocked ? t.wishes.unlockMember : t.wishes.lockMember}
              </CosmicButton>
            )}
          </>
        )}
      />
    </PageContainer>
  );

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guild.id}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={canManageWishes}
      activeTab="roster"
      toolbar={workspaceToolbar}
      context={{
        season: seasons.find((season) => season.id === selectedSeasonId)?.name,
        status: memberWishesLocked ? t.wishes.lockedTitle : undefined,
      }}
    >
      <PageContainer as="main" className="relative z-10 py-3 md:py-4" width="workspace">
        <div className="mb-4">
          <h2 className="font-sans text-xl font-medium text-foreground">
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

        <GlowCard surface="section" className="mb-4" hoverable={false}>
          <div className="grid gap-3 md:grid-cols-[minmax(180px,280px)_max-content] xl:grid-cols-[minmax(180px,280px)_max-content_max-content] xl:gap-8">
            <div className="min-w-0 space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.summaryTitle}</div>
              {canManageWishes && searchParams.get('rosterId') ? (
                <Select
                  value={member?.rosterDecision || 'undecided'}
                  onValueChange={(value) => handleRosterDecisionChange(value as RosterSelectionStatus)}
                  disabled={updatingRosterDecision}
                >
                  <SelectTrigger className="!h-7 !min-h-7 w-full px-2.5 !py-0 text-xs">
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
                (() => {
                  const decisionBadge = getRosterDecisionBadge(member?.rosterDecision);
                  const DecisionIcon = decisionBadge.icon;
                  return (
                    <Badge
                      variant="outline"
                      className={cn('h-7 px-2.5 py-0 text-xs', decisionBadge.className)}
                    >
                      <DecisionIcon className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                      {decisionBadge.label}
                    </Badge>
                  );
                })()
              )}
            </div>

            {member && (
              <div className="min-w-0 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.dashboard.commitment}</div>
                {(() => {
                  const commitmentBadge = getCommitmentBadge(member.status);
                  const Icon = commitmentBadge.icon;
                  return (
                    <Badge
                      variant="outline"
                      className={cn('h-7 px-2.5 py-0 text-xs', commitmentBadge.className)}
                    >
                      <Icon className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                      {commitmentBadge.label}
                    </Badge>
                  );
                })()}
              </div>
            )}

            <div className="min-w-0 space-y-1 text-xs">
              <div className="text-muted-foreground">{memberDetailText.firstWishGranted}</div>
              <div className="truncate font-medium text-foreground">
                {seasonMember?.outcome?.first_choice_granted === true ? memberDetailText.yes : seasonMember?.outcome?.first_choice_granted === false ? memberDetailText.no : '-'}
              </div>
            </div>

            {seasonMember?.selectionComment && canManageWishes && (
              <p className="min-w-0 text-xs text-muted-foreground md:col-span-2 xl:col-span-3">{seasonMember.selectionComment}</p>
            )}
          </div>
        </GlowCard>

        {editingWishes && (
          <GlowCard surface="section" className="mb-4 overflow-hidden p-0" hoverable={false}>
            <MemberWishEditor
              wishes={editWishes}
              status={editStatus}
              saving={savingWishes}
              onWishChange={handleEditWishChange}
              onStatusChange={setEditStatus}
              onSave={saveWishEditing}
              onCancel={() => setEditingWishes(false)}
            />
          </GlowCard>
        )}

        {wishes.length === 0 ? (
          <GlowCard surface="section" className="text-center" hoverable={false}>
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
                <GlowCard key={wish.choice_index} surface="section" className="p-3 md:p-4" hoverable={false}>
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
                        isGM={canManageWishes}
                        onValidate={canManageWishes ? (status) => handleValidation(wish.choice_index, status) : undefined}
                        loading={validatingWish === wish.choice_index}
                      />
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}

        {seasonSupportMode !== 'legacy' && selectedSeason && canSeeWishHistory && (
          <GlowCard surface="section" className="mt-4" hoverable={false}>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-primary" />
              {memberDetailText.history}
            </div>
            {wishHistoryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{memberDetailText.historyEmpty}</p>
            ) : (
              <div className="space-y-2">
                {wishHistoryRows.map((row) => {
                  const actorName = row.user_id ? wishHistoryActors[row.user_id] : null;
                  const summary = getWishHistorySummary(row);
                  return (
                    <div key={row.id} className="flex gap-3 rounded-md border border-border/45 bg-card/35 px-3 py-2">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/80" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium text-foreground">{getWishHistoryEventLabel(row.action_type)}</span>
                          {actorName && (
                            <span className="rounded-full border border-border/40 bg-background/50 px-2 py-0.5 text-xs text-muted-foreground">
                              {actorName}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        {summary && (
                          <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlowCard>
        )}
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default MemberWishes;
