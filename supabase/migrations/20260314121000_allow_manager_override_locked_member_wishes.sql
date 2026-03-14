-- Allow GM/manage_wishes to correct member wishes on locked rosters/member rows.
-- Self-service edits remain governed by can_edit_wishes() and table RLS.

CREATE OR REPLACE FUNCTION public.upsert_member_roster_wishes(
  p_guild_id UUID,
  p_roster_id UUID,
  p_member_id UUID,
  p_commitment_status TEXT,
  p_wishes JSONB DEFAULT '[]'::jsonb
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
  v_entry JSONB;
  v_choice_index INTEGER := 0;
  v_class_id TEXT;
  v_spec_ids TEXT[];
  v_comment TEXT;
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

  IF v_actor <> p_member_id AND NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT v_can_manage AND NOT public.can_edit_wishes(p_guild_id, p_roster_id, p_member_id) THEN
    RAISE EXCEPTION 'Wishes are locked';
  END IF;

  UPDATE public.guild_members
  SET status = p_commitment_status
  WHERE guild_id = p_guild_id
    AND user_id = p_member_id;

  DELETE FROM public.class_wishes
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND user_id = p_member_id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(v_wishes)
  LOOP
    v_choice_index := v_choice_index + 1;
    v_class_id := NULLIF(v_entry->>'class_id', '');

    IF v_class_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(array_agg(value), ARRAY[]::TEXT[])
      INTO v_spec_ids
    FROM jsonb_array_elements_text(COALESCE(v_entry->'spec_ids', '[]'::jsonb));

    IF cardinality(v_spec_ids) = 0 THEN
      RAISE EXCEPTION 'Each wish must include at least one spec';
    END IF;

    v_comment := NULLIF(v_entry->>'comment', '');

    INSERT INTO public.class_wishes (
      guild_id,
      user_id,
      roster_id,
      choice_index,
      class_id,
      spec_ids,
      spec_order,
      comment
    ) VALUES (
      p_guild_id,
      p_member_id,
      p_roster_id,
      v_choice_index,
      v_class_id,
      v_spec_ids,
      v_spec_ids,
      v_comment
    );
  END LOOP;
END;
$$;
