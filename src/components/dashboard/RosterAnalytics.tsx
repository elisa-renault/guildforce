import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role, RangeType } from '@/data/wowClasses';
import { MemberWish } from '@/types/guild';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Sword, Swords, Crosshair, AlertTriangle, TrendingUp, Users, Filter, Medal, Award, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  tank: 'hsl(210, 70%, 50%)',    // Blue
  healer: 'hsl(142, 70%, 45%)',  // Green
  dps: 'hsl(0, 70%, 55%)',       // Red
};

// Range color mapping
const rangeColorMap: Record<RangeType, string> = {
  melee: 'hsl(210, 70%, 55%)',   // Blue
  ranged: 'hsl(280, 70%, 55%)',  // Purple
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

export const RosterAnalytics = ({ members }: RosterAnalyticsProps) => {
  const { t, language } = useLanguage();
  const [maxWishIndex, setMaxWishIndex] = useState<number>(13);
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  // Calculate class distribution based on filter with player names
  const classStats = useMemo(() => {
    const stats: Record<string, { wish1: number; total: number; players: Set<string> }> = {};
    wowClasses.forEach(c => {
      stats[c.id] = { wish1: 0, total: 0, players: new Set() };
    });

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.class_id && stats[w.class_id] && w.choice_index <= maxWishIndex) {
          stats[w.class_id].total++;
          stats[w.class_id].players.add(m.username);
          if (w.choice_index === 1) {
            stats[w.class_id].wish1++;
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
  }, [members, language, maxWishIndex]);

  // Calculate max for bar scaling
  const maxClassTotal = useMemo(() => {
    return Math.max(...classStats.map(s => s.total), 1);
  }, [classStats]);

  // Calculate spec distribution (top 10) based on filter
  const specStats = useMemo(() => {
    const stats: Record<string, number> = {};

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            stats[specId] = (stats[specId] || 0) + 1;
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Set maxCount for progress bar scaling
    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(s => ({ ...s, maxCount }));
  }, [members, language, maxWishIndex]);

  // Calculate roles by priority based on filter
  const rolesByPriority = useMemo(() => {
    const stats: Record<Role, { wish1: number; other: number }> = {
      tank: { wish1: 0, other: 0 },
      healer: { wish1: 0, other: 0 },
      dps: { wish1: 0, other: 0 },
    };

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            const spec = getSpecById(specId);
            if (spec) {
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
  }, [members, maxWishIndex]);

  // Calculate range distribution based on filter
  const rangeStats = useMemo(() => {
    const stats = { melee: 0, ranged: 0 };

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && w.choice_index <= maxWishIndex) {
          w.spec_ids.forEach(specId => {
            const spec = getSpecById(specId);
            if (spec) {
              stats[spec.range]++;
            }
          });
        }
      });
    });

    return stats;
  }, [members, maxWishIndex]);

  // Missing classes (no one has this class in any wish)
  const missingClasses = useMemo(() => {
    return classStats.filter(s => s.total === 0);
  }, [classStats]);

  // Classes with at least one wish (any priority)
  const representedClasses = useMemo(() => {
    return classStats.filter(s => s.total > 0);
  }, [classStats]);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'tank':
        return <Shield className="h-4 w-4" />;
      case 'healer':
        return <Heart className="h-4 w-4" />;
      case 'dps':
        return <Sword className="h-4 w-4" />;
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

  // Medal icon for top 3
  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-amber-400 fill-amber-400/20" />;
      case 1:
        return <Medal className="h-4 w-4 text-slate-300" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  // Generate wish range label for selector
  const getWishRangeLabel = (n: number) => {
    if (n === 1) return t.dashboard.wishRange1;
    if (n === 13) return t.dashboard.allWishes;
    return language === 'fr' ? `Vœux 1-${n}` : `Wishes 1-${n}`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Wish range filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>{t.dashboard.wishRangeFilter}</span>
          </div>
          <Select value={String(maxWishIndex)} onValueChange={(v) => setMaxWishIndex(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>{getWishRangeLabel(maxWishIndex)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{getWishRangeLabel(1)}</SelectItem>
              {[2, 3, 4, 5, 6].map(n => (
                <SelectItem key={n} value={String(n)}>
                  {getWishRangeLabel(n)}
                </SelectItem>
              ))}
              <SelectItem value="13">{getWishRangeLabel(13)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.totalPlayers}</p>
              </div>
            </div>
          </GlowCard>
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{representedClasses.length}/{wowClasses.length}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.classesCount}</p>
              </div>
            </div>
          </GlowCard>
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Swords className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rangeStats.melee}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.melee}</p>
              </div>
            </div>
          </GlowCard>
          <GlowCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Crosshair className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rangeStats.ranged}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.ranged}</p>
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Class Distribution with hover tooltips */}
          <GlowCard className="p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4">{t.dashboard.classDistribution}</h3>
            <div className="space-y-2.5">
              {representedClasses.map((stat, index) => (
                <UITooltip key={stat.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-3 cursor-pointer group"
                      onMouseEnter={() => setHoveredClass(stat.id)}
                      onMouseLeave={() => setHoveredClass(null)}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div 
                        className="w-28 text-sm font-medium truncate transition-all duration-200 group-hover:scale-105"
                        style={{ color: classColorMap[stat.color] || 'inherit' }}
                      >
                        {stat.name}
                      </div>
                      <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${(stat.total / maxClassTotal) * 100}%`,
                            backgroundColor: classColorMap[stat.color] || 'hsl(var(--primary))',
                            opacity: hoveredClass === stat.id ? 1 : 0.85,
                            boxShadow: hoveredClass === stat.id 
                              ? `0 0 12px ${classColorMap[stat.color] || 'hsl(var(--primary))'}` 
                              : 'none'
                          }}
                        />
                      </div>
                      <div className="w-10 text-right text-sm text-muted-foreground tabular-nums group-hover:text-foreground transition-colors">
                        {stat.total}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="start"
                    sideOffset={8}
                    avoidCollisions={true}
                    className="max-w-xs z-50"
                  >
                    <p className="font-semibold mb-1" style={{ color: classColorMap[stat.color] }}>
                      {stat.name}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {stat.players.length} {language === 'fr' ? 'joueur(s)' : 'player(s)'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {stat.players.slice(0, 8).map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                      {stat.players.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{stat.players.length - 8}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </GlowCard>

          {/* Top Specs with medals and progress bars */}
          <GlowCard className="p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4">{t.dashboard.topSpecs}</h3>
            {specStats.length > 0 ? (
              <div className="space-y-2">
                {specStats.map((stat, index) => (
                  <div 
                    key={stat.id} 
                    className="flex items-center gap-2 group relative"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Progress bar background */}
                    <div 
                      className="absolute inset-0 rounded-md opacity-10 transition-opacity group-hover:opacity-20"
                      style={{ 
                        background: `linear-gradient(90deg, ${classColorMap[stat.classColor]} 0%, transparent ${(stat.count / stat.maxCount) * 100}%)`
                      }}
                    />
                    
                    {/* Medal or rank number */}
                    <div className="w-6 flex justify-center z-10">
                      {index < 3 ? (
                        getMedalIcon(index)
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}.</span>
                      )}
                    </div>
                    
                    {/* Role icon */}
                    <span 
                      className="z-10 transition-transform group-hover:scale-110"
                      style={{ color: classColorMap[stat.classColor] || 'inherit' }}
                    >
                      {getRoleIcon(stat.role)}
                    </span>
                    
                    {/* Spec name */}
                    <span 
                      className="flex-1 text-sm font-medium z-10 transition-colors group-hover:brightness-125"
                      style={{ color: classColorMap[stat.classColor] || 'inherit' }}
                    >
                      {stat.specName}
                    </span>
                    
                    {/* Count badge */}
                    <Badge 
                      variant="outline" 
                      className="text-xs z-10 transition-all group-hover:bg-card"
                    >
                      {stat.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          {/* Roles by Priority - PieChart */}
          <GlowCard className="p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4">{t.dashboard.rolesByPriority}</h3>
            {(() => {
              const pieData = rolesByPriority.map(stat => ({
                name: getRoleName(stat.role),
                value: stat.wish1 + stat.other,
                role: stat.role,
                color: roleColorMap[stat.role],
              })).filter(d => d.value > 0);

              const totalRoles = pieData.reduce((sum, d) => sum + d.value, 0);

              if (totalRoles === 0) {
                return <p className="text-sm text-muted-foreground">{t.dashboard.noData}</p>;
              }

              return (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                        {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke="none"
                              className="transition-all duration-200 hover:opacity-80"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [value, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {pieData.map(stat => (
                      <div key={stat.role} className="flex items-center gap-2 group cursor-default">
                        <div 
                          className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm transition-transform group-hover:scale-105">{getRoleIcon(stat.role)}</span>
                        <span className="text-sm font-medium">{stat.name}</span>
                        <span className="text-sm text-muted-foreground ml-auto">
                          {stat.value} ({Math.round((stat.value / totalRoles) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </GlowCard>

          {/* Range Distribution - PieChart */}
          <GlowCard className="p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Swords className="h-5 w-5 text-blue-500" />
              <span className="mx-1">/</span>
              <Crosshair className="h-5 w-5 text-purple-500" />
              <span className="ml-2">{t.dashboard.melee} / {t.dashboard.ranged}</span>
            </h3>
            {(() => {
              const total = rangeStats.melee + rangeStats.ranged;
              
              if (total === 0) {
                return <p className="text-sm text-muted-foreground">{t.dashboard.noData}</p>;
              }

              const pieData = [
                { name: t.dashboard.melee, value: rangeStats.melee, color: rangeColorMap.melee, icon: <Swords className="h-4 w-4" /> },
                { name: t.dashboard.ranged, value: rangeStats.ranged, color: rangeColorMap.ranged, icon: <Crosshair className="h-4 w-4" /> },
              ].filter(d => d.value > 0);

              return (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={200}
                          animationDuration={800}
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke="none"
                              className="transition-all duration-200 hover:opacity-80"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [value, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3">
                    {pieData.map(stat => (
                      <div key={stat.name} className="flex items-center gap-2 group cursor-default">
                        <div 
                          className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm transition-transform group-hover:scale-105" style={{ color: stat.color }}>
                          {stat.icon}
                        </span>
                        <span className="text-sm font-medium">{stat.name}</span>
                        <span className="text-sm text-muted-foreground ml-auto">
                          {stat.value} ({Math.round((stat.value / total) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </GlowCard>
        </div>

        {/* Missing Classes - Full width for emphasis */}
        {missingClasses.length > 0 && (
          <GlowCard className="p-4 md:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
              {t.dashboard.missingClasses}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({missingClasses.length})
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingClasses.map((stat, index) => {
                const color = classColorMap[stat.color] || 'inherit';
                return (
                  <Badge
                    key={stat.id}
                    variant="outline"
                    className="transition-all hover:scale-105 cursor-default"
                    style={{ 
                      color,
                      borderColor: color !== 'inherit' ? color : undefined,
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {stat.name}
                  </Badge>
                );
              })}
            </div>
          </GlowCard>
        )}

        {missingClasses.length === 0 && (
          <GlowCard className="p-4 md:p-6">
            <p className="text-sm text-green-500 flex items-center gap-2">
              ✓ {t.dashboard.allClassesRepresented}
            </p>
          </GlowCard>
        )}
      </div>
    </TooltipProvider>
  );
};
