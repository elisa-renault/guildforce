-- Seed current roster assignments from the first approved wish when no active
-- assignment already exists for the roster season member.

CREATE OR REPLACE FUNCTION public.seed_roster_assignments_from_first_approved_wish(
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
  v_inserted INTEGER := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  INNER JOIN public.roster_wish_seasons rws
    ON rws.roster_id = r.id
   AND rws.guild_id = r.guild_id
   AND rws.id = p_season_id
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
    OR public.has_role(v_actor, 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to seed roster assignments' USING ERRCODE = '42501';
  END IF;

  WITH approved_wishes AS (
    SELECT
      rsm.id AS roster_season_member_id,
      wish.choice_index,
      wish.class_id,
      wish.spec_id,
      wish.validated_by,
      wish.validated_at
    FROM public.roster_season_members rsm
    CROSS JOIN LATERAL (
      SELECT
        candidates.choice_index,
        candidates.class_id,
        candidates.spec_id,
        candidates.validated_by,
        candidates.validated_at
      FROM (
        SELECT
          cw.choice_index,
          cw.class_id,
          (COALESCE(cw.spec_order, cw.spec_ids))[1] AS spec_id,
          cw.validated_by,
          cw.validated_at
        FROM public.class_wishes cw
        WHERE cw.guild_id = rsm.guild_id
          AND cw.roster_id = rsm.roster_id
          AND cw.season_id = rsm.season_id
          AND cw.user_id = rsm.user_id
          AND cw.validation_status = 'approved'

        UNION ALL

        SELECT
          ew.choice_index,
          ew.class_id,
          (COALESCE(ew.spec_order, ew.spec_ids))[1] AS spec_id,
          ew.validated_by,
          ew.validated_at
        FROM public.external_member_wishes ew
        WHERE ew.guild_id = rsm.guild_id
          AND ew.roster_id = rsm.roster_id
          AND ew.season_id = rsm.season_id
          AND ew.roster_cache_id = rsm.roster_cache_id
          AND ew.validation_status = 'approved'
      ) candidates
      ORDER BY candidates.choice_index ASC
      LIMIT 1
    ) wish
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.roster_member_assignments active_assignment
        WHERE active_assignment.roster_season_member_id = rsm.id
          AND active_assignment.valid_to IS NULL
      )
  ),
  inserted AS (
    INSERT INTO public.roster_member_assignments (
      roster_season_member_id,
      class_id,
      spec_id,
      source,
      choice_index,
      valid_from,
      approved_by
    )
    SELECT
      approved_wishes.roster_season_member_id,
      approved_wishes.class_id,
      approved_wishes.spec_id,
      'wish'::public.roster_assignment_source,
      approved_wishes.choice_index,
      COALESCE(approved_wishes.validated_at, now()),
      approved_wishes.validated_by
    FROM approved_wishes
    WHERE length(trim(COALESCE(approved_wishes.class_id, ''))) > 0
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  IF v_inserted > 0 THEN
    INSERT INTO public.roster_season_events (
      guild_id,
      roster_id,
      season_id,
      actor_id,
      event_type,
      payload
    )
    VALUES (
      v_guild_id,
      p_roster_id,
      p_season_id,
      v_actor,
      'roster_assignments_seeded_from_wishes',
      jsonb_build_object('inserted_count', v_inserted)
    );
  END IF;

  RETURN v_inserted;
END;
$$;

WITH approved_wishes AS (
  SELECT
    rsm.id AS roster_season_member_id,
    wish.choice_index,
    wish.class_id,
    wish.spec_id,
    wish.validated_by,
    wish.validated_at
  FROM public.roster_season_members rsm
  CROSS JOIN LATERAL (
    SELECT
      candidates.choice_index,
      candidates.class_id,
      candidates.spec_id,
      candidates.validated_by,
      candidates.validated_at
    FROM (
      SELECT
        cw.choice_index,
        cw.class_id,
        (COALESCE(cw.spec_order, cw.spec_ids))[1] AS spec_id,
        cw.validated_by,
        cw.validated_at
      FROM public.class_wishes cw
      WHERE cw.guild_id = rsm.guild_id
        AND cw.roster_id = rsm.roster_id
        AND cw.season_id = rsm.season_id
        AND cw.user_id = rsm.user_id
        AND cw.validation_status = 'approved'

      UNION ALL

      SELECT
        ew.choice_index,
        ew.class_id,
        (COALESCE(ew.spec_order, ew.spec_ids))[1] AS spec_id,
        ew.validated_by,
        ew.validated_at
      FROM public.external_member_wishes ew
      WHERE ew.guild_id = rsm.guild_id
        AND ew.roster_id = rsm.roster_id
        AND ew.season_id = rsm.season_id
        AND ew.roster_cache_id = rsm.roster_cache_id
        AND ew.validation_status = 'approved'
    ) candidates
    ORDER BY candidates.choice_index ASC
    LIMIT 1
  ) wish
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.roster_member_assignments active_assignment
    WHERE active_assignment.roster_season_member_id = rsm.id
      AND active_assignment.valid_to IS NULL
  )
),
inserted AS (
  INSERT INTO public.roster_member_assignments (
    roster_season_member_id,
    class_id,
    spec_id,
    source,
    choice_index,
    valid_from,
    approved_by
  )
  SELECT
    approved_wishes.roster_season_member_id,
    approved_wishes.class_id,
    approved_wishes.spec_id,
    'wish'::public.roster_assignment_source,
    approved_wishes.choice_index,
    COALESCE(approved_wishes.validated_at, now()),
    approved_wishes.validated_by
  FROM approved_wishes
  WHERE length(trim(COALESCE(approved_wishes.class_id, ''))) > 0
  ON CONFLICT DO NOTHING
  RETURNING roster_season_member_id
)
INSERT INTO public.roster_season_events (
  guild_id,
  roster_id,
  season_id,
  actor_id,
  event_type,
  payload
)
SELECT
  rsm.guild_id,
  rsm.roster_id,
  rsm.season_id,
  NULL,
  'roster_assignments_seeded_from_wishes',
  jsonb_build_object('inserted_count', count(*), 'migration', true)
FROM inserted
INNER JOIN public.roster_season_members rsm ON rsm.id = inserted.roster_season_member_id
GROUP BY rsm.guild_id, rsm.roster_id, rsm.season_id;

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
        WHEN COALESCE(gsmi.commitment_status, gm.status) = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN COALESCE(gsmi.commitment_status, gm.status) = 'withdrawn' THEN 'declined'::public.roster_season_member_status
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
  inserted AS (
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
      v_guild_id,
      p_roster_id,
      p_season_id,
      user_id,
      roster_cache_id,
      display_name,
      character_name,
      realm_name,
      rank_index,
      source,
      season_status
    FROM linked_targets
    ON CONFLICT (roster_id, season_id, user_id)
    WHERE user_id IS NOT NULL
    DO UPDATE SET
      roster_cache_id = COALESCE(EXCLUDED.roster_cache_id, roster_season_members.roster_cache_id),
      season_status = CASE
        WHEN roster_season_members.season_status IN ('departed', 'removed') THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  WITH external_targets AS (
    SELECT DISTINCT ON (grc.id)
      grc.id AS roster_cache_id,
      grc.character_name,
      COALESCE(grc.character_realm, grc.character_realm_slug) AS realm_name,
      grc.rank_index,
      CASE
        WHEN ew.id IS NOT NULL THEN 'manual_external'::public.roster_season_member_source
        WHEN rms.roster_cache_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        ELSE 'target_rule'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN ew.commitment_status = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN ew.commitment_status = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_roster_cache grc
    LEFT JOIN public.external_member_wishes ew
      ON ew.guild_id = grc.guild_id
     AND ew.roster_id = p_roster_id
     AND ew.season_id = p_season_id
     AND ew.roster_cache_id = grc.id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
     AND rms.roster_cache_id = grc.id
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NULL
      AND (
        ew.id IS NOT NULL
        OR rms.roster_cache_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.roster_access_rules rar
          WHERE rar.roster_id = p_roster_id
            AND rar.access_type = 'rank'
            AND grc.rank_index >= COALESCE(rar.min_rank_index, 0)
            AND grc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, grc.rank_index)
        )
      )
    ORDER BY grc.id, ew.created_at DESC NULLS LAST
  ),
  inserted AS (
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
      v_guild_id,
      p_roster_id,
      p_season_id,
      roster_cache_id,
      character_name,
      character_name,
      realm_name,
      rank_index,
      source,
      season_status
    FROM external_targets
    ON CONFLICT (roster_id, season_id, roster_cache_id)
    WHERE roster_cache_id IS NOT NULL
    DO UPDATE SET
      season_status = CASE
        WHEN roster_season_members.season_status IN ('departed', 'removed') THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_external_count FROM inserted;

  SELECT public.seed_roster_assignments_from_first_approved_wish(p_roster_id, p_season_id)
  INTO v_assignment_count;

  INSERT INTO public.roster_season_events (
    guild_id,
    roster_id,
    season_id,
    actor_id,
    event_type,
    payload
  )
  VALUES (
    v_guild_id,
    p_roster_id,
    p_season_id,
    v_actor,
    'roster_season_materialized',
    jsonb_build_object(
      'linked_count', v_inserted,
      'external_count', v_external_count,
      'assignment_count', v_assignment_count
    )
  );

  RETURN v_inserted + v_external_count + v_rank_count + v_explicit_count + v_wish_count;
END;
$$;
