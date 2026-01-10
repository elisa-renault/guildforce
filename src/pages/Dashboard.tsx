import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { wowClasses, getClassById, getSpecById, getRolesFromSpecs, Role } from '@/data/wowClasses';
import { RoleBadge } from '@/components/RoleBadge';
import { ClassGrid } from '@/components/ClassGrid';
import { SpecButtons } from '@/components/SpecButtons';
import { CommitmentToggle } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Copy, Download, Users, Shield, Heart, Swords, CheckCircle, HelpCircle, Search, Sparkles, ChevronDown, ChevronRight, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberWish {
  id: string;
  username: string;
  status: string;
  wishes: {
    choice_index: number;
    class_id: string;
    spec_ids: string[];
    comment: string | null;
  }[];
}

interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<{ name: string; faction: string; invite_key: string } | null>(null);
  const [members, setMembers] = useState<MemberWish[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    
    const { data: guildData } = await supabase
      .from('guilds')
      .select('name, faction, invite_key, owner_id')
      .eq('id', guildId)
      .single();
    
    if (!guildData || guildData.owner_id !== user.id) {
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

  const filteredMembers = members.filter(m => {
    if (searchQuery && !m.username.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (roleFilter !== 'all') {
      const hasRole = m.wishes.some(w => {
        const roles = getRolesFromSpecs(w.spec_ids);
        return roles.includes(roleFilter as Role);
      });
      if (!hasRole) return false;
    }

    if (classFilter !== 'all') {
      const hasClass = m.wishes.some(w => w.class_id === classFilter);
      if (!hasClass) return false;
    }

    return true;
  });

  const totalPlayers = members.length;
  const confirmedPlayers = members.filter(m => m.status === 'confirmed').length;
  const roleStats = { tank: 0, healer: 0, dps: 0 };
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

  const renderWishCell = (wishes: MemberWish['wishes'], choiceIndex: number) => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    if (!wish) return <span className="text-muted-foreground">-</span>;

    const cls = getClassById(wish.class_id);
    if (!cls) return <span className="text-muted-foreground">-</span>;

    const roles = getRolesFromSpecs(wish.spec_ids);

    return (
      <div className="space-y-1.5">
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs font-medium',
            `bg-class-${cls.id}/20 border-class-${cls.id}/50`
          )}
          style={{ 
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
            borderColor: `hsl(var(--class-${cls.id}) / 0.4)`,
            color: `hsl(var(--class-${cls.id}))`
          }}
        >
          {cls.name[language]}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {roles.map(role => (
            <RoleBadge key={role} role={role} size="sm" />
          ))}
        </div>
      </div>
    );
  };

  const renderExpandedContent = (member: MemberWish) => {
    const isEditing = editingUserId === member.id;
    const isOwnRow = member.id === user?.id;

    if (isEditing) {
      return (
        <div className="p-6 bg-background/50 border-t border-border/20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-foreground">{t.wishes.editMyWishes}</h4>
            <div className="flex gap-2">
              <CosmicButton 
                size="sm" 
                variant="outline" 
                onClick={cancelEditing}
                icon={<X className="h-4 w-4" strokeWidth={1.5} />}
              >
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton 
                size="sm" 
                onClick={saveEditing}
                loading={saving}
                icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
              >
                {t.wishes.saveWishes}
              </CosmicButton>
            </div>
          </div>

          {/* Commitment toggle */}
          <div className="mb-6 p-4 rounded bg-muted/20 border border-border/20">
            <CommitmentToggle confirmed={editConfirmed} onChange={setEditConfirmed} />
          </div>

          {/* Wishes editing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {editWishes.map((wish, index) => (
              <GlowCard key={index} className="p-4" hoverable={false}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{t.wishes.choice} #{index + 1}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground mb-2 block text-sm">{t.wishes.selectClass}</Label>
                    <ClassGrid
                      value={wish.classId}
                      onChange={(classId) => updateEditWish(index, 'classId', classId)}
                    />
                  </div>

                  {wish.classId && (
                    <div className="animate-fade-in">
                      <Label className="text-foreground mb-2 block text-sm">{t.wishes.selectSpecs}</Label>
                      <SpecButtons
                        classId={wish.classId}
                        selectedSpecs={wish.specIds}
                        onChange={(specIds) => updateEditWish(index, 'specIds', specIds)}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-foreground mb-2 block text-sm">{t.wishes.comment}</Label>
                    <Textarea
                      placeholder={t.wishes.commentPlaceholder}
                      value={wish.comment}
                      onChange={(e) => updateEditWish(index, 'comment', e.target.value)}
                      className="cosmic-input min-h-[60px] resize-none text-sm"
                    />
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      );
    }

    // Read-only expanded view
    return (
      <div className="p-6 bg-background/50 border-t border-border/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.dashboard.comments} & {t.wishes.specs}
          </h4>
          {isOwnRow && (
            <CosmicButton 
              size="sm" 
              variant="outline" 
              onClick={() => startEditing(member)}
              icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
            >
              {t.wishes.editMyWishes}
            </CosmicButton>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(choiceIndex => {
            const wish = member.wishes.find(w => w.choice_index === choiceIndex);
            if (!wish) {
              return (
                <div key={choiceIndex} className="p-4 rounded bg-muted/10 border border-border/10">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {choiceIndex === 1 ? t.dashboard.firstChoice : choiceIndex === 2 ? t.dashboard.secondChoice : t.dashboard.thirdChoice}
                  </div>
                  <span className="text-muted-foreground text-sm">-</span>
                </div>
              );
            }

            const cls = getClassById(wish.class_id);
            const specs = wish.spec_ids.map(sid => getSpecById(sid)).filter(Boolean);

            return (
              <div key={choiceIndex} className="p-4 rounded bg-muted/10 border border-border/10">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {choiceIndex === 1 ? t.dashboard.firstChoice : choiceIndex === 2 ? t.dashboard.secondChoice : t.dashboard.thirdChoice}
                </div>
                {cls && (
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium mb-2"
                    style={{ 
                      backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                      borderColor: `hsl(var(--class-${cls.id}) / 0.4)`,
                      color: `hsl(var(--class-${cls.id}))`
                    }}
                  >
                    {cls.name[language]}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {specs.map(spec => spec && (
                    <Badge key={spec.id} variant="outline" className="text-xs">
                      {spec.name[language]}
                    </Badge>
                  ))}
                </div>
                {wish.comment && (
                  <p className="text-sm text-muted-foreground mt-3 italic">"{wish.comment}"</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="stat-card total animate-fade-in" style={{ animationDelay: '0ms' }}>
            <Users className="h-8 w-8 mx-auto mb-3 text-primary" strokeWidth={1.5} />
            <div className="text-3xl font-bold text-foreground">{totalPlayers}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.dashboard.totalPlayers}</div>
          </div>
          <div className="stat-card confirmed animate-fade-in" style={{ animationDelay: '50ms' }}>
            <CheckCircle className="h-8 w-8 mx-auto mb-3 text-healer" strokeWidth={1.5} />
            <div className="text-3xl font-bold text-foreground">{confirmedPlayers}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.dashboard.confirmedPlayers}</div>
          </div>
          <div className="stat-card tank animate-fade-in" style={{ animationDelay: '100ms' }}>
            <Shield className="h-8 w-8 mx-auto mb-3 text-tank" strokeWidth={1.5} />
            <div className="text-3xl font-bold text-foreground">{roleStats.tank}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.dashboard.tank}</div>
          </div>
          <div className="stat-card healer animate-fade-in" style={{ animationDelay: '150ms' }}>
            <Heart className="h-8 w-8 mx-auto mb-3 text-healer" strokeWidth={1.5} />
            <div className="text-3xl font-bold text-foreground">{roleStats.healer}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.dashboard.healer}</div>
          </div>
          <div className="stat-card dps animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Swords className="h-8 w-8 mx-auto mb-3 text-dps" strokeWidth={1.5} />
            <div className="text-3xl font-bold text-foreground">{roleStats.dps}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.dashboard.dps}</div>
          </div>
        </div>

        {/* Filters */}
        <GlowCard className="p-6 mb-6 animate-fade-in" style={{ animationDelay: '250ms' }} hoverable={false}>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t.dashboard.filters}</h3>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder={t.common.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cosmic-input pl-10 w-56"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 cosmic-input">
                <SelectValue placeholder={t.dashboard.allRoles} />
              </SelectTrigger>
              <SelectContent className="cosmic-glass border-border/50">
                <SelectItem value="all">{t.dashboard.allRoles}</SelectItem>
                <SelectItem value="tank">{t.dashboard.tank}</SelectItem>
                <SelectItem value="healer">{t.dashboard.healer}</SelectItem>
                <SelectItem value="dps">{t.dashboard.dps}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-48 cosmic-input">
                <SelectValue placeholder={t.dashboard.allClasses} />
              </SelectTrigger>
              <SelectContent className="cosmic-glass border-border/50">
                <SelectItem value="all">{t.dashboard.allClasses}</SelectItem>
                {wowClasses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name[language]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlowCard>

        {/* Table */}
        <GlowCard className="overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }} hoverable={false}>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{t.dashboard.noData}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-8"></TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.player}</TableHead>
                    <TableHead className="text-muted-foreground">{t.wishes.status}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.firstChoice}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.secondChoice}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.thirdChoice}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member, index) => {
                    const isExpanded = expandedRows.has(member.id);
                    const isOwnRow = member.id === user?.id;
                    
                    return (
                      <Fragment key={member.id}>
                        <TableRow 
                          className={cn(
                            "border-border/20 transition-colors cursor-pointer",
                            isOwnRow ? "hover:bg-primary/5 bg-primary/[0.02]" : "hover:bg-white/[0.02]",
                            isExpanded && "bg-white/[0.03]"
                          )}
                          style={{ animationDelay: `${350 + index * 30}ms` }}
                          onClick={() => toggleRow(member.id)}
                        >
                          <TableCell className="w-8 pr-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {member.username}
                              {isOwnRow && (
                                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                                  {t.common.edit}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={member.status === 'confirmed' ? 'default' : 'outline'}
                              className={member.status === 'confirmed' 
                                ? 'bg-healer/20 text-healer border-healer/30' 
                                : 'border-border/50 text-muted-foreground'
                              }
                            >
                              {member.status === 'confirmed' ? (
                                <><CheckCircle className="h-3 w-3 mr-1" strokeWidth={1.5} /> {t.wishes.confirmed}</>
                              ) : (
                                <><HelpCircle className="h-3 w-3 mr-1" strokeWidth={1.5} /> {t.wishes.potential}</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderWishCell(member.wishes, 1)}</TableCell>
                          <TableCell>{renderWishCell(member.wishes, 2)}</TableCell>
                          <TableCell>{renderWishCell(member.wishes, 3)}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent border-border/20">
                            <TableCell colSpan={6} className="p-0">
                              {renderExpandedContent(member)}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </GlowCard>
      </main>
    </div>
  );
};

export default Dashboard;