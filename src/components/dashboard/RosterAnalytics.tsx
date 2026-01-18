import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role, RangeType } from '@/data/wowClasses';
import { MemberWish } from '@/types/guild';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Sword, Swords, Crosshair, AlertTriangle, TrendingUp, Users } from 'lucide-react';

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

  // Calculate class distribution
  const classStats = useMemo(() => {
    const stats: Record<string, { wish1: number; total: number }> = {};
    wowClasses.forEach(c => {
      stats[c.id] = { wish1: 0, total: 0 };
    });

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.class_id && stats[w.class_id]) {
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
  }, [members, language]);

  // Calculate max for bar scaling
  const maxClassTotal = useMemo(() => {
    return Math.max(...classStats.map(s => s.total), 1);
  }, [classStats]);

  // Calculate spec distribution (top 10)
  const specStats = useMemo(() => {
    const stats: Record<string, number> = {};

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length) {
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
  }, [members, language]);

  // Calculate roles by priority
  const rolesByPriority = useMemo(() => {
    const stats: Record<Role, { wish1: number; other: number }> = {
      tank: { wish1: 0, other: 0 },
      healer: { wish1: 0, other: 0 },
      dps: { wish1: 0, other: 0 },
    };

    members.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length) {
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
  }, [members]);

  // Calculate range distribution
  const rangeStats = useMemo(() => {
    const stats = { melee: 0, ranged: 0 };

    members.forEach(m => {
      const wish1 = m.wishes.find(w => w.choice_index === 1);
      if (wish1?.spec_ids?.length) {
        const spec = getSpecById(wish1.spec_ids[0]);
        if (spec) {
          stats[spec.range]++;
        }
      }
    });

    return stats;
  }, [members]);

  // Missing classes
  const missingClasses = useMemo(() => {
    return classStats.filter(s => s.total === 0);
  }, [classStats]);

  // Classes with at least one wish
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

  return (
    <div className="space-y-6">
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
                <div className={`w-28 text-sm font-medium text-${stat.color} truncate`}>
                  {stat.name}
                </div>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                  {/* Total bar (semi-transparent) */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-${stat.color}/30 transition-all duration-300`}
                    style={{ width: `${(stat.total / maxClassTotal) * 100}%` }}
                  />
                  {/* Wish 1 bar (opaque) */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-${stat.color} transition-all duration-300`}
                    style={{ width: `${(stat.wish1 / maxClassTotal) * 100}%` }}
                  />
                </div>
                <div className="w-14 text-right text-sm text-muted-foreground tabular-nums">
                  {stat.wish1} / {stat.total}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary" />
              {t.dashboard.wish1}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary/30" />
              {t.dashboard.otherWishes}
            </span>
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
                  <span className={`text-${stat.classColor}`}>{getRoleIcon(stat.role)}</span>
                  <span className={`flex-1 text-sm font-medium text-${stat.classColor}`}>
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
          <div className="space-y-4">
            {rolesByPriority.map(stat => (
              <div key={stat.role} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(stat.role)}
                    <span className="text-sm font-medium">{getRoleName(stat.role)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stat.wish1} + {stat.other}
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
                  <div
                    className="bg-primary transition-all duration-300"
                    style={{ width: `${(stat.wish1 / (stat.wish1 + stat.other || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-primary/40 transition-all duration-300"
                    style={{ width: `${(stat.other / (stat.wish1 + stat.other || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary" />
              {t.dashboard.wish1}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary/40" />
              {t.dashboard.otherWishes}
            </span>
          </div>
        </GlowCard>

        {/* Missing Classes */}
        <GlowCard className="p-4 md:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t.dashboard.missingClasses}
          </h3>
          {missingClasses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingClasses.map(stat => (
                <Badge
                  key={stat.id}
                  variant="outline"
                  className={`text-${stat.color} border-${stat.color}/30`}
                >
                  {stat.name}
                </Badge>
              ))}
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
