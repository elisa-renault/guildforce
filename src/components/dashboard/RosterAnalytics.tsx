import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role, RangeType } from '@/data/wowClasses';
import { MemberWish } from '@/types/guild';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Sword, Swords, Crosshair, AlertTriangle, Users, Filter, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Color mapping from Tailwind class to CSS variable
const classColorMap: Record<string, string> = {
  'class-warrior': 'hsl(var(--class-warrior))',
  'class-paladin': 'hsl(var(--class-paladin))',
  'class-hunter': 'hsl(var(--class-hunter))',
  'class-rogue': 'hsl(var(--class-rogue))',
  'class-priest': 'hsl(var(--class-priest))',
  'class-death-knight': 'hsl(var(--class-death-knight))',
  'class-shaman': 'hsl(var(--class-shaman))',
  'class-mage': 'hsl(var(--class-mage))',
  'class-warlock': 'hsl(var(--class-warlock))',
  'class-monk': 'hsl(var(--class-monk))',
  'class-druid': 'hsl(var(--class-druid))',
  'class-demon-hunter': 'hsl(var(--class-demon-hunter))',
  'class-evoker': 'hsl(var(--class-evoker))',
};

// Role color mapping for distinctive visualization
const roleColorMap: Record<Role, string> = {
  tank: 'hsl(210, 70%, 50%)',
  healer: 'hsl(142, 70%, 45%)',
  dps: 'hsl(0, 70%, 55%)',
};

// Range color mapping
const rangeColorMap: Record<RangeType, string> = {
  melee: 'hsl(210, 70%, 55%)',
  ranged: 'hsl(280, 70%, 55%)',
};

interface RosterAnalyticsProps {
  members: MemberWish[];
}

interface ClassStat {
  id: string;
  name: string;
  color: string;
  wish1: number;
  total: number;
  players: string[];
}

interface SpecStat {
  id: string;
  specName: string;
  className: string;
  classColor: string;
  role: Role;
  range: RangeType;
  count: number;
  maxCount: number;
}

interface RoleByPriority {
  role: Role;
  wish1: number;
  other: number;
}

type CommitmentFilter = 'all' | 'confirmed' | 'potential' | 'withdrawn';
type RoleFilter = 'all' | 'tank' | 'healer' | 'dps';
type RangeFilter = 'all' | 'melee' | 'ranged';

export const RosterAnalytics = ({ members }: RosterAnalyticsProps) => {
  const { t, language } = useLanguage();
  const [maxWishIndex, setMaxWishIndex] = useState<number>(13);
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

  // Pre-filter members based on commitment and exclude those with 0 wishes
  const filteredMembers = useMemo(() => {
    let filtered = members.filter(m => {
      const hasWishes = m.wishes && m.wishes.length > 0 && m.wishes.some(w => w.class_id);
      if (!hasWishes) return false;
      return true;
    });
    
    if (commitmentFilter !== 'all') {
      filtered = filtered.filter(m => m.status === commitmentFilter);
    }
    
    return filtered;
  }, [members, commitmentFilter]);

  // Check if spec matches role and range filters
  const specMatchesFilters = (specId: string): boolean => {
    const spec = getSpecById(specId);
    if (!spec) return false;
    if (roleFilter !== 'all' && spec.role !== roleFilter) return false;
    if (rangeFilter !== 'all' && spec.range !== rangeFilter) return false;
    return true;
  };

  // Calculate class distribution based on filter with player names
  const classStats = useMemo(() => {
    const stats: Record<string, { wish1: number; total: number; players: Set<string> }> = {};
    wowClasses.forEach(c => {
      stats[c.id] = { wish1: 0, total: 0, players: new Set() };
    });

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.class_id && stats[w.class_id] && w.choice_index <= maxWishIndex) {
          const hasMatchingSpec = !w.spec_ids?.length || 
            (roleFilter === 'all' && rangeFilter === 'all') ||
            w.spec_ids.some(specId => specMatchesFilters(specId));
          
          if (hasMatchingSpec) {
            stats[w.class_id].total++;
            stats[w.class_id].players.add(m.username);
            if (w.choice_index === 1) {
              stats[w.class_id].wish1++;
            }
          }
        }
      });
    });

    return Object.entries(stats)
      .map(([id, data]) => {
        const wowClass = getClassById(id);
        return {
          id,
          name: wowClass?.name[language] || id,
          color: wowClass?.color || 'class-warrior',
          wish1: data.wish1,
          total: data.total,
          players: Array.from(data.players),
        } as ClassStat;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredMembers, language, maxWishIndex, roleFilter, rangeFilter]);

  // Calculate max for bar scaling
  const maxClassTotal = useMemo(() => {
    return Math.max(...classStats.map(s => s.total), 1);
  }, [classStats]);

  // Calculate spec distribution (all specs) based on filter
  const specStats = useMemo(() => {
    const stats: Record<string, number> = {};

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            if (specMatchesFilters(specId)) {
              stats[specId] = (stats[specId] || 0) + 1;
            }
          });
        }
      });
    });

    const sorted = Object.entries(stats)
      .map(([id, count]) => {
        const spec = getSpecById(id);
        const wowClass = wowClasses.find(c => c.specs.some(s => s.id === id));
        return {
          id,
          specName: spec?.name[language] || id,
          className: wowClass?.name[language] || '',
          classColor: wowClass?.color || 'class-warrior',
          role: spec?.role || 'dps',
          range: spec?.range || 'melee',
          count,
          maxCount: 0,
        } as SpecStat;
      })
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);

    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(s => ({ ...s, maxCount }));
  }, [filteredMembers, language, maxWishIndex, roleFilter, rangeFilter]);

  // Calculate roles by priority based on filter
  const rolesByPriority = useMemo(() => {
    const stats: Record<Role, { wish1: number; other: number }> = {
      tank: { wish1: 0, other: 0 },
      healer: { wish1: 0, other: 0 },
      dps: { wish1: 0, other: 0 },
    };

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            const spec = getSpecById(specId);
            if (spec && specMatchesFilters(specId)) {
              if (w.choice_index === 1) {
                stats[spec.role].wish1++;
              } else {
                stats[spec.role].other++;
              }
            }
          });
        }
      });
    });

    return [
      { role: 'tank' as Role, ...stats.tank },
      { role: 'healer' as Role, ...stats.healer },
      { role: 'dps' as Role, ...stats.dps },
    ] as RoleByPriority[];
  }, [filteredMembers, maxWishIndex, roleFilter, rangeFilter]);

  // Calculate range distribution based on filter
  const rangeStats = useMemo(() => {
    const stats = { melee: 0, ranged: 0 };

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            const spec = getSpecById(specId);
            if (spec && specMatchesFilters(specId)) {
              stats[spec.range]++;
            }
          });
        }
      });
    });

    return stats;
  }, [filteredMembers, maxWishIndex, roleFilter, rangeFilter]);

  // Missing classes (no one has this class in any wish)
  const missingClasses = useMemo(() => {
    return classStats.filter(s => s.total === 0);
  }, [classStats]);

  // Classes with at least one wish (any priority)
  const representedClasses = useMemo(() => {
    return classStats.filter(s => s.total > 0);
  }, [classStats]);

  const getRoleIcon = (role: Role, size: string = "h-3.5 w-3.5") => {
    switch (role) {
      case 'tank':
        return <Shield className={size} />;
      case 'healer':
        return <Heart className={size} />;
      case 'dps':
        return <Sword className={size} />;
    }
  };

  const getRoleName = (role: Role) => {
    switch (role) {
      case 'tank':
        return t.dashboard.tank;
      case 'healer':
        return t.dashboard.healer;
      case 'dps':
        return t.dashboard.dps;
    }
  };

  // Rank number with colors for top 3
  const getRankDisplay = (index: number) => {
    const rank = index + 1;
    const colors = ['text-amber-400', 'text-slate-300', 'text-amber-600'];
    const colorClass = index < 3 ? colors[index] : 'text-muted-foreground';
    return <span className={`text-xs font-bold ${colorClass}`}>{rank}</span>;
  };

  // Generate wish range label for selector
  const getWishRangeLabel = (n: number) => {
    if (n === 1) return t.dashboard.wishRange1;
    if (n === 13) return t.dashboard.allWishes;
    return language === 'fr' ? `Vœux 1-${n}` : `Wishes 1-${n}`;
  };

  // Calculate totals for KPI bar
  const totalTanks = rolesByPriority.find(r => r.role === 'tank');
  const totalHealers = rolesByPriority.find(r => r.role === 'healer');
  const totalDps = rolesByPriority.find(r => r.role === 'dps');

  // Pie chart data
  const rolePieData = rolesByPriority.map(stat => ({
    name: getRoleName(stat.role),
    value: stat.wish1 + stat.other,
    role: stat.role,
    color: roleColorMap[stat.role],
  })).filter(d => d.value > 0);

  const totalRoles = rolePieData.reduce((sum, d) => sum + d.value, 0);
  const totalRange = rangeStats.melee + rangeStats.ranged;

  const rangePieData = [
    { name: t.dashboard.melee, value: rangeStats.melee, color: rangeColorMap.melee, key: 'melee' },
    { name: t.dashboard.ranged, value: rangeStats.ranged, color: rangeColorMap.ranged, key: 'ranged' },
  ].filter(d => d.value > 0);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Compact Filter Bar + KPIs */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-card/50 rounded-lg border border-border/50">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          
          <Select value={String(maxWishIndex)} onValueChange={(v) => setMaxWishIndex(Number(v))}>
            <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
              <SelectValue>{getWishRangeLabel(maxWishIndex)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs">{getWishRangeLabel(1)}</SelectItem>
              {[2, 3, 4, 5, 6].map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {getWishRangeLabel(n)}
                </SelectItem>
              ))}
              <SelectItem value="13" className="text-xs">{getWishRangeLabel(13)}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={commitmentFilter} onValueChange={(v) => setCommitmentFilter(v as CommitmentFilter)}>
            <SelectTrigger className="h-7 w-auto min-w-[90px] text-xs">
              <SelectValue>
                {commitmentFilter === 'all' ? t.dashboard.allCommitments : 
                 commitmentFilter === 'confirmed' ? t.wishes.commitment.confirmed :
                 commitmentFilter === 'potential' ? t.wishes.commitment.undecided :
                 t.wishes.commitment.withdrawn}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t.dashboard.allCommitments}</SelectItem>
              <SelectItem value="confirmed" className="text-xs">{t.wishes.commitment.confirmed}</SelectItem>
              <SelectItem value="potential" className="text-xs">{t.wishes.commitment.undecided}</SelectItem>
              <SelectItem value="withdrawn" className="text-xs">{t.wishes.commitment.withdrawn}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="h-7 w-auto min-w-[80px] text-xs">
              <SelectValue>
                {roleFilter === 'all' ? t.dashboard.allRoles :
                 roleFilter === 'tank' ? t.dashboard.tank :
                 roleFilter === 'healer' ? t.dashboard.healer :
                 t.dashboard.dps}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t.dashboard.allRoles}</SelectItem>
              <SelectItem value="tank" className="text-xs">{t.dashboard.tank}</SelectItem>
              <SelectItem value="healer" className="text-xs">{t.dashboard.healer}</SelectItem>
              <SelectItem value="dps" className="text-xs">{t.dashboard.dps}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={rangeFilter} onValueChange={(v) => setRangeFilter(v as RangeFilter)}>
            <SelectTrigger className="h-7 w-auto min-w-[80px] text-xs">
              <SelectValue>
                {rangeFilter === 'all' ? t.dashboard.allRanges :
                 rangeFilter === 'melee' ? t.dashboard.melee :
                 t.dashboard.ranged}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t.dashboard.allRanges}</SelectItem>
              <SelectItem value="melee" className="text-xs">{t.dashboard.melee}</SelectItem>
              <SelectItem value="ranged" className="text-xs">{t.dashboard.ranged}</SelectItem>
            </SelectContent>
          </Select>

          {/* Inline KPIs */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">{filteredMembers.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium">{representedClasses.length}/13</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/50">
              <div className="flex items-center gap-0.5" style={{ color: roleColorMap.tank }}>
                <Shield className="h-3 w-3" />
                <span className="text-xs font-medium">{(totalTanks?.wish1 || 0) + (totalTanks?.other || 0)}</span>
              </div>
              <div className="flex items-center gap-0.5" style={{ color: roleColorMap.healer }}>
                <Heart className="h-3 w-3" />
                <span className="text-xs font-medium">{(totalHealers?.wish1 || 0) + (totalHealers?.other || 0)}</span>
              </div>
              <div className="flex items-center gap-0.5" style={{ color: roleColorMap.dps }}>
                <Sword className="h-3 w-3" />
                <span className="text-xs font-medium">{(totalDps?.wish1 || 0) + (totalDps?.other || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: 4 columns on desktop */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Range Pie - 1 column */}
          <GlowCard className="p-3">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Swords className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">/</span>
              <Crosshair className="h-3.5 w-3.5 text-purple-500" />
            </h4>
            {totalRange > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rangePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={52}
                        dataKey="value"
                        stroke="none"
                      >
                        {rangePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-0.5">
                  {rangePieData.map(stat => (
                    <div key={stat.key} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      {stat.key === 'melee' ? (
                        <Swords className="h-3 w-3" style={{ color: stat.color }} />
                      ) : (
                        <Crosshair className="h-3 w-3" style={{ color: stat.color }} />
                      )}
                      <span className="text-xs">{stat.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {stat.value} ({Math.round((stat.value / totalRange) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          {/* Roles Pie - 1 column */}
          <GlowCard className="p-3">
            <h4 className="text-sm font-semibold mb-2 text-center">{t.dashboard.rolesByPriority}</h4>
            {totalRoles > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rolePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={52}
                        dataKey="value"
                        stroke="none"
                      >
                        {rolePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-0.5">
                  {rolePieData.map(stat => (
                    <div key={stat.role} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span style={{ color: stat.color }}>{getRoleIcon(stat.role, "h-3 w-3")}</span>
                      <span className="text-xs">{stat.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {stat.value} ({Math.round((stat.value / totalRoles) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          {/* Class Distribution - 1 column */}
          <GlowCard className="p-3">
            <h3 className="text-sm font-semibold mb-2">{t.dashboard.classDistribution}</h3>
            <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1">
              {representedClasses.map((stat) => (
                <UITooltip key={stat.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-2 cursor-pointer group break-inside-avoid"
                      onMouseEnter={() => setHoveredClass(stat.id)}
                      onMouseLeave={() => setHoveredClass(null)}
                    >
                      <div 
                        className="w-20 text-xs font-medium truncate transition-all duration-200"
                        style={{ color: classColorMap[stat.color] || 'inherit' }}
                      >
                        {stat.name}
                      </div>
                      <div className="flex-1 h-3.5 bg-muted/30 rounded-full overflow-hidden relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(stat.total / maxClassTotal) * 100}%`,
                            backgroundColor: classColorMap[stat.color] || 'hsl(var(--primary))',
                            opacity: hoveredClass === stat.id ? 1 : 0.85,
                          }}
                        />
                      </div>
                      <div className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                        {stat.total}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8} className="max-w-[180px]">
                    <p className="font-semibold text-xs mb-1" style={{ color: classColorMap[stat.color] }}>
                      {stat.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {stat.players.slice(0, 6).map(p => (
                        <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {p}
                        </Badge>
                      ))}
                      {stat.players.length > 6 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{stat.players.length - 6}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </GlowCard>

          {/* Spec Popularity - 1 column */}
          <GlowCard className="p-3">
            <h3 className="text-sm font-semibold mb-2">{t.dashboard.topSpecs}</h3>
            {specStats.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1">
                {specStats.map((stat, index) => (
                  <div key={stat.id} className="flex items-center gap-1.5 group">
                    <div className="w-4 flex justify-center">
                      {getRankDisplay(index)}
                    </div>
                    <span style={{ color: classColorMap[stat.classColor] || 'inherit' }}>
                      {getRoleIcon(stat.role, "h-3 w-3")}
                    </span>
                    <span 
                      className="flex-1 text-xs font-medium truncate"
                      style={{ color: classColorMap[stat.classColor] || 'inherit' }}
                    >
                      {stat.specName}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{stat.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
            )}
          </GlowCard>
        </div>

        {/* Missing/All Classes Alert - Compact */}
        {missingClasses.length > 0 ? (
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-amber-500">{t.dashboard.missingClasses}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {missingClasses.map(stat => (
                  <Badge
                    key={stat.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ 
                      color: classColorMap[stat.color],
                      borderColor: classColorMap[stat.color],
                    }}
                  >
                    {stat.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-500">{t.dashboard.allClassesRepresented}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
