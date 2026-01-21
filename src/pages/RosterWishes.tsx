import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { getClassById, getSpecById, getRolesFromSpecs, Role, wowClasses } from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GuildSubNav } from '@/components/guild';
import { RosterFilters, RosterTable, RosterAnalytics } from '@/components/dashboard';
import { RosterSelector, RosterEditDialog } from '@/components/roster';
import { MemberWish, WishData, RosterFilters as RosterFiltersType, ValidationStatus } from '@/types/guild';
import { Loader2, Sparkles, Settings, TableIcon, BarChart3, Download, Eye } from 'lucide-react';
import { exportWishesToCSV } from '@/lib/exportWishes';
import { toSlug, getGuildWishesPath } from '@/lib/guildSlug';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Max wishes = number of WoW classes
const MAX_WISHES = wowClasses.length;

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
}

const RosterWishes = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isAdmin: isGlobalAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [canManageWishes, setCanManageWishes] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [hasSettingsPermission, setHasSettingsPermission] = useState(false);
  const [isAdminReadOnly, setIsAdminReadOnly] = useState(false);
  const [filters, setFilters] = useState<RosterFiltersType>({
    roleFilters: [],
    classFilters: [],
    validationFilters: [],
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
  const [saving, setSaving] = useState(false);

  // Roster state
  const [rosters, setRosters] = useState<RosterData[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [rosterSettingsOpen, setRosterSettingsOpen] = useState(false);

  const isMobile = useIsMobile();

  // Dynamic offset for roster controls bar.
  // On mobile we render it as `fixed` (like the Settings tabs) to avoid a top-vs-scroll mismatch.
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [controlsTop, setControlsTop] = useState<number>(112);
  // Default spacer to ~44px (py-2 + h-7 button) so it's never 0 on first paint
  const [controlsSpacerH, setControlsSpacerH] = useState<number>(isMobile ? 44 : 0);

  useLayoutEffect(() => {
    let raf = 0;

    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const globalNav = document.querySelector<HTMLElement>('[data-global-nav]');
        const subNav = document.querySelector<HTMLElement>('[data-guild-subnav]');

        const fallbackGlobalH = globalNav?.offsetHeight ?? 64;
        const fallbackSubH = subNav?.offsetHeight ?? 48;

        // Use getBoundingClientRect for precise positioning when SubNav exists
        const nextTop = subNav
          ? Math.max(0, Math.round(subNav.getBoundingClientRect().bottom))
          : fallbackGlobalH + fallbackSubH;

        setControlsTop((prev) => (prev === nextTop ? prev : nextTop));

        if (isMobile && controlsRef.current) {
          const nextH = Math.round(controlsRef.current.offsetHeight);
          setControlsSpacerH((prev) => (prev === nextH ? prev : nextH));
        }
      });
    };

    // Run immediately on mount to measure controls bar height
    compute();

    window.addEventListener('resize', compute);

    const ro = new ResizeObserver(compute);
    const globalNavEl = document.querySelector<HTMLElement>('[data-global-nav]');
    const subNavEl = document.querySelector<HTMLElement>('[data-guild-subnav]');
    if (globalNavEl) ro.observe(globalNavEl);
    if (subNavEl) ro.observe(subNavEl);
    if (controlsRef.current) ro.observe(controlsRef.current);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [guild, isMobile]);

  const fetchData = async () => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) return;

    // First, find the guild by matching slugified region, server and name
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
    setGuild({ name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu', faction: matchedGuild.faction, avatar_url: matchedGuild.avatar_url });

    // Check if user is a member of this guild
    const { data: membershipData, error: membershipError } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', foundGuildId)
      .eq('user_id', user.id)
      .single();

    // If not a member but is global admin, allow read-only access
    if (membershipError || !membershipData) {
      if (isGlobalAdmin) {
        setIsAdminReadOnly(true);
        setIsGM(false);
        setCanManageWishes(false);
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

      // Check settings permissions
      const { data: settingsPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasSettingsPermission(!!userIsGM || !!settingsPerm);
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
            };
          }
          const { data: hasAccess } = await supabase.rpc('has_roster_access', {
            p_roster_id: roster.id,
            p_user_id: user.id,
          });
          return {
            id: roster.id,
            name: roster.name,
            is_default: roster.is_default,
            hasAccess: hasAccess || false,
          };
        })
      );
      setRosters(rostersWithAccess);

      // Select default roster or first accessible
      const defaultRoster = rostersWithAccess.find(r => r.is_default) || rostersWithAccess[0];
      if (defaultRoster && !selectedRosterId) {
        setSelectedRosterId(defaultRoster.id);
      }
    }

    setLoading(false);
  };

  // Fetch wishes when roster changes
  const fetchWishes = async () => {
    if (!guildId || !selectedRosterId) return;

    const { data: membersData } = await supabase
      .from('guild_members')
      .select('user_id, status')
      .eq('guild_id', guildId);

    if (membersData) {
      const userIds = membersData.map(m => m.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      // Filter wishes by selected roster
      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('user_id, choice_index, class_id, spec_ids, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId);

      // Fetch validator profiles if there are any
      const validatorIds = [...new Set(wishesData?.filter(w => w.validated_by).map(w => w.validated_by) || [])];
      const { data: validatorProfiles } = validatorIds.length > 0
        ? await supabase.from('profiles').select('id, username').in('id', validatorIds)
        : { data: [] };

      const mergedMembers: MemberWish[] = membersData.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        const memberWishes = wishesData?.filter(w => w.user_id === m.user_id).map(w => ({
          choice_index: w.choice_index,
          class_id: w.class_id,
          spec_ids: w.spec_ids,
          comment: w.comment,
          validation_status: (w.validation_status || 'pending') as ValidationStatus,
          validated_by: w.validated_by,
          validated_at: w.validated_at,
          validated_by_username: validatorProfiles?.find(p => p.id === w.validated_by)?.username || null,
        })) || [];
        return {
          id: m.user_id,
          username: profile?.username || 'Unknown',
          status: m.status,
          wishes: memberWishes.sort((a, b) => a.choice_index - b.choice_index),
        };
      });

      setMembers(mergedMembers);
    }
  };

  useEffect(() => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }
    // Wait for admin check to complete
    if (adminLoading) return;
    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate, adminLoading, isGlobalAdmin]);

  useEffect(() => {
    if (guildId && selectedRosterId) {
      fetchWishes();
    }
  }, [guildId, selectedRosterId]);


  const startEditing = (member: MemberWish) => {
    if (member.id !== user?.id) return;

    // Check if user has access to this roster
    const currentRoster = rosters.find(r => r.id === selectedRosterId);
    if (!currentRoster?.hasAccess) {
      toast({ title: t.rosters?.noAccess || 'No access to this roster', variant: 'destructive' });
      return;
    }

    // Load all wishes from member, ensuring at least 3 slots
    const wishCount = Math.max(3, member.wishes.length);
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
    setEditingUserId(member.id);
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


  const updateEditWish = (index: number, field: keyof WishData, value: any) => {
    const updated = [...editWishes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setEditWishes(updated);
  };

  const saveEditing = async () => {
    if (!user || !guildId || !editingUserId || !selectedRosterId) return;
    
    // Validation: each class must have at least one spec
    const invalidWish = editWishes.find(w => w.classId && w.specIds.length === 0);
    if (invalidWish) {
      const cls = getClassById(invalidWish.classId);
      toast({
        title: t.wishes.specRequired,
        description: t.wishes.specRequiredDesc.replace('{class}', cls?.name[language] || ''),
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);

    try {
      // Map CommitmentStatus to DB status
      const dbStatus = editStatus === 'withdrawn' ? 'withdrawn' : (editStatus === 'confirmed' ? 'confirmed' : 'potential');
      await supabase
        .from('guild_members')
        .update({ status: dbStatus })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Delete all existing wishes for this user/guild/roster first
      await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .eq('roster_id', selectedRosterId);

      // Insert all non-empty wishes with roster_id
      const wishesToInsert = editWishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
          roster_id: selectedRosterId,
          choice_index: i + 1,
          class_id: w.classId,
          spec_ids: w.specIds,
          comment: w.comment,
        }))
        .filter(w => w.class_id);

      if (wishesToInsert.length > 0) {
        const { error } = await supabase
          .from('class_wishes')
          .insert(wishesToInsert);
        if (error) throw error;
      }

      toast({ title: t.wishes.wishesSaved });
      setEditingUserId(null);
      await fetchWishes();
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Validate a wish (GM or users with manage_wishes permission)
  const validateWish = async (userId: string, choiceIndex: number, status: ValidationStatus) => {
    if (!user || !guildId || !selectedRosterId || !canManageWishes) return;

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
                  validated_at: status === 'pending' ? null : new Date().toISOString(),
                }
              : w
          ),
        };
      })
    );

    try {
      const { error } = await supabase
        .from('class_wishes')
        .update({
          validation_status: status,
          validated_by: status === 'pending' ? null : user.id,
          validated_at: status === 'pending' ? null : new Date().toISOString(),
        })
        .eq('guild_id', guildId)
        .eq('roster_id', selectedRosterId)
        .eq('user_id', userId)
        .eq('choice_index', choiceIndex);

      if (error) throw error;

      toast({
        title:
          status === 'approved'
            ? t.wishes.validation.approved
            : status === 'rejected'
              ? t.wishes.validation.rejected
              : t.wishes.validation.pending,
      });

      // Refresh wishes to sync validated_by_username, timestamps, etc.
      await fetchWishes();
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    }
  };

  // Filter members
  const filteredMembers = members.filter(m => {
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

  // Calculate stats

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentRoster = rosters.find(r => r.id === selectedRosterId);

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

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
          activeTab="roster"
        />
      )}

      {/* Admin read-only banner */}
      {isAdminReadOnly && (
        <div className="container mx-auto px-3 md:px-4 py-2">
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Eye className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">
              {language === 'fr' ? 'Mode lecture admin' : 'Admin read-only mode'}
            </span>
          </div>
        </div>
      )}

      {/* Roster controls bar */}
      <div
        ref={controlsRef}
        className={`${isMobile ? 'fixed left-0 right-0' : 'sticky'} z-30 bg-background/80 backdrop-blur-lg border-b border-border/50`}
        style={{ top: controlsTop }}
      >
        <div className="container mx-auto px-3 md:px-4 py-2 flex items-center justify-between">
          <RosterSelector
            rosters={rosters}
            selectedRosterId={selectedRosterId}
            onSelect={setSelectedRosterId}
            showAccessIndicator={true}
          />
          <div className="flex gap-1.5 md:gap-2">
            <CosmicButton 
              size="sm" 
              variant="outline" 
              onClick={() => {
                exportWishesToCSV(filteredMembers, {
                  language,
                  rosterName: currentRoster?.name || 'roster',
                  guildName: guild?.name || 'guild'
                });
                toast({ title: t.dashboard.exportSuccess });
              }} 
              icon={<Download className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} 
              className="h-7 w-7 md:h-8 md:w-auto p-0 md:px-3"
            >
              <span className="hidden md:inline">{t.dashboard.exportCSV}</span>
            </CosmicButton>
            {/* Hide edit my wishes button for admin read-only mode */}
            {!isAdminReadOnly && (
              <CosmicButton size="sm" variant="outline" onClick={() => guild && navigate(getGuildWishesPath(guild.region, guild.server, guild.name))} icon={<Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 w-7 md:h-8 md:w-auto p-0 md:px-3">
                <span className="hidden md:inline">{t.wishes.editMyWishes}</span>
              </CosmicButton>
            )}
            {isGM && selectedRosterId && (
              <CosmicButton size="sm" variant="outline" onClick={() => setRosterSettingsOpen(true)} icon={<Settings className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 w-7 md:h-8 md:w-auto p-0 md:px-3">
                <span className="hidden md:inline">{t.dashboard.roster}</span>
              </CosmicButton>
            )}
          </div>
        </div>
      </div>
      {isMobile && controlsSpacerH > 0 && (
        <div aria-hidden="true" style={{ height: controlsSpacerH }} />
      )}

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 relative z-10">
        {/* Access warning */}
        {currentRoster && !currentRoster.hasAccess && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {t.rosters?.noAccessMessage || 'You can view this roster but cannot edit your wishes.'}
          </div>
        )}

        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              {t.dashboard.table}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t.dashboard.analytics}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            <RosterFilters
              filters={filters}
              onFiltersChange={setFilters}
            />

            <RosterTable
              members={filteredMembers}
              currentUserId={user?.id}
              selectedRosterId={selectedRosterId}
              editingUserId={editingUserId}
              editWishes={editWishes}
              editStatus={editStatus}
              saving={saving}
              maxWishes={MAX_WISHES}
              isGM={canManageWishes}
              onStartEditing={startEditing}
              onUpdateEditWish={updateEditWish}
              onEditStatusChange={setEditStatus}
              onSaveEditing={saveEditing}
              onAddWish={addWish}
              onRemoveWish={removeWish}
              onClearWish={clearWish}
              onValidateWish={validateWish}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <RosterAnalytics members={members} />
          </TabsContent>
        </Tabs>
      </main>

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
    </div>
  );
};

export default RosterWishes;
