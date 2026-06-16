import type { CommandPaletteGroup, CommandPaletteGroupId, CommandPaletteItem } from './types';

export const COMMAND_PALETTE_GROUP_ORDER: CommandPaletteGroupId[] = [
  'recent',
  'actions',
  'pages',
  'guilds',
  'members',
  'rosters',
  'polls',
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .trim();

const orderedCharacterMatch = (candidate: string, query: string) => {
  if (!query) return false;
  let index = 0;

  for (const char of candidate) {
    if (char === query[index]) {
      index += 1;
      if (index === query.length) return true;
    }
  }

  return false;
};

export const scoreCommandPaletteItem = (
  item: CommandPaletteItem,
  query: string,
  contextGuildId?: string | null,
) => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return item.score ?? item.recentCount ?? 0;
  }

  const title = normalize(item.title);
  const subtitle = normalize(item.subtitle || '');
  const keywords = (item.keywords || []).map(normalize);
  const haystack = [title, subtitle, ...keywords].filter(Boolean).join(' ');
  let score = 0;

  if (title === normalizedQuery) score += 100;
  if (title.startsWith(normalizedQuery)) score += 70;
  if (title.includes(normalizedQuery)) score += 45;
  if (subtitle.includes(normalizedQuery)) score += 18;
  if (keywords.some((keyword) => keyword === normalizedQuery)) score += 58;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) score += 34;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 22;
  if (orderedCharacterMatch(haystack, normalizedQuery)) score += Math.max(8, 24 - normalizedQuery.length);
  if (contextGuildId && item.guildId === contextGuildId) score += 24;
  if (item.type === 'action') score += 8;
  if (item.type === 'page') score += 4;

  return score;
};

export const filterLocalCommandPaletteItems = (
  items: CommandPaletteItem[],
  query: string,
  contextGuildId?: string | null,
) =>
  items
    .map((item) => ({
      ...item,
      score: scoreCommandPaletteItem(item, query, contextGuildId),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title));

export const groupCommandPaletteItems = (items: CommandPaletteItem[]): CommandPaletteGroup[] => {
  const grouped = new Map<CommandPaletteGroupId, CommandPaletteItem[]>();

  items.forEach((item) => {
    const current = grouped.get(item.group) || [];
    current.push(item);
    grouped.set(item.group, current);
  });

  return COMMAND_PALETTE_GROUP_ORDER
    .map((groupId) => ({
      id: groupId,
      items: grouped.get(groupId) || [],
    }))
    .filter((group) => group.items.length > 0);
};

export const dedupeCommandPaletteItems = (items: CommandPaletteItem[]) => {
  const seen = new Set<string>();
  const deduped: CommandPaletteItem[] = [];

  items.forEach((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return deduped;
};
