-- Let wish managers correct historical assignments and add roster-season sync delta.

ALTER TABLE public.roster_season_members
  ADD COLUMN IF NOT EXISTS left_roster_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_roster_member_assignment(
  p_roster_season_member_id UUID,
  p_class_id TEXT,
  p_spec_id TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_source public.roster_assignment_source DEFAULT 'manager_decision',
  p_choice_index INTEGER DEFAULT NULL,
  p_reason_code public.roster_selection_reason_code DEFAULT NULL,
  p_manager_comment TEXT DEFAULT NULL,
  p_valid_from TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_member public.roster_season_members;
  v_assignment_id UUID;
  v_valid_from TIMESTAMPTZ := COALESCE(p_valid_from, now());
  v_season_state public.guild_season_state;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_member
  FROM public.roster_season_members
  WHERE id = p_roster_season_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Roster season member not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_member.guild_id, v_actor)
    OR public.has_guild_permission(v_member.guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update roster assignments' USING ERRCODE = '42501';
  END IF;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_member.season_id
    AND rws.guild_id = v_member.guild_id
    AND rws.roster_id = v_member.roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF length(trim(COALESCE(p_class_id, ''))) = 0 THEN
    RAISE EXCEPTION 'Class is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.roster_member_assignments
  SET valid_to = v_valid_from
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from < v_valid_from;

  DELETE FROM public.roster_member_assignments
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from >= v_valid_from;

  INSERT INTO public.roster_member_assignments (
    roster_season_member_id,
    class_id,
    spec_id,
    role,
    source,
    choice_index,
    reason_code,
    manager_comment,
    valid_from,
    approved_by
  )
  VALUES (
    p_roster_season_member_id,
    trim(p_class_id),
    NULLIF(trim(COALESCE(p_spec_id, '')), ''),
    NULLIF(trim(COALESCE(p_role, '')), ''),
    p_source,
    p_choice_index,
    p_reason_code,
    NULLIF(trim(COALESCE(p_manager_comment, '')), ''),
    v_valid_from,
    v_actor
  )
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.roster_season_events (
    guild_id,
    roster_id,
    season_id,
    roster_season_member_id,
    actor_id,
    event_type,
    payload
  )
  VALUES (
    v_member.guild_id,
    v_member.roster_id,
    v_member.season_id,
    v_member.id,
    v_actor,
    'assignment_changed',
    jsonb_build_object(
      'assignment_id', v_assignment_id,
      'class_id', trim(p_class_id),
      'spec_id', NULLIF(trim(COALESCE(p_spec_id, '')), ''),
      'role', NULLIF(trim(COALESCE(p_role, '')), ''),
      'source', p_source,
      'choice_index', p_choice_index,
      'reason_code', p_reason_code,
      'valid_from', v_valid_from,
      'season_state', v_season_state
    )
  );

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_roster_season_history(
  p_roster_id UUID,
  p_season_id UUID,
  p_roster_season_member_id UUID
)
RETURNS TABLE (
  event_at TIMESTAMPTZ,
  event_type TEXT,
  actor_id UUID,
  payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_can_manage BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT rws.guild_id
  INTO v_guild_id
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.roster_id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.has_roster_access(p_roster_id, v_actor)
    OR public.has_role(v_actor, 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  v_can_manage := public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
    OR public.has_role(v_actor, 'admin');

  RETURN QUERY
  SELECT
    rsm.created_at,
    'season_member_snapshot'::TEXT,
    NULL::UUID,
    jsonb_build_object(
      'display_name', rsm.display_name_snapshot,
      'source', rsm.source,
      'season_status', rsm.season_status,
      'left_roster_at', rsm.left_roster_at,
      'left_guild_at', rsm.left_guild_at
    )
  FROM public.roster_season_members rsm
  WHERE rsm.id = p_roster_season_member_id
    AND rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id

  UNION ALL

  SELECT
    rma.created_at,
    'assignment_changed'::TEXT,
    rma.approved_by,
    jsonb_build_object(
      'class_id', rma.class_id,
      'spec_id', rma.spec_id,
      'role', rma.role,
      'source', rma.source,
      'choice_index', rma.choice_index,
      'reason_code', rma.reason_code,
      'manager_comment', CASE WHEN v_can_manage THEN rma.manager_comment ELSE NULL END,
      'valid_from', rma.valid_from,
      'valid_to', rma.valid_to
    )
  FROM public.roster_member_assignments rma
  WHERE rma.roster_season_member_id = p_roster_season_member_id

  UNION ALL

  SELECT
    rse.created_at,
    rse.event_type,
    rse.actor_id,
    CASE
      WHEN v_can_manage THEN rse.payload
      ELSE rse.payload - 'manager_comment'
    END
  FROM public.roster_season_events rse
  WHERE rse.roster_id = p_roster_id
    AND rse.season_id = p_season_id
    AND rse.roster_season_member_id = p_roster_season_member_id

  ORDER BY event_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_roster_season_sync_delta(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_state public.guild_season_state;
  v_added INTEGER := 0;
  v_left_roster INTEGER := 0;
  v_left_guild INTEGER := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT rws.guild_id, rws.state
  INTO v_guild_id, v_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.roster_id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to sync roster season' USING ERRCODE = '42501';
  END IF;

  IF v_state = 'archived' THEN
    RAISE EXCEPTION 'Archived seasons cannot receive sync deltas' USING ERRCODE = '25006';
  END IF;

  WITH departed AS (
    UPDATE public.roster_season_members rsm
    SET
      season_status = 'departed'::public.roster_season_member_status,
      left_guild_at = COALESCE(rsm.left_guild_at, now()),
      updated_at = now()
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
      AND rsm.user_id IS NOT NULL
      AND rsm.season_status <> 'departed'::public.roster_season_member_status
      AND NOT EXISTS (
        SELECT 1
        FROM public.guild_members gm
        WHERE gm.guild_id = v_guild_id
          AND gm.user_id = rsm.user_id
          AND gm.status <> 'withdrawn'
      )
    RETURNING rsm.*
  ),
  departed_events AS (
    INSERT INTO public.roster_season_events (
      guild_id,
      roster_id,
      season_id,
      roster_season_member_id,
      actor_id,
      event_type,
      payload
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      departed.id,
      v_actor,
      'member_left_guild',
      jsonb_build_object('left_guild_at', departed.left_guild_at)
    FROM departed
    RETURNING id
  )
  SELECT count(*) INTO v_left_guild FROM departed_events;

  WITH best_cache AS (
    SELECT DISTINCT ON (grc.matched_user_id)
      grc.matched_user_id AS user_id,
      grc.id AS roster_cache_id,
      grc.rank_index
    FROM public.guild_roster_cache grc
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NOT NULL
    ORDER BY grc.matched_user_id, grc.rank_index ASC, grc.updated_at DESC
  ),
  eligible_users AS (
    SELECT DISTINCT gm.user_id
    FROM public.guild_members gm
    LEFT JOIN best_cache bc ON bc.user_id = gm.user_id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
     AND rms.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.class_wishes
      WHERE guild_id = v_guild_id
        AND roster_id = p_roster_id
        AND season_id = p_season_id
    ) cw ON cw.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.roster_access_rules
      WHERE roster_id = p_roster_id
        AND access_type = 'user'
        AND user_id IS NOT NULL
    ) rar_user ON rar_user.user_id = gm.user_id
    WHERE gm.guild_id = v_guild_id
      AND gm.status <> 'withdrawn'
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
  removed AS (
    UPDATE public.roster_season_members rsm
    SET
      season_status = 'removed'::public.roster_season_member_status,
      left_roster_at = COALESCE(rsm.left_roster_at, now()),
      updated_at = now()
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
      AND rsm.user_id IS NOT NULL
      AND rsm.season_status NOT IN (
        'departed'::public.roster_season_member_status,
        'removed'::public.roster_season_member_status
      )
      AND EXISTS (
        SELECT 1
        FROM public.guild_members gm
        WHERE gm.guild_id = v_guild_id
          AND gm.user_id = rsm.user_id
          AND gm.status <> 'withdrawn'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM eligible_users eu
        WHERE eu.user_id = rsm.user_id
      )
    RETURNING rsm.*
  ),
  removed_events AS (
    INSERT INTO public.roster_season_events (
      guild_id,
      roster_id,
      season_id,
      roster_season_member_id,
      actor_id,
      event_type,
      payload
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      removed.id,
      v_actor,
      'member_left_roster',
      jsonb_build_object('left_roster_at', removed.left_roster_at)
    FROM removed
    RETURNING id
  )
  SELECT count(*) INTO v_left_roster FROM removed_events;

  SELECT public.materialize_roster_season_members(p_roster_id, p_season_id)
  INTO v_added;

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
    'roster_season_sync_delta_applied',
    jsonb_build_object(
      'added_or_refreshed_count', COALESCE(v_added, 0),
      'left_roster_count', v_left_roster,
      'left_guild_count', v_left_guild,
      'season_state', v_state
    )
  );

  RETURN jsonb_build_object(
    'added_or_refreshed_count', COALESCE(v_added, 0),
    'left_roster_count', v_left_roster,
    'left_guild_count', v_left_guild,
    'season_state', v_state
  );
END;
$$;
