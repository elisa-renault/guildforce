import type { Language } from '@/i18n/config';

export interface RaidEffectAnalyticsRow {
  class_id: string;
  spec_id: string | null;
  category: string;
  spell_id: number;
  effect_key?: string | null;
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

export interface CoverageSpellProvider {
  classId: string;
  specId: string | null;
  covered: boolean;
}

export interface CoverageSpellEntry {
  spellId: number;
  name: string;
  description?: string;
  providers: CoverageSpellProvider[];
  covered: boolean;
  sortOrder: number;
}

export interface RaidEffectStat {
  spellId: number;
  coverageKey?: string;
  name: string;
  description: string;
  spellNames: string[];
  spellEntries: CoverageSpellEntry[];
  count: number;
  sortOrder: number;
}

export interface BuildMajorBuffsDebuffsOptions {
  getWishSpecIds?: (wish: RaidEffectWishInput) => string[];
}

type RaidEffectWithText = RaidEffectAnalyticsRow & {
  name: string;
  description: string;
};

type SpellTextField = keyof Omit<WowSpellAnalyticsRow, 'spell_id'>;

const bloodlustEquivalentSpellIds = new Set([2825, 32182, 80353, 264667, 390386]);
const shamanBloodlustVariantSpellIds = new Set([2825, 32182]);

const getRaidEffectCoverageKey = (effect: RaidEffectAnalyticsRow): string =>
  bloodlustEquivalentSpellIds.has(effect.spell_id)
    ? 'bloodlust'
    : effect.effect_key || String(effect.spell_id);

const getProviderKey = (classId: string, specId: string | null): string => `${classId}:${specId ?? ''}`;

const getEffectProviderKey = (effect: RaidEffectAnalyticsRow): string =>
  `${getRaidEffectCoverageKey(effect)}:${effect.spell_id}:${getProviderKey(effect.class_id, effect.spec_id)}`;

const getProviderSignature = (providers: CoverageSpellProvider[]): string =>
  providers
    .map(provider => getProviderKey(provider.classId, provider.specId))
    .sort()
    .join('|');

const getMergeableSpellEntryKey = (entry: CoverageSpellEntry): string | null => {
  if (!shamanBloodlustVariantSpellIds.has(entry.spellId)) return null;
  if (!entry.providers.length || entry.providers.some(provider => provider.classId !== 'shaman')) return null;
  return `shaman-bloodlust:${getProviderSignature(entry.providers)}`;
};

const mergeDescriptions = (...descriptions: Array<string | null | undefined>): string | undefined => {
  const uniqueDescriptions = descriptions
    .map(description => description?.trim())
    .filter((description): description is string => Boolean(description))
    .reduce<string[]>((result, description) => {
      if (!result.includes(description)) result.push(description);
      return result;
    }, []);

  return uniqueDescriptions.length > 0 ? uniqueDescriptions.join('\n\n') : undefined;
};

export const mergeEquivalentCoverageSpellEntries = (
  entries: CoverageSpellEntry[],
): CoverageSpellEntry[] => {
  const merged = new Map<string, CoverageSpellEntry>();
  const passthrough: CoverageSpellEntry[] = [];

  entries.forEach((entry) => {
    const mergeKey = getMergeableSpellEntryKey(entry);
    if (!mergeKey) {
      passthrough.push(entry);
      return;
    }

    const existing = merged.get(mergeKey);
    if (!existing) {
      merged.set(mergeKey, {
        ...entry,
        providers: [...entry.providers],
      });
      return;
    }

    const providerMap = new Map<string, CoverageSpellProvider>();
    [...existing.providers, ...entry.providers].forEach((provider) => {
      const providerKey = getProviderKey(provider.classId, provider.specId);
      const current = providerMap.get(providerKey);
      providerMap.set(providerKey, current ? { ...current, covered: current.covered || provider.covered } : provider);
    });

    merged.set(mergeKey, {
      ...existing,
      spellId: Math.min(existing.spellId, entry.spellId),
      name: `${existing.name} / ${entry.name}`,
      description: mergeDescriptions(existing.description, entry.description),
      providers: Array.from(providerMap.values()),
      covered: existing.covered || entry.covered,
      sortOrder: Math.min(existing.sortOrder, entry.sortOrder),
    });
  });

  return [...passthrough, ...merged.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
};

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
  options: BuildMajorBuffsDebuffsOptions = {},
): { buffs: RaidEffectStat[]; debuffs: RaidEffectStat[] } => {
  const effectsWithText = attachRaidEffectText(effects, spells, language);
  const effectsByClass = new Map<string, RaidEffectWithText[]>();
  const buffs = new Map<string, RaidEffectStat>();
  const debuffs = new Map<string, RaidEffectStat>();
  const spellNamesByCoverage = new Map<string, { name: string; sortOrder: number }[]>();
  const spellEntriesByCoverage = new Map<string, {
    spellId: number;
    name: string;
    description: string;
    sortOrder: number;
    providers: Map<string, { classId: string; specId: string | null }>;
  }[]>();
  const coveredEffectProviders = new Set<string>();

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

    const coverageKey = getRaidEffectCoverageKey(effect);
    const sortOrder = effect.sort_order ?? Number.MAX_SAFE_INTEGER;
    const spellNames = spellNamesByCoverage.get(coverageKey) ?? [];
    spellNames.push({ name: effect.name, sortOrder });
    spellNamesByCoverage.set(coverageKey, spellNames);
    const spellEntries = spellEntriesByCoverage.get(coverageKey) ?? [];
    let spellEntry = spellEntries.find(entry => entry.spellId === effect.spell_id);
    if (!spellEntry) {
      spellEntry = {
        spellId: effect.spell_id,
        name: effect.name,
        description: effect.description,
        sortOrder,
        providers: new Map(),
      };
      spellEntries.push(spellEntry);
      spellEntriesByCoverage.set(coverageKey, spellEntries);
    }
    spellEntry.sortOrder = Math.min(spellEntry.sortOrder, sortOrder);
    if (!spellEntry.description && effect.description) {
      spellEntry.description = effect.description;
    }
    spellEntry.providers.set(getProviderKey(effect.class_id, effect.spec_id), {
      classId: effect.class_id,
      specId: effect.spec_id,
    });

    const current = target.get(coverageKey);
    if (!current) {
      target.set(coverageKey, {
        spellId: effect.spell_id,
        coverageKey,
        name: effect.name,
        description: effect.description,
        spellNames: [],
        spellEntries: [],
        count: 0,
        sortOrder,
      });
      return;
    }

    current.sortOrder = Math.min(current.sortOrder, sortOrder);
  });

  const attachGroupedSpellData = (stats: Map<string, RaidEffectStat>) => {
    stats.forEach((stat, coverageKey) => {
      const uniqueNames = (spellNamesByCoverage.get(coverageKey) ?? [])
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
      const spellEntries = (spellEntriesByCoverage.get(coverageKey) ?? [])
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.name.localeCompare(b.name);
        })
        .map((entry) => {
          const providers = Array.from(entry.providers.values()).map(provider => ({
            ...provider,
            covered: coveredEffectProviders.has(
              `${coverageKey}:${entry.spellId}:${getProviderKey(provider.classId, provider.specId)}`,
            ),
          }));

          return {
            spellId: entry.spellId,
            name: entry.name,
            description: entry.description || undefined,
            sortOrder: entry.sortOrder,
            providers,
            covered: providers.some(provider => provider.covered),
          };
        });
      stat.spellEntries = mergeEquivalentCoverageSpellEntries(spellEntries);
    });
  };

  members.forEach((member) => {
    const coveredBuffsForMember = new Set<string>();
    const coveredDebuffsForMember = new Set<string>();

    member.wishes.forEach((wish) => {
      if (!wishMatchesFilters(member, wish)) return;
      if (!wish.class_id) return;

      const entries = effectsByClass.get(wish.class_id);
      if (!entries) return;

      entries.forEach((entry) => {
        const wishSpecIds = options.getWishSpecIds?.(wish) ?? wish.spec_ids ?? [];
        if (entry.spec_id && !wishSpecIds.includes(entry.spec_id)) return;
        const coverageKey = getRaidEffectCoverageKey(entry);
        if (entry.category === 'major_buff') {
          coveredBuffsForMember.add(coverageKey);
          coveredEffectProviders.add(getEffectProviderKey(entry));
        }
        if (entry.category === 'major_debuff') {
          coveredDebuffsForMember.add(coverageKey);
          coveredEffectProviders.add(getEffectProviderKey(entry));
        }
      });
    });

    coveredBuffsForMember.forEach((coverageKey) => {
      const existing = buffs.get(coverageKey);
      if (existing) existing.count += 1;
    });
    coveredDebuffsForMember.forEach((coverageKey) => {
      const existing = debuffs.get(coverageKey);
      if (existing) existing.count += 1;
    });
  });

  attachGroupedSpellData(buffs);
  attachGroupedSpellData(debuffs);

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
