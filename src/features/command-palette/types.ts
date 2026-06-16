import type { Json } from '@/integrations/supabase/types';

export type CommandPaletteResultType =
  | 'action'
  | 'page'
  | 'guild'
  | 'member'
  | 'roster'
  | 'poll';

export type CommandPaletteGroupId =
  | 'recent'
  | 'actions'
  | 'pages'
  | 'guilds'
  | 'members'
  | 'rosters'
  | 'polls';

export interface CommandPaletteGuildContext {
  id: string;
  name: string;
  server: string;
  region: string;
  avatarUrl?: string | null;
  basePath: string;
  canManageAtlas?: boolean;
}

export interface CommandPaletteItem {
  id: string;
  type: CommandPaletteResultType;
  group: CommandPaletteGroupId;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  guildId?: string | null;
  metadata?: Record<string, unknown>;
  keywords?: string[];
  score?: number;
  recentCount?: number;
}

export interface CommandPaletteGroup {
  id: CommandPaletteGroupId;
  items: CommandPaletteItem[];
}

export interface CommandPaletteServerResult {
  result_type: string;
  result_id: string;
  guild_id: string | null;
  title: string;
  subtitle: string | null;
  metadata: Json;
  score: number;
}

export interface CommandPaletteRecentRow {
  item_type: string;
  item_id: string;
  guild_id: string | null;
  title: string;
  subtitle: string | null;
  href: string | null;
  metadata: Json;
  use_count: number;
  last_used_at: string;
}
