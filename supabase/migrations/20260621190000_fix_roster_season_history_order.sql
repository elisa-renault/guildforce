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
  SELECT history.event_at, history.event_type, history.actor_id, history.payload
  FROM (
    SELECT
      rsm.created_at AS event_at,
      'season_member_snapshot'::TEXT AS event_type,
      NULL::UUID AS actor_id,
      jsonb_build_object(
        'display_name', rsm.display_name_snapshot,
        'source', rsm.source,
        'season_status', rsm.season_status,
        'left_roster_at', rsm.left_roster_at,
        'left_guild_at', rsm.left_guild_at
      ) AS payload
    FROM public.roster_season_members rsm
    WHERE rsm.id = p_roster_season_member_id
      AND rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id

    UNION ALL

    SELECT
      rma.created_at AS event_at,
      'assignment_changed'::TEXT AS event_type,
      rma.approved_by AS actor_id,
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
      ) AS payload
    FROM public.roster_member_assignments rma
    WHERE rma.roster_season_member_id = p_roster_season_member_id

    UNION ALL

    SELECT
      rse.created_at AS event_at,
      rse.event_type,
      rse.actor_id,
      CASE
        WHEN v_can_manage THEN rse.payload
        ELSE rse.payload - 'manager_comment'
      END AS payload
    FROM public.roster_season_events rse
    WHERE rse.roster_id = p_roster_id
      AND rse.season_id = p_season_id
      AND rse.roster_season_member_id = p_roster_season_member_id
  ) AS history
  ORDER BY history.event_at ASC;
END;
$$;
