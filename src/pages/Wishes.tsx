import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName } from '@/data/wowClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WishCardEditor } from '@/components/WishCardEditor';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { ContextualToolbar } from '@/components/layout/ContextualToolbar';
import { PageContainer } from '@/components/layout/PageContainer';
import { GuildWorkspaceShell } from '@/components/guild';
import { RosterSelector } from '@/components/roster';
import { SeasonSelector, SeasonStateCallout } from '@/components/seasons/SeasonSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GuildSeason } from '@/types/seasons';
import { Loader2, Save, GripVertical, Plus, Trash2, ChevronUp, ChevronDown, Lock, Clock } from 'lucide-react';

import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { resolveSpecOrder } from '@/lib/wishOrder';
import { formatDateTimeLocalized, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { isSeasonFilteringEnabled, isSeasonSchemaUnavailable, type SeasonSupportMode } from '@/lib/seasonSupport';
import { resolveWishLockState } from '@/lib/wishLock';
import { cn } from '@/lib/utils';
import { toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WishData {
  id: string;
  classId: string;
  specIds: string[];
  comment: string;
}

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
  wishes_locked?: boolean | null;
  wishes_lock_at?: string | null;
}

interface SortableWishCardProps {
  wish: WishData;
  index: number;
  totalWishes: number;
  onChange: (
    field: keyof Omit<WishData, 'id'>,
    value: Omit<WishData, 'id'>[keyof Omit<WishData, 'id'>]
  ) => void;
  onRemove: () => void;
  onClear: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
  choiceLabels: string[];
  usedClassIds: string[];
  disabled?: boolean;
}

const SortableWishCard = forwardRef<HTMLDivElement, SortableWishCardProps>(
  ({ wish, index, totalWishes, onChange, onRemove, onClear, onMoveUp, onMoveDown, canRemove, choiceLabels, usedClassIds, disabled = false }, outerRef) => {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wish.id, disabled: disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < totalWishes - 1;
  const isDisabled = disabled;

  return (
    <div ref={setNodeRef} style={style}>
      <GlowCard 
        surface="section"
        className={cn("p-3", isDisabled && "opacity-60")}
        hoverable={false}
      >
        <div className="flex items-center gap-2">
          {/* Reorder controls */}
          <div className="hidden lg:flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp || isDisabled}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={s('wishes.move_up')}
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown || isDisabled}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={s('wishes.move_down')}
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <button
            {...attributes}
            {...listeners}
            disabled={isDisabled}
            className={cn(
              "hidden lg:flex w-7 h-7 rounded-lg bg-muted/50 items-center justify-center flex-shrink-0",
              isDisabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
            )}
            title={s('wishes.drag_reorder')}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20 flex-shrink-0">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>

          {/* Wish editor inline */}
          <WishCardEditor
            wish={wish}
            onChange={onChange}
            usedClassIds={usedClassIds}
            disabled={isDisabled}
          />

          {/* Delete button */}
          {canRemove ? (
            <button
              onClick={onRemove}
              disabled={isDisabled}
              className={cn(
                "w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center transition-colors flex-shrink-0",
                isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-destructive/20"
              )}
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          ) : wish.classId ? (
            <button
              onClick={onClear}
              disabled={isDisabled}
              className={cn(
                "w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center transition-colors flex-shrink-0",
                isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
              )}
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="w-7 h-7 flex-shrink-0" />
          )}
        </div>
      </GlowCard>
    </div>
  );
});

SortableWishCard.displayName = 'SortableWishCard';

const Wishes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const requestedRosterId = new URLSearchParams(location.search).get('rosterId');
  const requestedSeasonId = new URLSearchParams(location.search).get('seasonId');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url?: string | null } | null>(null);
  const [seasons, setSeasons] = useState<GuildSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonSupportMode, setSeasonSupportMode] = useState<SeasonSupportMode>('enabled');
  const [confirmed, setConfirmed] = useState<CommitmentStatus>('undecided');
  const [memberWishesLocked, setMemberWishesLocked] = useState(false);
  const [wishes, setWishes] = useState<WishData[]>([
    { id: 'wish-1', classId: '', specIds: [], comment: '' },
    { id: 'wish-2', classId: '', specIds: [], comment: '' },
    { id: 'wish-3', classId: '', specIds: [], comment: '' },
  ]);
  
  // Roster state
  const [rosters, setRosters] = useState<RosterData[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  
  // GM and permissions state
  const [isGM, setIsGM] = useState(false);
  const [hasActivityPermission, setHasActivityPermission] = useState(false);
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const choiceLabels = [
    t.wishes.preferredChoice,
    t.wishes.secondChoice,
    t.wishes.thirdChoice,
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
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
      
      const foundGuildId = matchedGuild.id;
      setGuildId(foundGuildId);
      setGuild({ 
        name: matchedGuild.name, 
        server: matchedGuild.server, 
        region: matchedGuild.region || 'eu', 
        faction: matchedGuild.faction,
        avatar_url: matchedGuild.avatar_url 
      });

      let initialSeason: GuildSeason | null = null;
      let initialRosterId: string | null = null;

      // Check if user is GM
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: foundGuildId,
        p_user_id: user.id,
      });
      setIsGM(!!gmCheck);

      // Check activity permission
      const { data: activityPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasActivityPermission(!!activityPerm);

      // Fetch rosters and check access
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('*')
        .eq('guild_id', foundGuildId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (rostersData) {
        // Check access for each roster - only show accessible ones on Wishes page
        const rostersWithAccess: RosterData[] = [];
        for (const roster of rostersData) {
          const { data: hasAccess } = await supabase.rpc('has_roster_access', {
            p_roster_id: roster.id,
            p_user_id: user.id,
          });
          if (hasAccess) {
            rostersWithAccess.push({
              id: roster.id,
              name: roster.name,
              is_default: roster.is_default,
              hasAccess: true,
              wishes_locked: roster.wishes_locked,
              wishes_lock_at: roster.wishes_lock_at,
            });
          }
        }
        setRosters(rostersWithAccess);
        
        // Select roster from querystring (when coming from roster table) or default roster
        const requested = requestedRosterId
          ? rostersWithAccess.find(r => r.id === requestedRosterId)
          : undefined;
        const defaultRoster = rostersWithAccess.find(r => r.is_default) || rostersWithAccess[0];
        const initialRoster = requested || defaultRoster;
        if (initialRoster) {
          initialRosterId = initialRoster.id;
          setSelectedRosterId(initialRoster.id);

          const { data: seasonsData, error: seasonsError } = await supabase
            .from('roster_wish_seasons')
            .select('*')
            .eq('guild_id', foundGuildId)
            .eq('roster_id', initialRoster.id)
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
                nextSeasons[0];
              if (initialSeason) {
                setSelectedSeasonId(initialSeason.id);
              }
            }
          }
        }
      }

      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status, wishes_locked')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        const { data: intentData } = initialSeason
          ? await supabase
              .from('guild_season_member_intents')
              .select('commitment_status')
              .eq('guild_id', foundGuildId)
              .eq('roster_id', initialRosterId)
              .eq('season_id', initialSeason.id)
              .eq('user_id', user.id)
              .maybeSingle()
          : { data: null };
        // Map DB status to CommitmentStatus
        const statusMap: Record<string, CommitmentStatus> = {
          'confirmed': 'confirmed',
          'potential': 'undecided',
          'withdrawn': 'withdrawn',
        };
        setConfirmed(statusMap[intentData?.commitment_status || memberData.status] || 'undecided');
        setMemberWishesLocked(!!memberData.wishes_locked);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, navigate, requestedRosterId, requestedSeasonId]);

  // Fetch wishes when roster changes
  useEffect(() => {
    if (!guildId || !selectedRosterId || !user) return;

    const seasonFilteringEnabled = isSeasonFilteringEnabled(seasonSupportMode, selectedSeasonId);
    if (seasonSupportMode === 'enabled' && !selectedSeasonId) return;

    const fetchWishes = async () => {
      const { data: intentData } = seasonFilteringEnabled
        ? await supabase
            .from('guild_season_member_intents')
            .select('commitment_status')
            .eq('guild_id', guildId)
            .eq('roster_id', selectedRosterId)
            .eq('season_id', selectedSeasonId!)
            .eq('user_id', user.id)
            .maybeSingle()
        : { data: null };
      if (intentData?.commitment_status) {
        const statusMap: Record<string, CommitmentStatus> = {
          confirmed: 'confirmed',
          potential: 'undecided',
          withdrawn: 'withdrawn',
        };
        setConfirmed(statusMap[intentData.commitment_status] || 'undecided');
      }

      let wishesQuery = supabase
        .from('class_wishes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .eq('roster_id', selectedRosterId);
      if (seasonFilteringEnabled) {
        wishesQuery = wishesQuery.eq('season_id', selectedSeasonId!);
      }
      const { data: wishesData } = await wishesQuery.order('choice_index');

      if (wishesData && wishesData.length > 0) {
        const loadedWishes: WishData[] = wishesData.map((w, index) => ({
          id: `wish-${index + 1}`,
          classId: w.class_id,
          specIds: resolveSpecOrder(w.spec_ids || [], w.spec_order),
          comment: w.comment || '',
        }));
        setWishes(loadedWishes);
      } else {
        // Reset to empty wishes if no data for this roster
        setWishes([
          { id: 'wish-1', classId: '', specIds: [], comment: '' },
          { id: 'wish-2', classId: '', specIds: [], comment: '' },
          { id: 'wish-3', classId: '', specIds: [], comment: '' },
        ]);
      }
    };

    fetchWishes();
  }, [guildId, selectedRosterId, selectedSeasonId, user, seasonSupportMode]);

  useEffect(() => {
    if (!guildId || !selectedRosterId || seasonSupportMode === 'legacy') return;

    let cancelled = false;
    const loadRosterSeasons = async () => {
      const { data, error } = await supabase
        .from('roster_wish_seasons')
        .select('*')
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId)
        .order('state', { ascending: true })
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error && isSeasonSchemaUnavailable(error)) {
        setSeasonSupportMode('legacy');
        setSeasons([]);
        setSelectedSeasonId(null);
        return;
      }

      const nextSeasons = (data || []) as GuildSeason[];
      setSeasons(nextSeasons);
      setSelectedSeasonId((current) => {
        if (current && nextSeasons.some((season) => season.id === current)) return current;
        return nextSeasons.find((season) => season.state === 'active')?.id || nextSeasons[0]?.id || null;
      });
    };

    loadRosterSeasons();
    return () => {
      cancelled = true;
    };
  }, [guildId, selectedRosterId, seasonSupportMode]);

  const updateWish = (
    index: number,
    field: keyof Omit<WishData, 'id'>,
    value: Omit<WishData, 'id'>[keyof Omit<WishData, 'id'>]
  ) => {
    if (isEditingDisabled) return;
    const updated = [...wishes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setWishes(updated);
  };

  const addWish = () => {
    if (isEditingDisabled) return;
    if (wishes.length >= 13) return; // Max 13 wishes (one per class)
    const newId = `wish-${Date.now()}`;
    setWishes([...wishes, { id: newId, classId: '', specIds: [], comment: '' }]);
  };

  const removeWish = (index: number) => {
    if (isEditingDisabled) return;
    if (wishes.length <= 1) return;
    setWishes(wishes.filter((_, i) => i !== index));
  };

  const clearWish = (index: number) => {
    if (isEditingDisabled) return;
    const updated = [...wishes];
    updated[index] = { ...updated[index], classId: '', specIds: [], comment: '' };
    setWishes(updated);
  };

  const moveWish = (index: number, direction: 'up' | 'down') => {
    if (isEditingDisabled) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= wishes.length) return;
    setWishes(arrayMove(wishes, index, newIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isEditingDisabled) return;
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWishes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveWishes = async () => {
    if (!user || !guildId) {
      toast({ title: t.errors.generic, description: s('wishes.session_expired'), variant: 'destructive' });
      return;
    }
    if (!selectedRosterId) {
      toast({ title: t.errors.generic, description: t.wishes.noRosterSelected, variant: 'destructive' });
      return;
    }
    if (seasonSupportMode === 'enabled' && (!selectedSeasonId || selectedSeason?.state !== 'active')) {
      toast({ title: t.seasons.archived, description: selectedSeason?.state === 'draft' ? t.seasons.draftHint : t.seasons.archivedHint, variant: 'destructive' });
      return;
    }

    const rosterLockState = resolveWishLockState({
      rosterLocked: rosters.find(r => r.id === selectedRosterId)?.wishes_locked,
      rosterLockAt: rosters.find(r => r.id === selectedRosterId)?.wishes_lock_at,
      memberLocked: memberWishesLocked,
    });
    if (rosterLockState.isLocked) {
      toast({
        title: t.wishes.lockedTitle,
        description: rosterLockState.reason === 'member' ? t.wishes.lockedMemberDesc : t.wishes.lockedRosterDesc,
        variant: 'destructive',
      });
      return;
    }
    
    // Validate: each wish with a class must have at least one spec
    const invalidWish = wishes.find(w => w.classId && w.specIds.length === 0);
    if (invalidWish) {
      const cls = getClassById(invalidWish.classId);
      toast({
        title: t.wishes.specRequired,
        description: interpolateMessage(t.wishes.specRequiredDesc, {
          class: cls ? getLocalizedClassName(cls.id, language) : '',
        }),
        variant: 'destructive'
      });
      return;
    }
    setSaving(true);

    try {
      const dbStatus = confirmed === 'withdrawn' ? 'withdrawn' : (confirmed === 'confirmed' ? 'confirmed' : 'potential');
      const wishesPayload = wishes
        .filter((w) => !!w.classId)
        .map((w) => ({
          class_id: w.classId,
          spec_ids: w.specIds,
          comment: w.comment || null,
        }));

      const payload: Record<string, unknown> = {
        p_guild_id: guildId,
        p_roster_id: selectedRosterId,
        p_member_id: user.id,
        p_commitment_status: dbStatus,
        p_wishes: wishesPayload,
        p_manager_edit: false,
      };
      if (seasonSupportMode === 'enabled' && selectedSeasonId) {
        payload.p_season_id = selectedSeasonId;
      }
      const { error } = await supabase.rpc('upsert_member_roster_wishes', payload);
      if (error) throw error;

      const [{ data: intentData }, { data: memberData }, { data: wishesData }] = await Promise.all([
        seasonSupportMode === 'enabled' && selectedSeasonId
          ? supabase
              .from('guild_season_member_intents')
              .select('commitment_status')
              .eq('guild_id', guildId)
              .eq('roster_id', selectedRosterId)
              .eq('season_id', selectedSeasonId)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('guild_members')
          .select('status, wishes_locked')
          .eq('guild_id', guildId)
          .eq('user_id', user.id)
          .single(),
        (() => {
          let query = supabase
            .from('class_wishes')
            .select('*')
            .eq('guild_id', guildId)
            .eq('user_id', user.id)
            .eq('roster_id', selectedRosterId);
          if (seasonSupportMode === 'enabled' && selectedSeasonId) {
            query = query.eq('season_id', selectedSeasonId);
          }
          return query.order('choice_index');
        })(),
      ]);

      if (memberData || intentData) {
        const statusMap: Record<string, CommitmentStatus> = {
          confirmed: 'confirmed',
          potential: 'undecided',
          withdrawn: 'withdrawn',
        };
        setConfirmed(statusMap[intentData?.commitment_status || memberData?.status || 'potential'] || 'undecided');
        setMemberWishesLocked(!!memberData?.wishes_locked);
      }

      if (wishesData && wishesData.length > 0) {
        const loadedWishes: WishData[] = wishesData.map((w, index) => ({
          id: `wish-${index + 1}`,
          classId: w.class_id,
          specIds: resolveSpecOrder(w.spec_ids || [], w.spec_order),
          comment: w.comment || '',
        }));
        setWishes(loadedWishes);
      } else {
        setWishes([
          { id: 'wish-1', classId: '', specIds: [], comment: '' },
          { id: 'wish-2', classId: '', specIds: [], comment: '' },
          { id: 'wish-3', classId: '', specIds: [], comment: '' },
        ]);
      }

      toast({ title: t.wishes.wishesSaved });
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentRoster = rosters.find(r => r.id === selectedRosterId);
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const isSelectedSeasonActive = seasonSupportMode === 'legacy' || selectedSeason?.state === 'active';
  const lockState = resolveWishLockState({
    rosterLocked: currentRoster?.wishes_locked,
    rosterLockAt: currentRoster?.wishes_lock_at,
    memberLocked: memberWishesLocked,
  });
  const isEditingDisabled = lockState.isLocked || !isSelectedSeasonActive;
  const lockMessage =
    lockState.reason === 'member'
      ? t.wishes.lockedMemberDesc
      : t.wishes.lockedRosterDesc;
  const scheduledLabel =
    lockState.isScheduled && lockState.scheduledAt
      ? formatDateTimeLocalized(lockState.scheduledAt, language, { dateStyle: 'medium', timeStyle: 'short' })
      : null;

  // Only show accessible rosters
  const accessibleRosters = rosters.filter(r => r.hasAccess);
  const selectSeason = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const next = new URLSearchParams(location.search);
    next.set('seasonId', seasonId);
    navigate(`${location.pathname}?${next.toString()}`, { replace: true });
  };

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  if (!guild) return null;

  const workspaceToolbar = (
    <PageContainer className="py-2" width="workspace">
            <ContextualToolbar
              className="border-border/30 bg-card/10 p-2"
              leading={(
                <div className="flex min-w-0 flex-1 items-center gap-2">
              <RosterSelector
                rosters={accessibleRosters}
                selectedRosterId={selectedRosterId}
                onSelect={setSelectedRosterId}
                showWishesLockIndicator={true}
              />
              <SeasonSelector
                seasons={seasons}
                selectedSeasonId={selectedSeasonId}
                onSelect={selectSeason}
                emptyLabel={seasonSupportMode === 'legacy' ? t.seasons.legacyMode : undefined}
              />
                </div>
              )}
              trailing={(
                <>
                  {(lockState.isLocked || scheduledLabel) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded border border-border/40 bg-background/40',
                              lockState.isLocked ? toneTextClass('warning') : toneTextClass('info'),
                            )}
                            aria-label={lockState.isLocked ? `${t.wishes.lockedTitle}: ${lockMessage}` : interpolateMessage(t.wishes.lockScheduledDesc, { date: scheduledLabel || '' })}
                          >
                            {lockState.isLocked ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            <span className="sr-only">
                              {lockState.isLocked ? `${t.wishes.lockedTitle}: ${lockMessage}` : interpolateMessage(t.wishes.lockScheduledDesc, { date: scheduledLabel || '' })}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {lockState.isLocked
                              ? `${t.wishes.lockedTitle}: ${lockMessage}`
                              : interpolateMessage(t.wishes.lockScheduledDesc, { date: scheduledLabel || '' })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <CosmicButton
                    size="sm"
                    onClick={saveWishes}
                    loading={saving}
                    disabled={isEditingDisabled}
                    icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
                  >
                    {t.wishes.saveWishes}
                  </CosmicButton>
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
      hasSettingsPermission={isGM || hasActivityPermission}
      activeTab="wishes"
      toolbar={workspaceToolbar}
      context={{
        roster: currentRoster?.name,
        season: selectedSeason?.name,
        status: lockState.isLocked ? t.wishes.lockedTitle : undefined,
      }}
    >
      <PageContainer as="main" className="relative z-10 py-3 md:py-4" width="workspace">
        {seasonSupportMode === 'legacy' ? (
          <div className={cn('mb-4 rounded-lg border p-3 text-sm', toneCalloutClass('info'))}>
            <span className={toneTextClass('info')}>{t.seasons.legacyModeHint}</span>
          </div>
        ) : (
          selectedSeason && <SeasonStateCallout season={selectedSeason} />
        )}

        {/* Commitment toggle */}
        <GlowCard surface="section" className="mb-4 p-3">
          <CommitmentToggle status={confirmed} onChange={setConfirmed} disabled={isEditingDisabled} />
        </GlowCard>

        {/* Wish cards with drag and drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={wishes.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {wishes.map((wish, index) => {
                // Get all used class IDs except the current wish's class
                const usedClassIds = wishes
                  .filter((_, i) => i !== index)
                  .map(w => w.classId)
                  .filter(Boolean);
                
                return (
                  <SortableWishCard
                    key={wish.id}
                    wish={wish}
                    index={index}
                    totalWishes={wishes.length}
                    onChange={(field, value) => updateWish(index, field, value)}
                    onRemove={() => removeWish(index)}
                    onClear={() => clearWish(index)}
                    onMoveUp={() => moveWish(index, 'up')}
                    onMoveDown={() => moveWish(index, 'down')}
                    canRemove={wishes.length > 1}
                    choiceLabels={choiceLabels}
                    usedClassIds={usedClassIds}
                    disabled={isEditingDisabled}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add wish button */}
        {wishes.length < 13 && (
          <div className="mt-4 text-center">
            <button
              onClick={addWish}
              disabled={isEditingDisabled}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-primary/50 text-sm text-primary transition-colors",
                isEditingDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10"
              )}
            >
              <Plus className="h-4 w-4" />
              {t.wishes.addWish}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <CosmicButton 
            size="md" 
            onClick={saveWishes} 
            loading={saving}
            disabled={isEditingDisabled}
            icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
          >
            {t.wishes.saveWishes}
          </CosmicButton>
        </div>
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default Wishes;
