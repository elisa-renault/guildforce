import { Shield, Heart, Sword, Swords, Crosshair, AlertTriangle, Users, Filter, CheckCircle2, Clock, XCircle, UserCheck, UserMinus, UserX, Armchair, Hash, Check, ChevronDown, Target, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar, activeFilterControlClassName, filterControlClassName } from '@/components/ui/filter-controls';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCompositionCoverage,
  buildCompositionCoverageSections,
  type CompositionAbilityAnalyticsRow,
  type CompositionAbilityMappingAnalyticsRow,
  type CompositionCoverageStat,
} from '@/lib/compositionAnalytics';
import {
  commitmentTextClass,
  rangeColorValue,
  roleColorValue,
  tierTokenColorValue,
  tierTokenGradientValue,
  type TierTokenGroupId,
  wowClassColorValue,
} from '@/lib/design-tokens';
import {
  buildMajorBuffsDebuffs,
  type CoverageSpellEntry,
  type RaidEffectAnalyticsRow,
  type RaidEffectStat,
  type WowSpellAnalyticsRow,
} from '@/lib/raidEffectAnalytics';
import {
  getTokenRiskSummary,
  sortCoverageMissingFirst,
} from '@/lib/rosterAnalyticsQuickWins';
import { cn } from '@/lib/utils';
import { MemberWish } from '@/types/guild';

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
  melee: 'hsl(var(--status-warning))',
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

const topRaidEssentialKeys = new Set(['bloodlust', 'combat_res']);
const topRaidEssentialColor = 'hsl(var(--status-warning))';

export interface RosterAnalyticsMetadata {
  raidEffects: RaidEffectRow[];
  compositionAbilities: CompositionAbilityRow[];
  compositionMappings: CompositionAbilityMappingRow[];
  wowSpells: WowSpellRow[];
}

interface RosterAnalyticsProps {
  members: MemberWish[];
  rosterMembers?: Array<{ id: string; name: string }>;
  rosterMemberFilters?: string[] | null;
  onRosterMemberFiltersChange?: (memberIds: string[] | null) => void;
  metadata?: RosterAnalyticsMetadata;
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
  players: string[];
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
  players: string[];
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
type SpecScopeFilter = 'primary' | 'all';
type AnalyticsFilterIcon = typeof Filter;
type AnalyticsFilterOption<Value extends string> = {
  value: Value;
  label: string;
  icon: AnalyticsFilterIcon;
  colorClass: string;
  labelColorClass?: string;
};

export const RosterAnalytics = ({
  members,
  rosterMembers = [],
  rosterMemberFilters = null,
  onRosterMemberFiltersChange,
  metadata,
}: RosterAnalyticsProps) => {
  const { t, language } = useLanguage();
  const s = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const [wishScopeFilter, setWishScopeFilter] = useState<WishScopeFilter>('first_approved');
  const [wishScopeFilterTouched, setWishScopeFilterTouched] = useState(false);
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);
  const [hoveredRangeKey, setHoveredRangeKey] = useState<RangeType | null>(null);
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('confirmed');
  const [rosterDecisionFilter, setRosterDecisionFilter] = useState<RosterDecisionFilter>('selected');
  const [rosterDecisionFilterTouched, setRosterDecisionFilterTouched] = useState(false);
  const [specScopeFilter, setSpecScopeFilter] = useState<SpecScopeFilter>('primary');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');
  const [validationFilterTouched, setValidationFilterTouched] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [wishesOpen, setWishesOpen] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [raidEffects, setRaidEffects] = useState<RaidEffectRow[]>(metadata?.raidEffects ?? []);
  const [compositionAbilities, setCompositionAbilities] = useState<CompositionAbilityRow[]>(metadata?.compositionAbilities ?? []);
  const [compositionMappings, setCompositionMappings] = useState<CompositionAbilityMappingRow[]>(metadata?.compositionMappings ?? []);
  const [wowSpells, setWowSpells] = useState<WowSpellRow[]>(metadata?.wowSpells ?? []);
  const tokenNames: Record<TokenGroupId, string> = {
    dreadful: t.dashboard.tokenCloth,
    mystic: t.dashboard.tokenLeather,
    venerated: t.dashboard.tokenMail,
    zenith: t.dashboard.tokenPlate,
  };

  useEffect(() => {
    if (metadata) {
      setRaidEffects(metadata.raidEffects);
      setCompositionAbilities(metadata.compositionAbilities);
      setCompositionMappings(metadata.compositionMappings);
      setWowSpells(metadata.wowSpells);
      return;
    }

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
        .in('ability_kind', ['raid_utility', 'raid_defensive', 'external', 'raid_buff', 'raid_debuff'])
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
  }, [metadata]);

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
    const specIds = specScopeFilter === 'primary' ? wish.spec_ids.slice(0, 1) : wish.spec_ids;
    return specIds.some(specId => specMatchesFilters(specId));
  };

  const filteredMemberCount = useMemo(() => {
    return filteredMembers.filter(member =>
      member.wishes.some(wish => wishMatchesFilters(member, wish))
    ).length;
  }, [filteredMembers, wishScopeFilter, maxWishIndex, specScopeFilter, roleFilter, rangeFilter, validationFilter]);

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
  }, [filteredMembers, language, maxWishIndex, specScopeFilter, roleFilter, rangeFilter, validationFilter]);

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
      const players = Array.from(
        new Set(group.classIds.flatMap(classId => classMap.get(classId)?.players ?? [])),
      );
      return {
        id: group.id,
        name: tokenNames[group.id],
        total,
        color: tokenColorMap[group.id],
        classes,
        players,
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
      {
        getWishSpecIds: wish => (specScopeFilter === 'primary' ? wish.spec_ids?.slice(0, 1) ?? [] : wish.spec_ids ?? []),
      },
    );
  }, [filteredMembers, raidEffects, wowSpells, language, validationFilter, maxWishIndex, specScopeFilter, roleFilter, rangeFilter]);

  const compositionCoverageLabels = useMemo(() => ({
    combat_res: t.dashboard.compositionCoverageLabels.combatResurrection,
    immunity: t.dashboard.compositionCoverageLabels.immunities,
    burst_move_speed: t.dashboard.compositionCoverageLabels.burstMoveSpeed,
    knockbacks: t.dashboard.compositionCoverageLabels.knockbacks,
    knockups: t.dashboard.compositionCoverageLabels.knockups,
    extra_damage_to_shields: t.dashboard.compositionCoverageLabels.extraDamageToShields,
    execute_damage: t.dashboard.compositionCoverageLabels.executeDamage,
    soothe: t.dashboard.compositionCoverageLabels.disenrage,
    warlock_curses: t.dashboard.compositionCoverageLabels.warlockCurses,
    mortal_strike: t.dashboard.compositionCoverageLabels.healingReduction,
    purge: t.dashboard.compositionCoverageLabels.magicPurges,
    cheat_death: t.dashboard.compositionCoverageLabels.cheatDeath,
    external_defensives: t.dashboard.compositionCoverageLabels.externalDefensives,
    raid_defensives: t.dashboard.compositionCoverageLabels.raidDefensives,
    aoe_stuns: t.dashboard.compositionCoverageLabels.aoeStuns,
    aoe_roots: t.dashboard.compositionCoverageLabels.aoeRoots,
    aoe_slows: t.dashboard.compositionCoverageLabels.aoeSlows,
    enemy_grips_and_grouping: t.dashboard.compositionCoverageLabels.enemyGripsAndGrouping,
    threat_redirection: t.dashboard.compositionCoverageLabels.threatRedirection,
    silences_and_anti_cast: t.dashboard.compositionCoverageLabels.silencesAndAntiCast,
    ally_freedom_and_mobility: t.dashboard.compositionCoverageLabels.allyFreedomAndMobility,
    interrupts: t.dashboard.compositionCoverageLabels.interrupts,
    ally_magic_dispels: t.dashboard.compositionCoverageLabels.allyMagicDispels,
    ally_curse_dispels: t.dashboard.compositionCoverageLabels.allyCurseDispels,
    ally_poison_dispels: t.dashboard.compositionCoverageLabels.allyPoisonDispels,
    ally_disease_dispels: t.dashboard.compositionCoverageLabels.allyDiseaseDispels,
    ally_bleed_dispels: t.dashboard.compositionCoverageLabels.allyBleedDispels,
    ally_fear_dispels: t.dashboard.compositionCoverageLabels.allyFearDispels,
    ally_charm_sleep_dispels: t.dashboard.compositionCoverageLabels.allyCharmSleepDispels,
    ally_roots_snares_dispels: t.dashboard.compositionCoverageLabels.allyRootsSnaresDispels,
  }), [
    t.dashboard.compositionCoverageLabels.allyBleedDispels,
    t.dashboard.compositionCoverageLabels.allyCharmSleepDispels,
    t.dashboard.compositionCoverageLabels.allyCurseDispels,
    t.dashboard.compositionCoverageLabels.allyDiseaseDispels,
    t.dashboard.compositionCoverageLabels.allyFearDispels,
    t.dashboard.compositionCoverageLabels.allyFreedomAndMobility,
    t.dashboard.compositionCoverageLabels.allyMagicDispels,
    t.dashboard.compositionCoverageLabels.allyPoisonDispels,
    t.dashboard.compositionCoverageLabels.allyRootsSnaresDispels,
    t.dashboard.compositionCoverageLabels.aoeRoots,
    t.dashboard.compositionCoverageLabels.aoeSlows,
    t.dashboard.compositionCoverageLabels.aoeStuns,
    t.dashboard.compositionCoverageLabels.burstMoveSpeed,
    t.dashboard.compositionCoverageLabels.combatResurrection,
    t.dashboard.compositionCoverageLabels.cheatDeath,
    t.dashboard.compositionCoverageLabels.disenrage,
    t.dashboard.compositionCoverageLabels.executeDamage,
    t.dashboard.compositionCoverageLabels.externalDefensives,
    t.dashboard.compositionCoverageLabels.extraDamageToShields,
    t.dashboard.compositionCoverageLabels.healingReduction,
    t.dashboard.compositionCoverageLabels.immunities,
    t.dashboard.compositionCoverageLabels.knockbacks,
    t.dashboard.compositionCoverageLabels.knockups,
    t.dashboard.compositionCoverageLabels.magicPurges,
    t.dashboard.compositionCoverageLabels.raidDefensives,
    t.dashboard.compositionCoverageLabels.warlockCurses,
    t.dashboard.compositionCoverageLabels.enemyGripsAndGrouping,
    t.dashboard.compositionCoverageLabels.interrupts,
    t.dashboard.compositionCoverageLabels.silencesAndAntiCast,
    t.dashboard.compositionCoverageLabels.threatRedirection,
  ]);
  const compositionCoverage = useMemo(() => {
    return buildCompositionCoverage(
      filteredMembers,
      compositionAbilities,
      compositionMappings,
      wowSpells,
      language,
      wishMatchesFilters,
      {
        coverageKinds: ['raid_utility', 'raid_defensive', 'external', 'raid_buff', 'raid_debuff'],
        coverageLabels: compositionCoverageLabels,
        getWishSpecIds: wish => (specScopeFilter === 'primary' ? wish.spec_ids?.slice(0, 1) ?? [] : wish.spec_ids ?? []),
      },
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
    specScopeFilter,
    roleFilter,
    rangeFilter,
  ]);
  const compositionCoverageSections = useMemo(() => (
    buildCompositionCoverageSections(majorBuffsDebuffs, compositionCoverage)
  ), [majorBuffsDebuffs, compositionCoverage]);
  const showCompositionCoverage = Object.values(compositionCoverageSections)
    .some(section => section.length > 0);

  const renderClassProviderPill = (provider: CoverageSpellEntry['providers'][number]) => {
    const className = getLocalizedClassName(provider.classId, language);
    const specName = provider.specId ? getLocalizedSpecName(provider.specId, language) : null;
    const providerLabel = specName ? `${className} - ${specName}` : className;
    const classColor = wowClassColorValue(provider.classId);

    return (
      <span
        key={`${provider.classId}-${provider.specId ?? 'all'}`}
        title={providerLabel}
        className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-0 text-[10px] font-semibold leading-4 ${
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

  const renderCoverageSpellDetail = (
    entry: Pick<CoverageSpellEntry, 'name' | 'description' | 'providers' | 'covered'>,
    key: string,
  ) => {
    const bodyText = (entry.description || entry.name).replace(/\s+/g, ' ').trim();

    return (
      <div
        key={key}
        className={`space-y-2 pt-1 text-xs font-normal ${entry.covered ? '' : 'text-muted-foreground/85'}`}
      >
        {entry.providers.length > 0 && (
          <div className="flex flex-wrap justify-start gap-1">
            {entry.providers.map(renderClassProviderPill)}
          </div>
        )}
        <p className="whitespace-normal break-words font-normal leading-5">
          {bodyText}
        </p>
      </div>
    );
  };

  const renderCoverageSpellList = (spellEntries: Array<Pick<CoverageSpellEntry, 'name' | 'providers' | 'covered'>>) => (
    <ul className="space-y-1.5 text-xs font-normal">
      {spellEntries.map((entry, index) => (
        <li
          key={`${entry.name}-${index}`}
          className={`grid min-w-0 grid-cols-[minmax(7.5rem,1fr)_minmax(0,auto)] items-center gap-3 ${
            entry.covered ? '' : 'text-muted-foreground/85'
          }`}
        >
          <span className="min-w-0 truncate font-normal leading-5">{entry.name}</span>
          {entry.providers.length > 0 && (
            <span className="flex max-w-[15rem] flex-wrap justify-end gap-1">
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

    if (spellEntries.length === 1) {
      return renderCoverageSpellDetail(spellEntries[0], `${spellEntries[0].spellId}-${spellEntries[0].name}`);
    }

    if (spellNames.length > 1) {
      return (
        <ul className="space-y-1 text-xs font-normal">
          {spellNames.map(spellName => (
            <li key={spellName} className="break-words font-normal leading-5">
              {spellName}
            </li>
          ))}
        </ul>
      );
    }

    return renderCoverageSpellDetail(
      {
        name: stat.name,
        description: stat.description,
        providers: [],
        covered: stat.count > 0,
      },
      stat.name,
    );
  };

  const getSingleProviderClassColor = (stat: RaidEffectStat | CompositionCoverageStat) => {
    const coveredClassIds = new Set<string>();
    const providerClassIds = new Set<string>();
    stat.spellEntries.forEach((entry) => {
      entry.providers.forEach((provider) => {
        providerClassIds.add(provider.classId);
        if (provider.covered) coveredClassIds.add(provider.classId);
      });
    });

    const classIds = coveredClassIds.size > 0 ? coveredClassIds : providerClassIds;
    if (classIds.size !== 1) return null;
    const classId = Array.from(classIds)[0];
    const wowClass = getClassById(classId);
    return wowClass ? resolveClassColor(wowClass.color) : null;
  };

  const renderCoverageList = (
    title: string,
    stats: (RaidEffectStat | CompositionCoverageStat)[],
    options: { columns?: 'single' | 'responsive'; required?: boolean } = {},
  ) => {
    const isRequired = options.required === true;
    const covered = stats.filter(stat => stat.count > 0).length;
    const allCovered = stats.length > 0 && covered === stats.length;
    const coverageTone = isRequired
      ? allCovered
        ? 'border-status-success/30 bg-status-success/10 text-status-success'
        : covered > 0
          ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
          : 'border-status-error/25 bg-status-error/10 text-status-error'
      : 'border-border/60 bg-muted/10 text-muted-foreground';
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
            {[...stats].sort((a, b) => {
              const aKey = 'coverageKey' in a ? a.coverageKey : String(a.spellId);
              const bKey = 'coverageKey' in b ? b.coverageKey : String(b.spellId);
              const aTop = topRaidEssentialKeys.has(aKey);
              const bTop = topRaidEssentialKeys.has(bKey);
              if (aTop !== bTop) return aTop ? -1 : 1;
              if (aTop && bTop) return aKey === 'bloodlust' ? -1 : 1;
              return sortCoverageMissingFirst([a, b])[0] === a ? -1 : 1;
            }).map(stat => {
              const isCovered = stat.count > 0;
              const statKey = 'coverageKey' in stat ? stat.coverageKey : stat.spellId;
              const isTopRaidEssential = 'coverageKey' in stat && topRaidEssentialKeys.has(stat.coverageKey);
              const spellNames = 'spellNames' in stat ? stat.spellNames : [];
              const spellEntries = 'spellEntries' in stat ? stat.spellEntries : [];
              const singleProviderClassColor = getSingleProviderClassColor(stat);
              const rowTone = isRequired
                ? isCovered
                  ? 'border-status-success/20 bg-status-success/5 hover:bg-status-success/10'
                  : 'border-border/50 bg-muted/10 hover:border-status-error/30 hover:bg-status-error/5'
                : 'border-border/50 bg-muted/5 hover:border-border hover:bg-muted/10';
              const countTone = isRequired
                ? isCovered
                  ? 'border-status-success/30 bg-status-success/10 text-status-success'
                  : 'border-status-error/25 bg-status-error/10 text-status-error'
                : 'border-border/60 bg-muted/20 text-muted-foreground';
              const statusColor = isTopRaidEssential ? topRaidEssentialColor : isCovered ? singleProviderClassColor : 'hsl(var(--status-error))';
              const countStyle = statusColor
                ? {
                    borderColor: statusColor,
                    color: statusColor,
                    backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                  }
                : undefined;
              const rowStyle = isTopRaidEssential
                ? {
                    borderColor: `color-mix(in srgb, ${topRaidEssentialColor} 65%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${topRaidEssentialColor} 13%, transparent)`,
                    boxShadow: `0 0 18px color-mix(in srgb, ${topRaidEssentialColor} 18%, transparent)`,
                    color: topRaidEssentialColor,
                  }
                : singleProviderClassColor
                ? {
                    borderColor: `color-mix(in srgb, ${singleProviderClassColor} 45%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${singleProviderClassColor} 9%, transparent)`,
                    color: singleProviderClassColor,
                  }
                : undefined;
              const labelStyle = isTopRaidEssential
                ? { color: topRaidEssentialColor }
                : singleProviderClassColor
                  ? { color: singleProviderClassColor }
                  : undefined;
              const labelTone = isRequired && !isCovered ? 'text-muted-foreground' : 'text-foreground';
              return (
                <UITooltip key={statKey} delayDuration={40}>
                  <TooltipTrigger asChild>
                    <div
                      className={`group flex min-h-8 cursor-help items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${singleProviderClassColor || isTopRaidEssential ? 'hover:brightness-110' : rowTone}`}
                      style={rowStyle}
                    >
                      {isRequired && (
                        isCovered ? (
                          <CheckCircle2
                            className={`h-3.5 w-3.5 shrink-0 ${singleProviderClassColor ? '' : 'text-status-success'}`}
                            style={labelStyle}
                          />
                        ) : (
                          <AlertTriangle
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: 'hsl(var(--status-error))' }}
                          />
                        )
                      )}
                      <span
                        className={`flex h-5 min-w-8 shrink-0 items-center justify-center rounded border px-2 text-[11px] font-semibold tabular-nums ${statusColor ? '' : countTone}`}
                        style={countStyle}
                      >
                        {stat.count}
                      </span>
                      <span className={`min-w-0 flex-1 truncate font-medium ${singleProviderClassColor ? '' : labelTone}`} style={labelStyle}>
                        {stat.name}
                      </span>
                      {isTopRaidEssential && (
                        <Star className="ml-auto h-3.5 w-3.5 shrink-0 fill-current" style={{ color: topRaidEssentialColor }} />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6} className="w-[min(92vw,420px)] max-w-[420px]">
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

  // Calculate spec distribution based on the selected specialization scope.
  const specStats = useMemo(() => {
    const stats: Record<string, { count: number; players: Set<string> }> = {};

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (w.spec_ids?.length && wishMatchesFilters(m, w)) {
          const specIds = specScopeFilter === 'primary' ? w.spec_ids.slice(0, 1) : w.spec_ids;
          specIds.forEach(specId => {
            if (specMatchesFilters(specId)) {
              if (!stats[specId]) {
                stats[specId] = { count: 0, players: new Set() };
              }
              stats[specId].count++;
              stats[specId].players.add(m.username);
            }
          });
        }
      });
    });

    const sorted = wowClasses
      .flatMap((wowClass) =>
        wowClass.specs
          .filter((spec) => {
            if (roleFilter !== 'all' && spec.role !== roleFilter) return false;
            if (rangeFilter !== 'all' && spec.range !== rangeFilter) return false;
            return true;
          })
          .map((spec) => ({ spec, wowClass })),
      )
      .map(({ spec, wowClass }) => {
        const data = stats[spec.id];
        const count = data?.count || 0;
        return {
          id: spec.id,
          specName: getLocalizedSpecName(spec.id, language),
          className: getLocalizedClassName(wowClass.id, language),
          classColor: wowClass.color,
          role: spec.role,
          range: spec.range,
          count,
          maxCount: 0,
          players: Array.from(data?.players ?? []),
        } as SpecStat;
      })
      .sort((a, b) =>
        b.count - a.count
        || a.className.localeCompare(b.className, language)
        || a.specName.localeCompare(b.specName, language),
      );

    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(s => ({ ...s, maxCount }));
  }, [filteredMembers, language, maxWishIndex, specScopeFilter, roleFilter, rangeFilter, validationFilter]);

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
  }, [filteredMembers, maxWishIndex, specScopeFilter, roleFilter, rangeFilter, validationFilter]);

  // Calculate range distribution based on filter
  const rangeStats = useMemo(() => {
    const stats = {
      melee: { count: 0, players: new Set<string>() },
      ranged: { count: 0, players: new Set<string>() },
    };

    filteredMembers.forEach(m => {
      m.wishes.forEach(w => {
        if (!wishMatchesFilters(m, w)) return;
        const spec = getFirstWishSpec(w);
        if (!spec) return;
        stats[spec.range].count++;
        stats[spec.range].players.add(m.username);
      });
    });

    return {
      melee: {
        count: stats.melee.count,
        players: Array.from(stats.melee.players),
      },
      ranged: {
        count: stats.ranged.count,
        players: Array.from(stats.ranged.players),
      },
    };
  }, [filteredMembers, maxWishIndex, specScopeFilter, roleFilter, rangeFilter, validationFilter]);

  // Missing classes (no one has this class in any wish)
  const missingClasses = useMemo(() => {
    return classStats.filter(s => s.total === 0);
  }, [classStats]);

  // Classes with at least one wish (any priority)
  const representedClasses = useMemo(() => {
    return classStats.filter(s => s.total > 0);
  }, [classStats]);

  const tokenRiskSummary = useMemo(() => getTokenRiskSummary(tokenStats), [tokenStats]);

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

  // Generate wish range label for selector
  const getWishRangeLabel = (value: WishScopeFilter) => {
    if (value === 'first_approved') return t.dashboard.firstApprovedWish;
    const n = Number(value);
    if (n === 1) return t.dashboard.wishRange1;
    if (n === 13) return t.dashboard.allWishes;
    return interpolateMessage(s('dashboard.roster_analytics.wish_range'), { n });
  };

  const renderFilterOption = <Value extends string>(option: AnalyticsFilterOption<Value>) => {
    const Icon = option.icon;
    const labelClassName = option.labelColorClass ?? option.colorClass;

    return (
      <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap leading-none">
        <Icon className={cn('h-4 w-4 shrink-0', option.colorClass)} />
        <span className={cn('min-w-0 truncate leading-none', labelClassName)}>{option.label}</span>
      </span>
    );
  };

  const firstApprovedWishScopeOption: AnalyticsFilterOption<WishScopeFilter> = {
    value: 'first_approved',
    label: getWishRangeLabel('first_approved'),
    icon: CheckCircle2,
    colorClass: 'text-status-success',
  };

  const wishRangeOptions: AnalyticsFilterOption<WishScopeFilter>[] = [
    {
      value: '1',
      label: getWishRangeLabel('1'),
      icon: Hash,
      colorClass: 'text-primary',
      labelColorClass: 'text-foreground',
    },
    ...([2, 3, 4, 5, 6] as const).map((n) => ({
      value: String(n) as WishScopeFilter,
      label: getWishRangeLabel(String(n) as WishScopeFilter),
      icon: Hash,
      colorClass: 'text-primary',
      labelColorClass: 'text-foreground',
    })),
  ];

  const validationOptions: AnalyticsFilterOption<ValidationFilter>[] = [
    { value: 'pending', label: t.wishes.validation.pending, icon: Clock, colorClass: 'text-status-warning' },
    { value: 'approved', label: t.wishes.validation.approved, icon: CheckCircle2, colorClass: 'text-status-success' },
    { value: 'rejected', label: t.wishes.validation.rejected, icon: XCircle, colorClass: 'text-muted-foreground' },
  ];

  const commitmentOptions: AnalyticsFilterOption<CommitmentFilter>[] = [
    { value: 'confirmed', label: t.wishes.commitment.confirmed, icon: UserCheck, colorClass: commitmentTextClass('confirmed') },
    { value: 'potential', label: t.wishes.commitment.undecided, icon: UserMinus, colorClass: commitmentTextClass('undecided') },
    { value: 'withdrawn', label: t.wishes.commitment.withdrawn, icon: UserX, colorClass: commitmentTextClass('withdrawn') },
  ];

  const rosterDecisionOptions: AnalyticsFilterOption<RosterDecisionFilter>[] = [
    { value: 'selected', label: t.wishes.rosterDecision.selected, icon: CheckCircle2, colorClass: 'text-status-success' },
    { value: 'bench', label: t.wishes.rosterDecision.bench, icon: Armchair, colorClass: 'text-status-warning' },
    { value: 'not_selected', label: t.wishes.rosterDecision.notSelected, icon: XCircle, colorClass: 'text-status-error' },
    { value: 'undecided', label: t.wishes.rosterDecision.undecided, icon: Clock, colorClass: 'text-muted-foreground' },
  ];

  const roleOptions: AnalyticsFilterOption<RoleFilter>[] = [
    { value: 'tank', label: t.dashboard.tank, icon: Shield, colorClass: 'text-tank' },
    { value: 'healer', label: t.dashboard.healer, icon: Heart, colorClass: 'text-healer' },
    { value: 'dps', label: t.dashboard.dps, icon: Sword, colorClass: 'text-dps' },
  ];

  const rangeOptions: AnalyticsFilterOption<RangeFilter>[] = [
    { value: 'melee', label: t.dashboard.melee, icon: Swords, colorClass: 'text-warning' },
    { value: 'ranged', label: t.dashboard.ranged, icon: Crosshair, colorClass: 'text-info' },
  ];

  const specScopeOptions: AnalyticsFilterOption<SpecScopeFilter>[] = [
    { value: 'primary', label: t.dashboard.primarySpecializations, icon: Target, colorClass: 'text-primary' },
    { value: 'all', label: t.dashboard.allExpressedSpecializations, icon: Target, colorClass: 'text-muted-foreground' },
  ];

  const allRosterMemberIds = useMemo(() => rosterMembers.map(member => member.id), [rosterMembers]);
  const isRosterMemberSelected = (memberId: string) =>
    rosterMemberFilters === null || rosterMemberFilters.includes(memberId);
  const setRosterMemberFilters = (memberIds: string[] | null) => {
    onRosterMemberFiltersChange?.(memberIds);
  };
  const toggleRosterMember = (memberId: string) => {
    const current = rosterMemberFilters === null ? allRosterMemberIds : rosterMemberFilters;
    setRosterMemberFilters(
      current.includes(memberId)
        ? current.filter(id => id !== memberId)
        : [...current, memberId],
    );
  };
  const selectAllRosterMembers = () => setRosterMemberFilters(null);
  const deselectAllRosterMembers = () => setRosterMemberFilters([]);
  const rosterMemberFilterCount = rosterMemberFilters === null ? 0 : rosterMemberFilters.length;
  const hasRosterMemberFilter = rosterMemberFilters !== null;

  const playersFilterCount =
    (commitmentFilter !== 'all' ? 1 : 0) +
    (rosterDecisionFilter !== 'all' ? 1 : 0) +
    (hasRosterMemberFilter ? rosterMemberFilterCount : 0);
  const wishesFilterCount =
    (wishScopeFilter !== '13' ? 1 : 0) +
    (validationFilter !== 'all' ? 1 : 0);
  const specsFilterCount =
    (specScopeFilter !== 'primary' ? 1 : 0) +
    (roleFilter !== 'all' ? 1 : 0) +
    (rangeFilter !== 'all' ? 1 : 0);
  const hasPlayersFilters = playersFilterCount > 0 || hasRosterMemberFilter;
  const hasWishesFilters = wishesFilterCount > 0;
  const hasSpecsFilters = specsFilterCount > 0;

  const renderFilterChoice = <Value extends string>({
    value,
    options,
    clearValue,
    onValueChange,
  }: {
    value: Value;
    options: AnalyticsFilterOption<Value>[];
    clearValue?: Value;
    onValueChange: (value: Value) => void;
  }) => (
    <div className="flex flex-col gap-1">
      {options.map(option => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(isSelected && clearValue !== undefined ? clearValue : option.value)}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
              isSelected ? 'bg-primary/20' : 'hover:bg-primary/10',
            )}
          >
            <span className="min-w-0 flex-1">
              {renderFilterOption(option)}
            </span>
            {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );

  const renderRosterMemberSelector = () => (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{t.dashboard.rosterMembers}</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={selectAllRosterMembers}
          >
            {t.dashboard.selectAllMembers}
          </button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={deselectAllRosterMembers}
          >
            {t.dashboard.deselectAllMembers}
          </button>
        </div>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
        {rosterMembers.map(member => {
          const isSelected = isRosterMemberSelected(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleRosterMember(member.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                isSelected ? 'bg-primary/20' : 'hover:bg-primary/10',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{member.name}</span>
              {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const getCommitmentFilterLabel = (value: CommitmentFilter) => {
    if (value === 'all') return t.dashboard.allCommitments;
    return commitmentOptions.find(option => option.value === value)?.label || value;
  };

  const getRosterDecisionFilterLabel = (value: RosterDecisionFilter) => {
    if (value === 'all') return t.common.all;
    return rosterDecisionOptions.find(option => option.value === value)?.label || value;
  };

  const getValidationFilterLabel = (value: ValidationFilter) => {
    if (value === 'all') return t.dashboard.allValidations;
    return validationOptions.find(option => option.value === value)?.label || value;
  };

  const getRoleFilterLabel = (value: RoleFilter) => {
    if (value === 'all') return t.dashboard.allRoles;
    return roleOptions.find(option => option.value === value)?.label || value;
  };

  const getRangeFilterLabel = (value: RangeFilter) => {
    if (value === 'all') return t.dashboard.allRanges;
    return rangeOptions.find(option => option.value === value)?.label || value;
  };

  const getSpecScopeFilterLabel = (value: SpecScopeFilter) =>
    specScopeOptions.find(option => option.value === value)?.label || value;

  const resetAnalyticsFilters = () => {
    setCommitmentFilter('confirmed');
    setRosterDecisionFilter(defaultAnalyticsFilters.rosterDecision);
    setRosterDecisionFilterTouched(false);
    setWishScopeFilter(defaultAnalyticsFilters.wishScope);
    setWishScopeFilterTouched(false);
    setValidationFilter(defaultAnalyticsFilters.validation);
    setValidationFilterTouched(false);
    setSpecScopeFilter('primary');
    setRoleFilter('all');
    setRangeFilter('all');
  };

  const activeFilterItems = [
    interpolateMessage(t.dashboard.activeFilterMembers, { count: filteredMemberCount }),
    interpolateMessage(t.dashboard.activeFilterCommitment, { value: getCommitmentFilterLabel(commitmentFilter) }),
    interpolateMessage(t.dashboard.activeFilterDecision, { value: getRosterDecisionFilterLabel(rosterDecisionFilter) }),
    interpolateMessage(t.dashboard.activeFilterWishes, { value: getWishRangeLabel(wishScopeFilter) }),
    interpolateMessage(t.dashboard.activeFilterValidation, { value: getValidationFilterLabel(validationFilter) }),
    interpolateMessage(t.dashboard.activeFilterSpecs, { value: getSpecScopeFilterLabel(specScopeFilter) }),
    interpolateMessage(t.dashboard.activeFilterRole, { value: getRoleFilterLabel(roleFilter) }),
    interpolateMessage(t.dashboard.activeFilterRange, { value: getRangeFilterLabel(rangeFilter) }),
  ];

  const formatTokenList = (tokens: string[]) => {
    try {
      return new Intl.ListFormat(language, { type: 'conjunction', style: 'long' }).format(tokens);
    } catch {
      return tokens.join(', ');
    }
  };

  const tokenRiskDescription = tokenRiskSummary.token && tokenRiskSummary.level !== 'none'
    ? tokenRiskSummary.topTokens.length > 1
      ? interpolateMessage(t.dashboard.tokenRiskSummaryMultiple, {
          level: t.dashboard.tokenRiskLevels[tokenRiskSummary.level],
          tokens: formatTokenList(tokenRiskSummary.topTokens.map(token => token.name)),
          count: tokenRiskSummary.token.total,
          total: tokenRiskSummary.total,
          percent: Math.round(tokenRiskSummary.percent * 100),
        })
      : interpolateMessage(t.dashboard.tokenRiskSummary, {
          level: t.dashboard.tokenRiskLevels[tokenRiskSummary.level],
          token: tokenRiskSummary.token.name,
          count: tokenRiskSummary.token.total,
          total: tokenRiskSummary.total,
          percent: Math.round(tokenRiskSummary.percent * 100),
        })
    : t.dashboard.tokenRiskNone;

  // Calculate totals for KPI bar
  const totalTanks = rolesByPriority.find(r => r.role === 'tank');
  const totalHealers = rolesByPriority.find(r => r.role === 'healer');
  const totalDps = rolesByPriority.find(r => r.role === 'dps');

  // Pie chart data
  const totalRange = rangeStats.melee.count + rangeStats.ranged.count;

  const rangePieData = [
    {
      name: t.dashboard.melee,
      value: rangeStats.melee.count,
      players: rangeStats.melee.players,
      color: rangeColorMap.melee,
      key: 'melee',
    },
    {
      name: t.dashboard.ranged,
      value: rangeStats.ranged.count,
      players: rangeStats.ranged.players,
      color: rangeColorMap.ranged,
      key: 'ranged',
    },
  ].filter(d => d.value > 0);
  const hoveredRangeStat = hoveredRangeKey
    ? rangePieData.find(stat => stat.key === hoveredRangeKey) || null
    : null;

  const pluralizeKpiLabel = (count: number, singular: string, plural: string) =>
    count > 1 ? plural : singular;
  const formatKpiLabel = (label: string) =>
    label ? `${label.charAt(0).toLocaleUpperCase(language)}${label.slice(1)}` : label;

  const tankCount = (totalTanks?.wish1 || 0) + (totalTanks?.other || 0);
  const healerCount = (totalHealers?.wish1 || 0) + (totalHealers?.other || 0);
  const dpsCount = (totalDps?.wish1 || 0) + (totalDps?.other || 0);
  const meleeCount = rangeStats.melee.count;
  const rangedCount = rangeStats.ranged.count;

  const compositionKpis = [
    {
      key: 'members',
      label: formatKpiLabel(pluralizeKpiLabel(filteredMemberCount, t.guild.member, t.guild.members)),
      value: filteredMemberCount,
      color: 'hsl(var(--foreground))',
      icon: <Users className="h-3 w-3 shrink-0" />,
    },
    {
      key: 'classes',
      label: pluralizeKpiLabel(representedClasses.length, t.dashboard.classSingular, t.dashboard.classes),
      value: `${representedClasses.length}/13`,
      color: 'hsl(var(--status-success))',
      icon: <CheckCircle2 className="h-3 w-3 shrink-0" />,
    },
    {
      key: 'tank',
      label: pluralizeKpiLabel(tankCount, getRoleName('tank'), t.dashboard.tankPlural),
      value: tankCount,
      color: roleColorMap.tank,
      icon: getRoleIcon('tank', 'h-3 w-3 shrink-0'),
    },
    {
      key: 'healer',
      label: pluralizeKpiLabel(healerCount, getRoleName('healer'), t.dashboard.healerPlural),
      value: healerCount,
      color: roleColorMap.healer,
      icon: getRoleIcon('healer', 'h-3 w-3 shrink-0'),
    },
    {
      key: 'dps',
      label: getRoleName('dps'),
      value: dpsCount,
      color: roleColorMap.dps,
      icon: getRoleIcon('dps', 'h-3 w-3 shrink-0'),
    },
    {
      key: 'melee',
      label: pluralizeKpiLabel(meleeCount, t.dashboard.melee, t.dashboard.meleePlural),
      value: meleeCount,
      color: rangeColorMap.melee,
      icon: <Swords className="h-3 w-3 shrink-0" />,
    },
    {
      key: 'ranged',
      label: pluralizeKpiLabel(rangedCount, t.dashboard.ranged, t.dashboard.rangedPlural),
      value: rangedCount,
      color: rangeColorMap.ranged,
      icon: <Crosshair className="h-3 w-3 shrink-0" />,
    },
  ];

  const renderRosterTooltipContent = (
    title: string,
    color: string,
    players: string[],
    options?: { maxPlayers?: number | null },
  ) => {
    const maxPlayers = options?.maxPlayers ?? 6;
    const visiblePlayers = maxPlayers === null ? players : players.slice(0, maxPlayers);
    return (
    <>
      <p className="mb-2 text-sm font-semibold leading-none" style={{ color }}>
        {title}
      </p>
      {players.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visiblePlayers.map(player => (
            <Badge key={player} variant="secondary" className="px-2 py-0.5 text-[10px] leading-4">
              {player}
            </Badge>
          ))}
          {maxPlayers !== null && players.length > maxPlayers && (
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] leading-4">
              +{players.length - maxPlayers}
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
      )}
    </>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="sticky top-[var(--app-header-height,0px)] z-20 -mx-2 border-y border-border/50 bg-background/85 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:mx-0 sm:rounded-lg sm:border">
          <FilterBar className="gap-3">
            <Popover open={playersOpen} onOpenChange={setPlayersOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  filterControlClassName,
                  'gap-2',
                  hasPlayersFilters ? activeFilterControlClassName : 'text-muted-foreground',
                )}
              >
                <Users className="h-4 w-4" />
                <span>{t.guild.members}</span>
                {hasPlayersFilters && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {playersFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-40 bg-card p-3" align="start">
              <div className="space-y-3">
                {renderRosterMemberSelector()}
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.dashboard.commitment}</h4>
                  {renderFilterChoice({
                    value: commitmentFilter,
                    options: commitmentOptions,
                    clearValue: 'all',
                    onValueChange: setCommitmentFilter,
                  })}
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.wishes.rosterDecision.title}</h4>
                  {renderFilterChoice({
                    value: rosterDecisionFilter,
                    options: rosterDecisionOptions,
                    clearValue: 'all',
                    onValueChange: (v) => {
                      setRosterDecisionFilterTouched(true);
                      setRosterDecisionFilter(v);
                    },
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={wishesOpen} onOpenChange={setWishesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  filterControlClassName,
                  'gap-2',
                  hasWishesFilters ? activeFilterControlClassName : 'text-muted-foreground',
                )}
              >
                <Hash className="h-4 w-4" />
                <span>{s('dashboard.roster_filters.wishes_title')}</span>
                {hasWishesFilters && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {wishesFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-w-[calc(100vw-1rem)] bg-card p-3" align="start">
              <div className="space-y-3">
                <div>
                  {renderFilterChoice({
                    value: wishScopeFilter,
                    options: [firstApprovedWishScopeOption],
                    clearValue: '13',
                    onValueChange: (v) => {
                      setWishScopeFilterTouched(true);
                      setWishScopeFilter(v);
                    },
                  })}
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.dashboard.wishRangeFilter}</h4>
                  {renderFilterChoice({
                    value: wishScopeFilter,
                    options: wishRangeOptions,
                    clearValue: '13',
                    onValueChange: (v) => {
                      setWishScopeFilterTouched(true);
                      setWishScopeFilter(v);
                    },
                  })}
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.dashboard.validation}</h4>
                  {renderFilterChoice({
                    value: validationFilter,
                    options: validationOptions,
                    clearValue: 'all',
                    onValueChange: (v) => {
                      setValidationFilterTouched(true);
                      setValidationFilter(v);
                    },
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={specsOpen} onOpenChange={setSpecsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  filterControlClassName,
                  'gap-2',
                  hasSpecsFilters ? activeFilterControlClassName : 'text-muted-foreground',
                )}
              >
                <Target className="h-4 w-4" />
                <span>{t.wishes.specs}</span>
                {hasSpecsFilters && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {specsFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-w-[calc(100vw-1rem)] bg-card p-3" align="start">
              <div className="space-y-3">
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.dashboard.specializationScope}</h4>
                  {renderFilterChoice({
                    value: specScopeFilter,
                    options: specScopeOptions,
                    onValueChange: setSpecScopeFilter,
                  })}
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{s('dashboard.roster_filters.roles_title')}</h4>
                  {renderFilterChoice({
                    value: roleFilter,
                    options: roleOptions,
                    clearValue: 'all',
                    onValueChange: setRoleFilter,
                  })}
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t.dashboard.range}</h4>
                  {renderFilterChoice({
                    value: rangeFilter,
                    options: rangeOptions,
                    clearValue: 'all',
                    onValueChange: setRangeFilter,
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          </FilterBar>

          <div className="mt-3 flex flex-col gap-3 border-t border-border/40 pt-3 text-sm text-muted-foreground lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium text-foreground">{t.dashboard.activeAnalysisScope}</span>
              </div>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {activeFilterItems.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="max-w-full border-border/60 bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className="min-w-0 truncate">{item}</span>
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetAnalyticsFilters}
              className="self-start lg:self-center"
            >
              {t.common.reset}
            </Button>
          </div>
        </div>

        {missingClasses.length > 0 && (
          <section className="grid gap-3 xl:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border border-status-warning/35 bg-status-warning/10 p-3 xl:col-span-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-status-warning">{t.dashboard.absentClassesTitle}</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missingClasses.map(stat => (
                    <Badge
                      key={stat.id}
                      variant="outline"
                      className="px-2 py-0.5 text-xs"
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
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <section className="min-w-0 md:col-span-2 xl:col-span-12">
            <div className="grid grid-cols-2 gap-2 min-[440px]:grid-cols-4 lg:grid-cols-7">
              {compositionKpis.map(kpi => (
                <div
                  key={kpi.key}
                  className="grid min-h-[64px] min-w-0 grid-cols-[44px_minmax(0,1fr)] overflow-hidden rounded-lg border shadow-sm shadow-background/30"
                  style={{
                    borderColor: `color-mix(in srgb, ${kpi.color} 48%, transparent)`,
                    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${kpi.color} 15%, transparent), color-mix(in srgb, ${kpi.color} 6%, transparent))`,
                  }}
                >
                  <div
                    className="flex items-center justify-center border-r [&_svg]:h-5 [&_svg]:w-5"
                    style={{
                      borderColor: `color-mix(in srgb, ${kpi.color} 28%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${kpi.color} 13%, transparent)`,
                      color: kpi.color,
                    }}
                  >
                    {kpi.icon}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center px-3 py-2">
                    <span className="min-w-0 truncate text-xs font-semibold leading-tight">
                      {kpi.label}
                    </span>
                    <div
                      className="mt-1 text-3xl font-extrabold leading-none tracking-tight tabular-nums"
                      style={{
                        color: kpi.color,
                        textShadow: `0 0 18px color-mix(in srgb, ${kpi.color} 22%, transparent)`,
                      }}
                    >
                      {kpi.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-3">
            <div className="flex h-full min-h-[260px] flex-col">
              <div className="flex min-w-0 flex-1 flex-col">
                <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{t.dashboard.rangeBalance}</h5>
                {totalRange > 0 ? (
                  <div className="relative flex flex-1 items-center justify-center py-2">
                    {rangePieData.map(stat => {
                      const isMelee = stat.key === 'melee';
                      const positionClass = isMelee
                        ? 'left-[calc(50%+6rem)] top-[31%] items-start text-left'
                        : 'right-[calc(50%+6rem)] top-[69%] items-end text-right';
                      const lineClass = isMelee
                        ? 'right-full mr-2 bg-gradient-to-l from-current to-transparent'
                        : 'left-full ml-2 bg-gradient-to-r from-current to-transparent';

                      return (
                        <UITooltip key={stat.key} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute z-10 flex -translate-y-1/2 cursor-help flex-col gap-1 ${positionClass}`}
                              style={{ color: stat.color }}
                            >
                              <div className={`absolute top-1/2 h-px w-4 -translate-y-1/2 opacity-70 ${lineClass}`} />
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                {isMelee && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stat.color }} />}
                                {isMelee ? (
                                  <Swords className="h-3.5 w-3.5" />
                                ) : (
                                  <Crosshair className="h-3.5 w-3.5" />
                                )}
                                <span className="max-w-20 truncate">{stat.name}</span>
                                {!isMelee && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stat.color }} />}
                              </div>
                              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                                {stat.value} ({Math.round((stat.value / totalRange) * 100)}%)
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={8} className="max-w-[320px] rounded-md border-border/80 px-3 py-2.5">
                            {renderRosterTooltipContent(stat.name, stat.color, stat.players, { maxPlayers: null })}
                          </TooltipContent>
                        </UITooltip>
                      );
                    })}

                    <div className="flex flex-1 items-center justify-center">
                      <UITooltip open={!!hoveredRangeStat} delayDuration={40}>
                        <TooltipTrigger asChild>
                          <div
                            className="h-48 w-48 shrink-0 cursor-help"
                            onMouseLeave={() => setHoveredRangeKey(null)}
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={rangePieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={42}
                                  outerRadius={82}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {rangePieData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                      className="outline-none transition-opacity hover:opacity-90"
                                      onMouseEnter={() => setHoveredRangeKey(entry.key)}
                                    />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </TooltipTrigger>
                        {hoveredRangeStat && (
                          <TooltipContent sideOffset={10} className="max-w-[320px] rounded-md border-border/80 px-3 py-2.5">
                            {renderRosterTooltipContent(
                              hoveredRangeStat.name,
                              hoveredRangeStat.color,
                              hoveredRangeStat.players,
                              { maxPlayers: null },
                            )}
                          </TooltipContent>
                        )}
                      </UITooltip>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">{t.dashboard.noData}</p>
                )}
              </div>
            </div>
          </GlowCard>

          <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-3">
            <h4 className="text-sm font-medium mb-2">{t.dashboard.classes}</h4>
            <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1">
              {classStats.map((stat) => (
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
                            opacity: stat.total === 0 ? 0 : hoveredClass === stat.id ? 1 : 0.85,
                          }}
                        />
                      </div>
                      <div className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                        {stat.total}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8} className="max-w-[220px] rounded-md border-border/80 px-3 py-2.5">
                    {renderRosterTooltipContent(stat.name, resolveClassColor(stat.color), stat.players)}
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </GlowCard>

          <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-2">
            <h4 className="text-sm font-medium mb-2">{t.wishes.specs}</h4>
            {specStats.length > 0 ? (
              <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1">
                {specStats.map((stat) => (
                  <UITooltip key={stat.id} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5 group">
                        <span className="flex w-4 justify-center" style={{ color: resolveClassColor(stat.classColor) }}>
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
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="max-w-[220px] rounded-md border-border/80 px-3 py-2.5">
                      {renderRosterTooltipContent(stat.specName, resolveClassColor(stat.classColor), stat.players)}
                    </TooltipContent>
                  </UITooltip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          <GlowCard surface="section" className="p-3 md:col-span-2 xl:col-span-4">
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-sm font-medium">{t.dashboard.armorTypes}</h4>
              <Badge variant="outline" className="w-fit border-border/60 bg-muted/20 text-xs text-muted-foreground">
                {t.dashboard.tokenRiskLevels[tokenRiskSummary.level]}
              </Badge>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{tokenRiskDescription}</p>
            {totalTokenWishes > 0 ? (
              <div className="space-y-2">
                {tokenStats.map(stat => (
                  <UITooltip key={stat.id} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer space-y-1">
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
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="max-w-[220px] rounded-md border-border/80 px-3 py-2.5">
                      {renderRosterTooltipContent(stat.name, tokenTextColorMap[stat.id], stat.players)}
                    </TooltipContent>
                  </UITooltip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t.dashboard.noData}</p>
            )}
          </GlowCard>

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.majorBuffs, compositionCoverageSections.majorBuffs, { required: true })}
            </GlowCard>
          )}

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.majorDebuffs, compositionCoverageSections.majorDebuffs, { required: true })}
            </GlowCard>
          )}

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.raidEssentials, compositionCoverageSections.raidEssentials, { required: true })}
            </GlowCard>
          )}

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.raidEnhancements, compositionCoverageSections.raidEnhancements)}
            </GlowCard>
          )}

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.controls, compositionCoverageSections.controls)}
            </GlowCard>
          )}

          {showCompositionCoverage && (
            <GlowCard surface="section" className="p-3 md:col-span-1 xl:col-span-6 2xl:col-span-2">
              {renderCoverageList(t.dashboard.enemyWeakening, compositionCoverageSections.enemyWeakening)}
            </GlowCard>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
