import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getClassById, getSpecById, getRolesFromSpecs, Role } from '@/data/wowClasses';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { StatsCards, RosterFilters, RosterTable } from '@/components/dashboard';
import { MemberWish, WishData, RoleStats, RosterFilters as RosterFiltersType } from '@/types/guild';
import { Loader2, Copy, Download, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<{ name: string; faction: string; invite_key: string } | null>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [filters, setFilters] = useState<RosterFiltersType>({
    roleFilter: 'all',
    classFilter: 'all',
    searchQuery: '',
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editWishes, setEditWishes] = useState<WishData[]>([
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
  ]);
  const [editConfirmed, setEditConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user || !guildId) return;
    
    // Use secure RPC function that validates owner/GM access and returns invite_key
    const { data: guildData, error: guildError } = await supabase
      .rpc('get_guild_with_invite_key', { _guild_id: guildId })
      .single();
    
    // If RPC fails (unauthorized or not found), redirect
    if (guildError || !guildData) {
      navigate('/guilds');
      return;
    }
    
    // Double-check: user must be the owner
    if (guildData.owner_id !== user.id) {
      navigate('/guilds');
      return;
    }
    
    // Double-check: user must also have 'gm' role in guild_members
    const { data: membershipData } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();
    
    if (!membershipData || membershipData.role !== 'gm') {
      navigate('/guilds');
      return;
    }
    
    setGuild(guildData);

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

      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('user_id, choice_index, class_id, spec_ids, comment')
        .eq('guild_id', guildId);

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
    if (!user || !guildId) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, guildId, navigate]);

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
    
    const loadedWishes: WishData[] = [
      { classId: '', specIds: [], comment: '' },
      { classId: '', specIds: [], comment: '' },
      { classId: '', specIds: [], comment: '' },
    ];
    
    member.wishes.forEach(w => {
      const idx = w.choice_index - 1;
      if (idx >= 0 && idx < 3) {
        loadedWishes[idx] = {
          classId: w.class_id,
          specIds: w.spec_ids || [],
          comment: w.comment || '',
        };
      }
    });
    
    setEditWishes(loadedWishes);
    setEditConfirmed(member.status === 'confirmed');
    setEditingUserId(member.id);
    
    // Expand the row if not already
    const newExpanded = new Set(expandedRows);
    newExpanded.add(member.id);
    setExpandedRows(newExpanded);
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
      await supabase
        .from('guild_members')
        .update({ status: editConfirmed ? 'confirmed' : 'potential' })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      const wishesToUpsert = editWishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
          choice_index: i + 1,
          class_id: w.classId,
          spec_ids: w.specIds,
          comment: w.comment,
        }))
        .filter(w => w.class_id);

      const emptyChoiceIndexes = editWishes
        .map((w, i) => (!w.classId ? i + 1 : null))
        .filter((idx): idx is number => idx !== null);

      if (emptyChoiceIndexes.length > 0) {
        await supabase
          .from('class_wishes')
          .delete()
          .eq('guild_id', guildId)
          .eq('user_id', user.id)
          .in('choice_index', emptyChoiceIndexes);
      }

      if (wishesToUpsert.length > 0) {
        const { error } = await supabase
          .from('class_wishes')
          .upsert(wishesToUpsert, { 
            onConflict: 'guild_id,user_id,choice_index',
            ignoreDuplicates: false 
          });
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

  const copyInviteLink = () => {
    if (!guild) return;
    const link = `${window.location.origin}/guild/join?key=${guild.invite_key}`;
    navigator.clipboard.writeText(link);
    toast({ title: t.common.copied });
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

    if (filters.roleFilter !== 'all') {
      const hasRole = m.wishes.some(w => {
        const roles = getRolesFromSpecs(w.spec_ids);
        return roles.includes(filters.roleFilter as Role);
      });
      if (!hasRole) return false;
    }

    if (filters.classFilter !== 'all') {
      const hasClass = m.wishes.some(w => w.class_id === filters.classFilter);
      if (!hasClass) return false;
    }

    return true;
  });

  // Calculate stats
  const totalPlayers = members.length;
  const confirmedPlayers = members.filter(m => m.status === 'confirmed').length;
  const roleStats: RoleStats = { tank: 0, healer: 0, dps: 0 };
  members.forEach(m => {
    const wish = m.wishes.find(w => w.choice_index === 1);
    if (wish) {
      const roles = getRolesFromSpecs(wish.spec_ids);
      roles.forEach(r => roleStats[r]++);
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{guild?.name}</h1>
          <div className="flex gap-2">
            <CosmicButton size="sm" variant="outline" onClick={() => navigate(`/guild/${guildId}/wishes`)}>
              <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.wishes.title}
            </CosmicButton>
            <CosmicButton size="sm" variant="outline" onClick={copyInviteLink}>
              <Copy className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.guild.copyInvite}
            </CosmicButton>
            <CosmicButton size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.dashboard.exportCSV}
            </CosmicButton>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <StatsCards 
          totalPlayers={totalPlayers} 
          confirmedPlayers={confirmedPlayers} 
          roleStats={roleStats} 
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
          editConfirmed={editConfirmed}
          saving={saving}
          onToggleRow={toggleRow}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onUpdateEditWish={updateEditWish}
          onEditConfirmedChange={setEditConfirmed}
          onSaveEditing={saveEditing}
        />
      </main>
    </div>
  );
};

export default Dashboard;
