import type { Database } from '@/integrations/supabase/types';

export type GuildSeasonState = Database['public']['Enums']['guild_season_state'];

export interface GuildSeason {
  id: string;
  guild_id: string;
  roster_id?: string | null;
  name: string;
  state: GuildSeasonState;
  starts_at: string | null;
  ends_at: string | null;
  source_season_id: string | null;
  created_by: string | null;
  activated_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
