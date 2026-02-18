// WoW Classes and Specializations data
// Centralized for easy updates
import { SUPPORTED_LANGUAGES, getBilingualContentLanguage } from '@/i18n/config';
import type { Language } from '@/i18n/config';

export type Role = 'tank' | 'healer' | 'dps';

export type RangeType = 'melee' | 'ranged';

type LocalizedLabel = { en: string; fr: string } & Partial<Record<Language, string>>;

const withLanguageFallbacks = (label: LocalizedLabel): Record<Language, string> => {
  const next = { ...label } as Record<Language, string>;

  for (const language of SUPPORTED_LANGUAGES) {
    if (next[language]) continue;
    next[language] = next[getBilingualContentLanguage(language)];
  }

  return next;
};

export interface Specialization {
  id: string;
  name: LocalizedLabel;
  role: Role;
  range: RangeType;
}

export interface WoWClass {
  id: string;
  name: LocalizedLabel;
  color: string; // Tailwind class color
  specs: Specialization[];
}

export const wowClasses: WoWClass[] = [
  {
    id: 'warrior',
    name: { en: 'Warrior', fr: 'Guerrier', de: 'Krieger', ru: 'Воин' },
    color: 'class-warrior',
    specs: [
      { id: 'warrior-arms', name: { en: 'Arms', fr: 'Armes', de: 'Waffen', ru: 'Оружие' }, role: 'dps', range: 'melee' },
      { id: 'warrior-fury', name: { en: 'Fury', fr: 'Fureur', de: 'Furor', ru: 'Неистовство' }, role: 'dps', range: 'melee' },
      { id: 'warrior-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz', ru: 'Защита' }, role: 'tank', range: 'melee' },
    ],
  },
  {
    id: 'paladin',
    name: { en: 'Paladin', fr: 'Paladin', de: 'Paladin' , ru: 'Паладин'},
    color: 'class-paladin',
    specs: [
      { id: 'paladin-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig' , ru: 'Свет'}, role: 'healer', range: 'ranged' },
      { id: 'paladin-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz' , ru: 'Защита'}, role: 'tank', range: 'melee' },
      { id: 'paladin-retribution', name: { en: 'Retribution', fr: 'Vindicte', de: 'Vergeltung' , ru: 'Воздаяние'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'hunter',
    name: { en: 'Hunter', fr: 'Chasseur', de: 'J\u00e4ger' , ru: 'Охотник'},
    color: 'class-hunter',
    specs: [
      { id: 'hunter-beast-mastery', name: { en: 'Beast Mastery', fr: 'Maîtrise des bêtes', de: 'Tierherrschaft' , ru: 'Повелитель зверей'}, role: 'dps', range: 'ranged' },
      { id: 'hunter-marksmanship', name: { en: 'Marksmanship', fr: 'Précision', de: 'Treffsicherheit' , ru: 'Стрельба'}, role: 'dps', range: 'ranged' },
      { id: 'hunter-survival', name: { en: 'Survival', fr: 'Survie', de: '\u00dcberleben' , ru: 'Выживание'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'rogue',
    name: { en: 'Rogue', fr: 'Voleur', de: 'Schurke' , ru: 'Разбойник'},
    color: 'class-rogue',
    specs: [
      { id: 'rogue-assassination', name: { en: 'Assassination', fr: 'Assassinat', de: 'Meucheln' , ru: 'Ликвидация'}, role: 'dps', range: 'melee' },
      { id: 'rogue-outlaw', name: { en: 'Outlaw', fr: 'Hors-la-loi', de: 'Gesetzlosigkeit' , ru: 'Головорез'}, role: 'dps', range: 'melee' },
      { id: 'rogue-subtlety', name: { en: 'Subtlety', fr: 'Finesse', de: 'T\u00e4uschung' , ru: 'Скрытность'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'priest',
    name: { en: 'Priest', fr: 'Prêtre', de: 'Priester' , ru: 'Жрец'},
    color: 'class-priest',
    specs: [
      { id: 'priest-discipline', name: { en: 'Discipline', fr: 'Discipline', de: 'Disziplin' , ru: 'Послушание'}, role: 'healer', range: 'ranged' },
      { id: 'priest-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig' , ru: 'Свет'}, role: 'healer', range: 'ranged' },
      { id: 'priest-shadow', name: { en: 'Shadow', fr: 'Ombre', de: 'Schatten' , ru: 'Тьма'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'death-knight',
    name: { en: 'Death Knight', fr: 'Chevalier de la mort', de: 'Todesritter' , ru: 'Рыцарь смерти'},
    color: 'class-death-knight',
    specs: [
      { id: 'dk-blood', name: { en: 'Blood', fr: 'Sang', de: 'Blut' , ru: 'Кровь'}, role: 'tank', range: 'melee' },
      { id: 'dk-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost' , ru: 'Лед'}, role: 'dps', range: 'melee' },
      { id: 'dk-unholy', name: { en: 'Unholy', fr: 'Impie', de: 'Unheilig' , ru: 'Нечестивость'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'shaman',
    name: { en: 'Shaman', fr: 'Chaman', de: 'Schamane' , ru: 'Шаман'},
    color: 'class-shaman',
    specs: [
      { id: 'shaman-elemental', name: { en: 'Elemental', fr: 'Élémentaire', de: 'Elementar' , ru: 'Стихии'}, role: 'dps', range: 'ranged' },
      { id: 'shaman-enhancement', name: { en: 'Enhancement', fr: 'Amélioration', de: 'Verst\u00e4rkung' , ru: 'Совершенствование'}, role: 'dps', range: 'melee' },
      { id: 'shaman-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung' , ru: 'Исцеление'}, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'mage',
    name: { en: 'Mage', fr: 'Mage', de: 'Magier' , ru: 'Маг'},
    color: 'class-mage',
    specs: [
      { id: 'mage-arcane', name: { en: 'Arcane', fr: 'Arcanes', de: 'Arkan' , ru: 'Тайная магия'}, role: 'dps', range: 'ranged' },
      { id: 'mage-fire', name: { en: 'Fire', fr: 'Feu', de: 'Feuer' , ru: 'Огонь'}, role: 'dps', range: 'ranged' },
      { id: 'mage-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost' , ru: 'Лед'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'warlock',
    name: { en: 'Warlock', fr: 'Démoniste', de: 'Hexenmeister' , ru: 'Чернокнижник'},
    color: 'class-warlock',
    specs: [
      { id: 'warlock-affliction', name: { en: 'Affliction', fr: 'Affliction', de: 'Gebrechen' , ru: 'Колдовство'}, role: 'dps', range: 'ranged' },
      { id: 'warlock-demonology', name: { en: 'Demonology', fr: 'Démonologie', de: 'D\u00e4monologie' , ru: 'Демонология'}, role: 'dps', range: 'ranged' },
      { id: 'warlock-destruction', name: { en: 'Destruction', fr: 'Destruction', de: 'Zerst\u00f6rung' , ru: 'Разрушение'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'monk',
    name: { en: 'Monk', fr: 'Moine', de: 'M\u00f6nch' , ru: 'Монах'},
    color: 'class-monk',
    specs: [
      { id: 'monk-brewmaster', name: { en: 'Brewmaster', fr: 'Maître brasseur', de: 'Braumeister' , ru: 'Хмелевар'}, role: 'tank', range: 'melee' },
      { id: 'monk-mistweaver', name: { en: 'Mistweaver', fr: 'Tisse-brume', de: 'Nebelwirker' , ru: 'Ткач туманов'}, role: 'healer', range: 'ranged' },
      { id: 'monk-windwalker', name: { en: 'Windwalker', fr: 'Marche-vent', de: 'Windl\u00e4ufer' , ru: 'Танцующий с ветром'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'druid',
    name: { en: 'Druid', fr: 'Druide', de: 'Druide' , ru: 'Друид'},
    color: 'class-druid',
    specs: [
      { id: 'druid-balance', name: { en: 'Balance', fr: 'Équilibre', de: 'Gleichgewicht' , ru: 'Баланс'}, role: 'dps', range: 'ranged' },
      { id: 'druid-feral', name: { en: 'Feral', fr: 'Féral', de: 'Wildheit' , ru: 'Сила зверя'}, role: 'dps', range: 'melee' },
      { id: 'druid-guardian', name: { en: 'Guardian', fr: 'Gardien', de: 'W\u00e4chter' , ru: 'Страж'}, role: 'tank', range: 'melee' },
      { id: 'druid-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung' , ru: 'Исцеление'}, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'demon-hunter',
    name: { en: 'Demon Hunter', fr: 'Chasseur de démons', de: 'D\u00e4monenj\u00e4ger' , ru: 'Охотник на демонов'},
    color: 'class-demon-hunter',
    specs: [
      { id: 'dh-havoc', name: { en: 'Havoc', fr: 'Dévastation', de: 'Verw\u00fcstung' , ru: 'Истребление'}, role: 'dps', range: 'melee' },
      { id: 'dh-vengeance', name: { en: 'Vengeance', fr: 'Vengeance', de: 'Rachsucht' , ru: 'Месть'}, role: 'tank', range: 'melee' },
      { id: 'dh-devourer', name: { en: 'Devourer', fr: 'Dévoreur', de: 'Verschlinger' , ru: 'Пожиратель'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'evoker',
    name: { en: 'Evoker', fr: 'Évocateur', de: 'Rufer' , ru: 'Пробудитель'},
    color: 'class-evoker',
    specs: [
      { id: 'evoker-devastation', name: { en: 'Devastation', fr: 'Dévastation', de: 'Verheerung' , ru: 'Опустошение'}, role: 'dps', range: 'ranged' },
      { id: 'evoker-preservation', name: { en: 'Preservation', fr: 'Préservation', de: 'Bewahrung' , ru: 'Сохранение'}, role: 'healer', range: 'ranged' },
      { id: 'evoker-augmentation', name: { en: 'Augmentation', fr: 'Augmentation', de: 'Verst\u00e4rkung' , ru: 'Насыщение'}, role: 'dps', range: 'ranged' },
    ],
  },
];

for (const wowClass of wowClasses) {
  wowClass.name = withLanguageFallbacks(wowClass.name);
  for (const spec of wowClass.specs) {
    spec.name = withLanguageFallbacks(spec.name);
  }
}

// Helper functions
export const getClassById = (classId: string): WoWClass | undefined => {
  return wowClasses.find(c => c.id === classId);
};

const LEGACY_SPEC_ID_ALIASES: Record<string, string> = {
  'death-knight-blood': 'dk-blood',
  'death-knight-frost': 'dk-frost',
  'death-knight-unholy': 'dk-unholy',
  'demon-hunter-havoc': 'dh-havoc',
  'demon-hunter-vengeance': 'dh-vengeance',
  'demon-hunter-devourer': 'dh-devourer',
};

const EXTRA_SPEC_LABELS: Record<string, LocalizedLabel> = {
  'hunter-pack-leader': { en: 'Pack Leader', fr: 'Chef de meute', de: 'Rudelf\u00fchrer' , ru: 'Вожак стаи'},
  'druid-elune': { en: 'Elune', fr: 'Elune', de: 'Elune' , ru: 'Элуна'},
};

const normalizeSpecId = (specId: string): string => LEGACY_SPEC_ID_ALIASES[specId] || specId;

export const getSpecById = (specId: string): Specialization | undefined => {
  const normalizedSpecId = normalizeSpecId(specId);

  for (const wowClass of wowClasses) {
    const spec = wowClass.specs.find(s => s.id === normalizedSpecId);
    if (spec) return spec;
  }
  return undefined;
};

export const getClassBySpecId = (specId: string): WoWClass | undefined => {
  return wowClasses.find(c => c.specs.some(s => s.id === specId));
};

export const getRolesFromSpecs = (specIds: string[]): Role[] => {
  const roles = new Set<Role>();
  for (const specId of specIds) {
    const spec = getSpecById(specId);
    if (spec) roles.add(spec.role);
  }
  return Array.from(roles);
};

export const getRangesFromSpecs = (specIds: string[]): RangeType[] => {
  const ranges = new Set<RangeType>();
  for (const specId of specIds) {
    const spec = getSpecById(specId);
    if (spec) {
      ranges.add(spec.range);
    }
  }
  return Array.from(ranges);
};

const getLocalizedLabel = (label: Partial<Record<Language, string>>, language: Language, fallback: string): string =>
  label[language] || label.en || fallback;

export const getLocalizedClassName = (classId: string, language: Language): string => {
  const wowClass = getClassById(classId);
  if (!wowClass) return classId;
  return getLocalizedLabel(wowClass.name, language, classId);
};

export const getLocalizedSpecName = (specId: string, language: Language): string => {
  const spec = getSpecById(specId);
  if (spec) return getLocalizedLabel(spec.name, language, specId);

  const extra = EXTRA_SPEC_LABELS[specId];
  if (extra) {
    const normalized = withLanguageFallbacks(extra);
    return getLocalizedLabel(normalized, language, specId);
  }

  return specId;
};
