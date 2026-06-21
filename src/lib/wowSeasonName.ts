const RAIDER_IO_CURRENT_RUNS_URL =
  'https://raider.io/api/v1/mythic-plus/runs?region=world&dungeon=all&page=0';

const EXPANSION_SLUGS: Record<string, string> = {
  mn: 'Midnight',
  tww: 'The War Within',
  df: 'Dragonflight',
  sl: 'Shadowlands',
  bfa: 'Battle for Azeroth',
  legion: 'Legion',
};

const FALLBACK_SEASON_NAME = 'Midnight - Saison 1';

type RaiderIoCurrentRunsResponse = {
  params?: {
    season?: string;
  };
  rankings?: Array<{
    run?: {
      season?: string;
    };
  }>;
};

export const resolveRosterSeasonNameFromSlug = (seasonSlug: string | null | undefined) => {
  const match = /^season-([a-z0-9-]+)-(\d+)$/i.exec(seasonSlug || '');
  if (!match) return FALLBACK_SEASON_NAME;

  const [, expansionSlug, seasonNumber] = match;
  const expansionName = EXPANSION_SLUGS[expansionSlug.toLowerCase()];
  if (!expansionName) return FALLBACK_SEASON_NAME;

  return `${expansionName} - Saison ${seasonNumber}`;
};

export const resolveCurrentWowSeasonName = async () => {
  try {
    const response = await fetch(RAIDER_IO_CURRENT_RUNS_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return FALLBACK_SEASON_NAME;

    const data = (await response.json()) as RaiderIoCurrentRunsResponse;
    return resolveRosterSeasonNameFromSlug(data.params?.season || data.rankings?.[0]?.run?.season);
  } catch {
    return FALLBACK_SEASON_NAME;
  }
};
