-- Canonicalize wish automations for self-edit, manager edit, and external claim flows.
-- This migration:
-- 1. Replaces the member/manager upsert RPC with slot-diff semantics and explicit manager mode.
-- 2. Stops auto-approving manager-created external wishes.
-- 3. Transfers external roster decisions to linked users without mutating business state.

ALTER TABLE public.external_member_wishes
  ALTER COLUMN validation_status SET DEFAULT 'pending';

DROP FUNCTION IF EXISTS public.upsert_member_roster_wishes(UUID, UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.upsert_member_roster_wishes(
  p_guild_id UUID,
  p_roster_id UUID,
  p_member_id UUID,
  p_commitment_status TEXT,
  p_wishes JSONB DEFAULT '[]'::jsonb,
  p_manager_edit BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_wishes JSONB := COALESCE(p_wishes, '[]'::jsonb);
  v_can_manage BOOLEAN := false;
  v_is_manager_edit BOOLEAN := false;
  v_current_status TEXT;
  v_previous_selection_status public.roster_selection_status := 'undecided';
  v_any_wish_change BOOLEAN := false;
  v_commitment_changed BOOLEAN := false;
  v_should_reset_selection BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status';
  END IF;

  IF jsonb_typeof(v_wishes) <> 'array' THEN
    RAISE EXCEPTION 'Invalid wishes payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rosters r
    WHERE r.id = p_roster_id
      AND r.guild_id = p_guild_id
  ) THEN
    RAISE EXCEPTION 'Roster not found in guild';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Member not found in guild';
  END IF;

  IF NOT public.has_roster_access(p_roster_id, v_actor) THEN
    RAISE EXCEPTION 'No access to roster';
  END IF;

  v_can_manage := public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes');
  v_is_manager_edit := (v_actor <> p_member_id AND v_can_manage)
    OR (COALESCE(p_manager_edit, false) AND v_can_manage);

  IF v_actor <> p_member_id AND NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT v_is_manager_edit AND NOT public.can_edit_wishes(p_guild_id, p_roster_id, p_member_id) THEN
    RAISE EXCEPTION 'Wishes are locked';
  END IF;

  IF EXISTS (
    WITH incoming AS (
      SELECT
        ordinality::INTEGER AS choice_index,
        NULLIF(value->>'class_id', '') AS class_id,
        (
          SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
          FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
        ) AS spec_ids
      FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
    )
    SELECT 1
    FROM incoming
    WHERE class_id IS NOT NULL
      AND cardinality(spec_ids) = 0
  ) THEN
    RAISE EXCEPTION 'Each wish must include at least one spec';
  END IF;

  SELECT gm.status
  INTO v_current_status
  FROM public.guild_members gm
  WHERE gm.guild_id = p_guild_id
    AND gm.user_id = p_member_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Member not found in guild';
  END IF;

  SELECT rms.selection_status
  INTO v_previous_selection_status
  FROM public.roster_member_selection rms
  WHERE rms.roster_id = p_roster_id
    AND rms.user_id = p_member_id;

  v_previous_selection_status := COALESCE(v_previous_selection_status, 'undecided'::public.roster_selection_status);
  v_commitment_changed := p_commitment_status IS DISTINCT FROM v_current_status;

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  ),
  existing AS (
    SELECT
      cw.choice_index,
      cw.class_id,
      CASE
        WHEN COALESCE(cardinality(cw.spec_order), 0) > 0 THEN cw.spec_order
        ELSE cw.spec_ids
      END AS ordered_spec_ids,
      cw.comment
    FROM public.class_wishes cw
    WHERE cw.guild_id = p_guild_id
      AND cw.roster_id = p_roster_id
      AND cw.user_id = p_member_id
  ),
  diff AS (
    SELECT
      COALESCE(e.choice_index, n.choice_index) AS choice_index,
      e.class_id AS old_class_id,
      e.ordered_spec_ids AS old_spec_ids,
      e.comment AS old_comment,
      n.class_id AS new_class_id,
      n.spec_ids AS new_spec_ids,
      n.comment AS new_comment
    FROM existing e
    FULL OUTER JOIN normalized n
      ON n.choice_index = e.choice_index
  )
  SELECT EXISTS (
    SELECT 1
    FROM diff
    WHERE old_class_id IS DISTINCT FROM new_class_id
      OR old_spec_ids IS DISTINCT FROM new_spec_ids
      OR old_comment IS DISTINCT FROM new_comment
  )
  INTO v_any_wish_change;

  IF v_commitment_changed THEN
    UPDATE public.guild_members
    SET status = p_commitment_status
    WHERE guild_id = p_guild_id
      AND user_id = p_member_id;
  END IF;

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  UPDATE public.class_wishes cw
  SET class_id = normalized.class_id,
      spec_ids = normalized.spec_ids,
      spec_order = normalized.spec_ids,
      comment = normalized.comment,
      validation_status = CASE WHEN v_is_manager_edit THEN cw.validation_status ELSE 'pending' END,
      validated_by = CASE WHEN v_is_manager_edit THEN cw.validated_by ELSE NULL END,
      validated_at = CASE WHEN v_is_manager_edit THEN cw.validated_at ELSE NULL END
  FROM normalized
  WHERE cw.guild_id = p_guild_id
    AND cw.roster_id = p_roster_id
    AND cw.user_id = p_member_id
    AND cw.choice_index = normalized.choice_index
    AND (
      cw.class_id IS DISTINCT FROM normalized.class_id
      OR (
        CASE
          WHEN COALESCE(cardinality(cw.spec_order), 0) > 0 THEN cw.spec_order
          ELSE cw.spec_ids
        END
      ) IS DISTINCT FROM normalized.spec_ids
      OR cw.comment IS DISTINCT FROM normalized.comment
    );

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  INSERT INTO public.class_wishes (
    guild_id,
    user_id,
    roster_id,
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
    p_member_id,
    p_roster_id,
    normalized.choice_index,
    normalized.class_id,
    normalized.spec_ids,
    normalized.spec_ids,
    normalized.comment,
    'pending',
    NULL,
    NULL
  FROM normalized
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.class_wishes cw
    WHERE cw.guild_id = p_guild_id
      AND cw.roster_id = p_roster_id
      AND cw.user_id = p_member_id
      AND cw.choice_index = normalized.choice_index
  );

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  DELETE FROM public.class_wishes cw
  WHERE cw.guild_id = p_guild_id
    AND cw.roster_id = p_roster_id
    AND cw.user_id = p_member_id
    AND NOT EXISTS (
      SELECT 1
      FROM normalized
      WHERE normalized.choice_index = cw.choice_index
    );

  IF NOT v_is_manager_edit THEN
    IF v_any_wish_change AND v_previous_selection_status <> 'undecided'::public.roster_selection_status THEN
      v_should_reset_selection := true;
    ELSIF v_commitment_changed
      AND v_current_status = 'confirmed'
      AND p_commitment_status <> 'confirmed'
      AND v_previous_selection_status IN ('selected'::public.roster_selection_status, 'bench'::public.roster_selection_status) THEN
      v_should_reset_selection := true;
    END IF;
  END IF;

  IF v_should_reset_selection THEN
    UPDATE public.roster_member_selection
    SET selection_status = 'undecided',
        reason_code = NULL,
        comment = NULL,
        decided_by = NULL,
        decided_at = NULL
    WHERE roster_id = p_roster_id
      AND user_id = p_member_id
      AND selection_status <> 'undecided';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_external_member_wish(
  p_roster_id UUID,
  p_roster_cache_id UUID,
  p_class_id TEXT,
  p_spec_ids TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT NULL,
  p_commitment_status TEXT DEFAULT 'potential'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_guild_id UUID;
  v_matched_user_id UUID;
  v_existing_id UUID;
  v_spec_order TEXT[];
  v_commitment_status TEXT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT matched_user_id
    INTO v_matched_user_id
  FROM public.guild_roster_cache
  WHERE id = p_roster_cache_id
    AND guild_id = v_guild_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster cache member not found for this guild';
  END IF;

  v_spec_order := COALESCE(p_spec_ids, ARRAY[]::TEXT[]);
  v_commitment_status := COALESCE(NULLIF(p_commitment_status, ''), 'potential');
  IF v_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status';
  END IF;

  IF cardinality(v_spec_order) = 0 THEN
    RAISE EXCEPTION 'Each wish must include at least one spec';
  END IF;

  IF v_matched_user_id IS NOT NULL THEN
    UPDATE public.class_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment
    WHERE guild_id = v_guild_id
      AND roster_id = p_roster_id
      AND user_id = v_matched_user_id
      AND choice_index = 1;

    IF NOT FOUND THEN
      INSERT INTO public.class_wishes (
        guild_id,
        roster_id,
        user_id,
        choice_index,
        class_id,
        spec_ids,
        spec_order,
        comment,
        validation_status,
        validated_by,
        validated_at
      ) VALUES (
        v_guild_id,
        p_roster_id,
        v_matched_user_id,
        1,
        p_class_id,
        v_spec_order,
        v_spec_order,
        p_comment,
        'pending',
        NULL,
        NULL
      );
    END IF;

    UPDATE public.guild_members
    SET status = v_commitment_status
    WHERE guild_id = v_guild_id
      AND user_id = v_matched_user_id
      AND status IS DISTINCT FROM v_commitment_status;

    RETURN NULL;
  END IF;

  SELECT id
    INTO v_existing_id
  FROM public.external_member_wishes
  WHERE roster_id = p_roster_id
    AND roster_cache_id = p_roster_cache_id
    AND choice_index = 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.external_member_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment,
        commitment_status = v_commitment_status
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  END IF;

  INSERT INTO public.external_member_wishes (
    guild_id,
    roster_id,
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
  ) VALUES (
    v_guild_id,
    p_roster_id,
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
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_external_wishes_to_matched_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_selection RECORD;
BEGIN
  IF NEW.matched_user_id IS NULL OR OLD.matched_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR v_entry IN
    SELECT *
    FROM public.external_member_wishes
    WHERE guild_id = NEW.guild_id
      AND roster_cache_id = NEW.id
  LOOP
    DELETE FROM public.class_wishes
    WHERE guild_id = v_entry.guild_id
      AND roster_id = v_entry.roster_id
      AND user_id = NEW.matched_user_id
      AND choice_index = v_entry.choice_index;

    INSERT INTO public.class_wishes (
      guild_id,
      roster_id,
      user_id,
      choice_index,
      class_id,
      spec_ids,
      spec_order,
      comment,
      validation_status,
      validated_by,
      validated_at
    ) VALUES (
      v_entry.guild_id,
      v_entry.roster_id,
      NEW.matched_user_id,
      v_entry.choice_index,
      v_entry.class_id,
      COALESCE(v_entry.spec_ids, ARRAY[]::TEXT[]),
      COALESCE(v_entry.spec_order, ARRAY[]::TEXT[]),
      v_entry.comment,
      v_entry.validation_status,
      v_entry.validated_by,
      v_entry.validated_at
    );

    UPDATE public.guild_members
    SET status = v_entry.commitment_status
    WHERE guild_id = v_entry.guild_id
      AND user_id = NEW.matched_user_id
      AND status IS DISTINCT FROM v_entry.commitment_status;
  END LOOP;

  FOR v_selection IN
    SELECT rms.*
    FROM public.roster_member_selection rms
    INNER JOIN public.rosters r
      ON r.id = rms.roster_id
    WHERE rms.roster_cache_id = NEW.id
      AND r.guild_id = NEW.guild_id
  LOOP
    DELETE FROM public.roster_member_selection
    WHERE roster_id = v_selection.roster_id
      AND user_id = NEW.matched_user_id;

    INSERT INTO public.roster_member_selection (
      roster_id,
      user_id,
      roster_cache_id,
      selection_status,
      reason_code,
      comment,
      decided_by,
      decided_at,
      updated_at
    ) VALUES (
      v_selection.roster_id,
      NEW.matched_user_id,
      NULL,
      v_selection.selection_status,
      v_selection.reason_code,
      v_selection.comment,
      v_selection.decided_by,
      v_selection.decided_at,
      v_selection.updated_at
    );
  END LOOP;

  DELETE FROM public.external_member_wishes
  WHERE guild_id = NEW.guild_id
    AND roster_cache_id = NEW.id;

  DELETE FROM public.roster_member_selection
  WHERE roster_cache_id = NEW.id;

  RETURN NEW;
END;
$$;
