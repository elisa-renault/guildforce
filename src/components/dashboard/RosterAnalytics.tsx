import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role, RangeType } from '@/data/wowClasses';
import { MemberWish } from '@/types/guild';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Sword, Swords, Crosshair, AlertTriangle, TrendingUp, Users, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface RosterAnalyticsProps {
  members: MemberWish[];
}

interface ClassStat {
  id: string;
  name: string;
  color: string;
  wish1: number;
  total: number;
}

interface SpecStat {
  id: string;
  specName: string;
  className: string;
  classColor: string;
  role: Role;
  range: RangeType;
  count: number;
}

interface RoleByPriority {
  role: Role;
  wish1: number;
  other: number;
}

export const RosterAnalytics = ({ members }: RosterAnalyticsProps) => {
  const { t, language } = useLanguage();
  const [maxWishIndex, setMaxWishIndex] = useState<number>(13);

  // Calculate class distribution based on filter
  const classStats = useMemo(() => {
    const stats: Record<string, { wish1: number; total: number }> = {};
    wowClasses.forEach(c => {
      stats[c.id] = { wish1: 0, total: 0 };
    });

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.class_id && stats[w.class_id] && w.choice_index <= maxWishIndex) {
          stats[w.class_id].total++;
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

    return Object.entries(stats)
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
        } as SpecStat;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
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

  // Generate wish range label for selector

  // Generate wish range label for selector
  const getWishRangeLabel = (n: number) => {
    if (n === 1) return t.dashboard.wishRange1;
    if (n === 13) return t.dashboard.allWishes;
    return language === 'fr' ? `Vœux 1-${n}` : `Wishes 1-${n}`;
  };

  return (
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
        {/* Class Distribution */}
        <GlowCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4">{t.dashboard.classDistribution}</h3>
          <div className="space-y-2.5">
            {representedClasses.map(stat => (
              <div key={stat.id} className="flex items-center gap-3">
                <div 
                  className="w-28 text-sm font-medium truncate"
                  style={{ color: classColorMap[stat.color] || 'inherit' }}
                >
                  {stat.name}
                </div>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${(stat.total / maxClassTotal) * 100}%`,
                      backgroundColor: classColorMap[stat.color] || 'hsl(var(--primary))'
                    }}
                  />
                </div>
                <div className="w-10 text-right text-sm text-muted-foreground tabular-nums">
                  {stat.total}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Top Specs */}
        <GlowCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4">{t.dashboard.topSpecs}</h3>
          {specStats.length > 0 ? (
            <div className="space-y-2">
              {specStats.map((stat, index) => (
                <div key={stat.id} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-muted-foreground">{index + 1}.</span>
                  <span style={{ color: classColorMap[stat.classColor] || 'inherit' }}>
                    {getRoleIcon(stat.role)}
                  </span>
                  <span 
                    className="flex-1 text-sm font-medium"
                    style={{ color: classColorMap[stat.classColor] || 'inherit' }}
                  >
                    {stat.specName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {stat.count}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.dashboard.noData}</p>
          )}
        </GlowCard>

        {/* Roles by Priority */}
        <GlowCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4">{t.dashboard.rolesByPriority}</h3>
          {(() => {
            const maxRoleTotal = Math.max(...rolesByPriority.map(s => s.wish1 + s.other), 1);
            return (
              <div className="space-y-4">
                {rolesByPriority.map(stat => {
                  const total = stat.wish1 + stat.other;
                  return (
                    <div key={stat.role} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(stat.role)}
                          <span className="text-sm font-medium">{getRoleName(stat.role)}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {total}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted/30">
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{ 
                            width: `${(total / maxRoleTotal) * 100}%`,
                            backgroundColor: roleColorMap[stat.role]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </GlowCard>

        {/* Missing Classes */}
        <GlowCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t.dashboard.missingClasses}
          </h3>
          {missingClasses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingClasses.map(stat => {
                const color = classColorMap[stat.color] || 'inherit';
                return (
                  <Badge
                    key={stat.id}
                    variant="outline"
                    style={{ 
                      color,
                      borderColor: color !== 'inherit' ? color : undefined,
                      opacity: 0.9
                    }}
                  >
                    {stat.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-green-500 flex items-center gap-2">
              ✓ {t.dashboard.allClassesRepresented}
            </p>
          )}
        </GlowCard>
      </div>
    </div>
  );
};
