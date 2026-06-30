-- Make roster access resilient while Battle.net membership sync catches up.
-- Rank-based access can come from either the character membership table or the
-- guild roster cache, which is already used by roster-season membership views.

CREATE OR REPLACE FUNCTION public.get_roster_access_debug(
  p_roster_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  has_access BOOLEAN,
  source TEXT,
  best_rank_index INTEGER,
  profile_is_syncing BOOLEAN,
  latest_sync_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_guild_id UUID;
  v_wgm_rank INTEGER;
  v_cache_rank INTEGER;
  v_profile_is_syncing BOOLEAN := false;
  v_latest_profile_at TIMESTAMPTZ;
  v_latest_wgm_at TIMESTAMPTZ;
  v_latest_cache_at TIMESTAMPTZ;
  v_best_rank INTEGER;
  v_curly_apostrophe CONSTANT TEXT := chr(8217);
  v_accent_source CONSTANT TEXT := U&'\00E0\00E1\00E2\00E3\00E4\00E5\00E7\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F1\00F2\00F3\00F4\00F5\00F6\00F9\00FA\00FB\00FC\00FD\00FF\00C0\00C1\00C2\00C3\00C4\00C5\00C7\00C8\00C9\00CA\00CB\00CC\00CD\00CE\00CF\00D1\00D2\00D3\00D4\00D5\00D6\00D9\00DA\00DB\00DC\00DD';
  v_accent_target CONSTANT TEXT := 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';
BEGIN
  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  SELECT COALESCE(p.is_syncing, false), p.updated_at
  INTO v_profile_is_syncing, v_latest_profile_at
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_guild_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      'roster_not_found'::TEXT,
      NULL::INTEGER,
      COALESCE(v_profile_is_syncing, false),
      v_latest_profile_at;
    RETURN;
  END IF;

  SELECT MIN(wgm.rank_index), MAX(wgm.updated_at)
  INTO v_wgm_rank, v_latest_wgm_at
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g ON (
    LOWER(g.name) = LOWER(wgm.guild_name)
    AND LOWER(COALESCE(g.region, 'eu')) = LOWER(COALESCE(wgm.guild_region, 'eu'))
    AND (
      regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(g.server, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(wgm.guild_realm_slug, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
      OR regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(g.server, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(wgm.guild_realm, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
    )
  )
  WHERE g.id = v_guild_id
    AND wgm.user_id = p_user_id;

  SELECT MIN(grc.rank_index), MAX(grc.updated_at)
  INTO v_cache_rank, v_latest_cache_at
  FROM public.guild_roster_cache grc
  WHERE grc.guild_id = v_guild_id
    AND grc.matched_user_id = p_user_id
    AND grc.rank_index IS NOT NULL;

  v_best_rank := LEAST(COALESCE(v_wgm_rank, 2147483647), COALESCE(v_cache_rank, 2147483647));
  IF v_best_rank = 2147483647 THEN
    v_best_rank := NULL;
  END IF;

  IF public.is_guild_gm(v_guild_id, p_user_id) THEN
    RETURN QUERY SELECT
      true,
      'gm'::TEXT,
      v_best_rank,
      COALESCE(v_profile_is_syncing, false),
      (SELECT MAX(value) FROM (VALUES (v_latest_profile_at), (v_latest_wgm_at), (v_latest_cache_at)) AS latest(value));
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.roster_access_rules rar
    WHERE rar.roster_id = p_roster_id
      AND rar.access_type = 'user'
      AND rar.user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT
      true,
      'user'::TEXT,
      v_best_rank,
      COALESCE(v_profile_is_syncing, false),
      (SELECT MAX(value) FROM (VALUES (v_latest_profile_at), (v_latest_wgm_at), (v_latest_cache_at)) AS latest(value));
    RETURN;
  END IF;

  IF v_wgm_rank IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.roster_access_rules rar
    WHERE rar.roster_id = p_roster_id
      AND rar.access_type = 'rank'
      AND v_wgm_rank >= COALESCE(rar.min_rank_index, 0)
      AND v_wgm_rank <= COALESCE(rar.max_rank_index, rar.min_rank_index, v_wgm_rank)
  ) THEN
    RETURN QUERY SELECT
      true,
      'wow_guild_memberships'::TEXT,
      v_wgm_rank,
      COALESCE(v_profile_is_syncing, false),
      (SELECT MAX(value) FROM (VALUES (v_latest_profile_at), (v_latest_wgm_at), (v_latest_cache_at)) AS latest(value));
    RETURN;
  END IF;

  IF v_cache_rank IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.roster_access_rules rar
    WHERE rar.roster_id = p_roster_id
      AND rar.access_type = 'rank'
      AND v_cache_rank >= COALESCE(rar.min_rank_index, 0)
      AND v_cache_rank <= COALESCE(rar.max_rank_index, rar.min_rank_index, v_cache_rank)
  ) THEN
    RETURN QUERY SELECT
      true,
      'guild_roster_cache'::TEXT,
      v_cache_rank,
      COALESCE(v_profile_is_syncing, false),
      (SELECT MAX(value) FROM (VALUES (v_latest_profile_at), (v_latest_wgm_at), (v_latest_cache_at)) AS latest(value));
    RETURN;
  END IF;

  RETURN QUERY SELECT
    false,
    'none'::TEXT,
    v_best_rank,
    COALESCE(v_profile_is_syncing, false),
    (SELECT MAX(value) FROM (VALUES (v_latest_profile_at), (v_latest_wgm_at), (v_latest_cache_at)) AS latest(value));
END;
$$;

CREATE OR REPLACE FUNCTION public.has_roster_access(p_roster_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE((
    SELECT access_debug.has_access
    FROM public.get_roster_access_debug(p_roster_id, p_user_id) AS access_debug
    LIMIT 1
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.get_roster_access_debug(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_roster_access(UUID, UUID) TO authenticated;
