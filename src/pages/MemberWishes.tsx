import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Heart, Swords, Crosshair, CheckCircle, HelpCircle, XCircle, Pencil, ArrowLeft, Lock, Unlock, History, Save, ChevronDown, Check } from 'lucide-react';
import { CosmicButton } from '@/components/CosmicButton';
import { getGuildPath } from '@/lib/guildSlug';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import {
  wowClasses,
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getSpecById,
  Role,
  Specialization,
} from '@/data/wowClasses';
import { WishValidationBadge } from '@/components/dashboard/WishValidationBadge';
import { MemberWishEditor } from '@/components/dashboard/MemberWishEditor';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { CurrentRosterAssignment, RosterSeasonOutcome, RosterSelectionStatus, ValidationStatus, WishData } from '@/types/guild';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBattletagVisibility } from '@/hooks/useBattletagVisibility';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { toneBadgeClass, toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeasonSelector, SeasonStateCallout } from '@/components/seasons/SeasonSelector';
import { isSeasonSchemaUnavailable, type SeasonSupportMode } from '@/lib/seasonSupport';
import type { GuildSeason } from '@/types/seasons';
import { interpolateMessage } from '@/i18n/format';
import { resolveWishLockState } from '@/lib/wishLock';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  currentAssignment: CurrentRosterAssignment | null;
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
  current_assignment: CurrentRosterAssignment | null;
  outcome: RosterSeasonOutcome | null;
}

interface RosterSeasonHistoryRow {
  event_at: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
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

const specRoleStyles: Record<Role, string> = {
  tank: 'text-tank',
  healer: 'text-healer',
  dps: 'text-dps',
};

const toLocalDateInputValue = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoFromLocalDateInput = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getSpecRoleIcon = (spec: Specialization) => {
  if (spec.role === 'tank') return Shield;
  if (spec.role === 'healer') return Heart;
  return spec.range === 'ranged' ? Crosshair : Swords;
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
  const [historyRows, setHistoryRows] = useState<RosterSeasonHistoryRow[]>([]);
  const [wishes, setWishes] = useState<WishChoice[]>([]);
  const [canManageWishes, setCanManageWishes] = useState(false);
  const [memberWishesLocked, setMemberWishesLocked] = useState(false);
  const [lockingMember, setLockingMember] = useState(false);
  const [validatingWish, setValidatingWish] = useState<number | null>(null);
  const [updatingRosterDecision, setUpdatingRosterDecision] = useState(false);
  const [editingWishes, setEditingWishes] = useState(false);
  const [editWishes, setEditWishes] = useState<WishData[]>([]);
  const [editStatus, setEditStatus] = useState<CommitmentStatus>('undecided');
  const [savingWishes, setSavingWishes] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentClassId, setAssignmentClassId] = useState('');
  const [assignmentSpecId, setAssignmentSpecId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentComment, setAssignmentComment] = useState('');
  const [assignmentClassOpen, setAssignmentClassOpen] = useState(false);
  const [assignmentSpecOpen, setAssignmentSpecOpen] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;
  
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
            currentAssignment: seasonRow.current_assignment,
            outcome: seasonRow.outcome,
          });
          setMember((prev) => prev ? {
            ...prev,
            rosterDecision: seasonRow.selection_status || prev.rosterDecision,
          } : prev);

          const { data: historyData } = await supabase.rpc('get_roster_season_history', {
            p_roster_id: rosterId,
            p_season_id: initialSeason.id,
            p_roster_season_member_id: seasonRow.season_member_id,
          });
          setHistoryRows((historyData || []) as RosterSeasonHistoryRow[]);
        } else {
          setSeasonMember(null);
          setHistoryRows([]);
        }
      } else {
        setSeasonMember(null);
        setHistoryRows([]);
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
      toast.success(`${t.wishes.title.split(' ')[0]} ${statusLabel.toLowerCase()}`);
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
    const canEditAsManager = canManageWishes && !isSelfEdit;
    if (!isSelfEdit && !canEditAsManager) return;
    if (isSelfEdit && seasonSupportMode === 'enabled' && (!selectedSeasonId || selectedSeason?.state !== 'active')) {
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

  const openAssignmentDialog = () => {
    if (!seasonMember?.seasonMemberId) return;
    const currentClassId = seasonMember.currentAssignment?.class_id || wishes.find((wish) => wish.class_id)?.class_id || '';
    const currentSpecId = seasonMember.currentAssignment?.spec_id
      || wishes.find((wish) => wish.class_id === currentClassId)?.spec_ids?.[0]
      || '';
    setAssignmentClassId(currentClassId);
    setAssignmentSpecId(currentSpecId);
    setAssignmentDate(toLocalDateInputValue(seasonMember.currentAssignment?.valid_from));
    setAssignmentComment(seasonMember.currentAssignment?.manager_comment || '');
    setAssignmentClassOpen(false);
    setAssignmentSpecOpen(false);
    setAssignmentDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!seasonMember?.seasonMemberId || !assignmentClassId || !canManageWishes) return;
    const selectedSpec = assignmentSpecId ? getSpecById(assignmentSpecId) : null;
    setSavingAssignment(true);
    try {
      const { error } = await supabase.rpc('set_roster_member_assignment', {
        p_roster_season_member_id: seasonMember.seasonMemberId,
        p_class_id: assignmentClassId,
        p_spec_id: assignmentSpecId || null,
        p_role: selectedSpec?.role || null,
        p_source: 'manager_decision',
        p_choice_index: null,
        p_reason_code: null,
        p_manager_comment: assignmentComment.trim() || null,
        p_valid_from: toIsoFromLocalDateInput(assignmentDate) || new Date().toISOString(),
      });
      if (error) throw error;
      setAssignmentDialogOpen(false);
      toast.success(memberDetailText.assignmentDialog.updated);
      setRefreshNonce((value) => value + 1);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingAssignment(false);
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

  const getCommitmentBadge = (status: string | null | undefined) => {
    if (status === 'confirmed') {
      return {
        label: t.wishes.commitment.confirmed,
        icon: CheckCircle,
        className: 'bg-healer/20 text-healer border-healer/30',
      };
    }
    if (status === 'withdrawn') {
      return {
        label: t.wishes.commitment.withdrawn,
        icon: XCircle,
        className: 'bg-destructive/20 text-destructive border-destructive/30',
      };
    }
    return {
      label: t.wishes.commitment.undecided,
      icon: HelpCircle,
      className: toneBadgeClass('warning'),
    };
  };

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const isSelectedSeasonActive = seasonSupportMode === 'legacy' || selectedSeason?.state === 'active';
  const isSelfPage = user?.id === memberId;
  const memberDetailText = t.wishes.memberDetail;
  const canEditWishesHere = !!user && (canManageWishes || (isSelfPage && isSelectedSeasonActive && !memberWishesLocked));
  const canEditAssignment = canManageWishes && !!seasonMember?.seasonMemberId;
  const currentAssignment = seasonMember?.currentAssignment || null;
  const assignmentClass = currentAssignment?.class_id ? getClassById(currentAssignment.class_id) : null;
  const assignmentSpec = currentAssignment?.spec_id ? getSpecById(currentAssignment.spec_id) : null;
  const assignmentDialogClass = assignmentClassId ? getClassById(assignmentClassId) : null;
  const assignmentDialogSpecs = assignmentDialogClass?.specs || [];
  const assignmentDialogSpec = assignmentSpecId ? getSpecById(assignmentSpecId) : null;
  const getAssignmentSourceLabel = (source?: string | null) => {
    if (!source) return memberDetailText.assignmentSource.fallback;
    const normalized = source.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof typeof memberDetailText.assignmentSource;
    return memberDetailText.assignmentSource[normalized] || source;
  };
  const getSeasonStatusLabel = (status?: string | null) => {
    if (status === 'selected') return t.wishes.rosterDecision.selected;
    if (status === 'bench') return t.wishes.rosterDecision.bench;
    if (status === 'not_selected') return t.wishes.rosterDecision.notSelected;
    if (status === 'undecided') return t.wishes.rosterDecision.undecided;
    if (status === 'departed') return memberDetailText.historyEvent.memberLeftRoster;
    return status || '-';
  };
  const getHistoryEventLabel = (eventType: string) => {
    const eventLabels = memberDetailText.historyEvent;
    switch (eventType) {
      case 'season_member_snapshot':
        return eventLabels.snapshot;
      case 'assignment_changed':
        return eventLabels.assignmentChanged;
      case 'roster_assignments_seeded_from_wishes':
        return eventLabels.assignmentsSeeded;
      case 'roster_season_materialized':
        return eventLabels.materialized;
      case 'roster_season_sync_delta_applied':
        return eventLabels.syncDeltaApplied;
      case 'external_member_matched':
        return eventLabels.externalMatched;
      case 'member_left_roster':
        return eventLabels.memberLeftRoster;
      case 'member_left_guild':
        return eventLabels.memberLeftGuild;
      case 'selection_changed':
      case 'roster_selection_changed':
        return eventLabels.selectionChanged;
      case 'wishes_changed':
      case 'wish_created':
      case 'wish_updated':
      case 'wish_deleted':
        return eventLabels.wishesChanged;
      default:
        return eventLabels.fallback;
    }
  };
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
      <div className="sticky top-14 z-40 border-b border-border/35 bg-background/95 backdrop-blur-md">
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
              <h1 className="text-lg font-medium text-foreground">{member?.username}</h1>
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

            {memberWishesLocked && (
              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-1 flex items-center gap-1", toneBadgeClass('warning'))}
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t.wishes.lockedTitle}
              </Badge>
            )}
            
            {canEditWishesHere && guild && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                disabled={editingWishes}
                onClick={startWishEditing}
              >
                {t.common.edit}
              </CosmicButton>
            )}

            {canEditAssignment && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
                onClick={openAssignmentDialog}
              >
                {memberDetailText.assignmentButton}
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

        {memberWishesLocked && (
          <div className={cn("mb-4 rounded-lg border p-3 flex items-start gap-2", toneCalloutClass('warning'))}>
            <Lock className={cn("h-4 w-4 mt-0.5", toneTextClass('warning'))} />
            <div className="text-sm">
              <div className="font-medium">{t.wishes.lockedTitle}</div>
              <div className={cn("opacity-80", toneTextClass('warning'))}>{t.wishes.lockedMemberDesc}</div>
            </div>
          </div>
        )}

        <GlowCard surface="section" className="mb-4" hoverable={false}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.summaryTitle}</div>
              {canManageWishes && searchParams.get('rosterId') ? (
                <Select
                  value={member?.rosterDecision || 'undecided'}
                  onValueChange={(value) => handleRosterDecisionChange(value as RosterSelectionStatus)}
                  disabled={updatingRosterDecision}
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
              {seasonMember?.selectionComment && canManageWishes && (
                <p className="text-xs text-muted-foreground">{seasonMember.selectionComment}</p>
              )}
              {member && (
                <div className="pt-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t.dashboard.commitment}</div>
                  {(() => {
                    const commitmentBadge = getCommitmentBadge(member.status);
                    const Icon = commitmentBadge.icon;
                    return (
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-2 py-1', commitmentBadge.className)}
                      >
                        <Icon className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                        {commitmentBadge.label}
                      </Badge>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{memberDetailText.currentAssignment}</div>
                {canEditAssignment && (
                  <button
                    type="button"
                    onClick={openAssignmentDialog}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {t.common.edit}
                  </button>
                )}
              </div>
              {currentAssignment?.class_id ? (
                <div className="space-y-2">
                  <div
                    className="rounded-md px-3 py-2 text-sm font-medium"
                    style={assignmentClass ? {
                      backgroundColor: `hsl(var(--class-${assignmentClass.id}) / 0.18)`,
                      color: `hsl(var(--class-${assignmentClass.id}))`,
                    } : undefined}
                  >
                    {assignmentClass ? getLocalizedClassName(assignmentClass.id, language) : currentAssignment.class_id}
                  </div>
                  {assignmentSpec && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {(() => {
                        const Icon = getSpecRoleIcon(assignmentSpec);
                        return <Icon className={cn('h-4 w-4', specRoleStyles[assignmentSpec.role])} />;
                      })()}
                      <span>{getLocalizedSpecName(assignmentSpec.id, language)}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{getAssignmentSourceLabel(currentAssignment.source)}</span>
                    <span>•</span>
                    <span>{new Date(currentAssignment.valid_from).toLocaleDateString(language)}</span>
                  </div>
                  {currentAssignment.manager_comment && canManageWishes && (
                    <p className="text-xs text-muted-foreground">{currentAssignment.manager_comment}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
                  {memberDetailText.noAssignment}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{memberDetailText.seasonSheet}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border/50 bg-card/40 px-3 py-2">
                  <div className="text-muted-foreground">{memberDetailText.seasonStatus}</div>
                  <div className="mt-1 font-medium text-foreground">{getSeasonStatusLabel(seasonMember?.seasonStatus)}</div>
                </div>
                <div className="rounded-md border border-border/50 bg-card/40 px-3 py-2">
                  <div className="text-muted-foreground">{memberDetailText.snapshotRank}</div>
                  <div className="mt-1 font-medium text-foreground">{seasonMember?.rankIndex ?? '-'}</div>
                </div>
                <div className="rounded-md border border-border/50 bg-card/40 px-3 py-2">
                  <div className="text-muted-foreground">{memberDetailText.firstWishGranted}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {seasonMember?.outcome?.first_choice_granted === true ? memberDetailText.yes : seasonMember?.outcome?.first_choice_granted === false ? memberDetailText.no : '-'}
                  </div>
                </div>
                <div className="rounded-md border border-border/50 bg-card/40 px-3 py-2">
                  <div className="text-muted-foreground">{memberDetailText.seasonChange}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {seasonMember?.outcome?.changed_class_during_season ? memberDetailText.yes : memberDetailText.no}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>

        <div className="mb-3">
          <h3 className="text-sm font-medium text-foreground">{t.wishes.rosterDecision.validationDetailsTitle}</h3>
        </div>

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

        {seasonSupportMode !== 'legacy' && selectedSeason && (
          <GlowCard surface="section" className="mt-4" hoverable={false}>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-primary" />
              {memberDetailText.history}
            </div>
            {historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{memberDetailText.historyEmpty}</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {historyRows.map((row) => (
                  <div key={`${row.event_type}-${row.event_at}`} className="rounded-md border border-border/50 bg-card/40 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{getHistoryEventLabel(row.event_type)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(row.event_at).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        )}
      </PageContainer>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle>{memberDetailText.assignmentDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border/40 bg-background/40 px-3 py-2">
              <div className="text-sm font-medium text-foreground">{member?.username}</div>
              {seasonMember?.characterName && (
                <div className="text-xs text-muted-foreground">
                  {seasonMember.characterName}{seasonMember.realm ? ` - ${seasonMember.realm}` : ''}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{memberDetailText.assignmentDialog.classLabel}</Label>
              <Popover open={assignmentClassOpen} onOpenChange={setAssignmentClassOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-between gap-2 text-sm font-medium',
                      assignmentDialogClass
                        ? 'border-transparent'
                        : 'border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:bg-muted/20'
                    )}
                    style={assignmentDialogClass ? {
                      backgroundColor: `hsl(var(--class-${assignmentDialogClass.id}) / 0.2)`,
                      color: `hsl(var(--class-${assignmentDialogClass.id}))`,
                    } : undefined}
                  >
                    <span className="truncate">
                      {assignmentDialogClass ? getLocalizedClassName(assignmentDialogClass.id, language) : memberDetailText.assignmentDialog.selectClass}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 border-border bg-card p-1.5" align="start">
                  <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
                    {wowClasses.map((wowClass) => {
                      const isSelected = assignmentClassId === wowClass.id;
                      return (
                        <button
                          key={wowClass.id}
                          type="button"
                          onClick={() => {
                            setAssignmentClassId(wowClass.id);
                            setAssignmentSpecId(wowClass.specs[0]?.id || '');
                            setAssignmentClassOpen(false);
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            isSelected ? 'bg-primary/20' : 'hover:bg-primary/10'
                          )}
                          style={{ color: `hsl(var(--class-${wowClass.id}))` }}
                        >
                          {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{getLocalizedClassName(wowClass.id, language)}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{memberDetailText.assignmentDialog.specLabel}</Label>
              {assignmentDialogClass ? (
                <Popover open={assignmentSpecOpen} onOpenChange={setAssignmentSpecOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-10 w-full justify-between gap-2 bg-background/50 text-sm hover:bg-muted/50',
                        assignmentDialogSpec ? 'border-border/60' : 'border-dashed border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      {assignmentDialogSpec ? (
                        <span className="flex min-w-0 items-center gap-2">
                          {(() => {
                            const Icon = getSpecRoleIcon(assignmentDialogSpec);
                            return <Icon className={cn('h-4 w-4 shrink-0', specRoleStyles[assignmentDialogSpec.role])} />;
                          })()}
                          <span className="truncate">{getLocalizedSpecName(assignmentDialogSpec.id, language)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{memberDetailText.assignmentDialog.selectSpec}</span>
                      )}
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 border-border bg-card p-1.5" align="start">
                    <div className="space-y-0.5">
                      {assignmentDialogSpecs.map((spec) => {
                        const isSelected = assignmentSpecId === spec.id;
                        const Icon = getSpecRoleIcon(spec);
                        return (
                          <button
                            key={spec.id}
                            type="button"
                            onClick={() => {
                              setAssignmentSpecId(spec.id);
                              setAssignmentSpecOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                              isSelected ? 'bg-primary/20' : 'hover:bg-primary/10'
                            )}
                          >
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', specRoleStyles[spec.role])} />
                            <span className="flex-1 truncate">{getLocalizedSpecName(spec.id, language)}</span>
                            {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex h-10 items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/20 bg-transparent">
                  <Shield className="h-4 w-4 text-muted-foreground/20" />
                  <Heart className="h-4 w-4 text-muted-foreground/20" />
                  <Swords className="h-4 w-4 text-muted-foreground/20" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-assignment-date">{memberDetailText.assignmentDialog.effectiveDate}</Label>
              <Input
                id="member-assignment-date"
                type="date"
                value={assignmentDate}
                onChange={(event) => setAssignmentDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-assignment-comment">{memberDetailText.assignmentDialog.managerComment}</Label>
              <Textarea
                id="member-assignment-comment"
                value={assignmentComment}
                onChange={(event) => setAssignmentComment(event.target.value)}
                placeholder={memberDetailText.assignmentDialog.optional}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <CosmicButton variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton onClick={saveAssignment} loading={savingAssignment} disabled={!assignmentClassId || !assignmentDate}>
                {t.common.save}
              </CosmicButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberWishes;
