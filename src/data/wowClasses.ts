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
    name: { en: 'Warrior', fr: 'Guerrier', de: 'Krieger' },
    color: 'class-warrior',
    specs: [
      { id: 'warrior-arms', name: { en: 'Arms', fr: 'Armes', de: 'Waffen' }, role: 'dps', range: 'melee' },
      { id: 'warrior-fury', name: { en: 'Fury', fr: 'Fureur', de: 'Furor' }, role: 'dps', range: 'melee' },
      { id: 'warrior-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz' }, role: 'tank', range: 'melee' },
    ],
  },
  {
    id: 'paladin',
    name: { en: 'Paladin', fr: 'Paladin', de: 'Paladin' },
    color: 'class-paladin',
    specs: [
      { id: 'paladin-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig' }, role: 'healer', range: 'ranged' },
      { id: 'paladin-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz' }, role: 'tank', range: 'melee' },
      { id: 'paladin-retribution', name: { en: 'Retribution', fr: 'Vindicte', de: 'Vergeltung' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'hunter',
    name: { en: 'Hunter', fr: 'Chasseur', de: 'J\u00e4ger' },
    color: 'class-hunter',
    specs: [
      { id: 'hunter-beast-mastery', name: { en: 'Beast Mastery', fr: 'Maîtrise des bêtes', de: 'Tierherrschaft' }, role: 'dps', range: 'ranged' },
      { id: 'hunter-marksmanship', name: { en: 'Marksmanship', fr: 'Précision', de: 'Treffsicherheit' }, role: 'dps', range: 'ranged' },
      { id: 'hunter-survival', name: { en: 'Survival', fr: 'Survie', de: '\u00dcberleben' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'rogue',
    name: { en: 'Rogue', fr: 'Voleur', de: 'Schurke' },
    color: 'class-rogue',
    specs: [
      { id: 'rogue-assassination', name: { en: 'Assassination', fr: 'Assassinat', de: 'Meucheln' }, role: 'dps', range: 'melee' },
      { id: 'rogue-outlaw', name: { en: 'Outlaw', fr: 'Hors-la-loi', de: 'Gesetzlosigkeit' }, role: 'dps', range: 'melee' },
      { id: 'rogue-subtlety', name: { en: 'Subtlety', fr: 'Finesse', de: 'T\u00e4uschung' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'priest',
    name: { en: 'Priest', fr: 'Prêtre', de: 'Priester' },
    color: 'class-priest',
    specs: [
      { id: 'priest-discipline', name: { en: 'Discipline', fr: 'Discipline', de: 'Disziplin' }, role: 'healer', range: 'ranged' },
      { id: 'priest-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig' }, role: 'healer', range: 'ranged' },
      { id: 'priest-shadow', name: { en: 'Shadow', fr: 'Ombre', de: 'Schatten' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'death-knight',
    name: { en: 'Death Knight', fr: 'Chevalier de la mort', de: 'Todesritter' },
    color: 'class-death-knight',
    specs: [
      { id: 'dk-blood', name: { en: 'Blood', fr: 'Sang', de: 'Blut' }, role: 'tank', range: 'melee' },
      { id: 'dk-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost' }, role: 'dps', range: 'melee' },
      { id: 'dk-unholy', name: { en: 'Unholy', fr: 'Impie', de: 'Unheilig' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'shaman',
    name: { en: 'Shaman', fr: 'Chaman', de: 'Schamane' },
    color: 'class-shaman',
    specs: [
      { id: 'shaman-elemental', name: { en: 'Elemental', fr: 'Élémentaire', de: 'Elementar' }, role: 'dps', range: 'ranged' },
      { id: 'shaman-enhancement', name: { en: 'Enhancement', fr: 'Amélioration', de: 'Verst\u00e4rkung' }, role: 'dps', range: 'melee' },
      { id: 'shaman-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung' }, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'mage',
    name: { en: 'Mage', fr: 'Mage', de: 'Magier' },
    color: 'class-mage',
    specs: [
      { id: 'mage-arcane', name: { en: 'Arcane', fr: 'Arcanes', de: 'Arkan' }, role: 'dps', range: 'ranged' },
      { id: 'mage-fire', name: { en: 'Fire', fr: 'Feu', de: 'Feuer' }, role: 'dps', range: 'ranged' },
      { id: 'mage-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'warlock',
    name: { en: 'Warlock', fr: 'Démoniste', de: 'Hexenmeister' },
    color: 'class-warlock',
    specs: [
      { id: 'warlock-affliction', name: { en: 'Affliction', fr: 'Affliction', de: 'Gebrechen' }, role: 'dps', range: 'ranged' },
      { id: 'warlock-demonology', name: { en: 'Demonology', fr: 'Démonologie', de: 'D\u00e4monologie' }, role: 'dps', range: 'ranged' },
      { id: 'warlock-destruction', name: { en: 'Destruction', fr: 'Destruction', de: 'Zerst\u00f6rung' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'monk',
    name: { en: 'Monk', fr: 'Moine', de: 'M\u00f6nch' },
    color: 'class-monk',
    specs: [
      { id: 'monk-brewmaster', name: { en: 'Brewmaster', fr: 'Maître brasseur', de: 'Braumeister' }, role: 'tank', range: 'melee' },
      { id: 'monk-mistweaver', name: { en: 'Mistweaver', fr: 'Tisse-brume', de: 'Nebelwirker' }, role: 'healer', range: 'ranged' },
      { id: 'monk-windwalker', name: { en: 'Windwalker', fr: 'Marche-vent', de: 'Windl\u00e4ufer' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'druid',
    name: { en: 'Druid', fr: 'Druide', de: 'Druide' },
    color: 'class-druid',
    specs: [
      { id: 'druid-balance', name: { en: 'Balance', fr: 'Équilibre', de: 'Gleichgewicht' }, role: 'dps', range: 'ranged' },
      { id: 'druid-feral', name: { en: 'Feral', fr: 'Féral', de: 'Wildheit' }, role: 'dps', range: 'melee' },
      { id: 'druid-guardian', name: { en: 'Guardian', fr: 'Gardien', de: 'W\u00e4chter' }, role: 'tank', range: 'melee' },
      { id: 'druid-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung' }, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'demon-hunter',
    name: { en: 'Demon Hunter', fr: 'Chasseur de démons', de: 'D\u00e4monenj\u00e4ger' },
    color: 'class-demon-hunter',
    specs: [
      { id: 'dh-havoc', name: { en: 'Havoc', fr: 'Dévastation', de: 'Verw\u00fcstung' }, role: 'dps', range: 'melee' },
      { id: 'dh-vengeance', name: { en: 'Vengeance', fr: 'Vengeance', de: 'Rachsucht' }, role: 'tank', range: 'melee' },
      { id: 'dh-devourer', name: { en: 'Devourer', fr: 'Dévoreur', de: 'Verschlinger' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'evoker',
    name: { en: 'Evoker', fr: 'Évocateur', de: 'Rufer' },
    color: 'class-evoker',
    specs: [
      { id: 'evoker-devastation', name: { en: 'Devastation', fr: 'Dévastation', de: 'Verheerung' }, role: 'dps', range: 'ranged' },
      { id: 'evoker-preservation', name: { en: 'Preservation', fr: 'Préservation', de: 'Bewahrung' }, role: 'healer', range: 'ranged' },
      { id: 'evoker-augmentation', name: { en: 'Augmentation', fr: 'Augmentation', de: 'Verst\u00e4rkung' }, role: 'dps', range: 'ranged' },
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
  'hunter-pack-leader': { en: 'Pack Leader', fr: 'Chef de meute', de: 'Rudelf\u00fchrer' },
  'druid-elune': { en: 'Elune', fr: 'Elune', de: 'Elune' },
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
