-- Keep history ordering valid after roster member assignments were retired.
-- PostgreSQL requires UNION ORDER BY clauses to reference output columns
-- directly unless the UNION is wrapped in a subquery.

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
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.has_roster_access(p_roster_id, v_actor)
    OR public.has_role(v_actor, 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = p_season_id
      AND rws.roster_id = p_roster_id
  ) THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

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
        'season_status', rsm.season_status
      ) AS payload
    FROM public.roster_season_members rsm
    WHERE rsm.id = p_roster_season_member_id
      AND rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id

    UNION ALL

    SELECT
      rse.created_at AS event_at,
      rse.event_type,
      rse.actor_id,
      rse.payload
    FROM public.roster_season_events rse
    WHERE rse.roster_id = p_roster_id
      AND rse.season_id = p_season_id
      AND rse.roster_season_member_id = p_roster_season_member_id
  ) AS history
  ORDER BY history.event_at ASC;
END;
$$;
