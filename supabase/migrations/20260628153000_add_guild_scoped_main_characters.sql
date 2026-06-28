-- Guild-scoped main character overrides.
-- Stable character identity is stored by name + realm slug because Battle.net sync
-- can delete/reinsert wow_characters rows and change their UUIDs.

ALTER TABLE public.guild_members
  ADD COLUMN IF NOT EXISTS guild_main_character_id UUID REFERENCES public.wow_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guild_main_character_name TEXT,
  ADD COLUMN IF NOT EXISTS guild_main_character_realm TEXT,
  ADD COLUMN IF NOT EXISTS guild_main_character_realm_slug TEXT,
  ADD COLUMN IF NOT EXISTS guild_main_character_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guild_main_character_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guild_members_guild_main_character_id
  ON public.guild_members(guild_main_character_id);

COMMENT ON COLUMN public.guild_members.guild_main_character_name
  IS 'Guild-scoped main character override. NULL means use the profile/global main character.';
COMMENT ON COLUMN public.guild_members.guild_main_character_realm_slug
  IS 'Stable realm slug for the guild-scoped main character override.';

DROP FUNCTION IF EXISTS public.get_guild_member_main_characters(UUID);
CREATE OR REPLACE FUNCTION public.get_guild_member_main_characters(
  p_guild_id UUID
)
RETURNS TABLE (
  user_id UUID,
  character_id UUID,
  roster_cache_id UUID,
  character_name TEXT,
  character_realm TEXT,
  character_realm_slug TEXT,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.is_guild_member(p_guild_id, v_actor)
    OR public.has_role(v_actor, 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH ranked_cache AS (
    SELECT
      gm.user_id,
      grc.id AS roster_cache_id,
      COALESCE(grc.matched_character_id, wc.id) AS character_id,
      grc.character_name,
      grc.character_realm,
      grc.character_realm_slug,
      CASE
        WHEN gm.guild_main_character_name IS NOT NULL
          AND lower(grc.character_name) = lower(gm.guild_main_character_name)
          AND lower(grc.character_realm_slug) = lower(gm.guild_main_character_realm_slug)
          THEN 0
        WHEN wc.is_main = true THEN 1
        ELSE 2
      END AS priority,
      CASE
        WHEN gm.guild_main_character_name IS NOT NULL
          AND lower(grc.character_name) = lower(gm.guild_main_character_name)
          AND lower(grc.character_realm_slug) = lower(gm.guild_main_character_realm_slug)
          THEN 'override'
        WHEN wc.is_main = true THEN 'profile'
        ELSE 'fallback'
      END AS source,
      grc.rank_index,
      grc.updated_at
    FROM public.guild_members gm
    JOIN public.guild_roster_cache grc
      ON grc.guild_id = gm.guild_id
     AND grc.matched_user_id = gm.user_id
    LEFT JOIN public.wow_characters wc
      ON wc.user_id = gm.user_id
     AND (
       wc.id = grc.matched_character_id
       OR (
         lower(wc.name) = lower(grc.character_name)
         AND lower(wc.realm_slug) = lower(grc.character_realm_slug)
       )
     )
    WHERE gm.guild_id = p_guild_id
  ),
  best_cache AS (
    SELECT DISTINCT ON (ranked_cache.user_id)
      ranked_cache.*
    FROM ranked_cache
    ORDER BY ranked_cache.user_id, ranked_cache.priority, ranked_cache.rank_index ASC NULLS LAST, ranked_cache.updated_at DESC
  )
  SELECT
    best_cache.user_id,
    best_cache.character_id,
    best_cache.roster_cache_id,
    best_cache.character_name,
    best_cache.character_realm,
    best_cache.character_realm_slug,
    best_cache.source
  FROM best_cache;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guild_member_main_characters(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_guild_member_main_candidates(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_guild_member_main_candidates(
  p_guild_id UUID,
  p_member_id UUID
)
RETURNS TABLE (
  character_id UUID,
  roster_cache_id UUID,
  character_name TEXT,
  character_realm TEXT,
  character_realm_slug TEXT,
  character_level INTEGER,
  character_class_id INTEGER,
  rank_index INTEGER,
  is_effective_main BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_can_manage BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  v_can_manage := public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_members');

  IF NOT (
    p_member_id = v_actor
    OR v_can_manage
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Guild member not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH effective AS (
    SELECT *
    FROM public.get_guild_member_main_characters(p_guild_id)
    WHERE user_id = p_member_id
  )
  SELECT DISTINCT ON (grc.character_name, grc.character_realm_slug)
    COALESCE(grc.matched_character_id, wc.id) AS character_id,
    grc.id AS roster_cache_id,
    grc.character_name,
    grc.character_realm,
    grc.character_realm_slug,
    grc.character_level,
    grc.character_class_id,
    grc.rank_index,
    EXISTS (
      SELECT 1
      FROM effective e
      WHERE lower(e.character_name) = lower(grc.character_name)
        AND lower(e.character_realm_slug) = lower(grc.character_realm_slug)
    ) AS is_effective_main
  FROM public.guild_roster_cache grc
  LEFT JOIN public.wow_characters wc
    ON wc.user_id = p_member_id
   AND (
     wc.id = grc.matched_character_id
     OR (
       lower(wc.name) = lower(grc.character_name)
       AND lower(wc.realm_slug) = lower(grc.character_realm_slug)
     )
   )
  WHERE grc.guild_id = p_guild_id
    AND grc.matched_user_id = p_member_id
  ORDER BY grc.character_name, grc.character_realm_slug, grc.rank_index ASC NULLS LAST, grc.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guild_member_main_candidates(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.set_guild_member_main_character(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.set_guild_member_main_character(
  p_guild_id UUID,
  p_member_id UUID,
  p_character_name TEXT,
  p_realm_slug TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_can_manage BOOLEAN := false;
  v_character RECORD;
  v_profile_main RECORD;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  v_can_manage := public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_members');

  IF NOT (
    p_member_id = v_actor
    OR v_can_manage
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Guild member not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COALESCE(grc.matched_character_id, wc.id) AS character_id,
    grc.id AS roster_cache_id,
    grc.character_name,
    grc.character_realm,
    grc.character_realm_slug,
    grc.rank_index
  INTO v_character
  FROM public.guild_roster_cache grc
  LEFT JOIN public.wow_characters wc
    ON wc.user_id = p_member_id
   AND (
     wc.id = grc.matched_character_id
     OR (
       lower(wc.name) = lower(grc.character_name)
       AND lower(wc.realm_slug) = lower(grc.character_realm_slug)
     )
   )
  WHERE grc.guild_id = p_guild_id
    AND grc.matched_user_id = p_member_id
    AND lower(grc.character_name) = lower(p_character_name)
    AND lower(grc.character_realm_slug) = lower(p_realm_slug)
  ORDER BY grc.rank_index ASC NULLS LAST, grc.updated_at DESC
  LIMIT 1;

  IF v_character.character_name IS NULL THEN
    RAISE EXCEPTION 'Character not found in this guild' USING ERRCODE = 'P0002';
  END IF;

  SELECT wc.name, wc.realm_slug
  INTO v_profile_main
  FROM public.wow_characters wc
  WHERE wc.user_id = p_member_id
    AND wc.is_main = true
  LIMIT 1;

  IF v_profile_main.name IS NOT NULL
    AND lower(v_profile_main.name) = lower(v_character.character_name)
    AND lower(v_profile_main.realm_slug) = lower(v_character.character_realm_slug)
  THEN
    UPDATE public.guild_members
    SET guild_main_character_id = NULL,
        guild_main_character_name = NULL,
        guild_main_character_realm = NULL,
        guild_main_character_realm_slug = NULL,
        guild_main_character_updated_at = now(),
        guild_main_character_updated_by = v_actor
    WHERE guild_id = p_guild_id
      AND user_id = p_member_id;
  ELSE
    UPDATE public.guild_members
    SET guild_main_character_id = v_character.character_id,
        guild_main_character_name = v_character.character_name,
        guild_main_character_realm = v_character.character_realm,
        guild_main_character_realm_slug = v_character.character_realm_slug,
        guild_main_character_updated_at = now(),
        guild_main_character_updated_by = v_actor
    WHERE guild_id = p_guild_id
      AND user_id = p_member_id;
  END IF;

  UPDATE public.roster_season_members rsm
  SET roster_cache_id = v_character.roster_cache_id,
      display_name_snapshot = v_character.character_name,
      character_name_snapshot = v_character.character_name,
      realm_snapshot = COALESCE(v_character.character_realm, v_character.character_realm_slug),
      rank_index_snapshot = v_character.rank_index,
      updated_at = now()
  FROM public.roster_wish_seasons rws
  WHERE rsm.guild_id = p_guild_id
    AND rsm.user_id = p_member_id
    AND rws.id = rsm.season_id
    AND rws.state IN ('draft', 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_guild_member_main_character(UUID, UUID, TEXT, TEXT) TO authenticated;

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

  WITH effective_main AS (
    SELECT * FROM public.get_guild_member_main_characters(v_guild_id)
  ),
  linked_targets AS (
    SELECT
      gm.user_id,
      em.roster_cache_id,
      COALESCE(em.character_name, p.username, gm.user_id::text) AS display_name,
      COALESCE(em.character_name, p.username) AS character_name,
      COALESCE(em.character_realm, em.character_realm_slug) AS realm_name,
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
    LEFT JOIN effective_main em ON em.user_id = gm.user_id
    LEFT JOIN public.guild_roster_cache bc ON bc.id = em.roster_cache_id
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
      v_guild_id,
      p_roster_id,
      p_season_id,
      rsm.id,
      'member_joined'::public.roster_season_event_type,
      v_actor,
      jsonb_build_object('source', rsm.source)
    FROM public.roster_season_members rsm
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
      AND rsm.joined_wishlist_at >= now() - interval '5 seconds'
    ON CONFLICT DO NOTHING
  )
  SELECT
    (SELECT count(*) FROM inserted_linked) + (SELECT count(*) FROM inserted_external),
    (SELECT count(*) FROM linked_targets WHERE source = 'target_rule'),
    (SELECT count(*) FROM linked_targets WHERE source = 'manual_user'),
    (SELECT count(*) FROM linked_targets WHERE source = 'wish'),
    (SELECT count(*) FROM external_targets),
    (SELECT count(*) FROM linked_targets WHERE source = 'selection') + (SELECT count(*) FROM external_targets WHERE source = 'selection')
  INTO v_inserted, v_rank_count, v_explicit_count, v_wish_count, v_external_count, v_assignment_count;

  PERFORM public.seed_roster_assignments_from_first_approved_wish(p_roster_id, p_season_id);

  RETURN v_inserted;
END;
$$;
