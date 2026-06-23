import type { Language } from '@/i18n/config';

import {
  mergeEquivalentCoverageSpellEntries,
  type CoverageSpellEntry,
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

const defaultCoverageKinds = new Set<string>(['raid_utility', 'raid_defensive', 'external']);

export interface BuildCompositionCoverageOptions {
  coverageKinds?: Iterable<string>;
  coverageLabels?: Partial<Record<string, string>>;
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
  const activeAbilities = abilities.filter(
    ability => ability.active && kindSet.has(ability.ability_kind),
  );
  if (activeAbilities.length === 0) return [];

  const abilitiesById = new Map(activeAbilities.map(ability => [ability.id, ability]));
  const stats = new Map<string, CompositionCoverageStat>();
  const spellNamesByCoverage = new Map<string, { name: string; sortOrder: number }[]>();
  const spellEntriesByCoverage = new Map<string, {
    abilityId: string;
    spellId: number | null;
    name: string;
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
      sortOrder,
      providers: new Map(),
    });
    spellEntriesByCoverage.set(ability.coverage_key, spellEntries);

    if (!existing) {
      stats.set(ability.coverage_key, {
        coverageKey: ability.coverage_key,
        abilityKind: ability.ability_kind,
        spellId: ability.spell_id,
        name: coverageLabels[ability.coverage_key] ?? text.name,
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
      existing.name = coverageLabels[ability.coverage_key] ?? text.name;
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
        if (mapping.spec_id && !wish.spec_ids?.includes(mapping.spec_id)) return;
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
