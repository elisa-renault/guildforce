-- Remove a member's wish row from one roster wish season without removing guild membership.

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
AS $$
DECLARE
  v_actor UUID;
  v_season_state TEXT;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_guild_id IS NULL OR p_roster_id IS NULL OR p_season_id IS NULL OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'Missing guild, roster, season, or member id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rosters r
    WHERE r.id = p_roster_id
      AND r.guild_id = p_guild_id
  ) THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  SELECT state
    INTO v_season_state
  FROM public.guild_seasons
  WHERE id = p_season_id
    AND guild_id = p_guild_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF v_season_state <> 'active' THEN
    RAISE EXCEPTION 'Only active seasons can be changed';
  END IF;

  IF NOT (
    public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
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
    AND season_id = p_season_id
    AND user_id = p_member_id;

  PERFORM public.log_guild_activity(
    p_guild_id,
    v_actor,
    'wish_deleted',
    jsonb_build_object(
      'source', 'roster_wish_row',
      'season_id', p_season_id
    ),
    p_member_id,
    p_roster_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_external_member_wish(
  p_external_wish_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_guild_id UUID;
  v_roster_id UUID;
  v_season_id UUID;
  v_roster_cache_id UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT guild_id, roster_id, season_id, roster_cache_id
    INTO v_guild_id, v_roster_id, v_season_id, v_roster_cache_id
  FROM public.external_member_wishes
  WHERE id = p_external_wish_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'External member wish not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.roster_member_selection
  WHERE roster_id = v_roster_id
    AND season_id = v_season_id
    AND roster_cache_id = v_roster_cache_id;

  DELETE FROM public.external_member_wishes
  WHERE id = p_external_wish_id;
END;
$$;
