import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { wowClasses, getClassById, getSpecById, getRolesFromSpecs, Role } from '@/data/wowClasses';
import { RoleBadge } from '@/components/RoleBadge';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, ArrowLeft, Copy, Download, Users, Shield, Heart, Swords, CheckCircle, HelpCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberWish {
  id: string;
  discord_pseudo: string;
  status: string;
  wishes: {
    choice_index: number;
    class_id: string;
    spec_ids: string[];
    comment: string | null;
  }[];
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

  useEffect(() => {
    if (!user || !guildId) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
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
          .select('id, discord_pseudo')
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
            discord_pseudo: profile?.discord_pseudo || 'Unknown',
            status: m.status,
            wishes: memberWishes.sort((a, b) => a.choice_index - b.choice_index),
          };
        });

        setMembers(mergedMembers);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, guildId, navigate]);

  const copyInviteLink = () => {
    if (!guild) return;
    const link = `${window.location.origin}/guild/join?key=${guild.invite_key}`;
    navigator.clipboard.writeText(link);
    toast({ title: t.common.copied });
  };

  const exportCSV = () => {
    const headers = ['Discord', 'Status', 'Choice 1 Class', 'Choice 1 Specs', 'Choice 2 Class', 'Choice 2 Specs', 'Choice 3 Class', 'Choice 3 Specs', 'Comments'];
    const rows = members.map(m => {
      const row = [m.discord_pseudo, m.status];
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
    if (searchQuery && !m.discord_pseudo.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      <header className="sticky top-0 z-50 cosmic-header">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/guilds')}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.common.back}
          </Button>
          <h1 className="text-xl font-bold text-foreground">{guild?.name} - {t.dashboard.title}</h1>
          <div className="flex gap-2">
            <CosmicButton size="sm" variant="outline" onClick={copyInviteLink}>
              <Copy className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.guild.copyInvite}
            </CosmicButton>
            <CosmicButton size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.dashboard.exportCSV}
            </CosmicButton>
          </div>
        </div>
      </header>

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
                    <TableHead className="text-muted-foreground">{t.dashboard.player}</TableHead>
                    <TableHead className="text-muted-foreground">{t.wishes.status}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.firstChoice}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.secondChoice}</TableHead>
                    <TableHead className="text-muted-foreground">{t.dashboard.thirdChoice}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member, index) => (
                    <TableRow 
                      key={member.id} 
                      className="border-border/20 hover:bg-white/[0.02] transition-colors"
                      style={{ animationDelay: `${350 + index * 30}ms` }}
                    >
                      <TableCell className="font-medium text-foreground">{member.discord_pseudo}</TableCell>
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
                  ))}
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
