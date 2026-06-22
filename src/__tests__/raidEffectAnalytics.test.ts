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
  });

  it('counts spec-specific effects only when the wished spec matches', () => {
    const members: RaidEffectMemberInput<TestWish>[] = [
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-devastation'] }] },
      { wishes: [{ class_id: 'evoker', spec_ids: ['evoker-augmentation'] }] },
    ];

    const result = buildMajorBuffsDebuffs(members, effects, spells, 'en', alwaysMatch);

    expect(result.buffs.find((buff) => buff.spellId === 395152)?.count).toBe(1);
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
