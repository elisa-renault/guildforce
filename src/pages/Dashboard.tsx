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
import { MemberWish, WishData, RoleStats, RangeStats, RosterFilters as RosterFiltersType } from '@/types/guild';
import { Loader2, Download, Sparkles, ArrowLeft } from 'lucide-react';
import { toSlug, getGuildWishesPath } from '@/lib/guildSlug';
import { CommitmentStatus } from '@/components/CommitmentToggle';

// Max wishes = number of WoW classes
const MAX_WISHES = wowClasses.length;

const Dashboard = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string } | null>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [isGM, setIsGM] = useState(false);
  const [filters, setFilters] = useState<RosterFiltersType>({
    roleFilters: [],
    classFilters: [],
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

  const fetchData = async () => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) return;
    
    // First, find the guild by matching slugified region, server and name
    const { data: allGuilds } = await supabase
      .from('guilds')
      .select('id, name, server, region, faction');
    
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
    setGuild({ name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu', faction: matchedGuild.faction });
    
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

    const { data: membersData } = await supabase
      .from('guild_members')
      .select('user_id, status')
      .eq('guild_id', foundGuildId);

    if (membersData) {
      const userIds = membersData.map(m => m.user_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('user_id, choice_index, class_id, spec_ids, comment')
        .eq('guild_id', foundGuildId);

      const mergedMembers: MemberWish[] = membersData.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        const memberWishes = wishesData?.filter(w => w.user_id === m.user_id) || [];
        return {
          id: m.user_id,
          username: profile?.username || 'Unknown',
          status: m.status,
          wishes: memberWishes.sort((a, b) => a.choice_index - b.choice_index),
        };
      });

      setMembers(mergedMembers);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

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
    if (!user || !guildId || !editingUserId) return;
    setSaving(true);

    try {
      // Map CommitmentStatus to DB status
      const dbStatus = editStatus === 'withdrawn' ? 'withdrawn' : (editStatus === 'confirmed' ? 'confirmed' : 'potential');
      await supabase
        .from('guild_members')
        .update({ status: dbStatus })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Delete all existing wishes for this user/guild first
      await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Insert all non-empty wishes
      const wishesToInsert = editWishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
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
      await fetchData();
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  const exportCSV = () => {
    const headers = ['Username', 'Status', 'Choice 1 Class', 'Choice 1 Specs', 'Choice 2 Class', 'Choice 2 Specs', 'Choice 3 Class', 'Choice 3 Specs', 'Comments'];
    const rows = members.map(m => {
      const row = [m.username, m.status];
      for (let i = 1; i <= 3; i++) {
        const wish = m.wishes.find(w => w.choice_index === i);
        if (wish) {
          const cls = getClassById(wish.class_id);
          row.push(cls?.name[language] || '');
          row.push(wish.spec_ids.map(sid => getSpecById(sid)?.name[language] || '').join(', '));
        } else {
          row.push('', '');
        }
      }
      const comments = m.wishes.map(w => w.comment).filter(Boolean).join(' | ');
      row.push(comments);
      return row;
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guild?.name || 'guild'}-roster.csv`;
    a.click();
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
            <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">{guild?.name}</h1>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <CosmicButton size="sm" variant="outline" onClick={() => guild && navigate(getGuildWishesPath(guild.region, guild.server, guild.name))} icon={<Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
              <span className="hidden md:inline">{t.wishes.title}</span>
            </CosmicButton>
            {isGM && (
              <CosmicButton size="sm" onClick={exportCSV} icon={<Download className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />} className="h-7 md:h-8 px-2 md:px-3">
                <span className="hidden md:inline">{t.dashboard.exportCSV}</span>
              </CosmicButton>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 relative z-10">
        <StatsCards 
          totalPlayers={totalPlayers} 
          confirmedPlayers={confirmedPlayers} 
          roleStats={roleStats}
          rangeStats={rangeStats}
        />

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
          onToggleRow={toggleRow}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onUpdateEditWish={updateEditWish}
          onEditStatusChange={setEditStatus}
          onSaveEditing={saveEditing}
          onAddWish={addWish}
          onRemoveWish={removeWish}
          onClearWish={clearWish}
        />
      </main>
    </div>
  );
};

export default Dashboard;
