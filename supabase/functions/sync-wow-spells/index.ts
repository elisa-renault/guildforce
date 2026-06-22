import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const BATTLENET_CLIENT_ID = Deno.env.get('BATTLENET_CLIENT_ID')!;
const BATTLENET_CLIENT_SECRET = Deno.env.get('BATTLENET_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATTLENET_OAUTH_URL = 'https://oauth.battle.net';

type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

const BATTLENET_API_URLS: Record<BattleNetRegion, string> = {
  eu: 'https://eu.api.blizzard.com',
  us: 'https://us.api.blizzard.com',
  kr: 'https://kr.api.blizzard.com',
  tw: 'https://tw.api.blizzard.com',
};

type LocaleTextKey =
  | 'name_en'
  | 'description_en'
  | 'name_fr'
  | 'description_fr'
  | 'name_de'
  | 'description_de'
  | 'name_es'
  | 'description_es'
  | 'name_pt_br'
  | 'description_pt_br'
  | 'name_it'
  | 'description_it'
  | 'name_ru'
  | 'description_ru'
  | 'name_zh_tw'
  | 'description_zh_tw'
  | 'name_ko'
  | 'description_ko';

type LocaleConfig = {
  locale: string;
  region: BattleNetRegion;
  namespace: string;
  nameKey: LocaleTextKey;
  descriptionKey: LocaleTextKey;
};

const localeConfigs: LocaleConfig[] = [
  {
    locale: 'en_US',
    region: 'us',
    namespace: 'static-us',
    nameKey: 'name_en',
    descriptionKey: 'description_en',
  },
  {
    locale: 'fr_FR',
    region: 'eu',
    namespace: 'static-eu',
    nameKey: 'name_fr',
    descriptionKey: 'description_fr',
  },
  {
    locale: 'de_DE',
    region: 'eu',
    namespace: 'static-eu',
    nameKey: 'name_de',
    descriptionKey: 'description_de',
  },
  {
    locale: 'es_ES',
    region: 'eu',
    namespace: 'static-eu',
    nameKey: 'name_es',
    descriptionKey: 'description_es',
  },
  {
    locale: 'pt_BR',
    region: 'us',
    namespace: 'static-us',
    nameKey: 'name_pt_br',
    descriptionKey: 'description_pt_br',
  },
  {
    locale: 'it_IT',
    region: 'eu',
    namespace: 'static-eu',
    nameKey: 'name_it',
    descriptionKey: 'description_it',
  },
  {
    locale: 'ru_RU',
    region: 'eu',
    namespace: 'static-eu',
    nameKey: 'name_ru',
    descriptionKey: 'description_ru',
  },
  {
    locale: 'zh_TW',
    region: 'tw',
    namespace: 'static-tw',
    nameKey: 'name_zh_tw',
    descriptionKey: 'description_zh_tw',
  },
  {
    locale: 'ko_KR',
    region: 'kr',
    namespace: 'static-kr',
    nameKey: 'name_ko',
    descriptionKey: 'description_ko',
  },
];

const tokenCache = new Map<BattleNetRegion, { token: string; expiresAt: number }>();

async function getClientCredentialsToken(region: BattleNetRegion): Promise<string | null> {
  const cached = tokenCache.get(region);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const tokenResponse = await fetch(`${BATTLENET_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${BATTLENET_CLIENT_ID}:${BATTLENET_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`Client token failed: ${tokenResponse.status}`, errorText);
    return null;
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;
  tokenCache.set(region, { token: tokenData.access_token, expiresAt });
  return tokenData.access_token;
}

async function fetchWithRetry(url: string, options: RequestInit, attempts = 3): Promise<Response> {
  let delayMs = 800;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt === attempts || ![429, 500, 502, 503, 504].includes(response.status)) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2;
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  return fetch(url, options);
}

function isAuthorizedSyncRequest(req: Request): boolean {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCronSecret = Deno.env.get('CRON_SECRET');

  return (
    authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
    Boolean(cronSecret && expectedCronSecret && cronSecret === expectedCronSecret)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isAuthorizedSyncRequest(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const spellIdsInput = Array.isArray(body?.spellIds) ? body.spellIds : [];
    const force = Boolean(body?.force);
    const ttlDays = Number(Deno.env.get('SPELL_CACHE_TTL_DAYS') || 7);

    let spellIds = Array.from(new Set(spellIdsInput))
      .map((id: unknown) => Number(id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (spellIds.length === 0) {
      const { data: effectRows, error: effectsError } = await supabase
        .from('raid_effects')
        .select('spell_id');

      if (effectsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch raid_effects spell_ids' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: abilityRows, error: abilitiesError } = await supabase
        .from('composition_abilities')
        .select('spell_id');

      if (abilitiesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch composition_abilities spell_ids' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      spellIds = Array.from(new Set([
        ...(effectRows || []).map((row: { spell_id: number }) => row.spell_id),
        ...(abilityRows || [])
          .map((row: { spell_id: number | null }) => row.spell_id)
          .filter((id: number | null): id is number => Number.isInteger(id)),
      ]));
    }

    if (spellIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No spellIds to sync' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let idsToSync = spellIds;
    if (!force) {
      const { data: existing, error } = await supabase
        .from('wow_spells')
        .select('spell_id, updated_at')
        .in('spell_id', spellIds);

      if (error) {
        console.error('Failed to fetch existing spell cache:', error);
      } else if (existing) {
        const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - ttlMs;
        const existingMap = new Map<number, string>(
          existing.map((row: { spell_id: number; updated_at: string }) => [row.spell_id, row.updated_at])
        );
        idsToSync = spellIds.filter((id) => {
          const updatedAt = existingMap.get(id);
          if (!updatedAt) return true;
          return new Date(updatedAt).getTime() < cutoff;
        });
      }
    }

    const synced: number[] = [];
    const failed: number[] = [];

    for (const spellId of idsToSync) {
      const record: Record<string, unknown> = { spell_id: spellId, updated_at: new Date().toISOString() };
      let hasAnyLocale = false;

      for (const localeConfig of localeConfigs) {
        const token = await getClientCredentialsToken(localeConfig.region);
        if (!token) {
          console.error(`No client token for ${localeConfig.region}, spell ${spellId}`);
          continue;
        }

        const apiUrl = BATTLENET_API_URLS[localeConfig.region];
        const url =
          `${apiUrl}/data/wow/spell/${spellId}?namespace=${localeConfig.namespace}&locale=${localeConfig.locale}`;

        const response = await fetchWithRetry(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Spell ${spellId} (${localeConfig.locale}) failed: ${response.status}`, errorText.slice(0, 200));
          continue;
        }

        const data = await response.json();
        record[localeConfig.nameKey] = data?.name || null;
        record[localeConfig.descriptionKey] = data?.description || null;
        hasAnyLocale = true;
      }

      if (!hasAnyLocale) {
        failed.push(spellId);
        continue;
      }

      const { error: upsertError } = await supabase
        .from('wow_spells')
        .upsert(record, { onConflict: 'spell_id' });

      if (upsertError) {
        console.error(`Upsert failed for spell ${spellId}:`, upsertError);
        failed.push(spellId);
        continue;
      }

      synced.push(spellId);
    }

    return new Response(
      JSON.stringify({
        requested: spellIds.length,
        synced: synced.length,
        skipped: spellIds.length - idsToSync.length,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
