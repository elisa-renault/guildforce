// WoW Classes and Specializations data
// Centralized for easy updates

export type Role = 'tank' | 'healer' | 'dps';

export type RangeType = 'melee' | 'ranged';

export interface Specialization {
  id: string;
  name: {
    en: string;
    fr: string;
  };
  role: Role;
  range: RangeType;
}

export interface WoWClass {
  id: string;
  name: {
    en: string;
    fr: string;
  };
  color: string; // Tailwind class color
  specs: Specialization[];
}

export const wowClasses: WoWClass[] = [
  {
    id: 'warrior',
    name: { en: 'Warrior', fr: 'Guerrier' },
    color: 'class-warrior',
    specs: [
      { id: 'warrior-arms', name: { en: 'Arms', fr: 'Armes' }, role: 'dps', range: 'melee' },
      { id: 'warrior-fury', name: { en: 'Fury', fr: 'Fureur' }, role: 'dps', range: 'melee' },
      { id: 'warrior-protection', name: { en: 'Protection', fr: 'Protection' }, role: 'tank', range: 'melee' },
    ],
  },
  {
    id: 'paladin',
    name: { en: 'Paladin', fr: 'Paladin' },
    color: 'class-paladin',
    specs: [
      { id: 'paladin-holy', name: { en: 'Holy', fr: 'Sacré' }, role: 'healer', range: 'ranged' },
      { id: 'paladin-protection', name: { en: 'Protection', fr: 'Protection' }, role: 'tank', range: 'melee' },
      { id: 'paladin-retribution', name: { en: 'Retribution', fr: 'Vindicte' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'hunter',
    name: { en: 'Hunter', fr: 'Chasseur' },
    color: 'class-hunter',
    specs: [
      { id: 'hunter-beast-mastery', name: { en: 'Beast Mastery', fr: 'Maîtrise des bêtes' }, role: 'dps', range: 'ranged' },
      { id: 'hunter-marksmanship', name: { en: 'Marksmanship', fr: 'Précision' }, role: 'dps', range: 'ranged' },
      { id: 'hunter-survival', name: { en: 'Survival', fr: 'Survie' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'rogue',
    name: { en: 'Rogue', fr: 'Voleur' },
    color: 'class-rogue',
    specs: [
      { id: 'rogue-assassination', name: { en: 'Assassination', fr: 'Assassinat' }, role: 'dps', range: 'melee' },
      { id: 'rogue-outlaw', name: { en: 'Outlaw', fr: 'Hors-la-loi' }, role: 'dps', range: 'melee' },
      { id: 'rogue-subtlety', name: { en: 'Subtlety', fr: 'Finesse' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'priest',
    name: { en: 'Priest', fr: 'Prêtre' },
    color: 'class-priest',
    specs: [
      { id: 'priest-discipline', name: { en: 'Discipline', fr: 'Discipline' }, role: 'healer', range: 'ranged' },
      { id: 'priest-holy', name: { en: 'Holy', fr: 'Sacré' }, role: 'healer', range: 'ranged' },
      { id: 'priest-shadow', name: { en: 'Shadow', fr: 'Ombre' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'death-knight',
    name: { en: 'Death Knight', fr: 'Chevalier de la mort' },
    color: 'class-death-knight',
    specs: [
      { id: 'dk-blood', name: { en: 'Blood', fr: 'Sang' }, role: 'tank', range: 'melee' },
      { id: 'dk-frost', name: { en: 'Frost', fr: 'Givre' }, role: 'dps', range: 'melee' },
      { id: 'dk-unholy', name: { en: 'Unholy', fr: 'Impie' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'shaman',
    name: { en: 'Shaman', fr: 'Chaman' },
    color: 'class-shaman',
    specs: [
      { id: 'shaman-elemental', name: { en: 'Elemental', fr: 'Élémentaire' }, role: 'dps', range: 'ranged' },
      { id: 'shaman-enhancement', name: { en: 'Enhancement', fr: 'Amélioration' }, role: 'dps', range: 'melee' },
      { id: 'shaman-restoration', name: { en: 'Restoration', fr: 'Restauration' }, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'mage',
    name: { en: 'Mage', fr: 'Mage' },
    color: 'class-mage',
    specs: [
      { id: 'mage-arcane', name: { en: 'Arcane', fr: 'Arcanes' }, role: 'dps', range: 'ranged' },
      { id: 'mage-fire', name: { en: 'Fire', fr: 'Feu' }, role: 'dps', range: 'ranged' },
      { id: 'mage-frost', name: { en: 'Frost', fr: 'Givre' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'warlock',
    name: { en: 'Warlock', fr: 'Démoniste' },
    color: 'class-warlock',
    specs: [
      { id: 'warlock-affliction', name: { en: 'Affliction', fr: 'Affliction' }, role: 'dps', range: 'ranged' },
      { id: 'warlock-demonology', name: { en: 'Demonology', fr: 'Démonologie' }, role: 'dps', range: 'ranged' },
      { id: 'warlock-destruction', name: { en: 'Destruction', fr: 'Destruction' }, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'monk',
    name: { en: 'Monk', fr: 'Moine' },
    color: 'class-monk',
    specs: [
      { id: 'monk-brewmaster', name: { en: 'Brewmaster', fr: 'Maître brasseur' }, role: 'tank', range: 'melee' },
      { id: 'monk-mistweaver', name: { en: 'Mistweaver', fr: 'Tisse-brume' }, role: 'healer', range: 'ranged' },
      { id: 'monk-windwalker', name: { en: 'Windwalker', fr: 'Marche-vent' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'druid',
    name: { en: 'Druid', fr: 'Druide' },
    color: 'class-druid',
    specs: [
      { id: 'druid-balance', name: { en: 'Balance', fr: 'Équilibre' }, role: 'dps', range: 'ranged' },
      { id: 'druid-feral', name: { en: 'Feral', fr: 'Féral' }, role: 'dps', range: 'melee' },
      { id: 'druid-guardian', name: { en: 'Guardian', fr: 'Gardien' }, role: 'tank', range: 'melee' },
      { id: 'druid-restoration', name: { en: 'Restoration', fr: 'Restauration' }, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'demon-hunter',
    name: { en: 'Demon Hunter', fr: 'Chasseur de démons' },
    color: 'class-demon-hunter',
    specs: [
      { id: 'dh-havoc', name: { en: 'Havoc', fr: 'Dévastation' }, role: 'dps', range: 'melee' },
      { id: 'dh-vengeance', name: { en: 'Vengeance', fr: 'Vengeance' }, role: 'tank', range: 'melee' },
      { id: 'dh-devourer', name: { en: 'Devourer', fr: 'Dévoreur' }, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'evoker',
    name: { en: 'Evoker', fr: 'Évocateur' },
    color: 'class-evoker',
    specs: [
      { id: 'evoker-devastation', name: { en: 'Devastation', fr: 'Dévastation' }, role: 'dps', range: 'ranged' },
      { id: 'evoker-preservation', name: { en: 'Preservation', fr: 'Préservation' }, role: 'healer', range: 'ranged' },
      { id: 'evoker-augmentation', name: { en: 'Augmentation', fr: 'Augmentation' }, role: 'dps', range: 'ranged' },
    ],
  },
];

// Helper functions
export const getClassById = (classId: string): WoWClass | undefined => {
  return wowClasses.find(c => c.id === classId);
};

export const getSpecById = (specId: string): Specialization | undefined => {
  for (const wowClass of wowClasses) {
    const spec = wowClass.specs.find(s => s.id === specId);
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
