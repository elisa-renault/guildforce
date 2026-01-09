import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, ArrowLeft, Copy, Download, Users, Shield, Heart, Swords, CheckCircle, HelpCircle } from 'lucide-react';
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
      // Fetch guild info
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

      // Fetch members with profiles
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('user_id, status')
        .eq('guild_id', guildId);

      if (membersData) {
        const userIds = membersData.map(m => m.user_id);
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, discord_pseudo')
          .in('id', userIds);

        // Fetch wishes
        const { data: wishesData } = await supabase
          .from('class_wishes')
          .select('user_id, choice_index, class_id, spec_ids, comment')
          .eq('guild_id', guildId);

        // Merge data
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
    // Search filter
    if (searchQuery && !m.discord_pseudo.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Role filter
    if (roleFilter !== 'all') {
      const hasRole = m.wishes.some(w => {
        const roles = getRolesFromSpecs(w.spec_ids);
        return roles.includes(roleFilter as Role);
      });
      if (!hasRole) return false;
    }

    // Class filter
    if (classFilter !== 'all') {
      const hasClass = m.wishes.some(w => w.class_id === classFilter);
      if (!hasClass) return false;
    }

    return true;
  });

  // Stats
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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <div className="space-y-1">
        <Badge variant="outline" className={cn('text-xs', `bg-${cls.color}/20 text-${cls.color} border-${cls.color}/50`)}>
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/guilds')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <h1 className="text-xl font-bold">{guild?.name} - {t.dashboard.title}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Copy className="h-4 w-4 mr-2" /> {t.guild.copyInvite}
            </Button>
            <Button size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> {t.dashboard.exportCSV}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalPlayers}</div>
              <div className="text-sm text-muted-foreground">{t.dashboard.totalPlayers}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-healer" />
              <div className="text-2xl font-bold">{confirmedPlayers}</div>
              <div className="text-sm text-muted-foreground">{t.dashboard.confirmedPlayers}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-tank" />
              <div className="text-2xl font-bold">{roleStats.tank}</div>
              <div className="text-sm text-muted-foreground">{t.dashboard.tank}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <Heart className="h-8 w-8 mx-auto mb-2 text-healer" />
              <div className="text-2xl font-bold">{roleStats.healer}</div>
              <div className="text-sm text-muted-foreground">{t.dashboard.healer}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <Swords className="h-8 w-8 mx-auto mb-2 text-dps" />
              <div className="text-2xl font-bold">{roleStats.dps}</div>
              <div className="text-sm text-muted-foreground">{t.dashboard.dps}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t.dashboard.filters}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder={t.common.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t.dashboard.allRoles} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.allRoles}</SelectItem>
                  <SelectItem value="tank">{t.dashboard.tank}</SelectItem>
                  <SelectItem value="healer">{t.dashboard.healer}</SelectItem>
                  <SelectItem value="dps">{t.dashboard.dps}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.dashboard.allClasses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.allClasses}</SelectItem>
                  {wowClasses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="glass">
          <CardContent className="pt-6">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t.dashboard.noData}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dashboard.player}</TableHead>
                    <TableHead>{t.wishes.status}</TableHead>
                    <TableHead>{t.dashboard.firstChoice}</TableHead>
                    <TableHead>{t.dashboard.secondChoice}</TableHead>
                    <TableHead>{t.dashboard.thirdChoice}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.discord_pseudo}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'confirmed' ? 'default' : 'outline'}>
                          {member.status === 'confirmed' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> {t.wishes.confirmed}</>
                          ) : (
                            <><HelpCircle className="h-3 w-3 mr-1" /> {t.wishes.potential}</>
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
