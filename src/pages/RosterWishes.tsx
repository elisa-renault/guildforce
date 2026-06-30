import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getSpecById,
  getRolesFromSpecs,
  wowClasses,
} from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { ContextualToolbar } from '@/components/layout/ContextualToolbar';
import { PageContainer } from '@/components/layout/PageContainer';
import { GuildWorkspaceShell } from '@/components/guild';
import type { GuildMainCandidate } from '@/components/guild/GuildMainSelector';
import { RosterFilters, RosterTable, RosterAnalytics, RosterSelectedTable, type RosterTableColumnId } from '@/components/dashboard';
import { WishValidationBadge } from '@/components/dashboard/WishValidationBadge';
import { RosterSelector, RosterEditDialog } from '@/components/roster';
import { SeasonSelector, SeasonStateCallout, type PrepareSeasonInput } from '@/components/seasons/SeasonSelector';
import { WishFormEditor } from '@/components/wishes/WishFormEditor';
import { MemberWish, WishData, RosterFilters as RosterFiltersType, RosterSelectionStatus, ValidationStatus } from '@/types/guild';
import type { GuildSeason } from '@/types/seasons';
import { Archive, Loader2, Pencil, Play, Plus, Sparkles, Settings, TableIcon, BarChart3, Download, Eye, Lock, Unlock, Clock, UserPlus, MoreVertical, RefreshCw, Columns3 } from 'lucide-react';
import { exportWishesToCSV } from '@/lib/exportWishes';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { KILL_SWITCH_FEATURE_FLAGS, useKillSwitchFeatureEnabled } from '@/lib/featureFlags';
import { capturePostHogProductEvent, trackProductEvent } from '@/lib/productEvents';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTimeLocalized, formatLabelValue, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { isWishEditingLocked, resolveWishLockState } from '@/lib/wishLock';
import { isSeasonFilteringEnabled, isSeasonSchemaUnavailable, type SeasonSupportMode } from '@/lib/seasonSupport';
import { getSelectedValidatedMembers } from '@/lib/selectedValidatedMembers';
import { getRosterSelectionErrorMessage } from '@/lib/rosterSelectionErrors';
import { toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { resolveCurrentWowSeasonName } from '@/lib/wowSeasonName';
import { formatRealmDisplayName } from '@/lib/realms';
import log from '@/lib/logger';
import { reportClientToastError } from '@/lib/clientErrorReports';
import { GlowCard } from '@/components/GlowCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Max wishes = number of WoW classes
const MAX_WISHES = wowClasses.length;
const DEFAULT_ROSTER_TABLE_COLUMNS: RosterTableColumnId[] = [
  'status',
  'rosterDecision',
  'wishesCount',
  'wish1',
  'wish2',
  'wish3',
];

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
  accessSource?: string | null;
  wishes_locked?: boolean | null;
  wishes_lock_at?: string | null;
}

interface ExternalRosterCandidate {
  id: string;
  character_name: string;
  character_realm: string;
  character_realm_slug: string;
}

interface RosterMemberSelectionRow {
  user_id: string | null;
  roster_cache_id: string | null;
  selection_status: MemberWish['selectionStatus'];
  reason_code: MemberWish['selectionReasonCode'];
  comment: string | null;
  decided_by: string | null;
  decided_at: string | null;
  updated_at: string;
}

interface ExternalWishRow {
  id: string;
  roster_cache_id: string;
  class_id: string;
  spec_ids: string[];
  spec_order: string[];
  comment: string | null;
  commitment_status: 'confirmed' | 'potential' | 'withdrawn';
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
}

interface RosterAccessRuleRow {
  access_type: 'rank' | 'user';
  user_id: string | null;
  min_rank_index: number | null;
  max_rank_index: number | null;
}

interface RosterSeasonTableRow {
  season_member_id: string;
  user_id: string | null;
  roster_cache_id: string | null;
  display_name?: string | null;
  character_name?: string | null;
  realm?: string | null;
  rank_index: number | null;
  season_status: string;
  wishes: unknown;
  selection_status?: MemberWish['selectionStatus'];
  selection_reason_code?: MemberWish['selectionReasonCode'] | null;
  selection_comment?: string | null;
  selection_decided_by?: string | null;
  selection_decided_at?: string | null;
  selection_updated_at?: string | null;
  outcome: MemberWish['seasonOutcome'] | null;
}

interface RosterSeasonHistoryRow {
  event_at: string;
  event_type: string;
  actor_id: string | null;
  actor_username?: string | null;
  payload: Record<string, unknown> | null;
}

const RosterWishes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin: isGlobalAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wishesLoading, setWishesLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [seasons, setSeasons] = useState<GuildSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonSupportMode, setSeasonSupportMode] = useState<SeasonSupportMode>('enabled');
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonSettingsOpen, setSeasonSettingsOpen] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [seasonRenameName, setSeasonRenameName] = useState('');
  const [seasonStartsAt, setSeasonStartsAt] = useState('');
  const [seasonEndsAt, setSeasonEndsAt] = useState('');
  const [seasonSourceId, setSeasonSourceId] = useState('');
  const [seasonPrefillWishes, setSeasonPrefillWishes] = useState(false);
  const [seasonResetCopiedWishes, setSeasonResetCopiedWishes] = useState(true);
  const [seasonActivateImmediately, setSeasonActivateImmediately] = useState(true);
  const [seasonDialogSaving, setSeasonDialogSaving] = useState(false);
  const [seasonActionBusy, setSeasonActionBusy] = useState<null | 'archive' | 'activate' | 'rename'>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [canManageWishes, setCanManageWishes] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(false);
  const [isAdminReadOnly, setIsAdminReadOnly] = useState(false);
  const [filters, setFilters] = useState<RosterFiltersType>({
    roleFilters: [],
    classFilters: [],
    rosterMemberFilters: null,
    validationFilters: [],
    rosterDecisionFilters: [],
    searchQuery: '',
    filterMode: 'or',
    commitmentFilters: [],
    minWishes: null,
    rangeFilters: [],
    hasComment: null,
    maxWishIndex: null,
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editWishes, setEditWishes] = useState<WishData[]>([
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
  ]);
  const [editStatus, setEditStatus] = useState<CommitmentStatus>('undecided');
  const [editSelectionStatus, setEditSelectionStatus] = useState<RosterSelectionStatus>('undecided');
  const [editGuildMain, setEditGuildMain] = useState<Pick<GuildMainCandidate, 'character_name' | 'character_realm_slug'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'selected' | 'analytics'>('table');
  const [rosterSortSummary, setRosterSortSummary] = useState('');
  const [visibleRosterColumns, setVisibleRosterColumns] = useState<RosterTableColumnId[]>(DEFAULT_ROSTER_TABLE_COLUMNS);
  const [rosterColumnsCustomized, setRosterColumnsCustomized] = useState(false);
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error) {
      const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
      return [candidate.message, candidate.details, candidate.hint].filter(Boolean).map(String).join(' ') || t.errors.generic;
    }
    return t.errors.generic;
  };
  const getErrorDiagnostic = (error: unknown) => {
    const candidate = typeof error === 'object' && error
      ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown; name?: unknown }
      : null;
    return {
      name: error instanceof Error ? error.name : typeof candidate?.name === 'string' ? candidate.name : undefined,
      code: typeof candidate?.code === 'string' ? candidate.code : undefined,
      message: getErrorMessage(error),
      details: typeof candidate?.details === 'string' ? candidate.details : undefined,
      hint: typeof candidate?.hint === 'string' ? candidate.hint : undefined,
    };
  };
  const logRosterSeasonError = (
    event: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ) => {
    log.error(`[RosterWishes] ${event}`, {
      ...context,
      guildId,
      selectedRosterId,
      selectedSeasonId,
      seasonSupportMode,
      error: getErrorDiagnostic(error),
    });
  };
  const getRosterWishFailureMetadata = (context: Record<string, unknown> = {}) => {
    const activeRoster = rosters.find((roster) => roster.id === selectedRosterId);
    return {
      routeSearch: searchParams.toString(),
      requestedRosterId: searchParams.get('rosterId'),
      selectedRosterId,
      selectedSeasonId,
      hasAccess: activeRoster?.hasAccess ?? null,
      accessSource: activeRoster?.accessSource ?? null,
      currentMemberFound: members.some((member) => member.id === user?.id),
      profileIsSyncing: !!profile?.is_syncing,
      canManageWishes,
      isAdminReadOnly,
      ...context,
    };
  };
  const reportRosterWishClientError = (
    title: string,
    description?: string | null,
    metadata: Record<string, unknown> = {},
  ) => {
    void reportClientToastError({
      title,
      description,
      metadata: getRosterWishFailureMetadata(metadata),
    });
  };

  // Roster state
  const [rosters, setRosters] = useState<RosterData[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [rosterSettingsOpen, setRosterSettingsOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockAtInput, setLockAtInput] = useState('');
  const [lockingRoster, setLockingRoster] = useState(false);
  const [schedulingLock, setSchedulingLock] = useState(false);
  const [lockingMemberId, setLockingMemberId] = useState<string | null>(null);
  const [updatingSelectionMemberId, setUpdatingSelectionMemberId] = useState<string | null>(null);
  const [externalCandidates, setExternalCandidates] = useState<ExternalRosterCandidate[]>([]);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [externalCandidateId, setExternalCandidateId] = useState('');
  const [externalClassId, setExternalClassId] = useState('');
  const [externalComment, setExternalComment] = useState('');
  const [savingExternalWish, setSavingExternalWish] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMember, setHistoryMember] = useState<MemberWish | null>(null);
  const [historyRows, setHistoryRows] = useState<RosterSeasonHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncingSeason, setSyncingSeason] = useState(false);
  const [guildMainRefreshNonce, setGuildMainRefreshNonce] = useState(0);

  const isMobile = useIsMobile();
  const rosterSeasonsEnabled = useKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.rosterSeasons);

  const toLocalInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const toIsoFromLocalInput = (value: string) => {
    if (!value) return null;
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if ([year, month, day, hour, minute].some(n => Number.isNaN(n))) return null;
    const localDate = new Date(year, month - 1, day, hour, minute);
    return localDate.toISOString();
  };

  const selectSeasonInUrl = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const next = new URLSearchParams(searchParams);
    if (selectedRosterId) next.set('rosterId', selectedRosterId);
    next.set('seasonId', seasonId);
    setSearchParams(next, { replace: true });
  };

  const selectRosterInUrl = (rosterId: string) => {
    setSelectedRosterId(rosterId);
    const next = new URLSearchParams(searchParams);
    next.set('rosterId', rosterId);
    next.delete('seasonId');
    next.delete('edit');
    setSearchParams(next, { replace: true });
  };

  const clearPersonalEditIntent = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!rosterSeasonsEnabled) {
      setSeasonSupportMode('legacy');
      setSeasons([]);
      setSelectedSeasonId(null);
    }
  }, [rosterSeasonsEnabled]);

  const resolveInitialSeason = (items: GuildSeason[]) => {
    const requestedSeasonId = searchParams.get('seasonId');
    return (
      items.find((season) => season.id === requestedSeasonId) ||
      items.find((season) => season.state === 'active') ||
      items[0] ||
      null
    );
  };

  const fetchSeasons = async (foundGuildId = guildId, rosterId = selectedRosterId) => {
    if (!foundGuildId || !rosterId) return [];
    if (!rosterSeasonsEnabled) {
      setSeasonSupportMode('legacy');
      setSeasons([]);
      setSelectedSeasonId(null);
      return [];
    }

    const loadRosterSeasons = () => supabase
      .from('roster_wish_seasons')
      .select('*')
      .eq('guild_id', foundGuildId)
      .eq('roster_id', rosterId)
      .order('state', { ascending: true })
      .order('created_at', { ascending: false });
    const { data, error } = await loadRosterSeasons();

    if (error && isSeasonSchemaUnavailable(error)) {
      setSeasonSupportMode('legacy');
      setSeasons([]);
      setSelectedSeasonId(null);
      return [];
    }
    if (error) throw error;

    let nextSeasons = (data || []) as GuildSeason[];
    if (nextSeasons.length === 0) {
      if (canManageWishes && !isAdminReadOnly) {
        const seasonName = await resolveCurrentWowSeasonName();
        const { error: createError } = await supabase.rpc('prepare_roster_wish_season', {
          p_roster_id: rosterId,
          p_name: seasonName,
          p_starts_at: null,
          p_ends_at: null,
          p_source_season_id: null,
          p_activate: false,
        });
        if (createError && isSeasonSchemaUnavailable(createError)) {
          setSeasonSupportMode('legacy');
          setSeasons([]);
          setSelectedSeasonId(null);
          return [];
        }
        if (createError) throw createError;
        const reloaded = await loadRosterSeasons();
        if (reloaded.error) throw reloaded.error;
        nextSeasons = (reloaded.data || []) as GuildSeason[];
      }

      if (nextSeasons.length === 0) {
        setSeasonSupportMode('enabled');
        setSeasons([]);
        setSelectedSeasonId(null);
        return [];
      }
    }

    setSeasonSupportMode('enabled');
    setSeasons(nextSeasons);
    setSelectedSeasonId((current) => {
      if (current && nextSeasons.some((season) => season.id === current)) return current;
      return resolveInitialSeason(nextSeasons)?.id || null;
    });
    return nextSeasons;
  };

  const getProfileMainCharacterDisplay = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    const separators = [' - ', ' — ', ' – '];
    for (const sep of separators) {
      if (trimmed.includes(sep)) {
        const [name, ...realmParts] = trimmed.split(sep);
        const characterName = name?.trim();
        const realmName = formatRealmDisplayName(realmParts.join(sep));
        return [characterName, realmName].filter(Boolean).join(' - ') || trimmed;
      }
    }
    if (trimmed.includes('-')) {
      const [name, ...realmParts] = trimmed.split('-');
      const characterName = name?.trim();
      const realmName = formatRealmDisplayName(realmParts.join('-'));
      return [characterName, realmName].filter(Boolean).join(' - ') || trimmed;
    }
    return trimmed;
  };

  const fetchData = async () => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) return;

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
    setGuild({ name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu', faction: matchedGuild.faction, avatar_url: matchedGuild.avatar_url });

    // Check if user is a member of this guild
    const { data: membershipData, error: membershipError } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', foundGuildId)
      .eq('user_id', user.id)
      .maybeSingle();

    // If not a member but is global admin, allow read-only access
    if (membershipError || !membershipData) {
      if (isGlobalAdmin) {
        setIsAdminReadOnly(true);
        setIsGM(false);
        setCanManageWishes(false);
        setCanManageMembers(false);
        setHasSettingsPermission(true);
      } else {
        navigate('/guilds');
        return;
      }
    } else {
      const userIsGM = membershipData.role === 'gm';
      setIsGM(userIsGM);

      // Check manage_wishes permission
      const { data: wishPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'manage_wishes',
        p_user_id: user.id,
      });
      setCanManageWishes(!!userIsGM || !!wishPerm);

      const { data: membersPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'manage_members',
        p_user_id: user.id,
      });
      setCanManageMembers(!!userIsGM || !!membersPerm);

      // Check settings permissions
      const { data: settingsPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasSettingsPermission(!!userIsGM || !!wishPerm || !!settingsPerm);
    }

    // Fetch rosters and check access (for both members and admin read-only)
    const { data: rostersData } = await supabase
      .from('rosters')
      .select('*')
      .eq('guild_id', foundGuildId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (rostersData) {
      // Check access for each roster - admins get access to all rosters
      const rostersWithAccess: RosterData[] = await Promise.all(
        rostersData.map(async (roster) => {
          if (isGlobalAdmin) {
            return {
              id: roster.id,
              name: roster.name,
              is_default: roster.is_default,
              hasAccess: true,
              accessSource: 'admin_read_only',
              wishes_locked: roster.wishes_locked,
              wishes_lock_at: roster.wishes_lock_at,
            };
          }
          const { data: accessDebug, error: accessDebugError } = await supabase.rpc('get_roster_access_debug', {
            p_roster_id: roster.id,
            p_user_id: user.id,
          });
          const debugRow = !accessDebugError && Array.isArray(accessDebug) ? accessDebug[0] : null;
          const { data: hasAccess } = debugRow
            ? { data: debugRow.has_access }
            : await supabase.rpc('has_roster_access', {
                p_roster_id: roster.id,
                p_user_id: user.id,
              });
          return {
            id: roster.id,
            name: roster.name,
            is_default: roster.is_default,
            hasAccess: hasAccess || false,
            accessSource: debugRow?.source || null,
            wishes_locked: roster.wishes_locked,
            wishes_lock_at: roster.wishes_lock_at,
          };
        })
      );
      setRosters(rostersWithAccess);

      // Select requested roster from URL, default roster, or first accessible.
      const requestedRosterId = searchParams.get('rosterId');
      const hasPersonalEditIntent = searchParams.get('edit') === 'my-wishes';
      const requestedRosterById = requestedRosterId
        ? rostersWithAccess.find((roster) => roster.id === requestedRosterId)
        : null;
      const requestedRoster = requestedRosterId
        ? requestedRosterById && requestedRosterById.hasAccess ? requestedRosterById : null
        : null;
      const defaultRoster =
        requestedRoster ||
        rostersWithAccess.find(r => r.is_default && r.hasAccess) ||
        rostersWithAccess.find(r => r.hasAccess);
      if (defaultRoster) {
        const next = new URLSearchParams(searchParams);
        next.set('rosterId', defaultRoster.id);
        if (hasPersonalEditIntent && requestedRosterId && requestedRosterId !== defaultRoster.id) {
          next.delete('edit');
          reportRosterWishClientError(t.rosters.noAccess, null, {
            event: 'stale_personal_edit_roster_fallback',
            staleRosterId: requestedRosterId,
            fallbackRosterId: defaultRoster.id,
            hasAccess: false,
          });
        }
        if (selectedRosterId !== defaultRoster.id) {
          setSelectedRosterId(defaultRoster.id);
        }
        if (next.toString() !== searchParams.toString()) {
          setSearchParams(next, { replace: true });
        }
        await fetchSeasons(foundGuildId, defaultRoster.id);
      }
      if (!defaultRoster) {
        const fallbackRoster = requestedRosterById || rostersWithAccess[0] || null;
        if (selectedRosterId !== (fallbackRoster?.id || null)) {
          setSelectedRosterId(fallbackRoster?.id || null);
        }
        if (hasPersonalEditIntent) {
          const next = new URLSearchParams(searchParams);
          next.delete('edit');
          if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
          }
          reportRosterWishClientError(t.rosters.noAccess, null, {
            event: 'personal_edit_no_accessible_roster',
            staleRosterId: requestedRosterId,
            hasAccess: false,
          });
        }
        setWishesLoading(false);
      }
    } else {
      setWishesLoading(false);
    }

    setLoading(false);
  };

  // Fetch wishes when roster changes
  const fetchWishes = async () => {
    setWishesLoading(true);
    try {
      if (!guildId || !selectedRosterId) {
        setMembers([]);
        setExternalCandidates([]);
        return;
      }
      const selectedRoster = rosters.find((roster) => roster.id === selectedRosterId);
      if (selectedRoster && !selectedRoster.hasAccess && !isAdminReadOnly) {
        setMembers([]);
        setExternalCandidates([]);
        return;
      }

      const seasonFilteringEnabled = isSeasonFilteringEnabled(seasonSupportMode, selectedSeasonId);
      const hasPersonalEditIntent = searchParams.get('edit') === 'my-wishes';
      if (seasonSupportMode === 'enabled' && !selectedSeasonId) {
        setMembers([]);
        setExternalCandidates([]);
        return;
      }
      const privateMemberSeason = seasonFilteringEnabled
        && !!seasons.find((season) => season.id === selectedSeasonId)?.hide_member_wishes
        && !canManageWishes;
      if (seasonFilteringEnabled && canManageWishes && !isAdminReadOnly) {
        const { error: materializeError } = await supabase.rpc('materialize_roster_season_members', {
          p_roster_id: selectedRosterId,
          p_season_id: selectedSeasonId!,
        });
        if (materializeError && !isSeasonSchemaUnavailable(materializeError)) {
          logRosterSeasonError('materialize_roster_season_members_failed', materializeError, {
            rpc: 'materialize_roster_season_members',
            canManageWishes,
            isAdminReadOnly,
          });
        }
      }

      const { data: membersData } = await supabase
        .from('guild_members')
        .select('user_id, status, wishes_locked, role')
        .eq('guild_id', guildId);

      const safeMembers = privateMemberSeason
        ? (membersData || []).filter((member) => member.user_id === user?.id)
        : membersData || [];
      const needsCurrentUserFallback = hasPersonalEditIntent
        && !!user
        && !!selectedRoster?.hasAccess
        && !safeMembers.some((member) => member.user_id === user.id);
      const userIds = [
        ...new Set([
          ...safeMembers.map(m => m.user_id),
          ...(needsCurrentUserFallback && user ? [user.id] : []),
        ]),
      ];

      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, username, main_character_name')
            .in('id', userIds)
        : { data: [] };

      const { data: effectiveMains } = await supabase.rpc('get_guild_member_main_characters', {
        p_guild_id: guildId,
      });
      const effectiveMainByUserId = new Map((effectiveMains || []).map((row) => [row.user_id, row]));

      const { data: intentData } = userIds.length > 0 && seasonFilteringEnabled
        ? await supabase
            .from('guild_season_member_intents')
            .select('user_id, commitment_status')
            .eq('guild_id', guildId)
            .eq('roster_id', selectedRosterId)
            .eq('season_id', selectedSeasonId!)
            .in('user_id', userIds)
        : { data: [] };
      const intentByUserId = new Map((intentData || []).map((intent) => [intent.user_id, intent.commitment_status]));

      // Filter wishes by selected roster
      let wishesQuery = supabase
        .from('class_wishes')
        .select('user_id, choice_index, class_id, spec_ids, spec_order, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId);
      if (seasonFilteringEnabled) {
        wishesQuery = wishesQuery.eq('season_id', selectedSeasonId!);
      }
      const { data: wishesData } = await wishesQuery;

      // External wishes and candidate pool (members in roster cache not yet linked to a Guildforce account)
      let externalWishesQuery = supabase
        .from('external_member_wishes')
        .select('id, roster_cache_id, class_id, spec_ids, spec_order, comment, commitment_status, validation_status, validated_by, validated_at')
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId);
      if (seasonFilteringEnabled) {
        externalWishesQuery = externalWishesQuery.eq('season_id', selectedSeasonId!);
      }
      const { data: externalWishesData } = await externalWishesQuery;

      const { data: rosterCacheData } = await supabase
        .from('guild_roster_cache')
        .select('id, character_name, character_realm, character_realm_slug, matched_user_id, rank_index')
        .eq('guild_id', guildId);

      const { data: rosterAccessRulesData } = await supabase
        .from('roster_access_rules')
        .select('access_type, user_id, min_rank_index, max_rank_index')
        .eq('roster_id', selectedRosterId);
      const rosterAccessRules = (rosterAccessRulesData || []) as RosterAccessRuleRow[];
      const explicitUserIds = new Set(
        rosterAccessRules
          .filter((rule) => rule.access_type === 'user' && !!rule.user_id)
          .map((rule) => rule.user_id as string),
      );
      const rankRules = rosterAccessRules.filter((rule) => rule.access_type === 'rank');
      const isRankInRosterScope = (rankIndex: number | null | undefined) =>
        rankIndex !== null && rankIndex !== undefined && rankRules.some((rule) => {
          const minRank = rule.min_rank_index ?? 0;
          const maxRank = rule.max_rank_index ?? minRank;
          return rankIndex >= minRank && rankIndex <= maxRank;
        });

      const bestRankByUserId = new Map<string, number>();
      (rosterCacheData || []).forEach((row) => {
        if (!row.matched_user_id || row.rank_index === null || row.rank_index === undefined) return;
        const currentRank = bestRankByUserId.get(row.matched_user_id);
        if (currentRank === undefined || row.rank_index < currentRank) {
          bestRankByUserId.set(row.matched_user_id, row.rank_index);
        }
      });

      const { data: selectionRows, error: selectionError } = await supabase.rpc(
        'get_roster_member_selection',
        seasonFilteringEnabled
          ? { p_roster_id: selectedRosterId, p_season_id: selectedSeasonId! }
          : { p_roster_id: selectedRosterId }
      );
      if (selectionError && !isSeasonSchemaUnavailable(selectionError)) {
        logRosterSeasonError('get_roster_member_selection_failed', selectionError, {
          rpc: 'get_roster_member_selection',
        });
      }

      const selectionList = (selectionRows || []) as RosterMemberSelectionRow[];
      const selectionsByUserId = new Map(
        selectionList
          .filter((row) => !!row.user_id)
          .map((row) => [row.user_id as string, row])
      );
      const selectionsByRosterCacheId = new Map(
        selectionList
          .filter((row) => !!row.roster_cache_id)
          .map((row) => [row.roster_cache_id as string, row])
      );

      const { data: seasonTableRows, error: seasonTableError } = seasonFilteringEnabled
        ? await supabase.rpc('get_roster_season_table', {
            p_roster_id: selectedRosterId,
            p_season_id: selectedSeasonId!,
          })
        : { data: null, error: null };
      if (seasonTableError && !isSeasonSchemaUnavailable(seasonTableError)) {
        logRosterSeasonError('get_roster_season_table_failed', seasonTableError, {
          rpc: 'get_roster_season_table',
        });
      }
      const seasonTableList = (seasonTableRows || []) as RosterSeasonTableRow[];
      const seasonTableByUserId = new Map(
        seasonTableList.filter((row) => !!row.user_id).map((row) => [row.user_id as string, row])
      );
      const seasonTableByRosterCacheId = new Map(
        seasonTableList.filter((row) => !!row.roster_cache_id).map((row) => [row.roster_cache_id as string, row])
      );
      // Fetch validator profiles if there are any
      const validatorIds = [
        ...new Set([
          ...(wishesData?.filter(w => w.validated_by).map(w => w.validated_by) || []),
          ...(externalWishesData?.filter(w => w.validated_by).map(w => w.validated_by) || []),
          ...seasonTableList.flatMap((row) => {
            const rowWishes = Array.isArray(row.wishes) ? row.wishes as Array<{ validated_by?: string | null }> : [];
            return rowWishes.map((wish) => wish.validated_by).filter(Boolean) as string[];
          }),
        ]),
      ];
      const { data: validatorProfiles } = validatorIds.length > 0
        ? await supabase.from('profiles').select('id, username').in('id', validatorIds)
        : { data: [] };

      const profilesById = new Map((profiles || []).map((p) => [p.id, p]));
      const validatorById = new Map((validatorProfiles || []).map((p) => [p.id, p.username]));
      const wishUserIds = new Set((wishesData || []).map((wish) => wish.user_id));
      const intentUserIds = new Set((intentData || []).map((intent) => intent.user_id));
      const selectionUserIds = new Set(selectionsByUserId.keys());
      const mapSeasonWishes = (seasonRow?: RosterSeasonTableRow) => {
        const rowWishes = Array.isArray(seasonRow?.wishes)
          ? seasonRow.wishes as Array<{
              choice_index?: number;
              class_id?: string;
              spec_ids?: string[];
              spec_order?: string[];
              comment?: string | null;
              validation_status?: ValidationStatus;
              validated_by?: string | null;
              validated_at?: string | null;
            }>
          : [];
        return rowWishes.map((wish, index) => ({
          choice_index: wish.choice_index || index + 1,
          class_id: wish.class_id || '',
          spec_ids: resolveSpecOrder(wish.spec_ids || [], wish.spec_order),
          comment: wish.comment || null,
          validation_status: (wish.validation_status || 'pending') as ValidationStatus,
          validated_by: wish.validated_by || null,
          validated_at: wish.validated_at || null,
          validated_by_username: wish.validated_by ? validatorById.get(wish.validated_by) || null : null,
        }));
      };
      const mapLinkedWishes = (memberId: string) =>
        wishesData?.filter(w => w.user_id === memberId).map(w => ({
          choice_index: w.choice_index,
          class_id: w.class_id,
          spec_ids: resolveSpecOrder(w.spec_ids || [], w.spec_order),
          comment: w.comment,
          validation_status: (w.validation_status || 'pending') as ValidationStatus,
          validated_by: w.validated_by,
          validated_at: w.validated_at,
          validated_by_username: w.validated_by ? validatorById.get(w.validated_by) || null : null,
        })) || [];
      const shouldShowLinkedMember = (member: typeof safeMembers[number]) => {
        if (privateMemberSeason && member.user_id === user?.id) return true;
        const hasRosterSeasonData =
          wishUserIds.has(member.user_id)
          || intentUserIds.has(member.user_id)
          || selectionUserIds.has(member.user_id);
        if (hasRosterSeasonData) return true;
        if (member.role === 'gm') return true;
        if (explicitUserIds.has(member.user_id)) return true;
        return isRankInRosterScope(bestRankByUserId.get(member.user_id));
      };

      // Keep only members that still have an active profile.
      // This avoids showing stale lines for accounts that were removed.
      let mergedMembers: MemberWish[] = safeMembers.filter(shouldShowLinkedMember).flatMap(m => {
        const profile = profilesById.get(m.user_id);
        if (!profile) return [];
        const selection = selectionsByUserId.get(m.user_id);
        const seasonRow = seasonTableByUserId.get(m.user_id);
        const memberWishes = seasonFilteringEnabled
          ? mapSeasonWishes(seasonRow)
          : mapLinkedWishes(m.user_id);
        const visibleWishes = memberWishes.length > 0 ? memberWishes : mapLinkedWishes(m.user_id);
        return {
          id: m.user_id,
          seasonMemberId: seasonRow?.season_member_id || null,
          username: profile?.username || 'Unknown',
          mainCharacterName: (() => {
            const effectiveMain = effectiveMainByUserId.get(m.user_id);
            if (effectiveMain) {
              return [
                effectiveMain.character_name,
                formatRealmDisplayName(effectiveMain.character_realm, effectiveMain.character_realm_slug),
              ]
                .filter(Boolean)
                .join(' - ');
            }
            return getProfileMainCharacterDisplay(profile?.main_character_name);
          })(),
          rankIndex: seasonRow?.rank_index ?? null,
          status: intentByUserId.get(m.user_id) || (seasonFilteringEnabled ? 'undecided' : m.status),
          wishes_locked: m.wishes_locked,
          wishes: visibleWishes.sort((a, b) => a.choice_index - b.choice_index),
          selectionStatus: selection?.selection_status || 'undecided',
          selectionReasonCode: selection?.reason_code || null,
          selectionComment: selection?.comment || null,
          selectionDecidedBy: selection?.decided_by || null,
          selectionDecidedAt: selection?.decided_at || null,
          selectionUpdatedAt: selection?.updated_at || null,
          seasonOutcome: seasonRow?.outcome || null,
        };
      });

      if (needsCurrentUserFallback && user && !mergedMembers.some((member) => member.id === user.id)) {
        const seasonRow = seasonTableByUserId.get(user.id);
        const selection = selectionsByUserId.get(user.id);
        const fallbackProfile = profilesById.get(user.id) || (profile?.id === user.id ? profile : null);
        const fallbackCache = (rosterCacheData || [])
          .filter((row) => row.matched_user_id === user.id)
          .sort((a, b) => {
            const leftRank = a.rank_index ?? Number.MAX_SAFE_INTEGER;
            const rightRank = b.rank_index ?? Number.MAX_SAFE_INTEGER;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return a.character_name.localeCompare(b.character_name, language);
          })[0];

        if (seasonRow || fallbackProfile || fallbackCache) {
          const memberWishes = seasonFilteringEnabled
            ? mapSeasonWishes(seasonRow)
            : mapLinkedWishes(user.id);
          const visibleWishes = memberWishes.length > 0 ? memberWishes : mapLinkedWishes(user.id);
          const cacheMainCharacter = fallbackCache
            ? [
                fallbackCache.character_name,
                formatRealmDisplayName(fallbackCache.character_realm, fallbackCache.character_realm_slug),
              ]
                .filter(Boolean)
                .join(' - ')
            : null;
          const seasonMainCharacter = seasonRow?.character_name
            ? [
                seasonRow.character_name,
                seasonRow.realm,
              ]
                .filter(Boolean)
                .join(' - ')
            : null;
          mergedMembers = [
            ...mergedMembers,
            {
              id: user.id,
              seasonMemberId: seasonRow?.season_member_id || null,
              username: seasonRow?.display_name || fallbackProfile?.username || profile?.username || user.email || 'Unknown',
              mainCharacterName: seasonMainCharacter
                || cacheMainCharacter
                || getProfileMainCharacterDisplay(fallbackProfile?.main_character_name || profile?.main_character_name),
              rankIndex: seasonRow?.rank_index ?? fallbackCache?.rank_index ?? null,
              status: intentByUserId.get(user.id) || (seasonFilteringEnabled ? 'undecided' : 'potential'),
              wishes_locked: false,
              wishes: visibleWishes.sort((a, b) => a.choice_index - b.choice_index),
              selectionStatus: seasonRow?.selection_status || selection?.selection_status || 'undecided',
              selectionReasonCode: seasonRow?.selection_reason_code || selection?.reason_code || null,
              selectionComment: seasonRow?.selection_comment || selection?.comment || null,
              selectionDecidedBy: seasonRow?.selection_decided_by || selection?.decided_by || null,
              selectionDecidedAt: seasonRow?.selection_decided_at || selection?.decided_at || null,
              selectionUpdatedAt: seasonRow?.selection_updated_at || selection?.updated_at || null,
              seasonOutcome: seasonRow?.outcome || null,
            },
          ];
        }
      }

      const externalByCache = new Map((externalWishesData || []).map((w) => [w.roster_cache_id, w as ExternalWishRow]));
      const externalMembers: MemberWish[] = privateMemberSeason ? [] : (rosterCacheData || [])
        .filter((row) => !row.matched_user_id)
        .flatMap((row) => {
          const ext = externalByCache.get(row.id);
          if (!ext) return [];
          const selection = selectionsByRosterCacheId.get(row.id);
          const seasonRow = seasonTableByRosterCacheId.get(row.id);
          const externalWishes = seasonFilteringEnabled
            ? mapSeasonWishes(seasonRow)
            : [{
                choice_index: 1,
                class_id: ext.class_id,
                spec_ids: resolveSpecOrder(ext.spec_ids || [], ext.spec_order),
                comment: ext.comment,
                validation_status: (ext.validation_status || 'pending') as ValidationStatus,
                validated_by: ext.validated_by,
                validated_at: ext.validated_at,
                validated_by_username: ext.validated_by ? validatorById.get(ext.validated_by) || null : null,
              }];
          return [{
            id: `external:${ext.id}`,
            seasonMemberId: seasonRow?.season_member_id || null,
            username: row.character_name,
            mainCharacterName: formatRealmDisplayName(row.character_realm, row.character_realm_slug),
            rankIndex: row.rank_index,
            status: ext.commitment_status || 'potential',
            wishes_locked: false,
            isExternal: true,
            externalWishId: ext.id,
            rosterCacheId: row.id,
            wishes: externalWishes,
            selectionStatus: selection?.selection_status || 'undecided',
            selectionReasonCode: selection?.reason_code || null,
            selectionComment: selection?.comment || null,
            selectionDecidedBy: selection?.decided_by || null,
            selectionDecidedAt: selection?.decided_at || null,
            selectionUpdatedAt: selection?.updated_at || null,
            seasonOutcome: seasonRow?.outcome || null,
          }];
        });

      setMembers([...mergedMembers, ...externalMembers]);

      const candidates: ExternalRosterCandidate[] = privateMemberSeason
        ? []
        : (rosterCacheData || [])
            .filter((row) => !row.matched_user_id && isRankInRosterScope(row.rank_index))
            .map((row) => ({
              id: row.id,
              character_name: row.character_name,
              character_realm: formatRealmDisplayName(row.character_realm, row.character_realm_slug),
              character_realm_slug: row.character_realm_slug || '',
            }));
      setExternalCandidates(candidates);
    } finally {
      setWishesLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }
    // Wait for admin check to complete
    if (adminLoading) return;
    fetchData().catch((error: unknown) => {
      logRosterSeasonError('initial_fetch_failed', error);
      setLoading(false);
      setWishesLoading(false);
      reportRosterWishClientError(t.errors.generic, getErrorMessage(error), {
        event: 'initial_fetch_failed',
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    });
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, navigate, adminLoading, isGlobalAdmin, rosterSeasonsEnabled]);

  useEffect(() => {
    if (guildId && selectedRosterId && (seasonSupportMode === 'legacy' || selectedSeasonId)) {
      fetchWishes();
    } else if (guildId && !selectedRosterId) {
      setWishesLoading(false);
    }
  }, [guildId, selectedRosterId, selectedSeasonId, seasonSupportMode, guildMainRefreshNonce]);

  useEffect(() => {
    if (!guildId || !selectedRosterId || seasonSupportMode === 'legacy') return;
    fetchSeasons(guildId, selectedRosterId);
  }, [guildId, selectedRosterId, canManageWishes, isAdminReadOnly, rosterSeasonsEnabled, seasonSupportMode]);

  useEffect(() => {
    if (!lockDialogOpen) return;
    const roster = rosters.find(r => r.id === selectedRosterId);
    setLockAtInput(toLocalInputValue(roster?.wishes_lock_at));
  }, [lockDialogOpen, rosters, selectedRosterId]);

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const activeSeason = seasons.find((season) => season.state === 'active') || null;
  const sortedSeasonOptions = useMemo(
    () =>
      [...seasons].sort((a, b) => {
        const stateOrder = { active: 0, draft: 1, archived: 2 } as const;
        const stateDiff = stateOrder[a.state] - stateOrder[b.state];
        if (stateDiff !== 0) return stateDiff;
        return (b.activated_at || b.created_at).localeCompare(a.activated_at || a.created_at);
      }),
    [seasons],
  );
  const seasonSourceOptions = sortedSeasonOptions.filter((season) => season.id !== selectedSeasonId);
  const isSelectedSeasonActive = seasonSupportMode === 'legacy' || selectedSeason?.state === 'active';
  const canEditArchivedSeasonAsManager = canManageWishes && !isAdminReadOnly && selectedSeason?.state === 'archived';
  const canMutateSelectedSeason = (isSelectedSeasonActive || canEditArchivedSeasonAsManager) && !isAdminReadOnly;
  const canManageSeasonActions = canManageWishes && !isAdminReadOnly && seasonSupportMode === 'enabled' && seasons.length > 0;
  const isPrivateMemberSeason = !!selectedSeason?.hide_member_wishes && !canManageWishes;
  const canViewRosterInsights = !isPrivateMemberSeason;

  useEffect(() => {
    if (!canViewRosterInsights && activeTab !== 'table') {
      setActiveTab('table');
    }
  }, [activeTab, canViewRosterInsights]);

  const handlePrepareSeason = async (input: PrepareSeasonInput) => {
    if (!guildId || !selectedRosterId) return;
    setSeasonBusy(true);
    try {
      const { data, error } = await supabase.rpc('prepare_roster_wish_season', {
        p_roster_id: selectedRosterId,
        p_name: input.name,
        p_starts_at: input.startsAt,
        p_ends_at: input.endsAt,
        p_source_season_id: input.sourceSeasonId,
        p_activate: input.activateImmediately,
      });
      if (error) throw error;
      const nextSeasons = await fetchSeasons(guildId, selectedRosterId);
      const nextSeasonId = data?.id || resolveInitialSeason(nextSeasons)?.id;
      if (nextSeasonId) selectSeasonInUrl(nextSeasonId);
      toast({ title: input.activateImmediately ? t.seasons.activated : t.seasons.created });
      await fetchWishes();
    } catch (error: unknown) {
      logRosterSeasonError('prepare_roster_wish_season_failed', error, {
        rpc: 'prepare_roster_wish_season',
        activateImmediately: input.activateImmediately,
        sourceSeasonId: input.sourceSeasonId,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSeasonBusy(false);
    }
  };

  const handleArchiveSeason = async (seasonId: string) => {
    setSeasonBusy(true);
    try {
      const { error } = await supabase.rpc('archive_roster_wish_season', { p_season_id: seasonId });
      if (error) throw error;
      const nextSeasons = await fetchSeasons(guildId, selectedRosterId);
      const nextSeasonId = resolveInitialSeason(nextSeasons)?.id;
      if (nextSeasonId) selectSeasonInUrl(nextSeasonId);
      toast({ title: t.seasons.archivedToast });
    } catch (error: unknown) {
      logRosterSeasonError('archive_roster_wish_season_failed', error, {
        rpc: 'archive_roster_wish_season',
        seasonId,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSeasonBusy(false);
    }
  };

  const handleActivateSeason = async (seasonId: string) => {
    setSeasonBusy(true);
    try {
      const { data, error } = await supabase.rpc('activate_roster_wish_season', { p_season_id: seasonId });
      if (error) throw error;
      await fetchSeasons(guildId, selectedRosterId);
      if (data?.id) selectSeasonInUrl(data.id);
      toast({ title: t.seasons.activated });
    } catch (error: unknown) {
      logRosterSeasonError('activate_roster_wish_season_failed', error, {
        rpc: 'activate_roster_wish_season',
        seasonId,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSeasonBusy(false);
    }
  };

  const handleRenameSeason = async (seasonId: string, name: string) => {
    setSeasonBusy(true);
    try {
      const { error } = await supabase
        .from('roster_wish_seasons')
        .update({ name })
        .eq('id', seasonId);
      if (error) throw error;
      await fetchSeasons(guildId, selectedRosterId);
      toast({ title: t.seasons.renamed });
    } catch (error: unknown) {
      logRosterSeasonError('rename_roster_wish_season_failed', error, {
        table: 'roster_wish_seasons',
        operation: 'update',
        seasonId,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSeasonBusy(false);
    }
  };

  const handleToggleSeasonPrivacy = async (checked: boolean) => {
    if (!selectedSeason) return;
    setSeasonBusy(true);
    try {
      const { error } = await supabase
        .from('roster_wish_seasons')
        .update({ hide_member_wishes: checked })
        .eq('id', selectedSeason.id);
      if (error) throw error;
      await fetchSeasons(guildId, selectedRosterId);
      toast({ title: t.seasons.privacyUpdated });
      await fetchWishes();
    } catch (error: unknown) {
      logRosterSeasonError('update_roster_wish_season_privacy_failed', error, {
        table: 'roster_wish_seasons',
        operation: 'update',
        seasonId: selectedSeason.id,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSeasonBusy(false);
    }
  };

  const resetSeasonDialogForm = () => {
    setSeasonName('');
    setSeasonStartsAt('');
    setSeasonEndsAt('');
    setSeasonSourceId(activeSeason?.id || '');
    setSeasonPrefillWishes(false);
    setSeasonResetCopiedWishes(true);
    setSeasonActivateImmediately(true);
  };

  const openSeasonDialog = () => {
    resetSeasonDialogForm();
    setSeasonDialogOpen(true);
  };

  const openSeasonSettings = () => {
    if (selectedSeason) {
      setSeasonRenameName(selectedSeason.name);
    }
    setSeasonSettingsOpen(true);
  };

  const submitSeasonDialog = async () => {
    if (!seasonName.trim()) return;
    setSeasonDialogSaving(true);
    try {
      await handlePrepareSeason({
        name: seasonName.trim(),
        startsAt: seasonStartsAt || null,
        endsAt: seasonEndsAt || null,
        sourceSeasonId: seasonSourceId || activeSeason?.id || null,
        prefillWishes: seasonPrefillWishes,
        resetCopiedWishes: seasonResetCopiedWishes,
        activateImmediately: seasonActivateImmediately,
      });
      setSeasonDialogOpen(false);
      resetSeasonDialogForm();
    } finally {
      setSeasonDialogSaving(false);
    }
  };

  const activateSelectedSeason = async () => {
    if (!selectedSeason) return;
    setSeasonActionBusy('activate');
    try {
      await handleActivateSeason(selectedSeason.id);
    } finally {
      setSeasonActionBusy(null);
    }
  };

  const unarchiveSelectedSeason = async () => {
    if (!selectedSeason) return;
    if (!window.confirm(t.seasons.confirmUnarchive)) return;
    setSeasonActionBusy('activate');
    try {
      await handleActivateSeason(selectedSeason.id);
    } finally {
      setSeasonActionBusy(null);
    }
  };

  const archiveSelectedSeason = async () => {
    if (!selectedSeason) return;
    if (!window.confirm(t.seasons.confirmArchive)) return;
    setSeasonActionBusy('archive');
    try {
      await handleArchiveSeason(selectedSeason.id);
    } finally {
      setSeasonActionBusy(null);
    }
  };

  const renameSelectedSeason = async () => {
    if (!selectedSeason || !seasonRenameName.trim()) return;
    setSeasonActionBusy('rename');
    try {
      await handleRenameSeason(selectedSeason.id, seasonRenameName.trim());
    } finally {
      setSeasonActionBusy(null);
    }
  };

  const openHistoryDrawer = async (member: MemberWish) => {
    if (!selectedRosterId || !selectedSeasonId || !member.seasonMemberId) return;
    setHistoryMember(member);
    setHistoryRows([]);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_roster_season_history', {
        p_roster_id: selectedRosterId,
        p_season_id: selectedSeasonId,
        p_roster_season_member_id: member.seasonMemberId,
      });
      if (error) throw error;
      const rows = (data || []) as RosterSeasonHistoryRow[];
      const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => !!id))];
      const { data: actorProfiles } = actorIds.length > 0
        ? await supabase.from('profiles').select('id, username').in('id', actorIds)
        : { data: [] };
      const actorById = new Map((actorProfiles || []).map((profile) => [profile.id, profile.username]));
      setHistoryRows(rows.map((row) => ({
        ...row,
        actor_username: row.actor_id ? actorById.get(row.actor_id) || null : null,
      })));
    } catch (error: unknown) {
      logRosterSeasonError('get_roster_season_history_failed', error, {
        rpc: 'get_roster_season_history',
        seasonMemberId: member.seasonMemberId,
        memberId: member.isExternal ? null : member.id,
        rosterCacheId: member.isExternal ? member.rosterCacheId : null,
        isExternal: member.isExternal,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const applySyncDelta = async () => {
    if (!selectedRosterId || !selectedSeasonId) return;
    setSyncingSeason(true);
    try {
      const { data, error } = await supabase.rpc('apply_roster_season_sync_delta', {
        p_roster_id: selectedRosterId,
        p_season_id: selectedSeasonId,
      });
      if (error) throw error;
      const result = (data || {}) as Record<string, unknown>;
      toast({
        title: t.wishes.memberDetail.historyEvent.syncDeltaApplied,
        description: interpolateMessage(t.wishes.memberDetail.syncDeltaSummary, {
          added: result.added_or_refreshed_count ?? 0,
          leftRoster: result.left_roster_count ?? 0,
          leftGuild: result.left_guild_count ?? 0,
        }),
      });
      await fetchWishes();
    } catch (error: unknown) {
      logRosterSeasonError('apply_roster_season_sync_delta_failed', error, {
        rpc: 'apply_roster_season_sync_delta',
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSyncingSeason(false);
    }
  };

  const getHistoryEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      season_member_snapshot: t.wishes.memberDetail.historyEvent.snapshot,
      roster_season_materialized: t.wishes.memberDetail.historyEvent.materialized,
      external_member_matched: t.wishes.memberDetail.historyEvent.externalMatched,
      member_left_roster: t.wishes.memberDetail.historyEvent.memberLeftRoster,
      member_left_guild: t.wishes.memberDetail.historyEvent.memberLeftGuild,
      roster_season_sync_delta_applied: t.wishes.memberDetail.historyEvent.syncDeltaApplied,
      roster_selection_changed: t.wishes.memberDetail.historyEvent.selectionChanged,
      wishes_changed: t.wishes.memberDetail.historyEvent.wishesChanged,
      wish_created: t.wishes.memberDetail.historyEvent.wishCreated,
      wish_updated: t.wishes.memberDetail.historyEvent.wishUpdated,
      wish_deleted: t.wishes.memberDetail.historyEvent.wishDeleted,
      wish_validation: t.wishes.memberDetail.historyEvent.wishValidation,
    };
    return labels[eventType] || t.wishes.memberDetail.historyEvent.fallback;
  };

  const getSelectionStatusHistoryLabel = (status: unknown) => {
    if (status === 'selected') return t.wishes.rosterDecision.selected;
    if (status === 'bench') return t.wishes.rosterDecision.bench;
    if (status === 'not_selected') return t.wishes.rosterDecision.notSelected;
    if (status === 'undecided' || status === null) return t.wishes.rosterDecision.undecided;
    return typeof status === 'string' ? status : null;
  };

  const formatHistoryPayload = (row: RosterSeasonHistoryRow) => {
    const { payload } = row;
    if (!payload) return null;
    const parts: string[] = [];
    if (row.actor_username) {
      parts.push(formatLabelValue(t.wishes.memberDetail.historyEvent.actor, row.actor_username, language));
    }
    if (row.event_type === 'roster_selection_changed') {
      const oldStatus = getSelectionStatusHistoryLabel(payload.old_selection_status);
      const newStatus = getSelectionStatusHistoryLabel(payload.new_selection_status ?? payload.selection_status);
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        parts.push(formatLabelValue(t.wishes.rosterDecision.summaryTitle, `${oldStatus} -> ${newStatus}`, language));
      } else if (newStatus) {
        parts.push(formatLabelValue(t.wishes.rosterDecision.summaryTitle, newStatus, language));
      }
    }
    const classId = typeof payload.class_id === 'string' ? payload.class_id : null;
    const specId = typeof payload.spec_id === 'string' ? payload.spec_id : null;
    const classLabel = classId ? getLocalizedClassName(classId, language) : null;
    const specLabel = specId ? getLocalizedSpecName(specId, language) : null;
    if (classLabel) parts.push(specLabel ? `${classLabel} ${specLabel}` : classLabel);
    if (typeof payload.season_status === 'string') parts.push(payload.season_status);
    if (typeof payload.source === 'string') parts.push(payload.source);
    if (typeof payload.manager_comment === 'string' && payload.manager_comment.trim()) {
      parts.push(payload.manager_comment.trim());
    }
    if (typeof payload.left_roster_at === 'string') {
      parts.push(formatLabelValue(
        t.wishes.memberDetail.historyEvent.memberLeftRoster,
        formatDateTimeLocalized(payload.left_roster_at, language, { dateStyle: 'medium' }),
        language,
      ));
    }
    if (typeof payload.left_guild_at === 'string') {
      parts.push(formatLabelValue(
        t.wishes.memberDetail.historyEvent.memberLeftGuild,
        formatDateTimeLocalized(payload.left_guild_at, language, { dateStyle: 'medium' }),
        language,
      ));
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const startEditing = useCallback((member: MemberWish) => {
    if (!isSelectedSeasonActive && !canEditArchivedSeasonAsManager) {
      toast({ title: t.seasons.archived, description: selectedSeason?.state === 'draft' ? t.seasons.draftHint : t.seasons.archivedHint, variant: 'destructive' });
      return;
    }
    const canEditOwn = member.id === user?.id;
    const canEditAsManager = canManageWishes && !isAdminReadOnly;
    if (!canEditOwn && !canEditAsManager) return;

    // Check if user has access to this roster
    const currentRoster = rosters.find(r => r.id === selectedRosterId);
    if (!currentRoster?.hasAccess) {
      reportRosterWishClientError(t.rosters.noAccess, null, {
        event: 'start_editing_no_roster_access',
        memberId: member.id,
      });
      toast({ title: t.rosters.noAccess, variant: 'destructive' });
      return;
    }

    if (!canEditAsManager) {
      const lockState = resolveWishLockState({
        rosterLocked: currentRoster?.wishes_locked,
        rosterLockAt: currentRoster?.wishes_lock_at,
        memberLocked: member.wishes_locked,
      });
      if (lockState.isLocked) {
        toast({
          title: t.wishes.lockedTitle,
          description: lockState.reason === 'member' ? t.wishes.lockedMemberDesc : t.wishes.lockedRosterDesc,
          variant: 'destructive',
        });
        return;
      }
    }

    // Load all wishes from member, ensuring at least 3 slots
    const wishCount = member.isExternal ? 1 : Math.max(3, member.wishes.length);
    const loadedWishes: WishData[] = Array.from({ length: wishCount }, () => ({
      classId: '',
      specIds: [],
      comment: '',
    }));

    member.wishes.forEach(w => {
      const idx = w.choice_index - 1;
      if (idx >= 0 && idx < loadedWishes.length) {
        loadedWishes[idx] = {
          classId: w.class_id,
          specIds: w.spec_ids || [],
          comment: w.comment || '',
        };
      }
    });

    setEditWishes(loadedWishes);
    // Map DB status to CommitmentStatus
    const statusMap: Record<string, CommitmentStatus> = {
      'confirmed': 'confirmed',
      'potential': 'undecided',
      'withdrawn': 'withdrawn',
    };
    setEditStatus(statusMap[member.status] || 'undecided');
    setEditSelectionStatus(member.selectionStatus || 'undecided');
    setEditGuildMain(null);
    setEditingUserId(member.id);
  }, [
    canEditArchivedSeasonAsManager,
    canManageWishes,
    isAdminReadOnly,
    isSelectedSeasonActive,
    rosters,
    selectedRosterId,
    selectedSeason?.state,
    t,
    toast,
    user?.id,
  ]);

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditGuildMain(null);
    clearPersonalEditIntent();
  };

  useEffect(() => {
    if (searchParams.get('edit') !== 'my-wishes') return;
    if (loading || wishesLoading || editingUserId || !user || !canMutateSelectedSeason || isAdminReadOnly) return;

    const ownMember = members.find((member) => member.id === user.id);
    if (!ownMember) return;

    startEditing(ownMember);
  }, [
    canMutateSelectedSeason,
    editingUserId,
    isAdminReadOnly,
    loading,
    members,
    searchParams,
    startEditing,
    user,
    wishesLoading,
  ]);

  const updateRosterLockState = (rosterId: string, updates: Partial<RosterData>) => {
    setRosters(prev => prev.map(r => (r.id === rosterId ? { ...r, ...updates } : r)));
  };

  const handleRosterLockToggle = async (lock: boolean) => {
    if (!selectedRosterId || !guildId) return;
    setLockingRoster(true);
    try {
      if (lock) {
        const { error } = await supabase.rpc('lock_roster_wishes', { p_roster_id: selectedRosterId });
        if (error) throw error;
        updateRosterLockState(selectedRosterId, { wishes_locked: true, wishes_lock_at: null });
        toast({ title: t.rosters.wishesLockedToast });
      } else {
        const { error } = await supabase.rpc('unlock_roster_wishes', { p_roster_id: selectedRosterId });
        if (error) throw error;
        updateRosterLockState(selectedRosterId, { wishes_locked: false, wishes_lock_at: null });
        toast({ title: t.rosters.wishesUnlockedToast });
      }
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLockingRoster(false);
    }
  };

  const handleScheduleLock = async (nextValue?: string | null) => {
    if (!selectedRosterId || !guildId) return;
    setSchedulingLock(true);
    try {
      const lockAtIso = toIsoFromLocalInput(nextValue ?? lockAtInput);
      const { error } = await supabase.rpc('schedule_roster_wishes_lock', {
        p_roster_id: selectedRosterId,
        p_lock_at: lockAtIso,
      });
      if (error) throw error;
      updateRosterLockState(selectedRosterId, { wishes_lock_at: lockAtIso });
      toast({ title: lockAtIso ? t.rosters.wishesLockScheduledToast : t.rosters.wishesLockClearedToast });
      if (!lockAtIso) {
        setLockAtInput('');
      }
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSchedulingLock(false);
    }
  };

  const handleToggleMemberLock = async (memberId: string, locked: boolean) => {
    if (!guildId) return;
    setLockingMemberId(memberId);
    try {
      const { error } = await supabase.rpc('set_member_wishes_locked', {
        p_guild_id: guildId,
        p_member_id: memberId,
        p_locked: locked,
      });
      if (error) throw error;
      setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, wishes_locked: locked } : m)));
      toast({ title: locked ? t.wishes.memberLockedToast : t.wishes.memberUnlockedToast });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLockingMemberId(null);
    }
  };

  const resetExternalForm = () => {
    setExternalCandidateId('');
    setExternalClassId('');
    setExternalComment('');
  };

  const handleSaveExternalWish = async () => {
    if (!guildId || !selectedRosterId || !canManageWishes || !canMutateSelectedSeason) return;
    if (!externalCandidateId || !externalClassId) return;

    setSavingExternalWish(true);
    try {
      const payload: Record<string, unknown> = {
        p_roster_id: selectedRosterId,
        p_roster_cache_id: externalCandidateId,
        p_class_id: externalClassId,
        p_spec_ids: [],
        p_comment: externalComment.trim() || null,
        p_commitment_status: 'potential',
      };
      if (seasonSupportMode === 'enabled' && selectedSeasonId) {
        payload.p_season_id = selectedSeasonId;
      }
      const { error } = await supabase.rpc('upsert_external_member_wish', payload);
      if (error) throw error;

      toast({
        title: s('roster_wishes.external_wish_saved'),
      });
      setExternalDialogOpen(false);
      resetExternalForm();
      await fetchWishes();
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSavingExternalWish(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!guildId || !selectedRosterId || !selectedSeasonId || !canManageWishes || memberId === user?.id) return;
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const confirmMessage = member.isExternal
      ? interpolateMessage(s('roster_wishes.confirm_remove_external'), { username: member.username })
      : interpolateMessage(s('roster_wishes.confirm_remove_member'), { username: member.username });
    if (!window.confirm(confirmMessage)) return;

    setDeletingMemberId(memberId);
    try {
      const { error } = member.isExternal && member.externalWishId
        ? await supabase.rpc('delete_external_member_wish', {
            p_external_wish_id: member.externalWishId,
          })
        : await supabase.rpc('remove_roster_wish_row', {
            p_guild_id: guildId,
            p_roster_id: selectedRosterId,
            p_season_id: selectedSeasonId,
            p_member_id: memberId,
          });
      if (error) throw error;
      setMembers((prev) => prev.filter((item) => item.id !== memberId));
      toast({
        title: s('roster_wishes.member_removed'),
      });
    } catch (error: unknown) {
      logRosterSeasonError('remove_roster_member_wish_row_failed', error, {
        rpc: member.isExternal && member.externalWishId ? 'delete_external_member_wish' : 'remove_roster_wish_row',
        memberId: member.isExternal ? null : memberId,
        rosterCacheId: member.isExternal ? member.rosterCacheId ?? null : null,
        externalWishId: member.isExternal ? member.externalWishId ?? null : null,
        isExternal: member.isExternal,
      });
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setDeletingMemberId(null);
    }
  };


  const handleSelectionStatusChange = async (memberId: string, status: MemberWish['selectionStatus']) => {
    if (!selectedRosterId || !user || !canManageWishes || !canMutateSelectedSeason) return;
    if (!status) return;

    const currentMember = members.find((m) => m.id === memberId);
    if (!currentMember) return;

    const previousSelectionStatus = currentMember.selectionStatus || 'undecided';
    const previousDecidedBy = currentMember.selectionDecidedBy || null;
    const previousDecidedAt = currentMember.selectionDecidedAt || null;
    const previousUpdatedAt = currentMember.selectionUpdatedAt || null;

    setUpdatingSelectionMemberId(memberId);

    const now = new Date().toISOString();
    const nextStatus = status;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              selectionStatus: nextStatus,
              selectionDecidedBy: user.id,
              selectionDecidedAt: now,
              selectionUpdatedAt: now,
            }
          : m
      )
    );

    try {
      if (currentMember.isExternal && !currentMember.rosterCacheId) {
        throw new Error(s('roster_wishes.external_edit_unauthorized'));
      }

      const { error } = await supabase.rpc('set_roster_member_selection', {
        p_roster_id: selectedRosterId,
        p_selection_status: nextStatus,
        p_user_id: currentMember.isExternal ? null : memberId,
        p_roster_cache_id: currentMember.isExternal ? currentMember.rosterCacheId ?? null : null,
        p_season_id: seasonSupportMode === 'enabled' ? selectedSeasonId : null,
        p_reason_code: currentMember.selectionReasonCode ?? null,
        p_comment: currentMember.selectionComment ?? null,
      });
      if (error) throw error;
    } catch (error: unknown) {
      logRosterSeasonError('set_roster_member_selection_failed', error, {
        rpc: 'set_roster_member_selection',
        memberId: currentMember.isExternal ? null : memberId,
        rosterCacheId: currentMember.isExternal ? currentMember.rosterCacheId ?? null : null,
        isExternal: currentMember.isExternal,
        previousSelectionStatus,
        nextSelectionStatus: nextStatus,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                selectionStatus: previousSelectionStatus,
                selectionDecidedBy: previousDecidedBy,
                selectionDecidedAt: previousDecidedAt,
                selectionUpdatedAt: previousUpdatedAt,
              }
            : m
        )
      );
      toast({
        title: t.errors.generic,
        description: getRosterSelectionErrorMessage(error, language, getErrorMessage(error)),
        variant: 'destructive',
      });
    } finally {
      setUpdatingSelectionMemberId(null);
    }
  };

  const addWish = () => {
    if (editWishes.length >= MAX_WISHES) return;
    setEditWishes([...editWishes, { classId: '', specIds: [], comment: '' }]);
  };

  const removeWish = (index: number) => {
    if (editWishes.length <= 1) return;
    const updated = editWishes.filter((_, i) => i !== index);
    setEditWishes(updated);
  };

  const clearWish = (index: number) => {
    const updated = [...editWishes];
    updated[index] = { classId: '', specIds: [], comment: '' };
    setEditWishes(updated);
  };

  const moveEditWish = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    reorderEditWishes(index, newIndex);
  };

  const reorderEditWishes = (oldIndex: number, newIndex: number) => {
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= editWishes.length || newIndex >= editWishes.length) return;
    setEditWishes((current) => {
      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const updateEditWish = (
    index: number,
    field: keyof WishData,
    value: WishData[keyof WishData],
  ) => {
    const updated = [...editWishes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setEditWishes(updated);
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

  const getMemberWishSnapshot = (member: MemberWish) => (
    member.wishes
      .filter((wish) => !!wish.class_id)
      .sort((a, b) => a.choice_index - b.choice_index)
      .map((wish) => ({
        classId: wish.class_id,
        specIds: [...(wish.spec_ids || [])],
        comment: wish.comment?.trim() || '',
      }))
  );

  const wishSnapshotsEqual = (left: ReturnType<typeof normalizeWishSnapshot>, right: ReturnType<typeof normalizeWishSnapshot>) => (
    JSON.stringify(left) === JSON.stringify(right)
  );

  const saveEditing = async () => {
    if (!user || !guildId || !editingUserId || !selectedRosterId || !canMutateSelectedSeason) return;

    const currentRoster = rosters.find(r => r.id === selectedRosterId);
    const currentMember = members.find(m => m.id === editingUserId);
    if (!currentMember) return;
    const canEditAsManager = canManageWishes && !isAdminReadOnly;
    const isEditingExternal = !!currentMember.isExternal;
    const lockState = resolveWishLockState({
      rosterLocked: currentRoster?.wishes_locked,
      rosterLockAt: currentRoster?.wishes_lock_at,
      memberLocked: currentMember?.wishes_locked,
    });
    if (!canEditAsManager && lockState.isLocked) {
      toast({
        title: t.wishes.lockedTitle,
        description: lockState.reason === 'member' ? t.wishes.lockedMemberDesc : t.wishes.lockedRosterDesc,
        variant: 'destructive',
      });
      return;
    }
    
    // Validation: each class must have at least one spec
    const invalidWish = editWishes.find(w => w.classId && w.specIds.length === 0);
    if (invalidWish) {
      const cls = getClassById(invalidWish.classId);
      toast({
        title: t.wishes.specRequired,
        description: interpolateMessage(t.wishes.specRequiredDesc, {
          class: cls ? getLocalizedClassName(cls.id, language) : '',
        }),
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);

    try {
      const dbStatus = editStatus === 'withdrawn' ? 'withdrawn' : (editStatus === 'confirmed' ? 'confirmed' : 'potential');
      const currentWishSnapshot = getMemberWishSnapshot(currentMember);
      const nextWishSnapshot = normalizeWishSnapshot(editWishes);
      const hasWishChanges = !wishSnapshotsEqual(currentWishSnapshot, nextWishSnapshot);
      const currentCommitmentStatus = currentMember.status === 'potential' ? 'undecided' : currentMember.status;
      const hasStatusChanges = currentCommitmentStatus !== editStatus;
      const currentSelectionStatus = currentMember.selectionStatus || 'undecided';
      const hasSelectionChanges = canEditAsManager && currentSelectionStatus !== editSelectionStatus;
      const hasGuildMainChanges = !isEditingExternal && !!editGuildMain;

      if (!hasWishChanges && !hasStatusChanges && !hasSelectionChanges && !hasGuildMainChanges) {
        setEditingUserId(null);
        setEditGuildMain(null);
        clearPersonalEditIntent();
        toast({ title: t.wishes.noChangesToSave });
        return;
      }

      if (hasWishChanges || hasStatusChanges) {
        if (isEditingExternal) {
        if (!canEditAsManager || !currentMember.rosterCacheId) {
          throw new Error(s('roster_wishes.external_edit_unauthorized'));
        }

        const primaryWish = editWishes.find((w) => !!w.classId);
        if (!primaryWish) {
          throw new Error(s('roster_wishes.external_first_wish_required'));
        }

        const payload: Record<string, unknown> = {
          p_roster_id: selectedRosterId,
          p_roster_cache_id: currentMember.rosterCacheId,
          p_class_id: primaryWish.classId,
          p_spec_ids: primaryWish.specIds,
          p_comment: primaryWish.comment || null,
          p_commitment_status: dbStatus,
        };
        if (seasonSupportMode === 'enabled' && selectedSeasonId) {
          payload.p_season_id = selectedSeasonId;
        }
        const { error } = await supabase.rpc('upsert_external_member_wish', payload);
        if (error) throw error;
        } else {
        const wishesPayload = editWishes
          .filter((w) => !!w.classId)
          .map((w) => ({
            class_id: w.classId,
            spec_ids: w.specIds,
            comment: w.comment || null,
          }));

        const payload: Record<string, unknown> = {
          p_guild_id: guildId,
          p_roster_id: selectedRosterId,
          p_member_id: editingUserId,
          p_commitment_status: dbStatus,
          p_wishes: wishesPayload,
          p_manager_edit: canEditAsManager,
        };
        if (seasonSupportMode === 'enabled' && selectedSeasonId) {
          payload.p_season_id = selectedSeasonId;
        }
        const { error } = await supabase.rpc('upsert_member_roster_wishes', payload);
        if (error) throw error;

        capturePostHogProductEvent('wish_created', {
          source: 'roster_wishes_manager',
          feature_area: 'wishes',
          guild_id: guildId,
          roster_id: selectedRosterId,
        });
        if (currentMember.id === user.id) {
          void trackProductEvent(supabase, 'activated_first_action', {
            source: 'roster_wishes_manager',
            featureArea: 'wishes',
            guildId,
            rosterId: selectedRosterId,
          });
        }
        }
      }

      if (hasSelectionChanges) {
        const now = new Date().toISOString();
        const { error } = await supabase.rpc('set_roster_member_selection', {
          p_roster_id: selectedRosterId,
          p_selection_status: editSelectionStatus,
          p_user_id: isEditingExternal ? null : editingUserId,
          p_roster_cache_id: isEditingExternal ? currentMember.rosterCacheId ?? null : null,
          p_season_id: seasonSupportMode === 'enabled' ? selectedSeasonId : null,
          p_reason_code: currentMember.selectionReasonCode ?? null,
          p_comment: currentMember.selectionComment ?? null,
        });
        if (error) throw error;
        setMembers((prev) =>
          prev.map((m) =>
            m.id === currentMember.id
              ? {
                  ...m,
                  selectionStatus: editSelectionStatus,
                  selectionDecidedBy: user.id,
                  selectionDecidedAt: now,
                  selectionUpdatedAt: now,
                }
              : m
          )
        );
      }

      if (hasGuildMainChanges && editGuildMain) {
        const { error } = await supabase.rpc('set_guild_member_main_character', {
          p_guild_id: guildId,
          p_member_id: editingUserId,
          p_character_name: editGuildMain.character_name,
          p_realm_slug: editGuildMain.character_realm_slug,
        });
        if (error) throw error;
        setGuildMainRefreshNonce((value) => value + 1);
      }

      toast({
        title: currentMember.id === user.id
          ? t.wishes.wishesSaved
          : interpolateMessage(t.wishes.wishesSavedForMember, { member: currentMember.username }),
      });
      setEditingUserId(null);
      setEditGuildMain(null);
      clearPersonalEditIntent();
      if (hasWishChanges || hasStatusChanges || hasGuildMainChanges) {
        await fetchWishes();
      }
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Validate a wish (GM or users with manage_wishes permission)
  const validateWish = async (userId: string, choiceIndex: number, status: ValidationStatus) => {
    if (!user || !guildId || !selectedRosterId || !canManageWishes || !canMutateSelectedSeason) return;
    const currentMember = members.find((member) => member.id === userId);
    const previousWish = currentMember?.wishes.find((wish) => wish.choice_index === choiceIndex);
    const validatedAt = status === 'pending' ? null : new Date().toISOString();

    // Optimistic UI update so the badge changes instantly
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== userId) return m;
        return {
          ...m,
          wishes: m.wishes.map((w) =>
            w.choice_index === choiceIndex
              ? {
                  ...w,
                  validation_status: status,
                  validated_by: status === 'pending' ? null : user.id,
                  validated_at: validatedAt,
                  validated_by_username: status === 'pending' ? null : profile?.username || null,
                }
              : w
          ),
        };
      })
    );

    try {
      let query = supabase
        .from('class_wishes')
        .update({
          validation_status: status,
          validated_by: status === 'pending' ? null : user.id,
          validated_at: validatedAt,
        })
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId)
        .eq('user_id', userId)
        .eq('choice_index', choiceIndex);
      if (seasonSupportMode === 'enabled' && selectedSeasonId) {
        query = query.eq('season_id', selectedSeasonId);
      }
      const { error } = await query;

      if (error) throw error;

      toast({
        title:
          status === 'approved'
            ? t.wishes.validation.approved
            : status === 'rejected'
              ? t.wishes.validation.rejected
              : t.wishes.validation.pending,
      });
    } catch (error: unknown) {
      if (previousWish) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId
              ? {
                  ...m,
                  wishes: m.wishes.map((w) =>
                    w.choice_index === choiceIndex
                      ? {
                          ...w,
                          validation_status: previousWish.validation_status,
                          validated_by: previousWish.validated_by,
                          validated_at: previousWish.validated_at,
                          validated_by_username: previousWish.validated_by_username,
                        }
                      : w
                  ),
                }
              : m
          )
        );
      }
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  // Filter members
  const filteredMembers = members.filter(m => {
    if (filters.rosterMemberFilters !== null && !filters.rosterMemberFilters.includes(m.id)) {
      return false;
    }

    if (filters.searchQuery && !m.username.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }

    const isAndMode = filters.filterMode === 'and';

    // Limit wishes to first N if maxWishIndex is set
    const wishesToConsider = filters.maxWishIndex
      ? m.wishes.filter(w => w.choice_index <= filters.maxWishIndex!)
      : m.wishes;

    // Filter by commitment
    if (filters.commitmentFilters.length > 0) {
      // Map DB status to CommitmentFilter
      const statusMap: Record<string, 'confirmed' | 'undecided' | 'withdrawn'> = {
        'confirmed': 'confirmed',
        'potential': 'undecided',
        'withdrawn': 'withdrawn',
      };
      const memberCommitment = statusMap[m.status] || 'undecided';
      if (!filters.commitmentFilters.includes(memberCommitment)) return false;
    }

    // Filter by roster decision
    if (filters.rosterDecisionFilters.length > 0) {
      const selectionStatus = m.selectionStatus || 'undecided';
      if (!filters.rosterDecisionFilters.includes(selectionStatus)) return false;
    }

    // Filter by minimum wishes (based on wishesToConsider)
    if (filters.minWishes !== null) {
      const wishCount = wishesToConsider.filter(w => w.class_id).length;
      // Special case: minWishes === 0 means "exactly 0 wishes" (no wishes)
      if (filters.minWishes === 0) {
        if (wishCount !== 0) return false;
      } else {
        if (wishCount < filters.minWishes) return false;
      }
    }

    // Filter by range (melee/ranged) - based on wishesToConsider
    if (filters.rangeFilters.length > 0) {
      const hasRange = wishesToConsider.some(w => {
        if (!w.spec_ids?.length) return false;
        return w.spec_ids.some(specId => {
          const spec = getSpecById(specId);
          return spec && filters.rangeFilters.includes(spec.range);
        });
      });
      if (!hasRange) return false;
    }

    // Filter by comment - based on wishesToConsider
    if (filters.hasComment !== null) {
      const hasAnyComment = wishesToConsider.some(w => w.comment?.trim());
      if (filters.hasComment !== hasAnyComment) return false;
    }

    // Filter by role - based on wishesToConsider
    if (filters.roleFilters.length > 0) {
      const matchingWishes = wishesToConsider.filter(w => {
        const roles = getRolesFromSpecs(w.spec_ids);
        return filters.roleFilters.some(rf => roles.includes(rf as Role));
      });

      if (isAndMode) {
        // AND: all selected roles must be present across wishes
        const allRolesPresent = filters.roleFilters.every(rf =>
          wishesToConsider.some(w => getRolesFromSpecs(w.spec_ids).includes(rf as Role))
        );
        if (!allRolesPresent) return false;
      } else {
        // OR: at least one role must match
        if (matchingWishes.length === 0) return false;
      }
    }

    // Filter by class - based on wishesToConsider
    if (filters.classFilters.length > 0) {
      if (isAndMode) {
        // AND: all selected classes must be present
        const allClassesPresent = filters.classFilters.every(cf =>
          wishesToConsider.some(w => w.class_id === cf)
        );
        if (!allClassesPresent) return false;
      } else {
        // OR: at least one class must match
        const hasClass = wishesToConsider.some(w => filters.classFilters.includes(w.class_id));
        if (!hasClass) return false;
      }
    }

    // Filter by validation status - based on wishesToConsider
    if (filters.validationFilters.length > 0) {
      if (isAndMode) {
        // AND: all selected validation statuses must be present
        const allStatusesPresent = filters.validationFilters.every(vs =>
          wishesToConsider.some(w => (w.validation_status || 'pending') === vs)
        );
        if (!allStatusesPresent) return false;
      } else {
        // OR: at least one validation status must match
        const hasStatus = wishesToConsider.some(w =>
          filters.validationFilters.includes((w.validation_status || 'pending') as ValidationStatus)
        );
        if (!hasStatus) return false;
      }
    }

    return true;
  });

  const selectedValidatedMembers = useMemo(
    () => getSelectedValidatedMembers(filteredMembers),
    [filteredMembers],
  );
  const rosterMemberFilterOptions = useMemo(
    () =>
      [...members]
        .map((member) => ({ id: member.id, name: member.username }))
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    [members, language],
  );
  const defaultVisibleRosterColumns = useMemo(() => DEFAULT_ROSTER_TABLE_COLUMNS, []);

  useEffect(() => {
    if (!rosterColumnsCustomized) {
      setVisibleRosterColumns(defaultVisibleRosterColumns);
    }
  }, [defaultVisibleRosterColumns, rosterColumnsCustomized]);

  // Calculate stats
  const hasPersonalEditIntent = searchParams.get('edit') === 'my-wishes';
  const currentRoster = rosters.find(r => r.id === selectedRosterId);
  const currentMember = members.find(m => m.id === user?.id);
  const personalEditMissingMember = hasPersonalEditIntent
    && !wishesLoading
    && canMutateSelectedSeason
    && !isAdminReadOnly
    && !currentMember;
  useEffect(() => {
    if (!personalEditMissingMember) return;
    reportRosterWishClientError(t.rosters.accessUpdatingTitle, t.rosters.accessUpdatingMessage, {
      event: 'personal_edit_missing_current_member',
    });
  }, [personalEditMissingMember]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        {!hasPersonalEditIntent && <CosmicBackground />}
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const rosterLockState = resolveWishLockState({
    rosterLocked: currentRoster?.wishes_locked,
    rosterLockAt: currentRoster?.wishes_lock_at,
    memberLocked: false,
  });
  const showPersonalWishEditor = hasPersonalEditIntent
    && !!currentMember
    && editingUserId === currentMember.id;
  const isPersonalEditHandoffPending = hasPersonalEditIntent
    && canMutateSelectedSeason
    && !isAdminReadOnly
    && wishesLoading
    && (!currentMember || editingUserId !== currentMember.id);
  const privateMemberWishes = currentMember?.wishes.filter((wish) => !!wish.class_id).sort((a, b) => a.choice_index - b.choice_index) || [];
  const editingMember = members.find(m => m.id === editingUserId);
  const currentMemberLockState = resolveWishLockState({
    rosterLocked: currentRoster?.wishes_locked,
    rosterLockAt: currentRoster?.wishes_lock_at,
    memberLocked: editingMember?.wishes_locked ?? currentMember?.wishes_locked,
  });
  const isEditingLocked = isWishEditingLocked({
    lockState: currentMemberLockState,
    canManageWishes,
    isReadOnly: isAdminReadOnly,
  });
  const rosterScheduledLabel =
    rosterLockState.isScheduled && rosterLockState.scheduledAt
      ? formatDateTimeLocalized(rosterLockState.scheduledAt, language, { dateStyle: 'medium', timeStyle: 'short' })
      : null;
  const rosterLockLabel = rosterLockState.isLocked
    ? formatLabelValue(t.wishes.lockedTitle, t.wishes.lockedRosterDesc, language)
    : rosterScheduledLabel
      ? interpolateMessage(t.wishes.lockScheduledDesc, { date: rosterScheduledLabel })
      : null;
  const beginPersonalWishEdit = () => {
    const next = new URLSearchParams(searchParams);
    if (selectedRosterId) next.set('rosterId', selectedRosterId);
    if (selectedSeasonId) next.set('seasonId', selectedSeasonId);
    next.set('edit', 'my-wishes');
    setSearchParams(next, { replace: true });
    if (currentMember) startEditing(currentMember);
  };
  const rosterColumnOptions: { id: RosterTableColumnId; label: string }[] = [
    { id: 'status', label: t.dashboard.rosterTable.status },
    { id: 'rosterDecision', label: t.dashboard.rosterTable.decision },
    { id: 'wishesCount', label: t.dashboard.rosterTable.total },
    { id: 'wish1', label: t.dashboard.rosterTable.choice1 },
    { id: 'wish2', label: t.dashboard.rosterTable.choice2 },
    { id: 'wish3', label: t.dashboard.rosterTable.choice3 },
  ];
  const toggleRosterColumn = (columnId: RosterTableColumnId, nextChecked: boolean) => {
    setRosterColumnsCustomized(true);
    setVisibleRosterColumns((current) => {
      if (nextChecked) {
        return current.includes(columnId) ? current : [...current, columnId];
      }
      if (current.length <= 1) return current;
      return current.filter((id) => id !== columnId);
    });
  };
  const rosterColumnSelector = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-border/45 bg-card/55 px-2.5 text-sm font-medium text-foreground/85 shadow-none hover:bg-card/75">
          <Columns3 className="h-4 w-4" />
          {t.dashboard.rosterTable.columnSelector}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border bg-card">
        {rosterColumnOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={visibleRosterColumns.includes(option.id)}
            disabled={visibleRosterColumns.length <= 1 && visibleRosterColumns.includes(option.id)}
            onCheckedChange={(checked) => toggleRosterColumn(option.id, checked === true)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setRosterColumnsCustomized(false);
            setVisibleRosterColumns(defaultVisibleRosterColumns);
          }}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t.common.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const canExportWishes = canManageWishes && !isAdminReadOnly;
  const rosterToolbarActions = [
    ...(canExportWishes
      ? [{
          key: 'export',
          label: t.dashboard.exportCSV,
          icon: Download,
          disabled: wishesLoading || filteredMembers.length === 0,
          onClick: () => {
            exportWishesToCSV(filteredMembers, {
              language,
              t,
              rosterName: currentRoster?.name || 'roster',
              guildName: guild?.name || 'guild',
            });
            toast({ title: t.dashboard.exportSuccess });
          },
        }]
      : []),
    ...(canManageWishes && !isAdminReadOnly && selectedRosterId && canMutateSelectedSeason
      ? [{
          key: 'add-external',
          label: t.dashboard.externalMember.addButton,
          icon: UserPlus,
          disabled: false,
          onClick: () => setExternalDialogOpen(true),
        }]
      : []),
    ...(canManageWishes && !isAdminReadOnly && selectedRosterId && canMutateSelectedSeason
      ? [{
          key: 'lock',
          label: t.rosters.wishesLockTitle,
          icon: Lock,
          disabled: false,
          onClick: () => setLockDialogOpen(true),
        }]
      : []),
    ...(canManageWishes && !isAdminReadOnly && selectedRosterId && selectedSeasonId && selectedSeason?.state !== 'archived'
      ? [{
          key: 'sync-delta',
          label: t.wishes.memberDetail.historyEvent.syncDeltaApplied,
          icon: RefreshCw,
          disabled: syncingSeason,
          onClick: applySyncDelta,
        }]
      : []),
    ...(isGM && selectedRosterId
      ? [{
          key: 'roster-settings',
          label: t.dashboard.roster,
          icon: Settings,
          disabled: false,
          onClick: () => setRosterSettingsOpen(true),
        }]
      : []),
  ];
  const hasToolbarActions = canManageSeasonActions || rosterToolbarActions.length > 0;
  const renderToolbarActionsMenu = () => {
    if (!hasToolbarActions) return null;

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <CosmicButton
            size="sm"
            variant="outline"
            icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
            className="h-8 w-8 p-0"
            aria-label={t.common.actions}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 border-border bg-card">
          {canManageSeasonActions && (
            <>
              <DropdownMenuItem onClick={openSeasonSettings} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {t.seasons.settingsTitle}
              </DropdownMenuItem>
              {rosterToolbarActions.length > 0 && <DropdownMenuSeparator />}
            </>
          )}
          {rosterToolbarActions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              disabled={action.disabled}
              onClick={action.onClick}
              className="cursor-pointer"
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  if (!guild) return null;

  const workspaceToolbar = (
    <PageContainer className="py-2" width="workspace">
          <ContextualToolbar
            className={cn('border-0 bg-transparent p-0 shadow-none backdrop-blur-0', isMobile && 'gap-2 overflow-hidden')}
            leading={(
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <RosterSelector
                  rosters={rosters}
                  selectedRosterId={selectedRosterId}
                  onSelect={selectRosterInUrl}
                  showAccessIndicator={true}
                />
                <SeasonSelector
                  seasons={seasons}
                  selectedSeasonId={selectedSeasonId}
                  onSelect={selectSeasonInUrl}
                  emptyLabel={seasonSupportMode === 'legacy' ? t.seasons.legacyMode : undefined}
                  busy={seasonBusy}
                />
              </div>
            )}
            trailing={isMobile ? (
              <>
              {rosterLockLabel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          rosterLockState.isLocked ? toneTextClass('warning') : toneTextClass('info'),
                        )}
                        aria-label={rosterLockLabel}
                      >
                        {rosterLockState.isLocked ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        <span className="sr-only">{rosterLockLabel}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{rosterLockLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isAdminReadOnly && !isPrivateMemberSeason && (
                <CosmicButton
                  size="sm"
                  onClick={beginPersonalWishEdit}
                  disabled={!canMutateSelectedSeason}
                  icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  className="h-8 flex-1 justify-center px-3 text-xs"
                >
                  {t.wishes.editMyWishes}
                </CosmicButton>
              )}
              {renderToolbarActionsMenu()}
              </>
            ) : (
              <>
              {rosterLockLabel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          rosterLockState.isLocked ? toneTextClass('warning') : toneTextClass('info'),
                        )}
                        aria-label={rosterLockLabel}
                      >
                        {rosterLockState.isLocked ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        <span className="sr-only">{rosterLockLabel}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{rosterLockLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isAdminReadOnly && !isPrivateMemberSeason && (
                <CosmicButton
                  size="sm"
                  onClick={beginPersonalWishEdit}
                  disabled={!canMutateSelectedSeason}
                  icon={<Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />}
                  className="h-7 w-7 md:h-8 md:w-auto p-0 md:px-3"
                >
                  <span className="hidden md:inline">{t.wishes.editMyWishes}</span>
                </CosmicButton>
              )}
              {renderToolbarActionsMenu()}
              </>
            )}
          />
    </PageContainer>
  );

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={hasSettingsPermission}
      activeTab="roster"
      toolbar={workspaceToolbar}
      context={{
        roster: currentRoster?.name,
        season: selectedSeason?.name,
        status: rosterLockState.isLocked ? t.wishes.lockedTitle : undefined,
      }}
    >
      {/* Admin read-only banner */}
      {isAdminReadOnly && (
        <PageContainer className="py-2.5" width="workspace">
          <div className={cn("flex items-center justify-center gap-2 p-2 rounded-lg border", toneCalloutClass('warning'))}>
            <Eye className={cn("h-4 w-4", toneTextClass('warning'))} />
            <span className={cn("text-sm font-medium", toneTextClass('warning'))}>
              {s('roster_wishes.admin_read_only')}
            </span>
          </div>
        </PageContainer>
      )}

      <PageContainer as="main" className="relative z-10 py-3 md:py-4" width="workspace">
        {/* Access warning */}
        {currentRoster && !currentRoster.hasAccess && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {t.rosters.noAccessMessage}
          </div>
        )}

        {seasonSupportMode === 'legacy' ? (
          <div className={cn('mb-3 rounded-lg border px-3 py-2 text-sm', toneCalloutClass('info'))}>
            <span className={toneTextClass('info')}>{t.seasons.legacyModeHint}</span>
          </div>
        ) : (
          selectedSeason && <SeasonStateCallout season={selectedSeason} />
        )}

        {isPersonalEditHandoffPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : personalEditMissingMember ? (
          <div className={cn('rounded-lg border px-4 py-5', toneCalloutClass('warning'))}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{t.rosters.accessUpdatingTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.rosters.accessUpdatingMessage}</p>
              </div>
              <CosmicButton
                size="sm"
                variant="outline"
                onClick={() => {
                  setWishesLoading(true);
                  void fetchWishes().catch((error: unknown) => {
                    logRosterSeasonError('personal_edit_retry_failed', error);
                    setWishesLoading(false);
                    reportRosterWishClientError(t.errors.generic, getErrorMessage(error), {
                      event: 'personal_edit_retry_failed',
                    });
                    toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
                  });
                }}
                icon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                className="w-full sm:w-auto"
              >
                {t.common.refresh}
              </CosmicButton>
            </div>
          </div>
        ) : showPersonalWishEditor && currentMember ? (
          <div className="space-y-4">
            {isPrivateMemberSeason && (
              <div className={cn('rounded-lg border px-4 py-3', toneCalloutClass('info'))}>
                <div className="flex items-start gap-3">
                  <Lock className={cn('mt-0.5 h-4 w-4 shrink-0', toneTextClass('info'))} />
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">{t.wishes.privateRosterTitle}</h2>
                    <p className="text-sm text-muted-foreground">{t.wishes.privateRosterMessage}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-foreground">{t.wishes.title}</h3>
              <p className="text-sm text-muted-foreground">{currentMember.username}</p>
            </div>
            <WishFormEditor
              wishes={editWishes}
              status={editStatus}
              saving={saving}
              disabled={isEditingLocked || !canMutateSelectedSeason}
              maxWishes={MAX_WISHES}
              onWishChange={updateEditWish}
              onStatusChange={setEditStatus}
              onAddWish={addWish}
              onRemoveWish={removeWish}
              onClearWish={clearWish}
              onMoveWish={moveEditWish}
              onReorderWishes={reorderEditWishes}
              onSave={saveEditing}
              onCancel={cancelEditing}
            />
          </div>
        ) : isPrivateMemberSeason ? (
          <div className="space-y-4">
            <div className={cn('rounded-lg border px-4 py-3', toneCalloutClass('info'))}>
              <div className="flex items-start gap-3">
                <Lock className={cn('mt-0.5 h-4 w-4 shrink-0', toneTextClass('info'))} />
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">{t.wishes.privateRosterTitle}</h2>
                  <p className="text-sm text-muted-foreground">{t.wishes.privateRosterMessage}</p>
                </div>
              </div>
            </div>

            {wishesLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-border/50 bg-card/40 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : currentMember && editingUserId === currentMember.id ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-foreground">{t.wishes.title}</h3>
                  <p className="text-sm text-muted-foreground">{currentMember.username}</p>
                </div>
                <WishFormEditor
                  wishes={editWishes}
                  status={editStatus}
                  saving={saving}
                  disabled={isEditingLocked || !canMutateSelectedSeason}
                  maxWishes={MAX_WISHES}
                  onWishChange={updateEditWish}
                  onStatusChange={setEditStatus}
                  onAddWish={addWish}
                  onRemoveWish={removeWish}
                  onClearWish={clearWish}
                  onMoveWish={moveEditWish}
                  onReorderWishes={reorderEditWishes}
                  onSave={saveEditing}
                  onCancel={cancelEditing}
                />
              </div>
            ) : currentMember ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-foreground">{t.wishes.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentMember.username}</p>
                  </div>
                  {canMutateSelectedSeason && !isEditingLocked && editingUserId !== currentMember.id && (
                    <CosmicButton
                      size="sm"
                      onClick={() => startEditing(currentMember)}
                      icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      className="w-full sm:w-auto"
                    >
                      {t.wishes.editMyWishes}
                    </CosmicButton>
                  )}
                </div>

                <GlowCard surface="section" className="p-3" hoverable={false}>
                  <CommitmentToggle
                    status={currentMember.status === 'confirmed' ? 'confirmed' : currentMember.status === 'withdrawn' ? 'withdrawn' : 'undecided'}
                    onChange={() => undefined}
                    disabled
                  />
                </GlowCard>

                {privateMemberWishes.length === 0 ? (
                  <GlowCard surface="section" className="p-3" hoverable={false}>
                    <div className="rounded-md border border-dashed border-border/60 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    {t.wishes.privateRosterEmpty}
                    </div>
                  </GlowCard>
                ) : (
                  <div className="space-y-2">
                    {privateMemberWishes.map((wish) => {
                      const classData = getClassById(wish.class_id);
                      const classLabel = classData ? getLocalizedClassName(classData.id, language) : wish.class_id;
                      const specs = wish.spec_ids
                        .map((specId) => getSpecById(specId))
                        .filter(Boolean)
                        .map((spec) => getLocalizedSpecName(spec!.id, language));

                      return (
                        <GlowCard key={wish.choice_index} surface="section" className="p-3" hoverable={false}>
                          <div className="flex items-center gap-2">
                            <div className="hidden w-5 shrink-0 lg:block" />
                            <div className="hidden h-7 w-7 shrink-0 lg:block" />
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/20 to-secondary/20">
                              <span className="text-sm font-bold text-primary">{wish.choice_index}</span>
                            </div>

                            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(12rem,18rem)_minmax(14rem,1fr)_minmax(16rem,1.35fr)]">
                              <div className="min-w-0 rounded-md border border-dashed border-border/60 bg-background/30 px-3 py-2">
                                <div className="truncate text-sm font-medium text-foreground">{classLabel}</div>
                              </div>
                              <div className="min-w-0 rounded-md border border-dashed border-border/60 bg-background/30 px-3 py-2">
                                <div className={cn('truncate text-sm', specs.length > 0 ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                                  {specs.length > 0 ? specs.join(', ') : '-'}
                                </div>
                              </div>
                              <div className="min-w-0 rounded-md border border-border/60 bg-background/30 px-3 py-2">
                                <div className={cn('truncate text-sm', wish.comment ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                                  {wish.comment || '-'}
                                </div>
                              </div>
                            </div>

                            <WishValidationBadge
                              status={wish.validation_status || 'pending'}
                              validatedBy={wish.validated_by_username}
                              validatedAt={wish.validated_at}
                              compact
                            />
                          </div>
                        </GlowCard>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
                {t.wishes.privateRosterEmpty}
              </div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'table' | 'selected' | 'analytics')} className="w-full">
            <TabsList className="mb-3 grid h-auto w-full max-w-full grid-cols-3 overflow-hidden p-1 lg:inline-flex lg:w-auto lg:justify-start">
              <TabsTrigger value="table" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                <TableIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate">{t.dashboard.table}</span>
              </TabsTrigger>
              <TabsTrigger value="selected" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate">{t.dashboard.selectedValidatedView}</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="truncate">{t.dashboard.analytics}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-2 p-1 md:p-2">
              <RosterFilters
                filters={filters}
                onFiltersChange={setFilters}
                rosterMembers={rosterMemberFilterOptions}
                sortSummary={rosterSortSummary}
                actions={rosterColumnSelector}
              />

              <RosterTable
                members={filteredMembers}
                loading={wishesLoading}
                guildId={guildId}
                currentUserId={user?.id}
                selectedRosterId={selectedRosterId}
                selectedSeasonId={selectedSeasonId}
                editingUserId={editingUserId}
                editWishes={editWishes}
                editStatus={editStatus}
                editSelectionStatus={editSelectionStatus}
                editGuildMainKey={editGuildMain ? `${editGuildMain.character_name}-${editGuildMain.character_realm_slug}` : null}
                saving={saving}
                maxWishes={MAX_WISHES}
                canManageWishes={canManageWishes && canMutateSelectedSeason}
                canManageMembers={canManageMembers}
                onGuildMainChanged={() => setGuildMainRefreshNonce((value) => value + 1)}
                isRosterLocked={rosterLockState.isLocked}
                isEditingLocked={isEditingLocked || !canMutateSelectedSeason}
                onStartEditing={startEditing}
                onUpdateEditWish={updateEditWish}
                onEditStatusChange={setEditStatus}
                onEditSelectionStatusChange={setEditSelectionStatus}
                onEditGuildMainChange={(candidate) => setEditGuildMain({
                  character_name: candidate.character_name,
                  character_realm_slug: candidate.character_realm_slug,
                })}
                onSaveEditing={saveEditing}
                onCancelEditing={cancelEditing}
                onAddWish={addWish}
                onRemoveWish={removeWish}
                onClearWish={clearWish}
                onValidateWish={validateWish}
                onToggleMemberLock={canManageWishes && canMutateSelectedSeason ? handleToggleMemberLock : undefined}
                lockingMemberId={lockingMemberId}
                onRemoveMember={canManageWishes && canMutateSelectedSeason ? handleRemoveMember : undefined}
                deletingMemberId={deletingMemberId}
                onSelectionStatusChange={canManageWishes && canMutateSelectedSeason ? handleSelectionStatusChange : undefined}
                updatingSelectionMemberId={updatingSelectionMemberId}
                onViewHistory={canManageWishes && !isAdminReadOnly ? openHistoryDrawer : undefined}
                onSortSummaryChange={setRosterSortSummary}
                visibleColumns={visibleRosterColumns}
              />
            </TabsContent>

            <TabsContent value="selected">
              <RosterSelectedTable
                members={selectedValidatedMembers}
                currentUserId={user?.id}
                selectedRosterId={selectedRosterId}
                selectedSeasonId={selectedSeasonId}
                onViewFullTable={() => setActiveTab('table')}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <RosterAnalytics
                members={filteredMembers}
                rosterMembers={rosterMemberFilterOptions}
                rosterMemberFilters={filters.rosterMemberFilters}
                onRosterMemberFiltersChange={(rosterMemberFilters) =>
                  setFilters((currentFilters) => ({ ...currentFilters, rosterMemberFilters }))
                }
              />
            </TabsContent>
          </Tabs>
        )}
      </PageContainer>

      {canManageSeasonActions && (
        <Sheet
          open={seasonSettingsOpen}
          onOpenChange={(open) => {
            if (open && selectedSeason) {
              setSeasonRenameName(selectedSeason.name);
            }
            setSeasonSettingsOpen(open);
          }}
        >
          <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background/95 sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>{t.seasons.settingsTitle}</SheetTitle>
              {selectedSeason && (
                <div className="text-sm text-muted-foreground">
                  {selectedSeason.name}
                  <span className="mx-2 text-border">·</span>
                  {selectedSeason.state === 'active'
                    ? t.seasons.active
                    : selectedSeason.state === 'draft'
                      ? t.seasons.draft
                      : t.seasons.archived}
                </div>
              )}
            </SheetHeader>

            {selectedSeason && (
              <div className="mt-6 space-y-6">
                <section className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">{t.seasons.renameSeason}</h3>
                    <p className="text-xs text-muted-foreground">{t.seasons.renameNameLabel}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="season-settings-name"
                      value={seasonRenameName}
                      onChange={(event) => setSeasonRenameName(event.target.value)}
                      placeholder={t.seasons.namePlaceholder}
                      className="border-border bg-background"
                    />
                    <CosmicButton
                      onClick={renameSelectedSeason}
                      loading={seasonActionBusy === 'rename'}
                      disabled={!seasonRenameName.trim() || seasonRenameName.trim() === selectedSeason.name}
                      className="sm:w-auto"
                    >
                      {t.seasons.renameConfirm}
                    </CosmicButton>
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">{t.seasons.hideMemberWishes}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{t.seasons.hideMemberWishesHint}</p>
                    </div>
                    <Switch
                      checked={!!selectedSeason.hide_member_wishes}
                      onCheckedChange={handleToggleSeasonPrivacy}
                      disabled={seasonBusy}
                      aria-label={t.seasons.hideMemberWishes}
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
                  <h3 className="text-sm font-semibold text-foreground">{t.seasons.lifecycleTitle}</h3>
                  <div className="flex flex-col gap-2">
                    <CosmicButton
                      variant="outline"
                      onClick={() => {
                        setSeasonSettingsOpen(false);
                        openSeasonDialog();
                      }}
                      className="justify-start"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t.seasons.prepareNew}
                    </CosmicButton>
                    {selectedSeason.state === 'draft' && (
                      <CosmicButton
                        variant="outline"
                        onClick={activateSelectedSeason}
                        loading={seasonActionBusy === 'activate'}
                        className="justify-start"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {t.seasons.activateDraft}
                      </CosmicButton>
                    )}
                    {selectedSeason.state === 'archived' ? (
                      <CosmicButton
                        variant="outline"
                        onClick={unarchiveSelectedSeason}
                        loading={seasonActionBusy === 'activate'}
                        className="justify-start"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {t.seasons.unarchiveSeason}
                      </CosmicButton>
                    ) : (
                      <CosmicButton
                        variant="outline"
                        onClick={archiveSelectedSeason}
                        loading={seasonActionBusy === 'archive'}
                        className="justify-start"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {t.seasons.archiveSeason}
                      </CosmicButton>
                    )}
                  </div>
                </section>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}

      {canManageSeasonActions && (
        <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
          <DialogContent className="max-w-lg border-border bg-card">
            <DialogHeader>
              <DialogTitle>{t.seasons.dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="season-name">{t.seasons.name}</Label>
                <Input
                  id="season-name"
                  value={seasonName}
                  onChange={(event) => setSeasonName(event.target.value)}
                  placeholder={t.seasons.namePlaceholder}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="season-start">{t.seasons.startsAt}</Label>
                  <Input id="season-start" type="date" value={seasonStartsAt} onChange={(event) => setSeasonStartsAt(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-end">{t.seasons.endsAt}</Label>
                  <Input id="season-end" type="date" value={seasonEndsAt} onChange={(event) => setSeasonEndsAt(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.seasons.sourceSeason}</Label>
                <Select value={seasonSourceId || activeSeason?.id || ''} onValueChange={setSeasonSourceId}>
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue placeholder={t.seasons.selectSeason} />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {(seasonSourceOptions.length > 0 ? seasonSourceOptions : sortedSeasonOptions).map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-3">
                <label className="flex items-start gap-3">
                  <Checkbox checked={seasonPrefillWishes} onCheckedChange={(checked) => setSeasonPrefillWishes(checked === true)} />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{t.seasons.prefillPrevious}</span>
                    <span className="block text-xs text-muted-foreground">{t.seasons.prefillPreviousHint}</span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={seasonResetCopiedWishes}
                    onCheckedChange={(checked) => setSeasonResetCopiedWishes(checked === true)}
                    disabled={!seasonPrefillWishes}
                  />
                  <span className="space-y-0.5">
                    <span className={cn('block text-sm font-medium', !seasonPrefillWishes && 'text-muted-foreground')}>{t.seasons.resetCopied}</span>
                    <span className="block text-xs text-muted-foreground">{t.seasons.resetCopiedHint}</span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox checked={seasonActivateImmediately} onCheckedChange={(checked) => setSeasonActivateImmediately(checked === true)} />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{t.seasons.activateImmediately}</span>
                    <span className="block text-xs text-muted-foreground">{t.seasons.activateImmediatelyHint}</span>
                  </span>
                </label>
              </div>

              {seasonActivateImmediately && activeSeason && (
                <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-xs text-status-warning">
                  {interpolateMessage(t.seasons.viewingArchived, { season: activeSeason.name })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <CosmicButton variant="outline" onClick={() => setSeasonDialogOpen(false)}>
                  {t.common.cancel}
                </CosmicButton>
                <CosmicButton onClick={submitSeasonDialog} loading={seasonDialogSaving} disabled={!seasonName.trim()}>
                  {seasonActivateImmediately ? t.seasons.startSeason : t.seasons.createDraft}
                </CosmicButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedRosterId && (
        <Dialog
          open={externalDialogOpen}
          onOpenChange={(open) => {
            setExternalDialogOpen(open);
            if (!open) resetExternalForm();
          }}
        >
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>{t.dashboard.externalMember.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t.dashboard.externalMember.memberLabel}
                </label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={externalCandidateId}
                  onChange={(e) => setExternalCandidateId(e.target.value)}
                >
                  <option value="">
                    {t.dashboard.externalMember.memberPlaceholder}
                  </option>
                  {externalCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.character_name} - {candidate.character_realm}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t.dashboard.externalMember.firstWishClassLabel}
                </label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={externalClassId}
                  onChange={(e) => setExternalClassId(e.target.value)}
                >
                  <option value="">
                    {t.dashboard.externalMember.classPlaceholder}
                  </option>
                  {wowClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {getLocalizedClassName(cls.id, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t.dashboard.externalMember.commentOptional}
                </label>
                <Input
                  value={externalComment}
                  onChange={(e) => setExternalComment(e.target.value)}
                  placeholder={t.dashboard.externalMember.commentPlaceholder}
                />
              </div>

              <div className="flex justify-end gap-2">
                <CosmicButton size="sm" variant="outline" onClick={() => setExternalDialogOpen(false)}>
                  {t.common.cancel}
                </CosmicButton>
                <CosmicButton
                  size="sm"
                  onClick={handleSaveExternalWish}
                  loading={savingExternalWish}
                  disabled={!externalCandidateId || !externalClassId}
                >
                  {t.common.save}
                </CosmicButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedRosterId && (
        <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>{t.rosters.wishesLockTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {rosterLockState.isLocked ? t.rosters.wishesLockedStatus : t.rosters.wishesUnlockedStatus}
                  </div>
                  {currentRoster?.wishes_lock_at && (
                    <div className="text-xs text-muted-foreground">
                      {t.rosters.wishesLockAtLabel}:{' '}
                      {formatDateTimeLocalized(currentRoster.wishes_lock_at, language, { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
                <CosmicButton
                  size="sm"
                  onClick={() => handleRosterLockToggle(!rosterLockState.isLocked)}
                  loading={lockingRoster}
                  icon={
                    rosterLockState.isLocked
                      ? <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  }
                >
                  {rosterLockState.isLocked ? t.rosters.unlockWishes : t.rosters.lockWishes}
                </CosmicButton>
              </div>

              <div className="space-y-2">
                <label htmlFor="roster-wishes-lock-at" className="text-sm text-muted-foreground">
                  {t.rosters.wishesLockAtLabel}
                </label>
                <Input
                  id="roster-wishes-lock-at"
                  type="datetime-local"
                  value={lockAtInput}
                  onChange={(e) => setLockAtInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t.rosters.wishesLockAtHint}</p>
                <div className="flex justify-end gap-2 pt-2">
                  {currentRoster?.wishes_lock_at && (
                    <CosmicButton
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLockAtInput('');
                        handleScheduleLock('');
                      }}
                      disabled={schedulingLock}
                    >
                      {t.rosters.wishesLockClear}
                    </CosmicButton>
                  )}
                  <CosmicButton size="sm" onClick={() => handleScheduleLock()} loading={schedulingLock}>
                    {t.rosters.wishesLockSchedule}
                  </CosmicButton>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full border-border bg-background/95 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t.wishes.memberDetail.history}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {historyMember && (
              <div className="rounded-md border border-border/40 bg-card/70 px-3 py-2">
                <div className="text-sm font-medium text-foreground">{historyMember.username}</div>
                {historyMember.mainCharacterName && (
                  <div className="text-xs text-muted-foreground">{historyMember.mainCharacterName}</div>
                )}
              </div>
            )}

            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.common.loading}
              </div>
            ) : historyRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t.wishes.memberDetail.historyEmpty}
              </div>
            ) : (
              <div className="space-y-3">
                {historyRows.map((row, index) => {
                  const detail = formatHistoryPayload(row);
                  return (
                    <div key={`${row.event_type}-${row.event_at}-${index}`} className="relative border-l border-border/60 pl-4">
                      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground">
                        {formatDateTimeLocalized(row.event_at, language, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="text-sm font-medium text-foreground">{getHistoryEventLabel(row.event_type)}</div>
                      {detail && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Roster Settings Dialog */}
      {guildId && selectedRosterId && (
        <RosterEditDialog
          open={rosterSettingsOpen}
          onOpenChange={setRosterSettingsOpen}
          rosterId={selectedRosterId}
          guildId={guildId}
          onSaved={fetchData}
        />
      )}
    </GuildWorkspaceShell>
  );
};

export default RosterWishes;
