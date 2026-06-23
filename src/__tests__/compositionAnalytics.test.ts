import { describe, expect, it } from 'vitest';

import type { WowSpellAnalyticsRow } from '@/lib/raidEffectAnalytics';

import {
  buildCompositionCoverage,
  type CompositionAbilityAnalyticsRow,
  type CompositionAbilityMappingAnalyticsRow,
  type CompositionMemberInput,
  type CompositionWishInput,
} from '@/lib/compositionAnalytics';

type TestWish = CompositionWishInput & {
  valid?: boolean;
};

const alwaysMatch = (_member: CompositionMemberInput<TestWish>, wish: TestWish) => wish.valid !== false;

const createAbility = (
  ability: Partial<CompositionAbilityAnalyticsRow> & { id: string; ability_key: string; coverage_key?: string },
): CompositionAbilityAnalyticsRow => ({
  id: ability.id,
  ability_key: ability.ability_key,
  coverage_key: ability.coverage_key ?? ability.ability_key,
  ability_kind: ability.ability_kind ?? 'raid_utility',
  spell_id: ability.spell_id ?? null,
  cooldown_profile: ability.cooldown_profile ?? null,
  cooldown_seconds: ability.cooldown_seconds ?? null,
  active: ability.active ?? true,
  sort_order: ability.sort_order ?? null,
});

const createMapping = (
  mapping: Partial<CompositionAbilityMappingAnalyticsRow> & { ability_id: string; class_id: string },
): CompositionAbilityMappingAnalyticsRow => ({
  ability_id: mapping.ability_id,
  class_id: mapping.class_id,
  spec_id: mapping.spec_id ?? null,
  role: mapping.role ?? null,
  applies_to_main: mapping.applies_to_main ?? true,
  applies_to_offspec_alt: mapping.applies_to_offspec_alt ?? false,
});

const createSpell = (spell: Partial<WowSpellAnalyticsRow> & { spell_id: number }): WowSpellAnalyticsRow => ({
  spell_id: spell.spell_id,
  name_en: spell.name_en ?? null,
  description_en: spell.description_en ?? null,
  name_fr: spell.name_fr ?? null,
  description_fr: spell.description_fr ?? null,
  name_de: spell.name_de ?? null,
  description_de: spell.description_de ?? null,
  name_es: spell.name_es ?? null,
  description_es: spell.description_es ?? null,
  name_pt_br: spell.name_pt_br ?? null,
  description_pt_br: spell.description_pt_br ?? null,
  name_it: spell.name_it ?? null,
  description_it: spell.description_it ?? null,
  name_ru: spell.name_ru ?? null,
  description_ru: spell.description_ru ?? null,
  name_zh_tw: spell.name_zh_tw ?? null,
  description_zh_tw: spell.description_zh_tw ?? null,
  name_ko: spell.name_ko ?? null,
  description_ko: spell.description_ko ?? null,
});

describe('composition analytics', () => {
  it('counts class-wide utility coverage from matching classes', () => {
    const abilities = [createAbility({ id: 'a1', ability_key: 'bloodlust', spell_id: 2825 })];
    const mappings = [createMapping({ ability_id: 'a1', class_id: 'shaman' })];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'shaman', spec_ids: ['shaman-restoration'] }] },
      { wishes: [{ class_id: 'mage', spec_ids: ['mage-arcane'] }] },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'en', alwaysMatch);

    expect(result).toHaveLength(1);
    expect(result[0].coverageKey).toBe('bloodlust');
    expect(result[0].count).toBe(1);
  });

  it('counts spec-specific abilities only when the wished spec matches', () => {
    const abilities = [createAbility({ id: 'a1', ability_key: 'ebon_might', ability_kind: 'external', spell_id: 395152 })];
    const mappings = [createMapping({ ability_id: 'a1', class_id: 'evoker', spec_id: 'evoker-augmentation' })];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-devastation'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-augmentation'] }] },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'en', alwaysMatch);

    expect(result[0].count).toBe(1);
  });

  it('counts each coverage key at most once per member across multiple mappings', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'heroism', coverage_key: 'bloodlust', spell_id: 32182 }),
      createAbility({ id: 'a2', ability_key: 'bloodlust', coverage_key: 'bloodlust', spell_id: 2825 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'shaman' }),
      createMapping({ ability_id: 'a2', class_id: 'shaman' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      {
        wishes: [
          { class_id: 'shaman', spec_ids: ['shaman-restoration'] },
          { class_id: 'shaman', spec_ids: ['shaman-elemental'] },
        ],
      },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'en', alwaysMatch);

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
  });

  it('combines bloodlust-equivalent abilities from different classes under one coverage key', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'bloodlust', coverage_key: 'bloodlust', spell_id: 2825, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'time_warp', coverage_key: 'bloodlust', spell_id: 80353, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'primal_rage', coverage_key: 'bloodlust', spell_id: 264667, sort_order: 3 }),
      createAbility({ id: 'a4', ability_key: 'fury_of_the_aspects', coverage_key: 'bloodlust', spell_id: 390386, sort_order: 4 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'shaman' }),
      createMapping({ ability_id: 'a2', class_id: 'mage' }),
      createMapping({ ability_id: 'a3', class_id: 'hunter' }),
      createMapping({ ability_id: 'a4', class_id: 'evoker' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'mage', spec_ids: ['mage-arcane'] }] },
      { wishes: [{ class_id: 'hunter', spec_ids: ['hunter-beast-mastery'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-preservation'] }] },
    ];
    const spells = [
      createSpell({ spell_id: 2825, name_en: 'Bloodlust', name_fr: 'Furie sanguinaire' }),
      createSpell({ spell_id: 80353, name_en: 'Time Warp', name_fr: 'Distorsion temporelle' }),
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, spells, 'fr', alwaysMatch);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'bloodlust',
      name: 'Furie sanguinaire',
      count: 3,
      spellNames: ['Furie sanguinaire', 'Distorsion temporelle', 'Spell 264667', 'Spell 390386'],
    });
  });

  it('uses coverage label overrides and grouped spell names for multi-spell rows', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'rebirth', coverage_key: 'combat_res', spell_id: 20484, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'raise_ally', coverage_key: 'combat_res', spell_id: 61999, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'druid' }),
      createMapping({ ability_id: 'a2', class_id: 'death-knight' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'druid' }, { class_id: 'death-knight' }] },
    ];
    const spells = [
      createSpell({
        spell_id: 20484,
        name_en: 'Rebirth',
        description_en: 'Returns the spirit to the body.',
      }),
      createSpell({
        spell_id: 61999,
        name_en: 'Raise Ally',
        description_en: 'Raises a fallen ally.',
      }),
    ];

    const result = buildCompositionCoverage(
      members,
      abilities,
      mappings,
      spells,
      'en',
      alwaysMatch,
      { coverageLabels: { combat_res: 'Combat resurrection' } },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'combat_res',
      name: 'Combat resurrection',
      description: 'Rebirth, Raise Ally',
      spellNames: ['Rebirth', 'Raise Ally'],
      count: 1,
    });
  });

  it('omits inactive catalog rows and empty catalog data', () => {
    const inactive = [createAbility({ id: 'a1', ability_key: 'bloodlust', active: false })];
    const mappings = [createMapping({ ability_id: 'a1', class_id: 'shaman' })];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'shaman', spec_ids: ['shaman-restoration'] }] },
    ];

    expect(buildCompositionCoverage(members, inactive, mappings, [], 'en', alwaysMatch)).toEqual([]);
    expect(buildCompositionCoverage(members, [], mappings, [], 'en', alwaysMatch)).toEqual([]);
  });

  it('prefers current locale spell text, then English, then spell id fallback', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'bloodlust', spell_id: 2825, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'soulwell', spell_id: 29893, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'missing_spell', spell_id: 999999, sort_order: 3 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'shaman' }),
      createMapping({ ability_id: 'a2', class_id: 'warlock' }),
      createMapping({ ability_id: 'a3', class_id: 'mage' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'shaman' }, { class_id: 'warlock' }, { class_id: 'mage' }] },
    ];
    const spells = [
      createSpell({ spell_id: 2825, name_en: 'Bloodlust', name_fr: 'Furie sanguinaire' }),
      createSpell({ spell_id: 29893, name_en: 'Create Soulwell' }),
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, spells, 'fr', alwaysMatch);

    expect(result.map(stat => stat.name)).toEqual([
      'Furie sanguinaire',
      'Create Soulwell',
      'Spell 999999',
    ]);
  });
});
