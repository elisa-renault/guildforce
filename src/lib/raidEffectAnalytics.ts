import type { Language } from '@/i18n/config';

export interface RaidEffectAnalyticsRow {
  class_id: string;
  spec_id: string | null;
  category: string;
  spell_id: number;
  sort_order?: number | null;
}

export interface WowSpellAnalyticsRow {
  spell_id: number;
  name_en: string | null;
  description_en: string | null;
  name_fr: string | null;
  description_fr: string | null;
  name_de: string | null;
  description_de: string | null;
  name_es: string | null;
  description_es: string | null;
  name_pt_br: string | null;
  description_pt_br: string | null;
  name_it: string | null;
  description_it: string | null;
  name_ru: string | null;
  description_ru: string | null;
  name_zh_tw: string | null;
  description_zh_tw: string | null;
  name_ko: string | null;
  description_ko: string | null;
}

export interface RaidEffectWishInput {
  class_id?: string | null;
  spec_ids?: string[] | null;
}

export interface RaidEffectMemberInput<Wish extends RaidEffectWishInput = RaidEffectWishInput> {
  wishes: Wish[];
}

export interface RaidEffectStat {
  spellId: number;
  name: string;
  description: string;
  count: number;
  sortOrder: number;
}

type RaidEffectWithText = RaidEffectAnalyticsRow & {
  name: string;
  description: string;
};

type SpellTextField = keyof Omit<WowSpellAnalyticsRow, 'spell_id'>;

const spellTextFieldsByLanguage: Record<Language, { name: SpellTextField; description: SpellTextField }> = {
  en: { name: 'name_en', description: 'description_en' },
  fr: { name: 'name_fr', description: 'description_fr' },
  de: { name: 'name_de', description: 'description_de' },
  es: { name: 'name_es', description: 'description_es' },
  'pt-BR': { name: 'name_pt_br', description: 'description_pt_br' },
  it: { name: 'name_it', description: 'description_it' },
  ru: { name: 'name_ru', description: 'description_ru' },
  'zh-TW': { name: 'name_zh_tw', description: 'description_zh_tw' },
  ko: { name: 'name_ko', description: 'description_ko' },
};

const fallbackNameFields: SpellTextField[] = [
  'name_en',
  'name_fr',
  'name_de',
  'name_es',
  'name_pt_br',
  'name_it',
  'name_ru',
  'name_zh_tw',
  'name_ko',
];

const getSpellTextValue = (spell: WowSpellAnalyticsRow, field: SpellTextField): string | null => {
  const value = spell[field];
  return typeof value === 'string' && value.trim() ? value : null;
};

export const resolveWowSpellText = (
  spell: WowSpellAnalyticsRow | undefined,
  spellId: number,
  language: Language,
): { name: string; description: string } => {
  if (!spell) {
    return { name: `Spell ${spellId}`, description: '' };
  }

  const fields = spellTextFieldsByLanguage[language] || spellTextFieldsByLanguage.en;
  const localizedName = getSpellTextValue(spell, fields.name);
  const localizedDescription = getSpellTextValue(spell, fields.description);
  const fallbackName =
    fallbackNameFields.map((field) => getSpellTextValue(spell, field)).find(Boolean) ||
    `Spell ${spellId}`;

  return {
    name: localizedName || fallbackName,
    description: localizedDescription || '',
  };
};

export const buildWowSpellTextMap = (
  spells: WowSpellAnalyticsRow[],
  language: Language,
): Map<number, { name: string; description: string }> => {
  const map = new Map<number, { name: string; description: string }>();
  spells.forEach((spell) => {
    map.set(spell.spell_id, resolveWowSpellText(spell, spell.spell_id, language));
  });
  return map;
};

export const attachRaidEffectText = (
  effects: RaidEffectAnalyticsRow[],
  spells: WowSpellAnalyticsRow[],
  language: Language,
): RaidEffectWithText[] => {
  const spellMap = buildWowSpellTextMap(spells, language);

  return effects.map((effect) => {
    const spell = spellMap.get(effect.spell_id);
    return {
      ...effect,
      name: spell?.name || `Spell ${effect.spell_id}`,
      description: spell?.description || '',
    };
  });
};

export const buildMajorBuffsDebuffs = <
  Wish extends RaidEffectWishInput,
  Member extends RaidEffectMemberInput<Wish>,
>(
  members: Member[],
  effects: RaidEffectAnalyticsRow[],
  spells: WowSpellAnalyticsRow[],
  language: Language,
  wishMatchesFilters: (member: Member, wish: Wish) => boolean,
): { buffs: RaidEffectStat[]; debuffs: RaidEffectStat[] } => {
  const effectsWithText = attachRaidEffectText(effects, spells, language);
  const effectsByClass = new Map<string, RaidEffectWithText[]>();
  const buffs = new Map<number, RaidEffectStat>();
  const debuffs = new Map<number, RaidEffectStat>();

  effectsWithText.forEach((effect) => {
    const existing = effectsByClass.get(effect.class_id) || [];
    existing.push(effect);
    effectsByClass.set(effect.class_id, existing);

    const target = effect.category === 'major_buff'
      ? buffs
      : effect.category === 'major_debuff'
        ? debuffs
        : null;

    if (!target) return;

    const sortOrder = effect.sort_order ?? Number.MAX_SAFE_INTEGER;
    const current = target.get(effect.spell_id);
    if (!current) {
      target.set(effect.spell_id, {
        spellId: effect.spell_id,
        name: effect.name,
        description: effect.description,
        count: 0,
        sortOrder,
      });
      return;
    }

    current.sortOrder = Math.min(current.sortOrder, sortOrder);
  });

  members.forEach((member) => {
    member.wishes.forEach((wish) => {
      if (!wishMatchesFilters(member, wish)) return;
      if (!wish.class_id) return;

      const entries = effectsByClass.get(wish.class_id);
      if (!entries) return;

      entries.forEach((entry) => {
        if (entry.spec_id && !wish.spec_ids?.includes(entry.spec_id)) return;
        if (entry.category === 'major_buff') {
          const existing = buffs.get(entry.spell_id);
          if (existing) existing.count += 1;
        }
        if (entry.category === 'major_debuff') {
          const existing = debuffs.get(entry.spell_id);
          if (existing) existing.count += 1;
        }
      });
    });
  });

  const sortByCoverage = (a: RaidEffectStat, b: RaidEffectStat) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  };

  return {
    buffs: Array.from(buffs.values()).sort(sortByCoverage),
    debuffs: Array.from(debuffs.values()).sort(sortByCoverage),
  };
};
