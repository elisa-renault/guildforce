export interface RaidEffect {
  name: string;
  description: string;
}

export interface RaidEffectBySpec {
  classId: string;
  specId?: string;
  buffs: RaidEffect[];
  debuffs: RaidEffect[];
}

export const raidMajorBuffsDebuffs: RaidEffectBySpec[] = [
  { classId: 'death-knight', buffs: [], debuffs: [] },
  {
    classId: 'demon-hunter',
    buffs: [],
    debuffs: [
      {
        name: 'Chaos Brand',
        description: "Increases magic damage taken by the enemy by 3%.",
      },
    ],
  },
  {
    classId: 'druid',
    buffs: [
      {
        name: 'Mark of the Wild',
        description: 'Increases raid Versatility by 3% for 1 hour.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'evoker',
    buffs: [
      {
        name: 'Blessing of the Bronze',
        description:
          'Weave the threads of time, reducing the cooldown of a major movement ability for all party and raid members by 15% for 1 hour.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'evoker',
    specId: 'evoker-augmentation',
    buffs: [
      {
        name: 'Ebon Might',
        description:
          "Increase all damage dealing allies' primary stat by 8% of your own and increase your own damage by 20% for 10 sec.",
      },
    ],
    debuffs: [],
  },
  {
    classId: 'hunter',
    buffs: [],
    debuffs: [
      {
        name: "Hunter's Mark",
        description: "Increases the target's damage taken by the enemy by 3%.",
      },
    ],
  },
  {
    classId: 'mage',
    buffs: [
      {
        name: 'Arcane Intellect',
        description: 'Increases raid Intellect by 3% for 1 hour.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'monk',
    buffs: [],
    debuffs: [
      {
        name: 'Mystic Touch',
        description: 'Increases physical damage taken by the enemy by 5%.',
      },
    ],
  },
  {
    classId: 'paladin',
    buffs: [
      {
        name: 'Devotion Aura',
        description:
          'Party and raid members within 40 yds are bolstered by their devotion reducing damage taken by 3%.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'priest',
    buffs: [
      {
        name: 'Power Word: Fortitude',
        description: 'Increases raid Stamina by 5% for 1 hour.',
      },
    ],
    debuffs: [],
  },
  { classId: 'rogue', buffs: [], debuffs: [] },
  {
    classId: 'rogue',
    buffs: [],
    debuffs: [
      {
        name: 'Atrophic Poison',
        description:
          'Talent. Each strike has a 30% chance of poisoning the enemy, reducing their damage by 3% for 10 sec.',
      },
    ],
  },
  {
    classId: 'shaman',
    buffs: [
      {
        name: 'Bloodlust',
        description: 'Increases haste by 30% for all party and raid members for 40 sec.',
      },
      {
        name: 'Skyfury',
        description:
          'Grants allies 2% Mastery and empowers auto-attacks to have a 20% chance to instantly strike again for 1 hour.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'warlock',
    buffs: [
      {
        name: 'Create Soulwell',
        description: 'Raid members can click the Soulwell to acquire a Healthstone. Healthstone on use restores 25% health.',
      },
    ],
    debuffs: [],
  },
  {
    classId: 'warrior',
    buffs: [
      {
        name: 'Battle Shout',
        description: 'Increases the attack power of all raid and party members within 100 yards by 5% for 1 hour.',
      },
    ],
    debuffs: [],
  },
];
