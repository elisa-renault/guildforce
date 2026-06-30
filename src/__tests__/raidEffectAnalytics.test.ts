import { describe, expect, it } from 'vitest';

import {
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/i18n/config';
import {
  buildMajorBuffsDebuffs,
  resolveWowSpellText,
  type RaidEffectAnalyticsRow,
  type RaidEffectMemberInput,
  type RaidEffectWishInput,
  type WowSpellAnalyticsRow,
} from '@/lib/raidEffectAnalytics';

type TestWish = RaidEffectWishInput & {
  valid?: boolean;
};

const alwaysMatch = (_member: RaidEffectMemberInput<TestWish>, wish: TestWish) => wish.valid !== false;

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

const effects: RaidEffectAnalyticsRow[] = [
  {
    class_id: 'mage',
    spec_id: null,
    category: 'major_buff',
    spell_id: 1459,
    sort_order: 10,
  },
  {
    class_id: 'monk',
    spec_id: null,
    category: 'major_debuff',
    spell_id: 8647,
    sort_order: 20,
  },
  {
    class_id: 'evoker',
    spec_id: 'evoker-augmentation',
    category: 'major_buff',
    spell_id: 395152,
    sort_order: 30,
  },
];

const spells: WowSpellAnalyticsRow[] = [
  createSpell({
    spell_id: 1459,
    name_en: 'Arcane Intellect',
    description_en: 'Increases Intellect.',
    name_fr: 'Intelligence des Arcanes',
    description_fr: 'Augmente Intelligence.',
  }),
  createSpell({
    spell_id: 8647,
    name_en: 'Mystic Touch',
    description_en: 'Increases physical damage taken.',
  }),
  createSpell({
    spell_id: 395152,
    name_en: 'Ebon Might',
    description_en: 'Empowers allies.',
    name_fr: 'Puissance d\'ébène',
    description_fr: 'Renforce les alliés.',
  }),
];

describe('raid effect analytics', () => {
  it('counts covered buffs from matching classes and keeps missing debuffs at zero', () => {
    const members: RaidEffectMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'mage', spec_ids: ['mage-arcane'] }] },
      { wishes: [{ class_id: 'warrior', spec_ids: ['warrior-arms'] }] },
    ];

    const result = buildMajorBuffsDebuffs(members, effects, spells, 'en', alwaysMatch);

    expect(result.buffs.find((buff) => buff.spellId === 1459)?.count).toBe(1);
    expect(result.debuffs.find((debuff) => debuff.spellId === 8647)?.count).toBe(0);
    expect(result.buffs.find((buff) => buff.spellId === 1459)?.spellEntries[0]?.description).toBe('Increases Intellect.');
    expect(result.debuffs.find((debuff) => debuff.spellId === 8647)?.spellEntries[0]?.description).toBe(
      'Increases physical damage taken.',
    );
  });

  it('counts spec-specific effects only when the wished spec matches', () => {
    const members: RaidEffectMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-devastation'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-augmentation'] }] },
    ];

    const result = buildMajorBuffsDebuffs(members, effects, spells, 'en', alwaysMatch);

    expect(result.buffs.find((buff) => buff.spellId === 395152)?.count).toBe(1);
  });

  it('uses the effective wish specialization list for spec-specific effects', () => {
    const members: RaidEffectMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-devastation', 'evoker-augmentation'] }] },
    ];

    const result = buildMajorBuffsDebuffs(members, effects, spells, 'en', alwaysMatch, {
      getWishSpecIds: wish => wish.spec_ids?.slice(0, 1) ?? [],
    });

    const ebonMight = result.buffs.find((buff) => buff.spellId === 395152);
    expect(ebonMight?.count).toBe(0);
    expect(ebonMight?.spellEntries[0]).toMatchObject({
      covered: false,
      providers: [expect.objectContaining({ classId: 'evoker', specId: 'evoker-augmentation', covered: false })],
    });
  });

  it('groups bloodlust-equivalent major buffs under one coverage row', () => {
    const bloodlustEffects: RaidEffectAnalyticsRow[] = [
      {
        class_id: 'shaman',
        spec_id: null,
        category: 'major_buff',
        spell_id: 2825,
        effect_key: 'bloodlust',
        sort_order: 90,
      },
      {
        class_id: 'shaman',
        spec_id: null,
        category: 'major_buff',
        spell_id: 32182,
        effect_key: 'heroism',
        sort_order: 91,
      },
      {
        class_id: 'mage',
        spec_id: null,
        category: 'major_buff',
        spell_id: 80353,
        effect_key: 'time_warp',
        sort_order: 92,
      },
      {
        class_id: 'hunter',
        spec_id: null,
        category: 'major_buff',
        spell_id: 264667,
        effect_key: 'primal_rage',
        sort_order: 93,
      },
      {
        class_id: 'evoker',
        spec_id: null,
        category: 'major_buff',
        spell_id: 390386,
        effect_key: 'fury_of_the_aspects',
        sort_order: 94,
      },
    ];
    const bloodlustSpells = [
      createSpell({
        spell_id: 2825,
        name_en: 'Bloodlust',
        name_fr: 'Furie sanguinaire',
        description_fr: 'Augmente la hâte.',
      }),
      createSpell({
        spell_id: 32182,
        name_en: 'Heroism',
        name_fr: 'Héroïsme',
        description_fr: 'Inspire les alliés.',
      }),
      createSpell({ spell_id: 80353, name_en: 'Time Warp', name_fr: 'Distorsion temporelle' }),
      createSpell({ spell_id: 264667, name_en: 'Primal Rage', name_fr: 'Rage primordiale' }),
      createSpell({ spell_id: 390386, name_en: 'Fury of the Aspects', name_fr: 'Fureur des aspects' }),
    ];
    const members: RaidEffectMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'mage', spec_ids: ['mage-arcane'] }] },
      { wishes: [{ class_id: 'hunter', spec_ids: ['hunter-beast-mastery'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-preservation'] }] },
    ];

    const result = buildMajorBuffsDebuffs(members, bloodlustEffects, bloodlustSpells, 'fr', alwaysMatch);

    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0]).toMatchObject({
      coverageKey: 'bloodlust',
      spellId: 2825,
      name: 'Furie sanguinaire',
      count: 3,
      spellNames: [
        'Furie sanguinaire',
        'Héroïsme',
        'Distorsion temporelle',
        'Rage primordiale',
        'Fureur des aspects',
      ],
    });
    expect(result.buffs[0].spellEntries).toEqual([
      expect.objectContaining({
        name: 'Furie sanguinaire / Héroïsme',
        description: 'Augmente la hâte.\n\nInspire les alliés.',
        covered: false,
        providers: [expect.objectContaining({ classId: 'shaman', covered: false })],
      }),
      expect.objectContaining({
        name: 'Distorsion temporelle',
        covered: true,
        providers: [expect.objectContaining({ classId: 'mage', covered: true })],
      }),
      expect.objectContaining({
        name: 'Rage primordiale',
        covered: true,
        providers: [expect.objectContaining({ classId: 'hunter', covered: true })],
      }),
      expect.objectContaining({
        name: 'Fureur des aspects',
        covered: true,
        providers: [expect.objectContaining({ classId: 'evoker', covered: true })],
      }),
    ]);
  });

  it('prefers localized spell text, then English, then a spell id fallback', () => {
    expect(resolveWowSpellText(spells[0], 1459, 'fr').name).toBe('Intelligence des Arcanes');
    expect(resolveWowSpellText(spells[1], 8647, 'fr').name).toBe('Mystic Touch');
    expect(resolveWowSpellText(undefined, 999999, 'fr').name).toBe('Spell 999999');
  });

  it('resolves every supported app locale before falling back', () => {
    const localizedSpell = createSpell({
      spell_id: 1,
      name_en: 'English',
      description_en: 'English description',
      name_fr: 'Français',
      description_fr: 'Description française',
      name_de: 'Deutsch',
      description_de: 'Deutsche Beschreibung',
      name_es: 'Español',
      description_es: 'Descripción española',
      name_pt_br: 'Português',
      description_pt_br: 'Descrição em português',
      name_it: 'Italiano',
      description_it: 'Descrizione italiana',
      name_ru: 'Русский',
      description_ru: 'Русское описание',
      name_zh_tw: '繁體中文',
      description_zh_tw: '繁體中文描述',
      name_ko: '한국어',
      description_ko: '한국어 설명',
    });

    const expectedNames: Record<Language, string> = {
      en: 'English',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
      'pt-BR': 'Português',
      it: 'Italiano',
      ru: 'Русский',
      'zh-TW': '繁體中文',
      ko: '한국어',
    };

    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(resolveWowSpellText(localizedSpell, 1, language).name).toBe(expectedNames[language]);
    });
  });
});
