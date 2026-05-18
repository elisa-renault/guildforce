type SeasonSchemaError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type SeasonSupportMode = 'enabled' | 'legacy';

const seasonSchemaTokens = [
  'guild_seasons',
  'guild_season_member_intents',
  'season_id',
  'prepare_guild_wish_season',
  'archive_guild_wish_season',
  'activate_guild_wish_season',
  'get_roster_member_selection',
];

export const isSeasonSchemaUnavailable = (error: SeasonSchemaError | null | undefined) => {
  if (!error) return false;

  const haystack = `${error.code || ''} ${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return seasonSchemaTokens.some((token) => haystack.includes(token));
};

export const isSeasonFilteringEnabled = (mode: SeasonSupportMode, seasonId: string | null) =>
  mode === 'enabled' && !!seasonId;
