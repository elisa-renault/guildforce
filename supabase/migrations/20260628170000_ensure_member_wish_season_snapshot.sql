-- Keep roster season table snapshots in sync when a member saves their own wishes.
-- Without this, a first wish can persist in class_wishes while get_roster_season_table
-- still has no roster_season_members row for that member.

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

  WITH effective_main AS (
    SELECT *
    FROM public.get_guild_member_main_characters(p_guild_id)
    WHERE user_id = p_member_id
  ),
  member_snapshot AS (
    SELECT
      gm.user_id,
      em.roster_cache_id,
      COALESCE(em.character_name, p.username, gm.user_id::text) AS display_name,
      COALESCE(em.character_name, p.username) AS character_name,
      COALESCE(em.character_realm, em.character_realm_slug) AS realm_name,
      grc.rank_index,
      CASE
        WHEN rms.user_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        WHEN EXISTS (
          SELECT 1
          FROM public.class_wishes cw
          WHERE cw.guild_id = p_guild_id
            AND cw.roster_id = p_roster_id
            AND cw.season_id = v_effective_season_id
            AND cw.user_id = p_member_id
        ) THEN 'wish'::public.roster_season_member_source
        ELSE 'manual_user'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN p_commitment_status = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN p_commitment_status = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_members gm
    LEFT JOIN public.profiles p ON p.id = gm.user_id
    LEFT JOIN effective_main em ON em.user_id = gm.user_id
    LEFT JOIN public.guild_roster_cache grc ON grc.id = em.roster_cache_id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = v_effective_season_id
     AND rms.user_id = gm.user_id
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  )
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
    p_guild_id,
    p_roster_id,
    v_effective_season_id,
    ms.user_id,
    ms.roster_cache_id,
    ms.display_name,
    ms.character_name,
    ms.realm_name,
    ms.rank_index,
    ms.source,
    ms.season_status,
    now()
  FROM member_snapshot ms
  ON CONFLICT (roster_id, season_id, user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    roster_cache_id = COALESCE(EXCLUDED.roster_cache_id, roster_season_members.roster_cache_id),
    display_name_snapshot = EXCLUDED.display_name_snapshot,
    character_name_snapshot = EXCLUDED.character_name_snapshot,
    realm_snapshot = EXCLUDED.realm_snapshot,
    rank_index_snapshot = EXCLUDED.rank_index_snapshot,
    source = EXCLUDED.source,
    season_status = CASE
      WHEN roster_season_members.season_status IN ('selected', 'bench', 'departed', 'removed')
        THEN roster_season_members.season_status
      ELSE EXCLUDED.season_status
    END,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_member_roster_wishes(UUID, UUID, UUID, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;
