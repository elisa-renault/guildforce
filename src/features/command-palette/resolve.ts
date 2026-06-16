import type {
  CommandPaletteItem,
  CommandPaletteRecentRow,
  CommandPaletteResultType,
  CommandPaletteServerResult,
} from './types';

import { getGuildPath } from '@/lib/guildSlug';


const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const stringValue = (value: unknown) => (typeof value === 'string' ? value : null);

const supportedResultTypes = ['action', 'page', 'guild', 'member', 'roster', 'poll'] as const;

export const isCommandPaletteResultType = (value: string): value is CommandPaletteResultType =>
  supportedResultTypes.includes(value as CommandPaletteResultType);

const getGuildBasePath = (metadata: Record<string, unknown>) => {
  const region = stringValue(metadata.region) || 'eu';
  const server = stringValue(metadata.server);
  const guildName = stringValue(metadata.guild_name) || stringValue(metadata.name);

  if (!server || !guildName) return null;
  return getGuildPath(region, server, guildName);
};

export const groupForResultType = (type: CommandPaletteResultType) => {
  switch (type) {
    case 'action':
      return 'actions';
    case 'page':
      return 'pages';
    case 'guild':
      return 'guilds';
    case 'member':
      return 'members';
    case 'roster':
      return 'rosters';
    case 'poll':
      return 'polls';
    default:
      return 'pages';
  }
};

export const resolveCommandPaletteHref = (item: CommandPaletteItem) => {
  if (item.href) return item.href;

  const metadata = item.metadata || {};

  if (item.type === 'guild') {
    return getGuildBasePath(metadata);
  }

  if (item.type === 'member') {
    const username = stringValue(metadata.username);
    if (username) return `/u/${encodeURIComponent(username)}`;

    const guildBasePath = getGuildBasePath(metadata);
    return guildBasePath ? `${guildBasePath}/members` : null;
  }

  if (item.type === 'roster') {
    const guildBasePath = getGuildBasePath(metadata);
    return guildBasePath ? `${guildBasePath}/roster?rosterId=${encodeURIComponent(item.id)}` : null;
  }

  if (item.type === 'poll') {
    const guildBasePath = getGuildBasePath(metadata);
    return guildBasePath ? `${guildBasePath}/poll/${encodeURIComponent(item.id)}` : null;
  }

  return null;
};

export const mapServerResultToCommandItem = (result: CommandPaletteServerResult): CommandPaletteItem | null => {
  if (!isCommandPaletteResultType(result.result_type)) {
    return null;
  }

  const type = result.result_type;
  if (!['guild', 'member', 'roster', 'poll'].includes(type)) {
    return null;
  }

  const metadata = toRecord(result.metadata);

  return {
    id: result.result_id,
    type,
    group: groupForResultType(type),
    title: result.title,
    subtitle: result.subtitle,
    guildId: result.guild_id,
    metadata,
    score: result.score,
  };
};

export const mapRecentRowToCommandItem = (row: CommandPaletteRecentRow): CommandPaletteItem | null => {
  if (!isCommandPaletteResultType(row.item_type)) {
    return null;
  }

  const metadata = toRecord(row.metadata);

  return {
    id: row.item_id,
    type: row.item_type,
    group: 'recent',
    title: row.title,
    subtitle: row.subtitle,
    href: row.href,
    guildId: row.guild_id,
    metadata,
    recentCount: row.use_count,
    score: row.use_count,
  };
};
