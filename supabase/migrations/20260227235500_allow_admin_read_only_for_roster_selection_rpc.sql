-- Allow global admins to read roster selection rows in read-only mode.
-- Comments remain masked unless the caller is GM or has manage_wishes.

DROP FUNCTION IF EXISTS public.get_roster_member_selection(UUID);

CREATE FUNCTION public.get_roster_member_selection(
  p_roster_id UUID
)
RETURNS TABLE (
  user_id UUID,
  roster_cache_id UUID,
  selection_status public.roster_selection_status,
  reason_code public.roster_selection_reason_code,
  comment TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_can_manage BOOLEAN := false;
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT guild_id
  INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  v_is_admin := public.has_role(v_actor, 'admin');

  IF NOT public.is_guild_member(v_guild_id, v_actor) AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_can_manage := public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes');

  RETURN QUERY
    SELECT
      rms.user_id,
      rms.roster_cache_id,
      rms.selection_status,
      rms.reason_code,
      CASE
        WHEN v_can_manage THEN rms.comment
        ELSE NULL
      END AS comment,
      rms.decided_by,
      rms.decided_at,
      rms.updated_at
    FROM public.roster_member_selection rms
    WHERE rms.roster_id = p_roster_id;
END;
$$;
