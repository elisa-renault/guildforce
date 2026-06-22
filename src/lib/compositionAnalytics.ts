import type { Language } from '@/i18n/config';

import {
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
  count: number;
  sortOrder: number;
}

const defaultCoverageKinds = new Set<string>(['raid_utility', 'raid_defensive', 'external']);

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
  coverageKinds: Iterable<string> = defaultCoverageKinds,
): CompositionCoverageStat[] => {
  const kindSet = new Set(coverageKinds);
  const spellsById = new Map(spells.map(spell => [spell.spell_id, spell]));
  const activeAbilities = abilities.filter(
    ability => ability.active && kindSet.has(ability.ability_kind),
  );
  if (activeAbilities.length === 0) return [];

  const abilitiesById = new Map(activeAbilities.map(ability => [ability.id, ability]));
  const stats = new Map<string, CompositionCoverageStat>();
  const mappingsByClass = new Map<string, { ability: CompositionAbilityAnalyticsRow; mapping: CompositionAbilityMappingAnalyticsRow }[]>();

  activeAbilities.forEach((ability) => {
    const text = resolveAbilityText(ability, spellsById, language);
    const sortOrder = ability.sort_order ?? Number.MAX_SAFE_INTEGER;
    const existing = stats.get(ability.coverage_key);

    if (!existing) {
      stats.set(ability.coverage_key, {
        coverageKey: ability.coverage_key,
        abilityKind: ability.ability_kind,
        spellId: ability.spell_id,
        name: text.name,
        description: text.description,
        count: 0,
        sortOrder,
      });
      return;
    }

    if (sortOrder < existing.sortOrder) {
      existing.abilityKind = ability.ability_kind;
      existing.spellId = ability.spell_id;
      existing.name = text.name;
      existing.description = text.description;
      existing.sortOrder = sortOrder;
    }
  });

  mappings.forEach((mapping) => {
    const ability = abilitiesById.get(mapping.ability_id);
    if (!ability) return;

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
      });
    });

    coveredForMember.forEach((coverageKey) => {
      const stat = stats.get(coverageKey);
      if (stat) stat.count += 1;
    });
  });

  return Array.from(stats.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
};
