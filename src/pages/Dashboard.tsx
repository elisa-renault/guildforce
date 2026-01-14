import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getClassById, getSpecById, getRolesFromSpecs, Role, wowClasses } from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { StatsCards, RosterFilters, RosterTable } from '@/components/dashboard';
import { RosterSelector, RosterEditDialog } from '@/components/roster';
import { ActivePollWidget } from '@/components/polls';
import { MemberWish, WishData, RoleStats, RangeStats, RosterFilters as RosterFiltersType, ValidationStatus } from '@/types/guild';
import { Loader2, Sparkles, ArrowLeft, Settings, Shield, BarChart3 } from 'lucide-react';
import { toSlug, getGuildWishesPath, getGuildSettingsPath } from '@/lib/guildSlug';
import { CommitmentStatus } from '@/components/CommitmentToggle';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Max wishes = number of WoW classes
const MAX_WISHES = wowClasses.length;

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url: string | null } | null>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [isGM, setIsGM] = useState(false);
  const [filters, setFilters] = useState<RosterFiltersType>({
    roleFilters: [],
    classFilters: [],
    validationFilters: [],
    searchQuery: '',
    filterMode: 'or',
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
    
    if (membershipError || !membershipData) {
      navigate('/guilds');
      return;
    }
    
    const userIsGM = membershipData.role === 'gm';
    setIsGM(userIsGM);

    // Fetch rosters and check access
    const { data: rostersData } = await supabase
      .from('rosters')
      .select('*')
      .eq('guild_id', foundGuildId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (rostersData) {
      // Check access for each roster
      const rostersWithAccess: RosterData[] = await Promise.all(
        rostersData.map(async (roster) => {
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
    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  useEffect(() => {
    if (guildId && selectedRosterId) {
      fetchWishes();
    }
  }, [guildId, selectedRosterId]);

  const toggleRow = (memberId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedRows(newExpanded);
  };

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
    
    // Expand the row if not already
    const newExpanded = new Set(expandedRows);
    newExpanded.add(member.id);
    setExpandedRows(newExpanded);
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

  const cancelEditing = () => {
    setEditingUserId(null);
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

  // Validate a wish (GM only)
  const validateWish = async (userId: string, choiceIndex: number, status: ValidationStatus) => {
    if (!user || !guildId || !selectedRosterId || !isGM) return;

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

    if (filters.roleFilters.length > 0) {
      const matchingWishes = m.wishes.filter(w => {
        const roles = getRolesFromSpecs(w.spec_ids);
        return filters.roleFilters.some(rf => roles.includes(rf as Role));
      });
      
      if (isAndMode) {
        // AND: all selected roles must be present across wishes
        const allRolesPresent = filters.roleFilters.every(rf => 
          m.wishes.some(w => getRolesFromSpecs(w.spec_ids).includes(rf as Role))
        );
        if (!allRolesPresent) return false;
      } else {
        // OR: at least one role must match
        if (matchingWishes.length === 0) return false;
      }
    }

    if (filters.classFilters.length > 0) {
      if (isAndMode) {
        // AND: all selected classes must be present
        const allClassesPresent = filters.classFilters.every(cf => 
          m.wishes.some(w => w.class_id === cf)
        );
        if (!allClassesPresent) return false;
      } else {
        // OR: at least one class must match
        const hasClass = m.wishes.some(w => filters.classFilters.includes(w.class_id));
        if (!hasClass) return false;
      }
    }

    // Filter by validation status
    if (filters.validationFilters.length > 0) {
      if (isAndMode) {
        // AND: all selected validation statuses must be present
        const allStatusesPresent = filters.validationFilters.every(vs => 
          m.wishes.some(w => (w.validation_status || 'pending') === vs)
        );
        if (!allStatusesPresent) return false;
      } else {
        // OR: at least one validation status must match
        const hasStatus = m.wishes.some(w => 
          filters.validationFilters.includes((w.validation_status || 'pending') as ValidationStatus)
        );
        if (!hasStatus) return false;
      }
    }

    return true;
  });

  // Calculate stats
  const totalPlayers = members.length;
  const confirmedPlayers = members.filter(m => m.status === 'confirmed').length;
  const roleStats: RoleStats = { tank: 0, healer: 0, dps: 0 };
  const rangeStats: RangeStats = { melee: 0, ranged: 0 };
  members.forEach(m => {
    const wish = m.wishes.find(w => w.choice_index === 1);
    if (wish && wish.spec_ids.length > 0) {
      // Only count the first spec of the first wish
      const firstSpec = getSpecById(wish.spec_ids[0]);
      if (firstSpec) {
        roleStats[firstSpec.role]++;
        rangeStats[firstSpec.range]++;
      }
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentRoster = rosters.find(r => r.id === selectedRosterId);

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      {/* Sticky toolbar */}
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-3 md:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/guilds')}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              title={t.common.back}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {guild?.avatar_url && (
              <Avatar className="h-7 w-7 border border-border/50">
                <AvatarImage src={guild.avatar_url} alt={guild.name} />
              </Avatar>
            )}
            <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">{guild?.name}</h1>
            
            {/* Roster selector */}
            <RosterSelector
              rosters={rosters}
              selectedRosterId={selectedRosterId}
              onSelect={setSelectedRosterId}
              showAccessIndicator={true}
            />
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <CosmicButton size="sm" variant="outline" onClick={() => guild && navigate(getGuildWishesPath(guild.region, guild.server, guild.name))} icon={<Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
              <span className="hidden md:inline">{t.wishes.editMyWishes}</span>
            </CosmicButton>
            {isGM && guild && (
              <CosmicButton size="sm" variant="outline" onClick={() => navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`)} icon={<BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
                <span className="hidden md:inline">{language === 'fr' ? 'Sondages' : 'Polls'}</span>
              </CosmicButton>
            )}
            {isGM && selectedRosterId && (
              <CosmicButton size="sm" variant="outline" onClick={() => setRosterSettingsOpen(true)} icon={<Settings className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
                <span className="hidden md:inline">{t.dashboard.roster}</span>
              </CosmicButton>
            )}
            {isGM && guild && (
              <CosmicButton size="sm" variant="outline" onClick={() => navigate(getGuildSettingsPath(guild.region, guild.server, guild.name))} icon={<Shield className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
                <span className="hidden md:inline">{language === 'fr' ? 'Guilde' : 'Guild'}</span>
              </CosmicButton>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 relative z-10">
        {/* Access warning */}
        {currentRoster && !currentRoster.hasAccess && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {t.rosters?.noAccessMessage || 'You can view this roster but cannot edit your wishes.'}
          </div>
        )}
        
        <StatsCards 
          totalPlayers={totalPlayers} 
          confirmedPlayers={confirmedPlayers} 
          roleStats={roleStats}
          rangeStats={rangeStats}
        />

        {/* Active Poll Widget */}
        {guildId && guild && (
          <ActivePollWidget 
            guildId={guildId} 
            guildSlug={`${regionSlug}/${serverSlug}/${guildSlug}`}
            isGM={isGM}
          />
        )}

        <RosterFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
        />

        <RosterTable
          members={filteredMembers}
          currentUserId={user?.id}
          expandedRows={expandedRows}
          editingUserId={editingUserId}
          editWishes={editWishes}
          editStatus={editStatus}
          saving={saving}
          maxWishes={MAX_WISHES}
          isGM={isGM}
          onToggleRow={toggleRow}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onUpdateEditWish={updateEditWish}
          onEditStatusChange={setEditStatus}
          onSaveEditing={saveEditing}
          onAddWish={addWish}
          onRemoveWish={removeWish}
          onClearWish={clearWish}
          onValidateWish={validateWish}
        />
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

export default Dashboard;