// WoW Classes and Specializations data
// Centralized for easy updates

export type Role = 'tank' | 'healer' | 'dps';

export interface Specialization {
  id: string;
  name: {
    en: string;
    fr: string;
  };
  role: Role;
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
      { id: 'warrior-arms', name: { en: 'Arms', fr: 'Armes' }, role: 'dps' },
      { id: 'warrior-fury', name: { en: 'Fury', fr: 'Fureur' }, role: 'dps' },
      { id: 'warrior-protection', name: { en: 'Protection', fr: 'Protection' }, role: 'tank' },
    ],
  },
  {
    id: 'paladin',
    name: { en: 'Paladin', fr: 'Paladin' },
    color: 'class-paladin',
    specs: [
      { id: 'paladin-holy', name: { en: 'Holy', fr: 'Sacré' }, role: 'healer' },
      { id: 'paladin-protection', name: { en: 'Protection', fr: 'Protection' }, role: 'tank' },
      { id: 'paladin-retribution', name: { en: 'Retribution', fr: 'Vindicte' }, role: 'dps' },
    ],
  },
  {
    id: 'hunter',
    name: { en: 'Hunter', fr: 'Chasseur' },
    color: 'class-hunter',
    specs: [
      { id: 'hunter-beast-mastery', name: { en: 'Beast Mastery', fr: 'Maîtrise des bêtes' }, role: 'dps' },
      { id: 'hunter-marksmanship', name: { en: 'Marksmanship', fr: 'Précision' }, role: 'dps' },
      { id: 'hunter-survival', name: { en: 'Survival', fr: 'Survie' }, role: 'dps' },
    ],
  },
  {
    id: 'rogue',
    name: { en: 'Rogue', fr: 'Voleur' },
    color: 'class-rogue',
    specs: [
      { id: 'rogue-assassination', name: { en: 'Assassination', fr: 'Assassinat' }, role: 'dps' },
      { id: 'rogue-outlaw', name: { en: 'Outlaw', fr: 'Hors-la-loi' }, role: 'dps' },
      { id: 'rogue-subtlety', name: { en: 'Subtlety', fr: 'Finesse' }, role: 'dps' },
    ],
  },
  {
    id: 'priest',
    name: { en: 'Priest', fr: 'Prêtre' },
    color: 'class-priest',
    specs: [
      { id: 'priest-discipline', name: { en: 'Discipline', fr: 'Discipline' }, role: 'healer' },
      { id: 'priest-holy', name: { en: 'Holy', fr: 'Sacré' }, role: 'healer' },
      { id: 'priest-shadow', name: { en: 'Shadow', fr: 'Ombre' }, role: 'dps' },
    ],
  },
  {
    id: 'death-knight',
    name: { en: 'Death Knight', fr: 'Chevalier de la mort' },
    color: 'class-death-knight',
    specs: [
      { id: 'dk-blood', name: { en: 'Blood', fr: 'Sang' }, role: 'tank' },
      { id: 'dk-frost', name: { en: 'Frost', fr: 'Givre' }, role: 'dps' },
      { id: 'dk-unholy', name: { en: 'Unholy', fr: 'Impie' }, role: 'dps' },
    ],
  },
  {
    id: 'shaman',
    name: { en: 'Shaman', fr: 'Chaman' },
    color: 'class-shaman',
    specs: [
      { id: 'shaman-elemental', name: { en: 'Elemental', fr: 'Élémentaire' }, role: 'dps' },
      { id: 'shaman-enhancement', name: { en: 'Enhancement', fr: 'Amélioration' }, role: 'dps' },
      { id: 'shaman-restoration', name: { en: 'Restoration', fr: 'Restauration' }, role: 'healer' },
    ],
  },
  {
    id: 'mage',
    name: { en: 'Mage', fr: 'Mage' },
    color: 'class-mage',
    specs: [
      { id: 'mage-arcane', name: { en: 'Arcane', fr: 'Arcanes' }, role: 'dps' },
      { id: 'mage-fire', name: { en: 'Fire', fr: 'Feu' }, role: 'dps' },
      { id: 'mage-frost', name: { en: 'Frost', fr: 'Givre' }, role: 'dps' },
    ],
  },
  {
    id: 'warlock',
    name: { en: 'Warlock', fr: 'Démoniste' },
    color: 'class-warlock',
    specs: [
      { id: 'warlock-affliction', name: { en: 'Affliction', fr: 'Affliction' }, role: 'dps' },
      { id: 'warlock-demonology', name: { en: 'Demonology', fr: 'Démonologie' }, role: 'dps' },
      { id: 'warlock-destruction', name: { en: 'Destruction', fr: 'Destruction' }, role: 'dps' },
    ],
  },
  {
    id: 'monk',
    name: { en: 'Monk', fr: 'Moine' },
    color: 'class-monk',
    specs: [
      { id: 'monk-brewmaster', name: { en: 'Brewmaster', fr: 'Maître brasseur' }, role: 'tank' },
      { id: 'monk-mistweaver', name: { en: 'Mistweaver', fr: 'Tisse-brume' }, role: 'healer' },
      { id: 'monk-windwalker', name: { en: 'Windwalker', fr: 'Marche-vent' }, role: 'dps' },
    ],
  },
  {
    id: 'druid',
    name: { en: 'Druid', fr: 'Druide' },
    color: 'class-druid',
    specs: [
      { id: 'druid-balance', name: { en: 'Balance', fr: 'Équilibre' }, role: 'dps' },
      { id: 'druid-feral', name: { en: 'Feral', fr: 'Féral' }, role: 'dps' },
      { id: 'druid-guardian', name: { en: 'Guardian', fr: 'Gardien' }, role: 'tank' },
      { id: 'druid-restoration', name: { en: 'Restoration', fr: 'Restauration' }, role: 'healer' },
    ],
  },
  {
    id: 'demon-hunter',
    name: { en: 'Demon Hunter', fr: 'Chasseur de démons' },
    color: 'class-demon-hunter',
    specs: [
      { id: 'dh-havoc', name: { en: 'Havoc', fr: 'Dévastation' }, role: 'dps' },
      { id: 'dh-vengeance', name: { en: 'Vengeance', fr: 'Vengeance' }, role: 'tank' },
      { id: 'dh-devourer', name: { en: 'Devourer', fr: 'Dévoreur' }, role: 'dps' },
    ],
  },
  {
    id: 'evoker',
    name: { en: 'Evoker', fr: 'Évocateur' },
    color: 'class-evoker',
    specs: [
      { id: 'evoker-devastation', name: { en: 'Devastation', fr: 'Dévastation' }, role: 'dps' },
      { id: 'evoker-preservation', name: { en: 'Preservation', fr: 'Préservation' }, role: 'healer' },
      { id: 'evoker-augmentation', name: { en: 'Augmentation', fr: 'Augmentation' }, role: 'dps' },
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
