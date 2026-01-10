// Battle.net class IDs to WoW class ID mapping
// Shared between BattleNetConnect and GuildMemberships components

export const BATTLENET_CLASS_MAP: Record<number, string> = {
  1: 'warrior',
  2: 'paladin',
  3: 'hunter',
  4: 'rogue',
  5: 'priest',
  6: 'death-knight',
  7: 'shaman',
  8: 'mage',
  9: 'warlock',
  10: 'monk',
  11: 'druid',
  12: 'demon-hunter',
  13: 'evoker',
};

export const getClassNameFromBattleNet = (classId: number): string => {
  return BATTLENET_CLASS_MAP[classId] || 'unknown';
};
