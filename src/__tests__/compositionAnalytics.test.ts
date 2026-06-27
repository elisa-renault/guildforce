import { describe, expect, it } from 'vitest';

import type { RaidEffectStat, WowSpellAnalyticsRow } from '@/lib/raidEffectAnalytics';

import {
  buildCompositionCoverage,
  buildCompositionCoverageSections,
  type CompositionAbilityAnalyticsRow,
  type CompositionAbilityMappingAnalyticsRow,
  type CompositionCoverageStat,
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

const createRaidStat = (
  stat: Partial<RaidEffectStat> & { spellId: number; name: string },
): RaidEffectStat => ({
  spellId: stat.spellId,
  coverageKey: stat.coverageKey ?? String(stat.spellId),
  name: stat.name,
  description: stat.description ?? '',
  spellNames: stat.spellNames ?? [stat.name],
  spellEntries: stat.spellEntries ?? [{
    spellId: stat.spellId,
    name: stat.name,
    providers: [],
    covered: (stat.count ?? 0) > 0,
    sortOrder: stat.sortOrder ?? 1,
  }],
  count: stat.count ?? 0,
  sortOrder: stat.sortOrder ?? 1,
});

const createCoverageStat = (
  stat: Partial<CompositionCoverageStat> & { coverageKey: string; spellId: number | null; name: string },
): CompositionCoverageStat => ({
  coverageKey: stat.coverageKey,
  abilityKind: stat.abilityKind ?? 'raid_utility',
  spellId: stat.spellId,
  name: stat.name,
  description: stat.description ?? '',
  spellNames: stat.spellNames ?? [stat.name],
  spellEntries: stat.spellEntries ?? (stat.spellId ? [{
    spellId: stat.spellId,
    name: stat.name,
    providers: [],
    covered: (stat.count ?? 0) > 0,
    sortOrder: stat.sortOrder ?? 1,
  }] : []),
  count: stat.count ?? 0,
  sortOrder: stat.sortOrder ?? 1,
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
      createAbility({ id: 'a2', ability_key: 'heroism', coverage_key: 'bloodlust', spell_id: 32182, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'time_warp', coverage_key: 'bloodlust', spell_id: 80353, sort_order: 3 }),
      createAbility({ id: 'a4', ability_key: 'primal_rage', coverage_key: 'bloodlust', spell_id: 264667, sort_order: 4 }),
      createAbility({ id: 'a5', ability_key: 'fury_of_the_aspects', coverage_key: 'bloodlust', spell_id: 390386, sort_order: 5 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'shaman' }),
      createMapping({ ability_id: 'a2', class_id: 'shaman' }),
      createMapping({ ability_id: 'a3', class_id: 'mage' }),
      createMapping({ ability_id: 'a4', class_id: 'hunter' }),
      createMapping({ ability_id: 'a5', class_id: 'evoker' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'mage', spec_ids: ['mage-arcane'] }] },
      { wishes: [{ class_id: 'hunter', spec_ids: ['hunter-beast-mastery'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-preservation'] }] },
    ];
    const spells = [
      createSpell({ spell_id: 2825, name_en: 'Bloodlust', name_fr: 'Furie sanguinaire' }),
      createSpell({ spell_id: 32182, name_en: 'Heroism', name_fr: 'Héroïsme' }),
      createSpell({ spell_id: 80353, name_en: 'Time Warp', name_fr: 'Distorsion temporelle' }),
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, spells, 'fr', alwaysMatch);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'bloodlust',
      name: 'Furie sanguinaire',
      count: 3,
      spellNames: ['Furie sanguinaire', 'Héroïsme', 'Distorsion temporelle', 'Spell 264667', 'Spell 390386'],
    });
    expect(result[0].spellEntries).toEqual([
      expect.objectContaining({
        name: 'Furie sanguinaire / Héroïsme',
        covered: false,
        providers: [expect.objectContaining({ classId: 'shaman', covered: false })],
      }),
      expect.objectContaining({
        name: 'Distorsion temporelle',
        covered: true,
        providers: [expect.objectContaining({ classId: 'mage', covered: true })],
      }),
      expect.objectContaining({
        name: 'Spell 264667',
        covered: true,
        providers: [expect.objectContaining({ classId: 'hunter', covered: true })],
      }),
      expect.objectContaining({
        name: 'Spell 390386',
        covered: true,
        providers: [expect.objectContaining({ classId: 'evoker', covered: true })],
      }),
    ]);
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
      { wishes: [{ class_id: 'druid' }] },
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
    expect(result[0].spellEntries).toEqual([
      expect.objectContaining({
        name: 'Rebirth',
        covered: true,
        providers: [expect.objectContaining({ classId: 'druid', covered: true })],
      }),
      expect.objectContaining({
        name: 'Raise Ally',
        covered: false,
        providers: [expect.objectContaining({ classId: 'death-knight', covered: false })],
      }),
    ]);
  });

  it('chooses singular coverage labels for 0 or 1 matches and plural labels above 1', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'stampeding_roar', coverage_key: 'burst_move_speed', spell_id: 106898, sort_order: 1 }),
    ];
    const mappings = [createMapping({ ability_id: 'a1', class_id: 'druid' })];
    const labels = {
      burst_move_speed: {
        singular: 'Mobilité de groupe',
        plural: 'Mobilité de groupe',
      },
    };

    const noMatches = buildCompositionCoverage(
      [],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      { coverageLabels: labels },
    );
    expect(noMatches[0].name).toBe('Mobilité de groupe');

    const oneMatch = buildCompositionCoverage(
      [{ wishes: [{ class_id: 'druid' }] }],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      { coverageLabels: labels },
    );
    expect(oneMatch[0].name).toBe('Mobilité de groupe');

    const multipleMatches = buildCompositionCoverage(
      [
        { wishes: [{ class_id: 'druid' }] },
        { wishes: [{ class_id: 'druid' }] },
      ],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      { coverageLabels: labels },
    );
    expect(multipleMatches[0].name).toBe('Mobilité de groupe');
  });

  it('keeps demonic gateway separate from group mobility coverage', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'stampeding_roar', coverage_key: 'burst_move_speed', spell_id: 106898, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'wind_rush_totem', coverage_key: 'burst_move_speed', spell_id: 192077, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'demonic_gateway', coverage_key: 'demonic_gateway', spell_id: 111771, sort_order: 3 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'druid' }),
      createMapping({ ability_id: 'a2', class_id: 'shaman' }),
      createMapping({ ability_id: 'a3', class_id: 'warlock' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'druid' }] },
      { wishes: [{ class_id: 'warlock' }] },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'fr', alwaysMatch, {
      coverageLabels: {
        burst_move_speed: {
          singular: 'Mobilité de groupe',
          plural: 'Mobilité de groupe',
        },
      },
    });

    expect(result).toHaveLength(2);
    expect(result.find(stat => stat.coverageKey === 'burst_move_speed')).toMatchObject({
      coverageKey: 'burst_move_speed',
      name: 'Mobilité de groupe',
      count: 1,
      spellNames: ['Spell 106898', 'Spell 192077'],
    });
    expect(result.find(stat => stat.coverageKey === 'demonic_gateway')).toMatchObject({
      coverageKey: 'demonic_gateway',
      name: 'Spell 111771',
      count: 1,
      spellNames: ['Spell 111771'],
    });
  });

  it('omits inactive execute variants from grouped spell entries and providers', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'execute_warrior_arms', coverage_key: 'execute_damage', spell_id: 163201, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'execute_warrior_fury', coverage_key: 'execute_damage', spell_id: 5308, active: false, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'kill_shot', coverage_key: 'execute_damage', spell_id: 53351, sort_order: 3 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'warrior', spec_id: 'warrior-arms' }),
      createMapping({ ability_id: 'a2', class_id: 'warrior', spec_id: 'warrior-fury' }),
      createMapping({ ability_id: 'a3', class_id: 'hunter' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'warrior', spec_ids: ['warrior-arms'] }] },
      { wishes: [{ class_id: 'warrior', spec_ids: ['warrior-fury'] }] },
      { wishes: [{ class_id: 'hunter' }] },
    ];
    const spells = [
      createSpell({ spell_id: 163201, name_en: 'Execute' }),
      createSpell({ spell_id: 5308, name_en: 'Execute' }),
      createSpell({ spell_id: 53351, name_en: 'Kill Shot' }),
    ];

    const result = buildCompositionCoverage(
      members,
      abilities,
      mappings,
      spells,
      'en',
      alwaysMatch,
      {
        coverageLabels: {
          execute_damage: { singular: 'Execute damage', plural: 'Execute damage' },
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'execute_damage',
      name: 'Execute damage',
      count: 2,
      spellNames: ['Execute', 'Kill Shot'],
    });
    expect(result[0].spellEntries).toEqual([
      expect.objectContaining({
        name: 'Execute',
        providers: [expect.objectContaining({ classId: 'warrior', specId: 'warrior-arms' })],
      }),
      expect.objectContaining({
        name: 'Kill Shot',
        providers: [expect.objectContaining({ classId: 'hunter', specId: null })],
      }),
    ]);
    expect(JSON.stringify(result[0].spellEntries)).not.toContain('warrior-fury');
  });

  it('groups extra damage to shields providers across warrior, evoker, and priest', () => {
    const abilities = [
      createAbility({
        id: 'a1',
        ability_key: 'wrecking_throw_extra_shield_damage',
        coverage_key: 'extra_damage_to_shields',
        spell_id: 384110,
        sort_order: 1,
      }),
      createAbility({
        id: 'a2',
        ability_key: 'shattering_throw_extra_shield_damage',
        coverage_key: 'extra_damage_to_shields',
        spell_id: 64382,
        sort_order: 2,
      }),
      createAbility({
        id: 'a3',
        ability_key: 'unravel_extra_shield_damage',
        coverage_key: 'extra_damage_to_shields',
        spell_id: 1264378,
        sort_order: 3,
      }),
      createAbility({
        id: 'a4',
        ability_key: 'devour_matter_extra_shield_damage',
        coverage_key: 'extra_damage_to_shields',
        spell_id: 451840,
        sort_order: 4,
      }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'warrior' }),
      createMapping({ ability_id: 'a2', class_id: 'warrior' }),
      createMapping({ ability_id: 'a3', class_id: 'evoker' }),
      createMapping({ ability_id: 'a4', class_id: 'priest', spec_id: 'priest-discipline' }),
      createMapping({ ability_id: 'a4', class_id: 'priest', spec_id: 'priest-shadow' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'warrior', spec_ids: ['warrior-arms'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-devastation'] }] },
      { wishes: [{ class_id: 'priest', spec_ids: ['priest-holy'] }] },
      { wishes: [{ class_id: 'priest', spec_ids: ['priest-shadow'] }] },
    ];
    const spells = [
      createSpell({ spell_id: 384110, name_en: 'Wrecking Throw' }),
      createSpell({ spell_id: 64382, name_en: 'Shattering Throw' }),
      createSpell({ spell_id: 1264378, name_en: 'Unravel' }),
      createSpell({ spell_id: 451840, name_en: 'Devour Matter' }),
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, spells, 'en', alwaysMatch, {
      coverageLabels: {
        extra_damage_to_shields: {
          singular: 'Extra damage to shields',
          plural: 'Extra damage to shields',
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'extra_damage_to_shields',
      name: 'Extra damage to shields',
      count: 3,
      spellNames: ['Wrecking Throw', 'Shattering Throw', 'Unravel', 'Devour Matter'],
    });
    expect(result[0].spellEntries).toEqual([
      expect.objectContaining({
        spellId: 384110,
        providers: [expect.objectContaining({ classId: 'warrior', specId: null, covered: true })],
      }),
      expect.objectContaining({
        spellId: 64382,
        providers: [expect.objectContaining({ classId: 'warrior', specId: null, covered: true })],
      }),
      expect.objectContaining({
        spellId: 1264378,
        providers: [expect.objectContaining({ classId: 'evoker', specId: null, covered: true })],
      }),
      expect.objectContaining({
        spellId: 451840,
        providers: [
          expect.objectContaining({ classId: 'priest', specId: 'priest-discipline', covered: false }),
          expect.objectContaining({ classId: 'priest', specId: 'priest-shadow', covered: true }),
        ],
      }),
    ]);
  });

  it('uses disenrage coverage labels for grouped soothe abilities', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'soothe', coverage_key: 'soothe', spell_id: 2908, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'tranquilizing_shot_soothe', coverage_key: 'soothe', spell_id: 19801, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'druid' }),
      createMapping({ ability_id: 'a2', class_id: 'hunter' }),
    ];

    const resultFr = buildCompositionCoverage(
      [
        { wishes: [{ class_id: 'druid' }] },
        { wishes: [{ class_id: 'hunter' }] },
      ],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      { coverageLabels: { soothe: { singular: 'Apaisement', plural: 'Apaisements' } } },
    );
    expect(resultFr[0].name).toBe('Apaisements');

    const resultEn = buildCompositionCoverage(
      [],
      abilities,
      mappings,
      [],
      'en',
      alwaysMatch,
      { coverageLabels: { soothe: { singular: 'Disenrage', plural: 'Disenrages' } } },
    );
    expect(resultEn[0].name).toBe('Disenrage');
  });

  it('groups warlock curses under one coverage label', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'curse_of_weakness_attack_speed', coverage_key: 'warlock_curses', spell_id: 702, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'curse_of_tongues_cast_speed', coverage_key: 'warlock_curses', spell_id: 1714, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'warlock' }),
      createMapping({ ability_id: 'a2', class_id: 'warlock' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'warlock' }] },
      { wishes: [{ class_id: 'warlock' }] },
    ];
    const spells = [
      createSpell({ spell_id: 702, name_fr: 'Malédiction de faiblesse' }),
      createSpell({ spell_id: 1714, name_fr: 'Malédiction des langages' }),
    ];

    const result = buildCompositionCoverage(
      members,
      abilities,
      mappings,
      spells,
      'fr',
      alwaysMatch,
      {
        coverageLabels: {
          warlock_curses: {
            singular: 'Malédiction de démoniste',
            plural: 'Malédictions de démoniste',
          },
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'warlock_curses',
      name: 'Malédictions de démoniste',
      count: 2,
      spellNames: ['Malédiction de faiblesse', 'Malédiction des langages'],
    });
    expect(result[0].spellEntries).toEqual([
      expect.objectContaining({ name: 'Malédiction de faiblesse' }),
      expect.objectContaining({ name: 'Malédiction des langages' }),
    ]);
  });

  it('normalizes legacy separate warlock curse coverage keys into one row', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'curse_of_weakness_attack_speed', coverage_key: 'attack_speed_reduction', spell_id: 702, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'curse_of_tongues_cast_speed', coverage_key: 'cast_speed_reduction', spell_id: 1714, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'warlock' }),
      createMapping({ ability_id: 'a2', class_id: 'warlock' }),
    ];
    const spells = [
      createSpell({ spell_id: 702, name_fr: 'Malédiction de faiblesse' }),
      createSpell({ spell_id: 1714, name_fr: 'Malédiction des langages' }),
    ];

    const result = buildCompositionCoverage(
      [{ wishes: [{ class_id: 'warlock' }] }],
      abilities,
      mappings,
      spells,
      'fr',
      alwaysMatch,
      {
        coverageLabels: {
          warlock_curses: {
            singular: 'Malédiction de démoniste',
            plural: 'Malédictions de démoniste',
          },
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      coverageKey: 'warlock_curses',
      name: 'Malédiction de démoniste',
      spellNames: ['Malédiction de faiblesse', 'Malédiction des langages'],
    });
  });

  it('uses healing reduction labels for mortal wounds coverage', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'mortal_strike', coverage_key: 'mortal_strike', spell_id: 12294, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'wound_poison_mortal_wounds', coverage_key: 'mortal_strike', spell_id: 8679, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'warrior', spec_id: 'warrior-arms' }),
      createMapping({ ability_id: 'a2', class_id: 'rogue' }),
    ];

    const singular = buildCompositionCoverage(
      [{ wishes: [{ class_id: 'warrior', spec_ids: ['warrior-arms'] }] }],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      {
        coverageLabels: {
          mortal_strike: {
            singular: 'Réduction des soins',
            plural: 'Réductions des soins',
          },
        },
      },
    );
    expect(singular[0].name).toBe('Réduction des soins');

    const plural = buildCompositionCoverage(
      [
        { wishes: [{ class_id: 'warrior', spec_ids: ['warrior-arms'] }] },
        { wishes: [{ class_id: 'rogue' }] },
      ],
      abilities,
      mappings,
      [],
      'fr',
      alwaysMatch,
      {
        coverageLabels: {
          mortal_strike: {
            singular: 'Réduction des soins',
            plural: 'Réductions des soins',
          },
        },
      },
    );
    expect(plural[0].name).toBe('Réductions des soins');
  });

  it('normalizes legacy external and raid defensive keys without double-counting one member', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'blessing_of_protection', coverage_key: 'blessing_of_protection', spell_id: 1022, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'blessing_of_spellwarding', coverage_key: 'blessing_of_spellwarding', spell_id: 204018, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'anti_magic_zone', coverage_key: 'anti_magic_zone', ability_kind: 'raid_defensive', spell_id: 51052, sort_order: 3 }),
      createAbility({ id: 'a4', ability_key: 'rallying_cry', coverage_key: 'rallying_cry', ability_kind: 'raid_defensive', spell_id: 97462, sort_order: 4 }),
      createAbility({ id: 'a5', ability_key: 'darkness', coverage_key: 'darkness', ability_kind: 'raid_defensive', spell_id: 196718, sort_order: 5 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'paladin' }),
      createMapping({ ability_id: 'a2', class_id: 'paladin', spec_id: 'paladin-protection' }),
      createMapping({ ability_id: 'a3', class_id: 'death-knight' }),
      createMapping({ ability_id: 'a4', class_id: 'warrior' }),
      createMapping({ ability_id: 'a5', class_id: 'demon-hunter' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'paladin', spec_ids: ['paladin-protection'] }] },
      { wishes: [{ class_id: 'death-knight' }] },
      { wishes: [{ class_id: 'warrior' }] },
      { wishes: [{ class_id: 'demon-hunter' }] },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'en', alwaysMatch, {
      coverageLabels: {
        external_defensives: { singular: 'External defensive', plural: 'External defensives' },
        raid_defensives: { singular: 'Raid defensive', plural: 'Raid defensives' },
      },
    });

    expect(result).toHaveLength(2);
    expect(result.find(stat => stat.coverageKey === 'external_defensives')).toMatchObject({
      count: 1,
      name: 'External defensive',
      spellNames: ['Spell 1022', 'Spell 204018'],
    });
    expect(result.find(stat => stat.coverageKey === 'raid_defensives')).toMatchObject({
      count: 3,
      name: 'Raid defensives',
      spellNames: ['Spell 51052', 'Spell 97462', 'Spell 196718'],
    });
  });

  it('separates legacy knockback and knockup rows and labels callable aoe cc groups', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'typhoon_knock', coverage_key: 'knock_up_back', spell_id: 132469, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'tail_swipe_knock', coverage_key: 'knock_up_back', spell_id: 368970, sort_order: 2 }),
      createAbility({ id: 'a3', ability_key: 'chaos_nova_aoe_stun', coverage_key: 'aoe_stuns', spell_id: 179057, sort_order: 3 }),
      createAbility({ id: 'a4', ability_key: 'mass_entanglement_aoe_root', coverage_key: 'aoe_roots', spell_id: 102359, sort_order: 4 }),
      createAbility({ id: 'a5', ability_key: 'tar_trap_aoe_slow', coverage_key: 'aoe_slows', spell_id: 187698, sort_order: 5 }),
      createAbility({ id: 'a6', ability_key: 'binding_shot_aoe_stun', coverage_key: 'binding_shot', spell_id: 117526, sort_order: 6 }),
      createAbility({ id: 'a7', ability_key: 'storm_bolts_aoe_stun', coverage_key: 'aoe_stuns', spell_id: 107570, sort_order: 7 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'druid' }),
      createMapping({ ability_id: 'a2', class_id: 'evoker' }),
      createMapping({ ability_id: 'a3', class_id: 'demon-hunter', spec_id: 'dh-havoc' }),
      createMapping({ ability_id: 'a3', class_id: 'demon-hunter', spec_id: 'dh-vengeance' }),
      createMapping({ ability_id: 'a4', class_id: 'druid' }),
      createMapping({ ability_id: 'a5', class_id: 'hunter' }),
      createMapping({ ability_id: 'a6', class_id: 'hunter' }),
      createMapping({ ability_id: 'a7', class_id: 'warrior' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'druid' }] },
      { wishes: [{ class_id: 'evoker' }] },
      { wishes: [{ class_id: 'demon-hunter', spec_ids: ['dh-havoc'] }] },
      { wishes: [{ class_id: 'demon-hunter', spec_ids: ['dh-devourer'] }] },
      { wishes: [{ class_id: 'hunter' }] },
      { wishes: [{ class_id: 'warrior' }] },
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, [], 'en', alwaysMatch, {
      coverageLabels: {
        knockbacks: { singular: 'Knockback', plural: 'Knockbacks' },
        knockups: { singular: 'Knockup', plural: 'Knockups' },
        aoe_stuns: { singular: 'AoE stun', plural: 'AoE stuns' },
        aoe_roots: { singular: 'AoE root', plural: 'AoE roots' },
        aoe_slows: { singular: 'AoE slow', plural: 'AoE slows' },
      },
    });

    expect(result.map(stat => stat.coverageKey).sort()).toEqual([
      'aoe_roots',
      'aoe_slows',
      'aoe_stuns',
      'knockbacks',
      'knockups',
    ].sort());
    expect(result.find(stat => stat.coverageKey === 'knockbacks')).toMatchObject({
      count: 1,
      name: 'Knockback',
      spellNames: ['Spell 132469'],
    });
    expect(result.find(stat => stat.coverageKey === 'knockups')).toMatchObject({
      count: 1,
      name: 'Knockup',
      spellNames: ['Spell 368970'],
    });
    expect(result.find(stat => stat.coverageKey === 'aoe_stuns')).toMatchObject({
      count: 2,
      name: 'AoE stuns',
      spellNames: ['Spell 179057', 'Spell 117526'],
    });
  });

  it('keeps distinct single-spell rows and their spell descriptions when coverage keys differ', () => {
    const abilities = [
      createAbility({ id: 'a1', ability_key: 'death_grip', coverage_key: 'death_grip', spell_id: 49576, sort_order: 1 }),
      createAbility({ id: 'a2', ability_key: 'anti_magic_zone', coverage_key: 'anti_magic_zone', spell_id: 51052, sort_order: 2 }),
    ];
    const mappings = [
      createMapping({ ability_id: 'a1', class_id: 'death-knight' }),
      createMapping({ ability_id: 'a2', class_id: 'death-knight' }),
    ];
    const members: CompositionMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'death-knight' }] },
    ];
    const spells = [
      createSpell({
        spell_id: 49576,
        name_en: 'Death Grip',
        description_en: 'Harnesses the unholy energy that surrounds and binds all matter.',
      }),
      createSpell({
        spell_id: 51052,
        name_en: 'Anti-Magic Zone',
        description_en: 'Places an Anti-Magic Zone for 8 sec.',
      }),
    ];

    const result = buildCompositionCoverage(members, abilities, mappings, spells, 'en', alwaysMatch);

    expect(result).toHaveLength(2);
    expect(result.map(stat => stat.name)).toEqual(['Death Grip', 'Anti-Magic Zone']);
    expect(result.map(stat => stat.description)).toEqual([
      'Harnesses the unholy energy that surrounds and binds all matter.',
      'Places an Anti-Magic Zone for 8 sec.',
    ]);
    expect(result.map(stat => stat.spellNames)).toEqual([['Death Grip'], ['Anti-Magic Zone']]);
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

  it('builds roster composition sections with raid essentials split from major buffs', () => {
    const majorBuff = createRaidStat({ spellId: 2825, coverageKey: 'bloodlust', name: 'Bloodlust', count: 2 });
    const soulwell = createRaidStat({ spellId: 29893, coverageKey: 'soulwell', name: 'Create Soulwell', count: 1 });
    const arcaneIntellect = createRaidStat({ spellId: 1459, coverageKey: 'arcane_intellect', name: 'Arcane Intellect', count: 1 });
    const majorDebuff = createRaidStat({ spellId: 8647, coverageKey: 'mystic_touch', name: 'Mystic Touch', count: 1 });
    const combatRes = createCoverageStat({ coverageKey: 'combat_res', spellId: 20484, name: 'Combat resurrection', count: 1 });
    const powerInfusion = createCoverageStat({ coverageKey: 'power_infusion', spellId: 10060, name: 'Power Infusion', count: 1 });
    const gateway = createCoverageStat({ coverageKey: 'demonic_gateway', spellId: 111771, name: 'Demonic Gateway', count: 1 });
    const magicDispels = createCoverageStat({ coverageKey: 'ally_magic_dispels', spellId: 4987, name: 'Magic dispels', count: 1 });
    const raidDefensive = createCoverageStat({ coverageKey: 'raid_defensives', spellId: 97462, name: 'Raid defensives', count: 1 });

    const sections = buildCompositionCoverageSections(
      { buffs: [majorBuff, soulwell, arcaneIntellect], debuffs: [majorDebuff] },
      [combatRes, powerInfusion, gateway, magicDispels, raidDefensive],
    );

    expect(sections.raidEssentials.map(stat => stat.name)).toEqual([
      'Bloodlust',
      'Combat resurrection',
      'Create Soulwell',
      'Demonic Gateway',
      'Power Infusion',
      'Magic dispels',
    ]);
    expect(sections.majorBuffs.map(stat => stat.name)).toEqual(['Arcane Intellect']);
    expect(sections.raidEnhancements.map(stat => stat.name)).toEqual(['Raid defensives']);
    expect(sections.raidEnhancements).not.toContain(combatRes);
    expect(sections.raidEnhancements).not.toContain(powerInfusion);
    expect(sections.raidEnhancements).not.toContain(gateway);
  });

  it('keeps major debuffs in their dedicated section', () => {
    const majorDebuff = createRaidStat({ spellId: 255260, coverageKey: 'chaos_brand', name: 'Chaos Brand', count: 1 });

    const sections = buildCompositionCoverageSections(
      { buffs: [], debuffs: [majorDebuff] },
      [],
    );

    expect(sections.majorDebuffs).toEqual([majorDebuff]);
    expect(sections.enemyWeakening).toEqual([]);
  });

  it('sorts utility coverage into raid enhancement, controls, and enemy weakening sections', () => {
    const powerInfusion = createCoverageStat({ coverageKey: 'power_infusion', spellId: 10060, name: 'Power Infusion', count: 1 });
    const purge = createCoverageStat({ coverageKey: 'purge', spellId: 370, name: 'Purge', count: 6 });
    const execute = createCoverageStat({ coverageKey: 'execute_damage', spellId: 53351, name: 'Execute damage', count: 2 });
    const allyFreedom = createCoverageStat({ coverageKey: 'ally_freedom_and_mobility', spellId: 1044, name: 'Ally freedom / mobility', count: 4 });
    const threat = createCoverageStat({ coverageKey: 'threat_redirection', spellId: 34477, name: 'Threat redirection', count: 2 });
    const deathGrip = createCoverageStat({ coverageKey: 'death_grip', spellId: 49576, name: 'Death Grip', count: 1 });
    const grips = createCoverageStat({ coverageKey: 'enemy_grips_and_grouping', spellId: 108199, name: 'Enemy grips / grouping', count: 1 });
    const knockup = createCoverageStat({ coverageKey: 'knockups', spellId: 132469, name: 'Knockups', count: 3 });
    const silence = createCoverageStat({ coverageKey: 'silences_and_anti_cast', spellId: 78675, name: 'Silences / anti-cast', count: 5 });
    const interrupt = createCoverageStat({ coverageKey: 'interrupts', spellId: 47528, name: 'Interrupts', count: 5 });

    const sections = buildCompositionCoverageSections(
      { buffs: [], debuffs: [] },
      [purge, powerInfusion, execute, allyFreedom, threat, deathGrip, grips, knockup, silence, interrupt],
    );

    expect(sections.raidEssentials).toEqual([powerInfusion, interrupt]);
    expect(sections.raidEnhancements).toEqual([allyFreedom, threat]);
    expect(sections.controls).toEqual([knockup, grips]);
    expect(sections.enemyWeakening).toEqual([purge, silence, execute]);
  });

  it('sorts major buffs and debuffs by count descending', () => {
    const bloodlust = createRaidStat({ spellId: 2825, coverageKey: 'bloodlust', name: 'Bloodlust', count: 7 });
    const arcaneIntellect = createRaidStat({ spellId: 1459, coverageKey: 'arcane_intellect', name: 'Arcane Intellect', count: 2 });
    const chaosBrand = createRaidStat({ spellId: 255260, coverageKey: 'chaos_brand', name: 'Chaos Brand', count: 1 });
    const mysticTouch = createRaidStat({ spellId: 113746, coverageKey: 'mystic_touch', name: 'Mystic Touch', count: 3 });
    const combatRes = createCoverageStat({ coverageKey: 'combat_res', spellId: 20484, name: 'Combat resurrection', count: 9 });

    const sections = buildCompositionCoverageSections(
      { buffs: [bloodlust, arcaneIntellect], debuffs: [chaosBrand, mysticTouch] },
      [combatRes],
    );

    expect(sections.raidEssentials).toEqual([bloodlust, combatRes]);
    expect(sections.majorBuffs).toEqual([arcaneIntellect]);
    expect(sections.majorDebuffs).toEqual([mysticTouch, chaosBrand]);
  });

  it('deduplicates composition rows already represented by major raid effects', () => {
    const majorBloodlust = createRaidStat({ spellId: 2825, coverageKey: 'bloodlust', name: 'Bloodlust', count: 1 });
    const compositionBloodlust = createCoverageStat({ coverageKey: 'bloodlust', spellId: 2825, name: 'Bloodlust', count: 1 });
    const combatRes = createCoverageStat({ coverageKey: 'combat_res', spellId: 20484, name: 'Combat resurrection', count: 1 });

    const sections = buildCompositionCoverageSections(
      { buffs: [majorBloodlust], debuffs: [] },
      [compositionBloodlust, combatRes],
    );

    expect(sections.raidEssentials).toEqual([majorBloodlust, combatRes]);
    expect(sections.majorBuffs).toEqual([]);
    expect(Object.values(sections).flat()).not.toContain(compositionBloodlust);
  });
});
