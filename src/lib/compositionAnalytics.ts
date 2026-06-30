import type { Language } from '@/i18n/config';

import {
  mergeEquivalentCoverageSpellEntries,
  type CoverageSpellEntry,
  type RaidEffectStat,
  resolveWowSpellText,
  type WowSpellAnalyticsRow,
} from '@/lib/raidEffectAnalytics';

export type CompositionAbilityKind =
  | 'raid_buff'
  | 'raid_debuff'
  | 'raid_utility'
  | 'raid_defensive'
  | 'external';

export interface CompositionAbilityAnalyticsRow {
  id: string;
  ability_key: string;
  coverage_key: string;
  ability_kind: string;
  spell_id: number | null;
  cooldown_profile: string | null;
  cooldown_seconds: number | null;
  active: boolean;
  sort_order: number | null;
}

export interface CompositionAbilityMappingAnalyticsRow {
  ability_id: string;
  class_id: string;
  spec_id: string | null;
  role: string | null;
  applies_to_main: boolean;
  applies_to_offspec_alt: boolean;
}

export interface CompositionWishInput {
  class_id?: string | null;
  spec_ids?: string[] | null;
}

export interface CompositionMemberInput<Wish extends CompositionWishInput = CompositionWishInput> {
  wishes: Wish[];
}

export interface CompositionCoverageStat {
  coverageKey: string;
  abilityKind: string;
  spellId: number | null;
  name: string;
  description: string;
  spellNames: string[];
  spellEntries: CoverageSpellEntry[];
  count: number;
  sortOrder: number;
}

export type CompositionCoverageDisplayStat = RaidEffectStat | CompositionCoverageStat;

export interface CompositionCoverageSections {
  raidEssentials: CompositionCoverageDisplayStat[];
  majorBuffs: CompositionCoverageDisplayStat[];
  majorDebuffs: CompositionCoverageDisplayStat[];
  raidEnhancements: CompositionCoverageDisplayStat[];
  controls: CompositionCoverageDisplayStat[];
  enemyWeakening: CompositionCoverageDisplayStat[];
}

const defaultCoverageKinds = new Set<string>(['raid_utility', 'raid_defensive', 'external']);
const raidEssentialCoverageKeys = [
  'bloodlust',
  'combat_res',
  'soulwell',
  'demonic_gateway',
  'power_infusion',
  'interrupts',
  'ally_magic_dispels',
  'ally_curse_dispels',
  'ally_poison_dispels',
  'ally_disease_dispels',
  'ally_bleed_dispels',
  'ally_fear_dispels',
  'ally_charm_sleep_dispels',
  'ally_roots_snares_dispels',
] as const;
const raidEnhancementCoverageKeys = [
  'external_defensives',
  'raid_defensives',
  'mass_dispel',
  'burst_move_speed',
  'ally_freedom_and_mobility',
  'threat_redirection',
  'innervate',
  'immunity',
  'cheat_death',
] as const;
const enemyWeakeningCoverageKeys = [
  'silences_and_anti_cast',
  'mortal_strike',
  'purge',
  'soothe',
  'execute_damage',
  'extra_damage_to_shields',
  'warlock_curses',
] as const;
const controlCoverageKeys = [
  'enemy_grips_and_grouping',
  'knockups',
  'aoe_stuns',
  'aoe_roots',
  'aoe_slows',
  'knockbacks',
] as const;
const warlockCurseAbilityKeys = new Set([
  'curse_of_tongues_warlock_utility',
  'curse_of_weakness_warlock_utility',
  'curse_of_weakness_attack_speed',
  'curse_of_tongues_cast_speed',
]);
const externalDefensiveAbilityKeys = new Set([
  'ironbark_external_defensive',
  'life_cocoon_external_defensive',
  'time_dilation_external_defensive',
  'pain_suppression_external_defensive',
  'guardian_spirit_external_defensive',
  'blessing_of_sacrifice_external_defensive',
  'blessing_of_protection',
  'blessing_of_spellwarding',
  'intervene_external_defensive',
]);
const raidDefensiveAbilityKeys = new Set([
  'anti_magic_zone',
  'rallying_cry',
  'darkness',
  'zephyr_raid_defensive',
  'aegis_of_light_raid_defensive',
]);
const knockbackAbilityKeys = new Set([
  'typhoon_knock',
  'thunderstorm_knock',
  'ring_of_peace_knock',
  'wing_buffet_knock',
]);
const knockupAbilityKeys = new Set([
  'tail_swipe_knock',
  'thundershock_knockup',
]);
const aoeStunAbilityKeys = new Set([
  'chaos_nova_aoe_stun',
  'void_nova_aoe_stun',
  'leg_sweep_aoe_stun',
  'capacitor_totem_aoe_stun',
  'shadowfury_aoe_stun',
  'binding_shot_aoe_stun',
  'shockwave_aoe_stun',
]);
const aoeRootAbilityKeys = new Set([
  'mass_entanglement_aoe_root',
  'entangling_vortex_aoe_root',
  'landslide_aoe_root',
  'frost_nova_aoe_root',
  'void_tendrils_aoe_root',
  'earthgrab_totem_aoe_root',
]);
const aoeSlowAbilityKeys = new Set([
  'sigil_of_chains_aoe_slow',
  'wave_of_debilitation_aoe_slow',
  'typhoon_aoe_slow',
  'ursols_vortex_aoe_slow',
  'tail_swipe_aoe_slow',
  'wing_buffet_aoe_slow',
  'tar_trap_aoe_slow',
  'earthbind_totem_aoe_slow',
  'earthgrab_totem_aoe_slow',
  'thunderstorm_aoe_slow',
  'piercing_howl_aoe_slow',
  'boneshaker_aoe_slow',
]);
const groupMobilityAbilityKeys = new Set([
  'stampeding_roar',
  'wind_rush_totem',
  'zephyr',
]);
const deprecatedCompositionAbilityKeys = new Set([
  'storm_bolts_aoe_stun',
]);

export interface BuildCompositionCoverageOptions {
  coverageKinds?: Iterable<string>;
  coverageLabels?: Partial<Record<string, string | { singular: string; plural: string }>>;
  getWishSpecIds?: (wish: CompositionWishInput) => string[];
}

const getProviderKey = (classId: string, specId: string | null): string => `${classId}:${specId ?? ''}`;

const keyToLabel = (key: string): string =>
  key
    .split('_')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || key;

const resolveAbilityText = (
  ability: CompositionAbilityAnalyticsRow,
  spellsById: Map<number, WowSpellAnalyticsRow>,
  language: Language,
): { name: string; description: string } => {
  if (!ability.spell_id) {
    return { name: keyToLabel(ability.ability_key), description: '' };
  }

  return resolveWowSpellText(spellsById.get(ability.spell_id), ability.spell_id, language);
};

const normalizeCoverageKey = (ability: CompositionAbilityAnalyticsRow): string => {
  if (groupMobilityAbilityKeys.has(ability.ability_key)) return 'burst_move_speed';
  if (warlockCurseAbilityKeys.has(ability.ability_key)) return 'warlock_curses';
  if (externalDefensiveAbilityKeys.has(ability.ability_key)) return 'external_defensives';
  if (raidDefensiveAbilityKeys.has(ability.ability_key)) return 'raid_defensives';
  if (knockbackAbilityKeys.has(ability.ability_key)) return 'knockbacks';
  if (knockupAbilityKeys.has(ability.ability_key)) return 'knockups';
  if (aoeStunAbilityKeys.has(ability.ability_key)) return 'aoe_stuns';
  if (aoeRootAbilityKeys.has(ability.ability_key)) return 'aoe_roots';
  if (aoeSlowAbilityKeys.has(ability.ability_key)) return 'aoe_slows';
  return ability.coverage_key;
};

const resolveCoverageLabel = (
  label: string | { singular: string; plural: string } | undefined,
  count: number,
): string | undefined => {
  if (!label) return undefined;
  if (typeof label === 'string') return label;
  return count > 1 ? label.plural : label.singular;
};

const getCoverageKey = (stat: CompositionCoverageDisplayStat): string | null => (
  'coverageKey' in stat && stat.coverageKey ? stat.coverageKey : null
);

const getSpellIds = (stat: CompositionCoverageDisplayStat): number[] => {
  const spellIds = new Set<number>();
  if ('spellId' in stat && Number.isInteger(stat.spellId) && stat.spellId > 0) {
    spellIds.add(stat.spellId);
  }
  stat.spellEntries.forEach((entry) => {
    if (Number.isInteger(entry.spellId) && entry.spellId > 0) {
      spellIds.add(entry.spellId);
    }
  });
  return Array.from(spellIds);
};

const sortByCountDesc = <Stat extends CompositionCoverageDisplayStat>(
  stats: Stat[],
  orderedKeys: readonly string[] = [],
): Stat[] => {
  const order = new Map(orderedKeys.map((key, index) => [key, index]));

  return [...stats].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const aOrder = order.get(getCoverageKey(a) ?? '') ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(getCoverageKey(b) ?? '') ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
};

const sortByConfiguredOrder = <Stat extends CompositionCoverageDisplayStat>(
  stats: Stat[],
  orderedKeys: readonly string[],
): Stat[] => {
  const order = new Map(orderedKeys.map((key, index) => [key, index]));

  return [...stats].sort((a, b) => {
    const aOrder = order.get(getCoverageKey(a) ?? '') ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(getCoverageKey(b) ?? '') ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (b.count !== a.count) return b.count - a.count;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
};

export const buildCompositionCoverageSections = (
  majorBuffsDebuffs: { buffs: RaidEffectStat[]; debuffs: RaidEffectStat[] },
  compositionCoverage: CompositionCoverageStat[],
): CompositionCoverageSections => {
  const majorSpellIds = new Set([
    ...majorBuffsDebuffs.buffs.flatMap(getSpellIds),
    ...majorBuffsDebuffs.debuffs.flatMap(getSpellIds),
  ]);
  const visibleCompositionCoverage = compositionCoverage.filter((stat) => {
    if (stat.coverageKey === 'combat_res') return true;
    return !getSpellIds(stat).some(spellId => majorSpellIds.has(spellId));
  });
  const compositionByCoverageKey = new Map(
    visibleCompositionCoverage.map(stat => [stat.coverageKey, stat]),
  );
  const pickCompositionStats = (coverageKeys: readonly string[]) =>
    coverageKeys
      .map(coverageKey => compositionByCoverageKey.get(coverageKey))
      .filter((stat): stat is CompositionCoverageStat => Boolean(stat));

  const essentialKeySet = new Set<string>(raidEssentialCoverageKeys);
  const majorBuffs = majorBuffsDebuffs.buffs.filter(stat => !essentialKeySet.has(getCoverageKey(stat) ?? ''));
  const majorBuffsByCoverageKey = new Map(
    majorBuffsDebuffs.buffs.map(stat => [getCoverageKey(stat), stat]),
  );
  const raidEssentials = raidEssentialCoverageKeys
    .map(coverageKey => majorBuffsByCoverageKey.get(coverageKey) ?? compositionByCoverageKey.get(coverageKey))
    .filter((stat): stat is CompositionCoverageDisplayStat => Boolean(stat));

  return {
    raidEssentials: sortByConfiguredOrder(raidEssentials, raidEssentialCoverageKeys),
    majorBuffs: sortByCountDesc(majorBuffs),
    majorDebuffs: sortByCountDesc(majorBuffsDebuffs.debuffs),
    raidEnhancements: sortByCountDesc(
      pickCompositionStats(raidEnhancementCoverageKeys),
      raidEnhancementCoverageKeys,
    ),
    controls: sortByCountDesc(
      pickCompositionStats(controlCoverageKeys),
      controlCoverageKeys,
    ),
    enemyWeakening: sortByCountDesc(
      pickCompositionStats(enemyWeakeningCoverageKeys),
      enemyWeakeningCoverageKeys,
    ),
  };
};

export const buildCompositionCoverage = <
  Wish extends CompositionWishInput,
  Member extends CompositionMemberInput<Wish>,
>(
  members: Member[],
  abilities: CompositionAbilityAnalyticsRow[],
  mappings: CompositionAbilityMappingAnalyticsRow[],
  spells: WowSpellAnalyticsRow[],
  language: Language,
  wishMatchesFilters: (member: Member, wish: Wish) => boolean,
  options: BuildCompositionCoverageOptions = {},
): CompositionCoverageStat[] => {
  const coverageKinds = options.coverageKinds ?? defaultCoverageKinds;
  const coverageLabels = options.coverageLabels ?? {};
  const kindSet = new Set(coverageKinds);
  const spellsById = new Map(spells.map(spell => [spell.spell_id, spell]));
  const activeAbilities = abilities
    .filter(ability => (
      ability.active
      && kindSet.has(ability.ability_kind)
      && !deprecatedCompositionAbilityKeys.has(ability.ability_key)
    ))
    .map(ability => ({ ...ability, coverage_key: normalizeCoverageKey(ability) }));
  if (activeAbilities.length === 0) return [];

  const abilitiesById = new Map(activeAbilities.map(ability => [ability.id, ability]));
  const stats = new Map<string, CompositionCoverageStat>();
  const spellNamesByCoverage = new Map<string, { name: string; sortOrder: number }[]>();
  const spellEntriesByCoverage = new Map<string, {
    abilityId: string;
    spellId: number | null;
    name: string;
    description: string;
    sortOrder: number;
    providers: Map<string, { classId: string; specId: string | null }>;
  }[]>();
  const mappingsByClass = new Map<string, { ability: CompositionAbilityAnalyticsRow; mapping: CompositionAbilityMappingAnalyticsRow }[]>();
  const coveredAbilityProviders = new Set<string>();

  activeAbilities.forEach((ability) => {
    const text = resolveAbilityText(ability, spellsById, language);
    const sortOrder = ability.sort_order ?? Number.MAX_SAFE_INTEGER;
    const existing = stats.get(ability.coverage_key);
    const spellNames = spellNamesByCoverage.get(ability.coverage_key) ?? [];
    spellNames.push({ name: text.name, sortOrder });
    spellNamesByCoverage.set(ability.coverage_key, spellNames);
    const spellEntries = spellEntriesByCoverage.get(ability.coverage_key) ?? [];
    spellEntries.push({
      abilityId: ability.id,
      spellId: ability.spell_id,
      name: text.name,
      description: text.description,
      sortOrder,
      providers: new Map(),
    });
    spellEntriesByCoverage.set(ability.coverage_key, spellEntries);

    if (!existing) {
      stats.set(ability.coverage_key, {
        coverageKey: ability.coverage_key,
        abilityKind: ability.ability_kind,
        spellId: ability.spell_id,
        name: resolveCoverageLabel(coverageLabels[ability.coverage_key], 0) ?? text.name,
        description: text.description,
        spellNames: [],
        spellEntries: [],
        count: 0,
        sortOrder,
      });
      return;
    }

    if (sortOrder < existing.sortOrder) {
      existing.abilityKind = ability.ability_kind;
      existing.spellId = ability.spell_id;
      existing.name = resolveCoverageLabel(coverageLabels[ability.coverage_key], 0) ?? text.name;
      existing.description = text.description;
      existing.sortOrder = sortOrder;
    }
  });

  stats.forEach((stat) => {
    const names = spellNamesByCoverage.get(stat.coverageKey) ?? [];
    const uniqueNames = names
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      })
      .reduce<string[]>((result, entry) => {
        if (!result.includes(entry.name)) result.push(entry.name);
        return result;
      }, []);

    stat.spellNames = uniqueNames;
    if (uniqueNames.length > 1) {
      stat.description = uniqueNames.join(', ');
    }
  });

  mappings.forEach((mapping) => {
    const ability = abilitiesById.get(mapping.ability_id);
    if (!ability) return;

    const spellEntries = spellEntriesByCoverage.get(ability.coverage_key);
    const spellEntry = spellEntries?.find(entry => entry.abilityId === ability.id);
    spellEntry?.providers.set(getProviderKey(mapping.class_id, mapping.spec_id), {
      classId: mapping.class_id,
      specId: mapping.spec_id,
    });

    const existing = mappingsByClass.get(mapping.class_id) || [];
    existing.push({ ability, mapping });
    mappingsByClass.set(mapping.class_id, existing);
  });

  members.forEach((member) => {
    const coveredForMember = new Set<string>();

    member.wishes.forEach((wish) => {
      if (!wishMatchesFilters(member, wish)) return;
      if (!wish.class_id) return;

      const entries = mappingsByClass.get(wish.class_id);
      if (!entries) return;

      entries.forEach(({ ability, mapping }) => {
        const wishSpecIds = options.getWishSpecIds?.(wish) ?? wish.spec_ids ?? [];
        if (mapping.spec_id && !wishSpecIds.includes(mapping.spec_id)) return;
        coveredForMember.add(ability.coverage_key);
        coveredAbilityProviders.add(
          `${ability.id}:${getProviderKey(mapping.class_id, mapping.spec_id)}`,
        );
      });
    });

    coveredForMember.forEach((coverageKey) => {
      const stat = stats.get(coverageKey);
      if (stat) stat.count += 1;
    });
  });

  stats.forEach((stat) => {
    stat.name = resolveCoverageLabel(coverageLabels[stat.coverageKey], stat.count) ?? stat.name;

    const spellEntries = (spellEntriesByCoverage.get(stat.coverageKey) ?? [])
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      })
      .map((entry) => {
        const providers = Array.from(entry.providers.values()).map(provider => ({
          ...provider,
          covered: coveredAbilityProviders.has(
            `${entry.abilityId}:${getProviderKey(provider.classId, provider.specId)}`,
          ),
        }));

        return {
          spellId: entry.spellId ?? 0,
          name: entry.name,
          description: entry.description || undefined,
          sortOrder: entry.sortOrder,
          providers,
          covered: providers.some(provider => provider.covered),
        };
      });
    stat.spellEntries = mergeEquivalentCoverageSpellEntries(spellEntries);
  });

  return Array.from(stats.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
};
