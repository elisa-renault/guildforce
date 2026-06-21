type SeasonSchemaError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type SeasonSupportMode = 'enabled' | 'legacy';

const seasonSchemaTokens = [
  'roster_wish_seasons',
  'roster_season_members',
  'roster_season_events',
  'guild_seasons',
  'guild_season_member_intents',
  'season_id',
  'prepare_roster_wish_season',
  'archive_roster_wish_season',
  'activate_roster_wish_season',
  'materialize_roster_season_members',
  'get_roster_season_table',
  'get_roster_member_selection',
];

export const isSeasonSchemaUnavailable = (error: SeasonSchemaError | null | undefined) => {
  if (!error) return false;

  const haystack = `${error.code || ''} ${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  const looksLikeMissingSchema =
    haystack.includes('does not exist')
    || haystack.includes('could not find')
    || haystack.includes('schema cache')
    || haystack.includes('undefined table')
    || haystack.includes('undefined column')
    || haystack.includes('undefined function')
    || error.code === '42P01'
    || error.code === '42703'
    || error.code === '42883'
    || error.code === 'PGRST202'
    || error.code === 'PGRST204';

  return looksLikeMissingSchema && seasonSchemaTokens.some((token) => haystack.includes(token));
};

export const isSeasonFilteringEnabled = (mode: SeasonSupportMode, seasonId: string | null) =>
  mode === 'enabled' && !!seasonId;
