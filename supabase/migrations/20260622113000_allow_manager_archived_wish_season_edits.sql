-- Allow wish managers to correct archived roster wish seasons for data recovery.
-- Regular members still only edit active seasons through can_edit_wishes().

CREATE OR REPLACE FUNCTION public.upsert_member_roster_wishes(
  p_guild_id UUID,
  p_roster_id UUID,
  p_member_id UUID,
  p_commitment_status TEXT,
  p_wishes JSONB DEFAULT '[]'::jsonb,
  p_manager_edit BOOLEAN DEFAULT false,
  p_season_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_wishes JSONB := COALESCE(p_wishes, '[]'::jsonb);
  v_can_manage BOOLEAN := false;
  v_is_manager_edit BOOLEAN := false;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_wishes) <> 'array' THEN
    RAISE EXCEPTION 'Invalid wishes payload' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT rws.id
      FROM public.roster_wish_seasons rws
      WHERE rws.guild_id = p_guild_id
        AND rws.roster_id = p_roster_id
        AND rws.state = 'active'
      ORDER BY rws.activated_at DESC NULLS LAST, rws.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_effective_season_id
    AND rws.guild_id = p_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Member not found in guild' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_roster_access(p_roster_id, v_actor) THEN
    RAISE EXCEPTION 'No access to roster' USING ERRCODE = '42501';
  END IF;

  v_can_manage := public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes');
  v_is_manager_edit := (v_actor <> p_member_id AND v_can_manage)
    OR (COALESCE(p_manager_edit, false) AND v_can_manage);

  IF v_actor <> p_member_id AND NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_season_state <> 'active'::public.guild_season_state
    AND NOT (v_is_manager_edit AND v_season_state = 'archived'::public.guild_season_state) THEN
    RAISE EXCEPTION 'Season is not editable' USING ERRCODE = '25006';
  END IF;

  IF NOT v_is_manager_edit AND NOT public.can_edit_wishes(p_guild_id, p_roster_id, p_member_id, v_effective_season_id) THEN
    RAISE EXCEPTION 'Wishes are locked' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_wishes) AS payload(value)
    WHERE NULLIF(value->>'class_id', '') IS NOT NULL
      AND jsonb_array_length(COALESCE(value->'spec_ids', '[]'::jsonb)) = 0
  ) THEN
    RAISE EXCEPTION 'Each wish must include at least one spec' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guild_season_member_intents (guild_id, roster_id, season_id, user_id, commitment_status)
  VALUES (p_guild_id, p_roster_id, v_effective_season_id, p_member_id, p_commitment_status)
  ON CONFLICT (roster_id, season_id, user_id)
  DO UPDATE SET commitment_status = EXCLUDED.commitment_status;

  DELETE FROM public.class_wishes
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND season_id = v_effective_season_id
    AND user_id = p_member_id;

  WITH incoming AS (
    SELECT
      row_number() OVER (ORDER BY ordinality)::INTEGER AS choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
    WHERE NULLIF(value->>'class_id', '') IS NOT NULL
  )
  INSERT INTO public.class_wishes (
    guild_id,
    roster_id,
    season_id,
    user_id,
    choice_index,
    class_id,
    spec_ids,
    spec_order,
    comment,
    validation_status,
    validated_by,
    validated_at
  )
  SELECT
    p_guild_id,
    p_roster_id,
    v_effective_season_id,
    p_member_id,
    choice_index,
    class_id,
    spec_ids,
    spec_ids,
    comment,
    'pending',
    NULL,
    NULL
  FROM incoming;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_external_member_wish(
  p_roster_id UUID,
  p_roster_cache_id UUID,
  p_class_id TEXT,
  p_spec_ids TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT NULL,
  p_commitment_status TEXT DEFAULT 'potential',
  p_season_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_matched_user_id UUID;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
  v_existing_id UUID;
  v_spec_order TEXT[] := COALESCE(p_spec_ids, ARRAY[]::TEXT[]);
  v_commitment_status TEXT := COALESCE(NULLIF(p_commitment_status, ''), 'potential');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status' USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_spec_order) = 0 THEN
    RAISE EXCEPTION 'Each wish must include at least one spec' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT rws.id
      FROM public.roster_wish_seasons rws
      WHERE rws.guild_id = v_guild_id
        AND rws.roster_id = p_roster_id
        AND rws.state = 'active'
      ORDER BY rws.activated_at DESC NULLS LAST, rws.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_effective_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state NOT IN ('active'::public.guild_season_state, 'archived'::public.guild_season_state) THEN
    RAISE EXCEPTION 'Season is not editable' USING ERRCODE = '25006';
  END IF;

  SELECT matched_user_id
  INTO v_matched_user_id
  FROM public.guild_roster_cache
  WHERE id = p_roster_cache_id
    AND guild_id = v_guild_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster cache member not found for this guild' USING ERRCODE = 'P0002';
  END IF;

  IF v_matched_user_id IS NOT NULL THEN
    PERFORM public.upsert_member_roster_wishes(
      v_guild_id,
      p_roster_id,
      v_matched_user_id,
      v_commitment_status,
      jsonb_build_array(jsonb_build_object(
        'class_id', p_class_id,
        'spec_ids', to_jsonb(v_spec_order),
        'comment', p_comment
      )),
      true,
      v_effective_season_id
    );
    RETURN NULL;
  END IF;

  INSERT INTO public.external_member_wishes (
    guild_id,
    roster_id,
    season_id,
    roster_cache_id,
    choice_index,
    class_id,
    spec_ids,
    spec_order,
    comment,
    commitment_status,
    validation_status,
    validated_by,
    validated_at,
    created_by
  )
  VALUES (
    v_guild_id,
    p_roster_id,
    v_effective_season_id,
    p_roster_cache_id,
    1,
    p_class_id,
    v_spec_order,
    v_spec_order,
    p_comment,
    v_commitment_status,
    'pending',
    NULL,
    NULL,
    v_actor
  )
  ON CONFLICT (roster_id, season_id, roster_cache_id, choice_index)
  DO UPDATE SET
    class_id = EXCLUDED.class_id,
    spec_ids = EXCLUDED.spec_ids,
    spec_order = EXCLUDED.spec_order,
    comment = EXCLUDED.comment,
    commitment_status = EXCLUDED.commitment_status
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_roster_wish_row(
  p_guild_id UUID,
  p_roster_id UUID,
  p_season_id UUID,
  p_member_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_season_state public.guild_season_state;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT state
  INTO v_season_state
  FROM public.roster_wish_seasons
  WHERE id = p_season_id
    AND guild_id = p_guild_id
    AND roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Season not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state NOT IN ('active'::public.guild_season_state, 'archived'::public.guild_season_state) THEN
    RAISE EXCEPTION 'Only active or archived seasons can be changed' USING ERRCODE = '25006';
  END IF;

  IF NOT (
    public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.class_wishes
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;

  DELETE FROM public.roster_member_selection
  WHERE roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;

  DELETE FROM public.guild_season_member_intents
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;

  DELETE FROM public.roster_season_members
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_roster_member_selection(
  p_roster_id UUID,
  p_selection_status public.roster_selection_status,
  p_user_id UUID DEFAULT NULL,
  p_roster_cache_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL,
  p_reason_code public.roster_selection_reason_code DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
  v_existing_id UUID;
  v_season_member_id UUID;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT r.guild_id INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update roster decisions' USING ERRCODE = '42501';
  END IF;

  IF (p_user_id IS NULL AND p_roster_cache_id IS NULL)
    OR (p_user_id IS NOT NULL AND p_roster_cache_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Roster decision target must be exactly one guild member or external roster cache entry' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT rws.id
      FROM public.roster_wish_seasons rws
      WHERE rws.guild_id = v_guild_id
        AND rws.roster_id = p_roster_id
        AND rws.state = 'active'
      ORDER BY rws.activated_at DESC NULLS LAST, rws.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  IF v_effective_season_id IS NULL THEN
    RAISE EXCEPTION 'No active guild season found' USING ERRCODE = 'P0002';
  END IF;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_effective_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Guild season not found for roster' USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state NOT IN ('active'::public.guild_season_state, 'archived'::public.guild_season_state) THEN
    RAISE EXCEPTION 'Roster decisions can only be changed for active or archived seasons' USING ERRCODE = '25006';
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF NOT public.is_guild_member(v_guild_id, p_user_id) THEN
      RAISE EXCEPTION 'Target user is not a guild member' USING ERRCODE = '42501';
    END IF;

    SELECT rms.id INTO v_existing_id
    FROM public.roster_member_selection rms
    WHERE rms.roster_id = p_roster_id
      AND rms.season_id = v_effective_season_id
      AND rms.user_id = p_user_id
    LIMIT 1;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.guild_roster_cache grc
      WHERE grc.id = p_roster_cache_id
        AND grc.guild_id = v_guild_id
        AND grc.matched_user_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Target external roster cache entry is not valid for this guild' USING ERRCODE = '42501';
    END IF;

    SELECT rms.id INTO v_existing_id
    FROM public.roster_member_selection rms
    WHERE rms.roster_id = p_roster_id
      AND rms.season_id = v_effective_season_id
      AND rms.roster_cache_id = p_roster_cache_id
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.roster_member_selection
    SET selection_status = p_selection_status,
        reason_code = p_reason_code,
        comment = p_comment,
        decided_by = v_actor,
        decided_at = now()
    WHERE id = v_existing_id;
  ELSE
    BEGIN
      INSERT INTO public.roster_member_selection (
        roster_id,
        season_id,
        user_id,
        roster_cache_id,
        selection_status,
        reason_code,
        comment,
        decided_by,
        decided_at
      )
      VALUES (
        p_roster_id,
        v_effective_season_id,
        p_user_id,
        p_roster_cache_id,
        p_selection_status,
        p_reason_code,
        p_comment,
        v_actor,
        now()
      );
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.roster_member_selection
      SET selection_status = p_selection_status,
          reason_code = p_reason_code,
          comment = p_comment,
          decided_by = v_actor,
          decided_at = now()
      WHERE roster_id = p_roster_id
        AND season_id = v_effective_season_id
        AND (
          (p_user_id IS NOT NULL AND user_id = p_user_id)
          OR (p_roster_cache_id IS NOT NULL AND roster_cache_id = p_roster_cache_id)
        );
    END;
  END IF;

  PERFORM public.materialize_roster_season_members(p_roster_id, v_effective_season_id);

  SELECT rsm.id INTO v_season_member_id
  FROM public.roster_season_members rsm
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = v_effective_season_id
    AND (
      (p_user_id IS NOT NULL AND rsm.user_id = p_user_id)
      OR (p_roster_cache_id IS NOT NULL AND rsm.roster_cache_id = p_roster_cache_id)
    )
  LIMIT 1;

  IF v_season_member_id IS NOT NULL THEN
    UPDATE public.roster_season_members
    SET season_status = public.roster_selection_to_season_status(p_selection_status)
    WHERE id = v_season_member_id
      AND season_status NOT IN ('departed', 'removed');

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
      v_guild_id,
      p_roster_id,
      v_effective_season_id,
      v_season_member_id,
      v_actor,
      'roster_selection_changed',
      jsonb_build_object(
        'selection_status', p_selection_status,
        'reason_code', p_reason_code
      )
    );
  END IF;
END;
$$;
