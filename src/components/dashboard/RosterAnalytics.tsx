import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  wowClasses,
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getSpecById,
  Role,
  RangeType,
} from '@/data/wowClasses';
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
import { supabase } from '@/integrations/supabase/client';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import {
  buildCompositionCoverage,
  type CompositionAbilityAnalyticsRow,
  type CompositionAbilityMappingAnalyticsRow,
  type CompositionCoverageStat,
} from '@/lib/compositionAnalytics';
import {
  buildMajorBuffsDebuffs,
  type CoverageSpellEntry,
  type RaidEffectAnalyticsRow,
  type RaidEffectStat,
  type WowSpellAnalyticsRow,
} from '@/lib/raidEffectAnalytics';
import {
  rangeColorValue,
  roleColorValue,
  tierTokenColorValue,
  tierTokenGradientValue,
  type TierTokenGroupId,
  wowClassColorValue,
} from '@/lib/design-tokens';

const resolveClassColor = (classToken: string): string =>
  wowClassColorValue(classToken.replace(/^class-/, ''));

// Role color mapping for distinctive visualization
const roleColorMap: Record<Role, string> = {
  tank: roleColorValue('tank'),
  healer: roleColorValue('healer'),
  dps: roleColorValue('dps'),
};

// Range color mapping
const rangeColorMap: Record<RangeType, string> = {
  melee: rangeColorValue('melee'),
  ranged: rangeColorValue('ranged'),
};

type TokenGroupId = TierTokenGroupId;

const tokenGroupConfig: { id: TokenGroupId; classIds: string[] }[] = [
  { id: 'dreadful', classIds: ['priest', 'mage', 'warlock'] },
  { id: 'mystic', classIds: ['rogue', 'monk', 'druid', 'demon-hunter'] },
  { id: 'venerated', classIds: ['hunter', 'shaman', 'evoker'] },
  { id: 'zenith', classIds: ['warrior', 'paladin', 'death-knight'] },
];

const tokenColorMap: Record<TokenGroupId, string> = {
  dreadful: tierTokenColorValue('dreadful'),
  mystic: tierTokenColorValue('mystic'),
  venerated: tierTokenColorValue('venerated'),
  zenith: tierTokenColorValue('zenith'),
};

const tokenTextColorMap: Record<TokenGroupId, string> = {
  dreadful: tierTokenColorValue('dreadful'),
  mystic: tierTokenColorValue('mystic'),
  venerated: tierTokenColorValue('venerated'),
  zenith: tierTokenColorValue('zenith'),
};

const tokenGradientMap: Record<TokenGroupId, string> = {
  dreadful: tierTokenGradientValue('dreadful'),
  mystic: tierTokenGradientValue('mystic'),
  venerated: tierTokenGradientValue('venerated'),
  zenith: tierTokenGradientValue('zenith'),
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

interface TokenStat {
  id: TokenGroupId;
  name: string;
  total: number;
  color: string;
  classes: { id: string; name: string; color: string }[];
}

type RaidEffectRow = RaidEffectAnalyticsRow;
type WowSpellRow = WowSpellAnalyticsRow;
type CompositionAbilityRow = CompositionAbilityAnalyticsRow;
type CompositionAbilityMappingRow = CompositionAbilityMappingAnalyticsRow;

type CommitmentFilter = 'all' | 'confirmed' | 'potential' | 'withdrawn';
type RosterDecisionFilter = 'all' | 'undecided' | 'selected' | 'bench' | 'not_selected';
type RoleFilter = 'all' | 'tank' | 'healer' | 'dps';
type RangeFilter = 'all' | 'melee' | 'ranged';
type ValidationFilter = 'all' | 'pending' | 'approved' | 'rejected';
type WishScopeFilter = 'first_approved' | '1' | '2' | '3' | '4' | '5' | '6' | '13';

export const RosterAnalytics = ({ members }: RosterAnalyticsProps) => {
  const { t, language } = useLanguage();
  const s = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const [wishScopeFilter, setWishScopeFilter] = useState<WishScopeFilter>('first_approved');
  const [wishScopeFilterTouched, setWishScopeFilterTouched] = useState(false);
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('confirmed');
  const [rosterDecisionFilter, setRosterDecisionFilter] = useState<RosterDecisionFilter>('selected');
  const [rosterDecisionFilterTouched, setRosterDecisionFilterTouched] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');
  const [validationFilterTouched, setValidationFilterTouched] = useState(false);
  const [raidEffects, setRaidEffects] = useState<RaidEffectRow[]>([]);
  const [compositionAbilities, setCompositionAbilities] = useState<CompositionAbilityRow[]>([]);
  const [compositionMappings, setCompositionMappings] = useState<CompositionAbilityMappingRow[]>([]);
  const [wowSpells, setWowSpells] = useState<WowSpellRow[]>([]);
  const tokenNames: Record<TokenGroupId, string> = {
    dreadful: `${t.dashboard.tokenDreadful} (${t.dashboard.tokenCloth})`,
    mystic: `${t.dashboard.tokenMystic} (${t.dashboard.tokenLeather})`,
    venerated: `${t.dashboard.tokenVenerated} (${t.dashboard.tokenMail})`,
    zenith: `${t.dashboard.tokenZenith} (${t.dashboard.tokenPlate})`,
  };

  useEffect(() => {
    let isActive = true;

    const fetchCompositionMetadata = async () => {
      const { data: effectsData, error: effectsError } = await supabase
        .from('raid_effects')
        .select('class_id, spec_id, category, spell_id, effect_key, sort_order')
        .eq('active', true)
        .in('category', ['major_buff', 'major_debuff'])
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('spell_id', { ascending: true });

      if (effectsError) {
        console.error('Failed to fetch raid_effects:', effectsError);
        if (isActive) {
          setRaidEffects([]);
          setCompositionAbilities([]);
          setCompositionMappings([]);
          setWowSpells([]);
        }
        return;
      }

      const effects = (effectsData || []) as RaidEffectRow[];
      let abilities: CompositionAbilityRow[] = [];
      let mappings: CompositionAbilityMappingRow[] = [];

      const { data: abilityData, error: abilityError } = await supabase
        .from('composition_abilities')
        .select('id, ability_key, coverage_key, ability_kind, spell_id, cooldown_profile, cooldown_seconds, active, sort_order')
        .eq('active', true)
        .in('ability_kind', ['raid_utility', 'raid_defensive', 'external'])
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('ability_key', { ascending: true });

      if (abilityError) {
        console.error('Failed to fetch composition_abilities:', abilityError);
      } else {
        abilities = (abilityData || []) as CompositionAbilityRow[];
      }

      const abilityIds = abilities.map(ability => ability.id);
      if (abilityIds.length > 0) {
        const { data: mappingData, error: mappingError } = await supabase
          .from('composition_ability_mappings')
          .select('ability_id, class_id, spec_id, role, applies_to_main, applies_to_offspec_alt')
          .in('ability_id', abilityIds);

        if (mappingError) {
          console.error('Failed to fetch composition_ability_mappings:', mappingError);
        } else {
          mappings = (mappingData || []) as CompositionAbilityMappingRow[];
        }
      }

      const spellIds = Array.from(new Set([
        ...effects.map(effect => effect.spell_id),
        ...abilities.map(ability => ability.spell_id).filter((spellId): spellId is number => Number.isInteger(spellId)),
      ]));
      let spells: WowSpellRow[] = [];

      if (spellIds.length > 0) {
        const { data: spellData, error: spellError } = await supabase
          .from('wow_spells')
          .select('spell_id, name_en, description_en, name_fr, description_fr, name_de, description_de, name_es, description_es, name_pt_br, description_pt_br, name_it, description_it, name_ru, description_ru, name_zh_tw, description_zh_tw, name_ko, description_ko')
          .in('spell_id', spellIds);

        if (spellError) {
          console.error('Failed to fetch wow_spells:', spellError);
        } else {
          spells = (spellData || []) as WowSpellRow[];
        }
      }

      if (isActive) {
        setRaidEffects(effects);
        setCompositionAbilities(abilities);
        setCompositionMappings(mappings);
        setWowSpells(spells);
      }
    };

    fetchCompositionMetadata();

    return () => {
      isActive = false;
    };
  }, []);

  const maxWishIndex = wishScopeFilter === 'first_approved' ? 13 : Number(wishScopeFilter);

  const getFirstApprovedWish = (member: MemberWish) =>
    (member.wishes || [])
      .filter(
        (wish) =>
          !!wish.class_id && (wish.validation_status || 'pending') === 'approved',
      )
      .sort((a, b) => a.choice_index - b.choice_index)[0] || null;

  const defaultAnalyticsFilters = useMemo(() => {
    const hasApprovedWishes = members.some(member => getFirstApprovedWish(member));
    const hasSelectedMembersWithApprovedWishes = members.some(
      (member) => (member.selectionStatus || 'undecided') === 'selected' && getFirstApprovedWish(member),
    );

    if (hasSelectedMembersWithApprovedWishes) {
      return {
        rosterDecision: 'selected' as RosterDecisionFilter,
        validation: 'approved' as ValidationFilter,
        wishScope: 'first_approved' as WishScopeFilter,
      };
    }

    if (hasApprovedWishes) {
      return {
        rosterDecision: 'all' as RosterDecisionFilter,
        validation: 'approved' as ValidationFilter,
        wishScope: 'first_approved' as WishScopeFilter,
      };
    }

    return {
      rosterDecision: 'all' as RosterDecisionFilter,
      validation: 'all' as ValidationFilter,
      wishScope: '1' as WishScopeFilter,
    };
  }, [members]);

  useEffect(() => {
    if (!wishScopeFilterTouched) {
      setWishScopeFilter(defaultAnalyticsFilters.wishScope);
    }
    if (!validationFilterTouched) {
      setValidationFilter(defaultAnalyticsFilters.validation);
    }
    if (!rosterDecisionFilterTouched) {
      setRosterDecisionFilter(defaultAnalyticsFilters.rosterDecision);
    }
  }, [
    defaultAnalyticsFilters,
    rosterDecisionFilterTouched,
    validationFilterTouched,
    wishScopeFilterTouched,
  ]);

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

    if (rosterDecisionFilter !== 'all') {
      filtered = filtered.filter((m) => (m.selectionStatus || 'undecided') === rosterDecisionFilter);
    }

    return filtered;
  }, [members, commitmentFilter, rosterDecisionFilter]);

  // Check if spec matches role and range filters
  const specMatchesFilters = (specId: string): boolean => {
    const spec = getSpecById(specId);
    if (!spec) return false;
    if (roleFilter !== 'all' && spec.role !== roleFilter) return false;
    if (rangeFilter !== 'all' && spec.range !== rangeFilter) return false;
    return true;
  };

  const wishMatchesFilters = (
    member: MemberWish,
    wish: MemberWish['wishes'][number],
  ): boolean => {
    if (!wish.class_id || wish.choice_index > maxWishIndex) return false;
    if (wishScopeFilter === 'first_approved') {
      const firstApprovedWish = getFirstApprovedWish(member);
      if (
        !firstApprovedWish ||
        firstApprovedWish.choice_index !== wish.choice_index ||
        firstApprovedWish.class_id !== wish.class_id
      ) {
        return false;
      }
    }
    const status = (wish.validation_status || 'pending') as ValidationFilter;
    if (validationFilter !== 'all' && status !== validationFilter) return false;
    if (!wish.spec_ids?.length) {
      return roleFilter === 'all' && rangeFilter === 'all';
    }
    if (roleFilter === 'all' && rangeFilter === 'all') return true;
    return wish.spec_ids.some(specId => specMatchesFilters(specId));
  };

  const filteredMemberCount = useMemo(() => {
    return filteredMembers.filter(member =>
      member.wishes.some(wish => wishMatchesFilters(member, wish))
    ).length;
  }, [filteredMembers, wishScopeFilter, maxWishIndex, roleFilter, rangeFilter, validationFilter]);

  const getFirstWishSpec = (wish: MemberWish['wishes'][number]) => {
    const specId = wish.spec_ids?.[0];
    if (!specId) return null;
    const spec = getSpecById(specId);
    if (!spec) return null;
    if (roleFilter !== 'all' && spec.role !== roleFilter) return null;
    if (rangeFilter !== 'all' && spec.range !== rangeFilter) return null;
    return spec;
  };

  // Calculate class distribution based on filter with player names
  const classStats = useMemo(() => {
    const stats: Record<string, { wish1: number; total: number; players: Set<string> }> = {};
    wowClasses.forEach(c => {
      stats[c.id] = { wish1: 0, total: 0, players: new Set() };
    });

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.class_id && stats[w.class_id] && wishMatchesFilters(m, w)) {
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
          name: wowClass ? getLocalizedClassName(wowClass.id, language) : id,
          color: wowClass?.color || 'class-warrior',
          wish1: data.wish1,
          total: data.total,
          players: Array.from(data.players),
        } as ClassStat;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredMembers, language, maxWishIndex, roleFilter, rangeFilter, validationFilter]);

  // Calculate max for bar scaling
  const maxClassTotal = useMemo(() => {
    return Math.max(...classStats.map(s => s.total), 1);
  }, [classStats]);

  const tokenStats = useMemo(() => {
    const classMap = new Map(classStats.map(stat => [stat.id, stat]));
    return tokenGroupConfig.map((group) => {
      const classes = group.classIds.map((classId) => {
        const wowClass = getClassById(classId);
        return {
          id: classId,
          name: wowClass ? getLocalizedClassName(wowClass.id, language) : classId,
          color: wowClass?.color || 'class-warrior',
        };
      });
      const total = group.classIds.reduce((sum, classId) => sum + (classMap.get(classId)?.total || 0), 0);
      return {
        id: group.id,
        name: tokenNames[group.id],
        total,
        color: tokenColorMap[group.id],
        classes,
      } as TokenStat;
    });
  }, [classStats, language, tokenNames]);

  const totalTokenWishes = tokenStats.reduce((sum, stat) => sum + stat.total, 0);
  const maxTokenTotal = Math.max(...tokenStats.map(stat => stat.total), 1);

  const majorBuffsDebuffs = useMemo(() => {
    return buildMajorBuffsDebuffs(
      filteredMembers,
      raidEffects,
      wowSpells,
      language,
      wishMatchesFilters,
    );
  }, [filteredMembers, raidEffects, wowSpells, language, validationFilter, maxWishIndex, roleFilter, rangeFilter]);

  const showBuffsDebuffs = majorBuffsDebuffs.buffs.length > 0 || majorBuffsDebuffs.debuffs.length > 0;
  const compositionCoverageLabels = useMemo(() => ({
    combat_res: t.dashboard.compositionCoverageLabels.combatResurrection,
    immunity: t.dashboard.compositionCoverageLabels.immunities,
    burst_move_speed: t.dashboard.compositionCoverageLabels.burstMoveSpeed,
    knock_up_back: t.dashboard.compositionCoverageLabels.knockUpBack,
    extra_damage_to_shields: t.dashboard.compositionCoverageLabels.extraDamageToShields,
    cheat_death: t.dashboard.compositionCoverageLabels.cheatDeath,
  }), [
    t.dashboard.compositionCoverageLabels.burstMoveSpeed,
    t.dashboard.compositionCoverageLabels.combatResurrection,
    t.dashboard.compositionCoverageLabels.cheatDeath,
    t.dashboard.compositionCoverageLabels.extraDamageToShields,
    t.dashboard.compositionCoverageLabels.immunities,
    t.dashboard.compositionCoverageLabels.knockUpBack,
  ]);
  const compositionCoverage = useMemo(() => {
    return buildCompositionCoverage(
      filteredMembers,
      compositionAbilities,
      compositionMappings,
      wowSpells,
      language,
      wishMatchesFilters,
      { coverageLabels: compositionCoverageLabels },
    );
  }, [
    filteredMembers,
    compositionAbilities,
    compositionMappings,
    wowSpells,
    language,
    compositionCoverageLabels,
    validationFilter,
    maxWishIndex,
    roleFilter,
    rangeFilter,
  ]);
  const showCompositionCoverage = compositionCoverage.length > 0;

  const renderClassProviderPill = (provider: CoverageSpellEntry['providers'][number]) => {
    const className = getLocalizedClassName(provider.classId, language);
    const specName = provider.specId ? getLocalizedSpecName(provider.specId, language) : null;
    const providerLabel = specName ?? className;
    const classColor = wowClassColorValue(provider.classId);

    return (
      <span
        key={`${provider.classId}-${provider.specId ?? 'all'}`}
        title={specName ? `${className} - ${specName}` : className}
        className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4 whitespace-nowrap ${
          provider.covered ? '' : 'border-border/70 bg-muted/30 text-muted-foreground opacity-80'
        }`}
        style={provider.covered
          ? {
              borderColor: classColor,
              backgroundColor: `color-mix(in srgb, ${classColor} 12%, transparent)`,
              color: classColor,
            }
          : undefined}
      >
        {providerLabel}
      </span>
    );
  };

  const renderCoverageSpellList = (spellEntries: CoverageSpellEntry[]) => (
    <ul className="space-y-1.5 text-xs">
      {spellEntries.map(entry => (
        <li
          key={`${entry.spellId}-${entry.name}`}
          className={`flex min-w-0 items-start justify-between gap-3 ${entry.covered ? '' : 'text-muted-foreground/85'}`}
        >
          <span className="min-w-0 break-words font-medium leading-5">{entry.name}</span>
          {entry.providers.length > 0 && (
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {entry.providers.map(renderClassProviderPill)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  const renderCoverageTooltipContent = (
    stat: RaidEffectStat | CompositionCoverageStat,
    spellNames: string[],
    spellEntries: CoverageSpellEntry[],
  ) => {
    if (spellEntries.length > 1) {
      return renderCoverageSpellList(spellEntries);
    }

    if (spellEntries.length === 1 && spellEntries[0].providers.length > 0) {
      return (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap justify-start gap-1">
            {spellEntries[0].providers.map(renderClassProviderPill)}
          </div>
          <p>{stat.description || stat.name}</p>
        </div>
      );
    }

    if (spellNames.length > 1) {
      return (
        <ul className="space-y-1 text-xs">
          {spellNames.map(spellName => (
            <li key={spellName}>{spellName}</li>
          ))}
        </ul>
      );
    }

    return <p className="text-xs">{stat.description || stat.name}</p>;
  };

  const renderCoverageList = (
    title: string,
    stats: (RaidEffectStat | CompositionCoverageStat)[],
    options: { columns?: 'single' | 'responsive' } = {},
  ) => {
    const covered = stats.filter(stat => stat.count > 0).length;
    const allCovered = stats.length > 0 && covered === stats.length;
    const coverageTone = allCovered
      ? 'border-status-success/30 bg-status-success/10 text-status-success'
      : covered > 0
        ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
        : 'border-status-error/25 bg-status-error/10 text-status-error';
    const listLayoutClass = options.columns === 'responsive'
      ? 'grid grid-cols-1 gap-1 xl:grid-cols-2'
      : 'space-y-1';

    return (
      <div className="min-w-0 space-y-2">
        <div className="flex min-h-6 items-center gap-2">
          <h5 className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
            {title}
          </h5>
          {stats.length > 0 && (
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${coverageTone}`}>
              {covered}/{stats.length}
            </span>
          )}
        </div>
        {stats.length > 0 ? (
          <div className={listLayoutClass}>
            {stats.map(stat => {
              const isCovered = stat.count > 0;
              const statKey = 'coverageKey' in stat ? stat.coverageKey : stat.spellId;
              const spellNames = 'spellNames' in stat ? stat.spellNames : [];
              const spellEntries = 'spellEntries' in stat ? stat.spellEntries : [];
              return (
                <UITooltip key={statKey} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div
                      className={`group flex min-h-8 items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        isCovered
                          ? 'border-status-success/20 bg-status-success/5 hover:bg-status-success/10'
                          : 'border-border/50 bg-muted/10 hover:border-status-error/30 hover:bg-status-error/5'
                      }`}
                    >
                      {isCovered ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-error/80" />
                      )}
                      <span
                        className={`flex h-5 min-w-7 shrink-0 items-center justify-center rounded border px-1.5 text-[11px] font-semibold tabular-nums ${
                          isCovered
                            ? 'border-status-success/30 bg-status-success/10 text-status-success'
                            : 'border-status-error/25 bg-status-error/10 text-status-error'
                        }`}
                      >
                        {stat.count}
                      </span>
                      <span className={`min-w-0 flex-1 truncate font-medium ${isCovered ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {stat.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6} className="max-w-[260px]">
                    {renderCoverageTooltipContent(stat, spellNames, spellEntries)}
                  </TooltipContent>
                </UITooltip>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
        )}
      </div>
    );
  };

  // Calculate spec distribution (all specs) based on filter
  const specStats = useMemo(() => {
    const stats: Record<string, number> = {};

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && wishMatchesFilters(m, w)) {
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
          specName: spec ? getLocalizedSpecName(spec.id, language) : id,
          className: wowClass ? getLocalizedClassName(wowClass.id, language) : '',
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
  }, [filteredMembers, language, maxWishIndex, roleFilter, rangeFilter, validationFilter]);

  // Calculate roles by priority based on filter
  const rolesByPriority = useMemo(() => {
    const stats: Record<Role, { wish1: number; other: number }> = {
      tank: { wish1: 0, other: 0 },
      healer: { wish1: 0, other: 0 },
      dps: { wish1: 0, other: 0 },
    };

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (!wishMatchesFilters(m, w)) return;
        const spec = getFirstWishSpec(w);
        if (!spec) return;
        if (w.choice_index === 1) {
          stats[spec.role].wish1++;
        } else {
          stats[spec.role].other++;
        }
      });
    });

    return [
      { role: 'tank' as Role, ...stats.tank },
      { role: 'healer' as Role, ...stats.healer },
      { role: 'dps' as Role, ...stats.dps },
    ] as RoleByPriority[];
  }, [filteredMembers, maxWishIndex, roleFilter, rangeFilter, validationFilter]);

  // Calculate range distribution based on filter
  const rangeStats = useMemo(() => {
    const stats = { melee: 0, ranged: 0 };

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (!wishMatchesFilters(m, w)) return;
        const spec = getFirstWishSpec(w);
        if (!spec) return;
        stats[spec.range]++;
      });
    });

    return stats;
  }, [filteredMembers, maxWishIndex, roleFilter, rangeFilter, validationFilter]);

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
    const colors = ['text-warning', 'text-slate-300', 'text-warning'];
    const colorClass = index < 3 ? colors[index] : 'text-muted-foreground';
    return <span className={`text-xs font-bold ${colorClass}`}>{rank}</span>;
  };

  // Generate wish range label for selector
  const getWishRangeLabel = (value: WishScopeFilter) => {
    if (value === 'first_approved') return t.dashboard.firstApprovedWish;
    const n = Number(value);
    if (n === 1) return t.dashboard.wishRange1;
    if (n === 13) return t.dashboard.allWishes;
    return interpolateMessage(s('dashboard.roster_analytics.wish_range'), { n });
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

          <Select
            value={wishScopeFilter}
            onValueChange={(v) => {
              setWishScopeFilterTouched(true);
              setWishScopeFilter(v as WishScopeFilter);
            }}
          >
            <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
              <SelectValue>{getWishRangeLabel(wishScopeFilter)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_approved" className="text-xs">{getWishRangeLabel('first_approved')}</SelectItem>
              <SelectItem value="1" className="text-xs">{getWishRangeLabel('1')}</SelectItem>
              {[2, 3, 4, 5, 6].map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {getWishRangeLabel(String(n) as WishScopeFilter)}
                </SelectItem>
              ))}
              <SelectItem value="13" className="text-xs">{getWishRangeLabel('13')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={validationFilter}
            onValueChange={(v) => {
              setValidationFilterTouched(true);
              setValidationFilter(v as ValidationFilter);
            }}
          >
            <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
              <SelectValue>
                {validationFilter === 'all' ? t.dashboard.allValidations :
                 validationFilter === 'approved' ? t.wishes.validation.approved :
                 validationFilter === 'rejected' ? t.wishes.validation.rejected :
                 t.wishes.validation.pending}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t.dashboard.allValidations}</SelectItem>
              <SelectItem value="pending" className="text-xs">{t.wishes.validation.pending}</SelectItem>
              <SelectItem value="approved" className="text-xs">{t.wishes.validation.approved}</SelectItem>
              <SelectItem value="rejected" className="text-xs">{t.wishes.validation.rejected}</SelectItem>
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

          <Select
            value={rosterDecisionFilter}
            onValueChange={(v) => {
              setRosterDecisionFilterTouched(true);
              setRosterDecisionFilter(v as RosterDecisionFilter);
            }}
          >
            <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
              <SelectValue>
                {rosterDecisionFilter === 'all' ? `${t.common.all} ${t.wishes.rosterDecision.title}` :
                 rosterDecisionFilter === 'selected' ? t.wishes.rosterDecision.selected :
                 rosterDecisionFilter === 'bench' ? t.wishes.rosterDecision.bench :
                 rosterDecisionFilter === 'not_selected' ? t.wishes.rosterDecision.notSelected :
                 t.wishes.rosterDecision.undecided}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t.common.all}</SelectItem>
              <SelectItem value="selected" className="text-xs">{t.wishes.rosterDecision.selected}</SelectItem>
              <SelectItem value="bench" className="text-xs">{t.wishes.rosterDecision.bench}</SelectItem>
              <SelectItem value="not_selected" className="text-xs">{t.wishes.rosterDecision.notSelected}</SelectItem>
              <SelectItem value="undecided" className="text-xs">{t.wishes.rosterDecision.undecided}</SelectItem>
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
              <span className="text-xs font-medium">{filteredMemberCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
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

        {/* Summary Grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <GlowCard surface="section" className="p-3 xl:col-span-2">
            <h4 className="text-sm font-medium mb-2">{t.dashboard.range}</h4>
            {totalRange > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rangePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={44}
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

          <GlowCard surface="section" className="p-3 xl:col-span-2">
            <h4 className="text-sm font-medium mb-2">{t.dashboard.rolesByPriority}</h4>
            {totalRoles > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rolePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={44}
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

          <GlowCard surface="section" className="p-3 xl:col-span-4">
            <h4 className="text-sm font-medium mb-2">{t.dashboard.classDistribution}</h4>
            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1">
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
                        style={{ color: resolveClassColor(stat.color) }}
                      >
                        {stat.name}
                      </div>
                      <div className="flex-1 h-3.5 bg-muted/30 rounded-full overflow-hidden relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(stat.total / maxClassTotal) * 100}%`,
                            backgroundColor: resolveClassColor(stat.color),
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
                    <p className="font-semibold text-xs mb-1" style={{ color: resolveClassColor(stat.color) }}>
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

          <GlowCard surface="section" className="p-3 xl:col-span-4">
            <h4 className="text-sm font-medium mb-2">{t.dashboard.topSpecs}</h4>
            {specStats.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1">
                {specStats.map((stat, index) => (
                  <div key={stat.id} className="flex items-center gap-1.5 group">
                    <div className="w-4 flex justify-center">
                      {getRankDisplay(index)}
                    </div>
                    <span style={{ color: resolveClassColor(stat.classColor) }}>
                      {getRoleIcon(stat.role, "h-3 w-3")}
                    </span>
                    <span 
                      className="flex-1 text-xs font-medium truncate"
                      style={{ color: resolveClassColor(stat.classColor) }}
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

        {/* Composition Grid */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <GlowCard surface="section" className={`p-3 ${showBuffsDebuffs ? 'xl:col-span-4' : 'xl:col-span-12'}`}>
            <h4 className="text-sm font-medium mb-2">{t.dashboard.tokenDistribution}</h4>
            <p className="text-[11px] text-muted-foreground mb-2">
              {t.dashboard.tokenDistributionInfo}{' '}
              <a
                href="https://www.wowhead.com/news/new-tier-set-token-groups-datamined-in-midnight-379062"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t.dashboard.tokenDistributionSource}
              </a>
            </p>
            {totalTokenWishes > 0 ? (
              <div className="space-y-2">
                {tokenStats.map(stat => (
                  <div key={stat.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: tokenTextColorMap[stat.id] }}>
                        {stat.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {stat.total} ({Math.round((stat.total / totalTokenWishes) * 100)}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${(stat.total / maxTokenTotal) * 100}%`,
                          backgroundImage: tokenGradientMap[stat.id],
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stat.classes.map(cls => (
                        <Badge
                          key={cls.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            color: resolveClassColor(cls.color),
                            borderColor: resolveClassColor(cls.color),
                          }}
                        >
                          {cls.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          {showBuffsDebuffs && (
            <GlowCard surface="section" className="p-3 xl:col-span-8">
              <h4 className="text-sm font-medium mb-2">{t.dashboard.majorBuffsDebuffs}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderCoverageList(t.dashboard.majorBuffs, majorBuffsDebuffs.buffs)}
                {renderCoverageList(t.dashboard.majorDebuffs, majorBuffsDebuffs.debuffs)}
              </div>
            </GlowCard>
          )}
        </div>

        {showCompositionCoverage && (
          <GlowCard surface="section" className="p-3">
            {renderCoverageList(t.dashboard.utilityDefensiveCoverage, compositionCoverage, { columns: 'responsive' })}
          </GlowCard>
        )}

        {/* Missing/All Classes Alert - Compact */}
        {missingClasses.length > 0 ? (
          <div className="flex items-start gap-2 p-2.5 bg-status-warning/10 border border-status-warning/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-status-warning">{t.dashboard.missingClasses}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {missingClasses.map(stat => (
                  <Badge
                    key={stat.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ 
                      color: resolveClassColor(stat.color),
                      borderColor: resolveClassColor(stat.color),
                    }}
                  >
                    {stat.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-status-success/10 border border-status-success/30 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-status-success" />
            <span className="text-xs text-status-success">{t.dashboard.allClassesRepresented}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};


