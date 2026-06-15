-- Centralize roster decision writes so clients do not depend on partial unique
-- index conflict targets that PostgREST cannot use for generic upserts.

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
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update roster decisions'
      USING ERRCODE = '42501';
  END IF;

  IF (p_user_id IS NULL AND p_roster_cache_id IS NULL)
    OR (p_user_id IS NOT NULL AND p_roster_cache_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Roster decision target must be exactly one guild member or external roster cache entry'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT gs.id
      FROM public.guild_seasons gs
      WHERE gs.guild_id = v_guild_id
        AND gs.state = 'active'
      ORDER BY gs.activated_at DESC NULLS LAST, gs.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  IF v_effective_season_id IS NULL THEN
    RAISE EXCEPTION 'No active guild season found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT gs.state
  INTO v_season_state
  FROM public.guild_seasons gs
  WHERE gs.id = v_effective_season_id
    AND gs.guild_id = v_guild_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Guild season not found for roster'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state <> 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Roster decisions can only be changed for the active season'
      USING ERRCODE = '25006';
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF NOT public.is_guild_member(v_guild_id, p_user_id) THEN
      RAISE EXCEPTION 'Target user is not a guild member'
        USING ERRCODE = '42501';
    END IF;

    SELECT rms.id
    INTO v_existing_id
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
      RAISE EXCEPTION 'Target external roster cache entry is not valid for this guild'
        USING ERRCODE = '42501';
    END IF;

    SELECT rms.id
    INTO v_existing_id
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
END;
$$;
