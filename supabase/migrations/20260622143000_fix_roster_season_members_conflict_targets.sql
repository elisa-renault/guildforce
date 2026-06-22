-- Align roster season materialization upserts with the existing partial unique indexes.
-- The current indexes include roster_id, so ON CONFLICT must include it too.

CREATE OR REPLACE FUNCTION public.materialize_roster_season_members(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_season_state public.guild_season_state;
  v_inserted INTEGER := 0;
  v_rank_count INTEGER := 0;
  v_explicit_count INTEGER := 0;
  v_wish_count INTEGER := 0;
  v_external_count INTEGER := 0;
  v_assignment_count INTEGER := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Season not found for roster guild' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_rosters')
  ) THEN
    RAISE EXCEPTION 'Not authorized to materialize roster season members' USING ERRCODE = '42501';
  END IF;

  WITH best_cache AS (
    SELECT DISTINCT ON (grc.matched_user_id)
      grc.matched_user_id AS user_id,
      grc.id AS roster_cache_id,
      grc.character_name,
      grc.character_realm,
      grc.character_realm_slug,
      grc.rank_index
    FROM public.guild_roster_cache grc
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NOT NULL
    ORDER BY grc.matched_user_id, grc.rank_index ASC, grc.updated_at DESC
  ),
  linked_targets AS (
    SELECT
      gm.user_id,
      bc.roster_cache_id,
      COALESCE(NULLIF(p.main_character_name, ''), p.username, gm.user_id::text) AS display_name,
      COALESCE(NULLIF(split_part(p.main_character_name, ' - ', 1), ''), bc.character_name, p.username) AS character_name,
      COALESCE(bc.character_realm, bc.character_realm_slug) AS realm_name,
      bc.rank_index,
      CASE
        WHEN rms.user_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        WHEN cw.user_id IS NOT NULL THEN 'wish'::public.roster_season_member_source
        WHEN rar_user.user_id IS NOT NULL THEN 'manual_user'::public.roster_season_member_source
        ELSE 'target_rule'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN gsmi.commitment_status = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN gsmi.commitment_status = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_members gm
    LEFT JOIN public.profiles p ON p.id = gm.user_id
    LEFT JOIN best_cache bc ON bc.user_id = gm.user_id
    LEFT JOIN public.guild_season_member_intents gsmi
      ON gsmi.guild_id = gm.guild_id
     AND gsmi.season_id = p_season_id
     AND gsmi.roster_id = p_roster_id
     AND gsmi.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.class_wishes
      WHERE guild_id = v_guild_id
        AND roster_id = p_roster_id
        AND season_id = p_season_id
    ) cw ON cw.user_id = gm.user_id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
     AND rms.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.roster_access_rules
      WHERE roster_id = p_roster_id
        AND access_type = 'user'
        AND user_id IS NOT NULL
    ) rar_user ON rar_user.user_id = gm.user_id
    WHERE gm.guild_id = v_guild_id
      AND (
        cw.user_id IS NOT NULL
        OR rms.user_id IS NOT NULL
        OR rar_user.user_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.roster_access_rules rar
          WHERE rar.roster_id = p_roster_id
            AND rar.access_type = 'rank'
            AND bc.rank_index IS NOT NULL
            AND bc.rank_index >= COALESCE(rar.min_rank_index, 0)
            AND bc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, bc.rank_index)
        )
      )
  ),
  inserted_linked AS (
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
      season_status,
      joined_wishlist_at
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      lt.user_id,
      lt.roster_cache_id,
      lt.display_name,
      lt.character_name,
      lt.realm_name,
      lt.rank_index,
      lt.source,
      lt.season_status,
      now()
    FROM linked_targets lt
    ON CONFLICT (roster_id, season_id, user_id) WHERE user_id IS NOT NULL
    DO UPDATE SET
      roster_cache_id = COALESCE(EXCLUDED.roster_cache_id, roster_season_members.roster_cache_id),
      display_name_snapshot = EXCLUDED.display_name_snapshot,
      character_name_snapshot = EXCLUDED.character_name_snapshot,
      realm_snapshot = EXCLUDED.realm_snapshot,
      rank_index_snapshot = EXCLUDED.rank_index_snapshot,
      source = EXCLUDED.source,
      season_status = CASE
        WHEN roster_season_members.season_status IN ('selected', 'bench', 'departed', 'removed', 'declined')
          THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  ),
  external_targets AS (
    SELECT DISTINCT ON (grc.id)
      grc.id AS roster_cache_id,
      grc.character_name,
      grc.character_realm,
      grc.character_realm_slug,
      grc.rank_index,
      CASE
        WHEN rms.roster_cache_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        WHEN emw.roster_cache_id IS NOT NULL THEN 'wish'::public.roster_season_member_source
        ELSE 'target_rule'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN emw.commitment_status = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN emw.commitment_status = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_roster_cache grc
    LEFT JOIN public.external_member_wishes emw
      ON emw.roster_cache_id = grc.id
     AND emw.roster_id = p_roster_id
     AND emw.season_id = p_season_id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_cache_id = grc.id
     AND rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.roster_access_rules rar
          WHERE rar.roster_id = p_roster_id
            AND rar.access_type = 'rank'
            AND grc.rank_index BETWEEN rar.min_rank_index AND rar.max_rank_index
        )
        OR emw.roster_cache_id IS NOT NULL
        OR rms.roster_cache_id IS NOT NULL
      )
    ORDER BY grc.id, grc.updated_at DESC
  ),
  inserted_external AS (
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
      season_status,
      joined_wishlist_at
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      et.roster_cache_id,
      et.character_name,
      et.character_name,
      COALESCE(et.character_realm, et.character_realm_slug),
      et.rank_index,
      et.source,
      et.season_status,
      now()
    FROM external_targets et
    ON CONFLICT (roster_id, season_id, roster_cache_id) WHERE roster_cache_id IS NOT NULL
    DO UPDATE SET
      display_name_snapshot = EXCLUDED.display_name_snapshot,
      character_name_snapshot = EXCLUDED.character_name_snapshot,
      realm_snapshot = EXCLUDED.realm_snapshot,
      rank_index_snapshot = EXCLUDED.rank_index_snapshot,
      source = EXCLUDED.source,
      season_status = CASE
        WHEN roster_season_members.season_status IN ('selected', 'bench', 'departed', 'removed', 'declined')
          THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  ),
  event_insert AS (
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
      rsm.guild_id,
      rsm.roster_id,
      rsm.season_id,
      rsm.id,
      'season_member_snapshot',
      v_actor,
      jsonb_build_object(
        'source', rsm.source,
        'season_status', rsm.season_status,
        'rank_index', rsm.rank_index_snapshot
      )
    FROM public.roster_season_members rsm
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
      AND rsm.joined_wishlist_at >= now() - interval '5 seconds'
    RETURNING id
  )
  SELECT
    (SELECT count(*) FROM inserted_linked) + (SELECT count(*) FROM inserted_external),
    (SELECT count(*) FROM linked_targets WHERE source = 'target_rule'),
    (SELECT count(*) FROM linked_targets WHERE source = 'manual_user'),
    (SELECT count(*) FROM linked_targets WHERE source = 'wish'),
    (SELECT count(*) FROM external_targets),
    (SELECT count(*) FROM event_insert)
  INTO v_inserted, v_rank_count, v_explicit_count, v_wish_count, v_external_count, v_assignment_count;

  PERFORM public.seed_roster_assignments_from_first_approved_wish(p_roster_id, p_season_id);

  RETURN COALESCE(v_inserted, 0);
END;
$$;
