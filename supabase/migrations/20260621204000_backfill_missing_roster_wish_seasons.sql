-- Backfill an initial draft wish season for rosters created before automatic season creation.

WITH inserted_seasons AS (
  INSERT INTO public.roster_wish_seasons (
    guild_id,
    roster_id,
    name,
    state
  )
  SELECT
    r.guild_id,
    r.id,
    'Midnight - Saison 1',
    'draft'::public.guild_season_state
  FROM public.rosters r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.roster_id = r.id
  )
  RETURNING id, guild_id, roster_id
),
best_cache AS (
  SELECT DISTINCT ON (grc.guild_id, grc.matched_user_id)
    grc.guild_id,
    grc.matched_user_id AS user_id,
    grc.id AS roster_cache_id,
    grc.character_name,
    grc.character_realm,
    grc.character_realm_slug,
    grc.rank_index
  FROM public.guild_roster_cache grc
  WHERE grc.matched_user_id IS NOT NULL
  ORDER BY grc.guild_id, grc.matched_user_id, grc.rank_index ASC, grc.updated_at DESC
),
linked_targets AS (
  SELECT
    s.guild_id,
    s.roster_id,
    s.id AS season_id,
    gm.user_id,
    bc.roster_cache_id,
    COALESCE(NULLIF(p.main_character_name, ''), p.username, gm.user_id::text) AS display_name,
    COALESCE(NULLIF(split_part(p.main_character_name, ' - ', 1), ''), bc.character_name, p.username) AS character_name,
    COALESCE(bc.character_realm, bc.character_realm_slug) AS realm_name,
    bc.rank_index
  FROM inserted_seasons s
  INNER JOIN public.guild_members gm ON gm.guild_id = s.guild_id
  LEFT JOIN public.profiles p ON p.id = gm.user_id
  LEFT JOIN best_cache bc
    ON bc.guild_id = s.guild_id
   AND bc.user_id = gm.user_id
  WHERE EXISTS (
    SELECT 1
    FROM public.roster_access_rules rar
    WHERE rar.roster_id = s.roster_id
      AND (
        (rar.access_type = 'user' AND rar.user_id = gm.user_id)
        OR (
          rar.access_type = 'rank'
          AND bc.rank_index IS NOT NULL
          AND bc.rank_index >= COALESCE(rar.min_rank_index, 0)
          AND bc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, bc.rank_index)
        )
      )
  )
),
inserted_linked_members AS (
  INSERT INTO public.roster_season_members (
    guild_id,
    roster_id,
    season_id,
    user_id,
    roster_cache_id,
    display_name_snapshot,
    character_name_snapshot,
    realm_snapshot,
    rank_index_snapshot,
    source,
    season_status
  )
  SELECT
    lt.guild_id,
    lt.roster_id,
    lt.season_id,
    lt.user_id,
    lt.roster_cache_id,
    lt.display_name,
    lt.character_name,
    lt.realm_name,
    lt.rank_index,
    'target_rule'::public.roster_season_member_source,
    'candidate'::public.roster_season_member_status
  FROM linked_targets lt
  ON CONFLICT (roster_id, season_id, user_id) WHERE user_id IS NOT NULL
  DO NOTHING
  RETURNING id, guild_id, roster_id, season_id, rank_index_snapshot, source, season_status
),
external_targets AS (
  SELECT DISTINCT ON (s.id, grc.id)
    s.guild_id,
    s.roster_id,
    s.id AS season_id,
    grc.id AS roster_cache_id,
    grc.character_name,
    grc.character_realm,
    grc.character_realm_slug,
    grc.rank_index
  FROM inserted_seasons s
  INNER JOIN public.guild_roster_cache grc
    ON grc.guild_id = s.guild_id
   AND grc.matched_user_id IS NULL
  WHERE EXISTS (
    SELECT 1
    FROM public.roster_access_rules rar
    WHERE rar.roster_id = s.roster_id
      AND rar.access_type = 'rank'
      AND grc.rank_index >= COALESCE(rar.min_rank_index, 0)
      AND grc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, grc.rank_index)
  )
  ORDER BY s.id, grc.id, grc.updated_at DESC
),
inserted_external_members AS (
  INSERT INTO public.roster_season_members (
    guild_id,
    roster_id,
    season_id,
    roster_cache_id,
    display_name_snapshot,
    character_name_snapshot,
    realm_snapshot,
    rank_index_snapshot,
    source,
    season_status
  )
  SELECT
    et.guild_id,
    et.roster_id,
    et.season_id,
    et.roster_cache_id,
    et.character_name,
    et.character_name,
    COALESCE(et.character_realm, et.character_realm_slug),
    et.rank_index,
    'target_rule'::public.roster_season_member_source,
    'candidate'::public.roster_season_member_status
  FROM external_targets et
  ON CONFLICT (roster_id, season_id, roster_cache_id) WHERE roster_cache_id IS NOT NULL
  DO NOTHING
  RETURNING id, guild_id, roster_id, season_id, rank_index_snapshot, source, season_status
),
inserted_members AS (
  SELECT * FROM inserted_linked_members
  UNION ALL
  SELECT * FROM inserted_external_members
)
INSERT INTO public.roster_season_events (
  guild_id,
  roster_id,
  season_id,
  roster_season_member_id,
  event_type,
  actor_id,
  payload
)
SELECT
  im.guild_id,
  im.roster_id,
  im.season_id,
  im.id,
  'season_member_snapshot',
  NULL,
  jsonb_build_object(
    'source', im.source,
    'season_status', im.season_status,
    'rank_index', im.rank_index_snapshot,
    'backfill', true
  )
FROM inserted_members im;
