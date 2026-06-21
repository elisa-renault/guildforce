-- Retire roster wish assignment. Roster seasons keep snapshots, wishes,
-- roster decisions, sync events, and history; effective class/spec assignment
-- will be rebuilt later as a separate feature.

DO $$
BEGIN
  IF to_regtype('public.roster_assignment_source') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.set_roster_member_assignment(UUID, TEXT, TEXT, TEXT, public.roster_assignment_source, INTEGER, public.roster_selection_reason_code, TEXT, TIMESTAMPTZ)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.set_roster_member_assignment(UUID, TEXT, TEXT, TEXT, public.roster_assignment_source, INTEGER, public.roster_selection_reason_code, TEXT, TIMESTAMPTZ, UUID)';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.seed_roster_assignments_from_first_approved_wish(UUID, UUID);

DROP TABLE IF EXISTS public.roster_member_assignments CASCADE;
DROP TYPE IF EXISTS public.roster_assignment_source;

CREATE OR REPLACE FUNCTION public.get_roster_season_table(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS TABLE (
  season_member_id UUID,
  user_id UUID,
  roster_cache_id UUID,
  display_name TEXT,
  character_name TEXT,
  realm TEXT,
  rank_index INTEGER,
  source public.roster_season_member_source,
  season_status public.roster_season_member_status,
  locked BOOLEAN,
  wishes JSONB,
  selection_status public.roster_selection_status,
  selection_reason_code public.roster_selection_reason_code,
  selection_comment TEXT,
  selection_decided_by UUID,
  selection_decided_at TIMESTAMPTZ,
  selection_updated_at TIMESTAMPTZ,
  outcome JSONB
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

  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = p_season_id
      AND rws.guild_id = v_guild_id
      AND rws.roster_id = p_roster_id
  ) THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.has_roster_access(p_roster_id, v_actor)
    OR public.has_role(v_actor, 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  v_can_manage := public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes');

  RETURN QUERY
  WITH linked_wishes AS (
    SELECT
      cw.user_id,
      NULL::UUID AS roster_cache_id,
      jsonb_agg(
        jsonb_build_object(
          'choice_index', cw.choice_index,
          'class_id', cw.class_id,
          'spec_ids', COALESCE(cw.spec_ids, ARRAY[]::TEXT[]),
          'spec_order', COALESCE(cw.spec_order, ARRAY[]::TEXT[]),
          'comment', cw.comment,
          'validation_status', cw.validation_status,
          'validated_by', cw.validated_by,
          'validated_at', cw.validated_at
        )
        ORDER BY cw.choice_index
      ) AS wishes
    FROM public.class_wishes cw
    WHERE cw.guild_id = v_guild_id
      AND cw.roster_id = p_roster_id
      AND cw.season_id = p_season_id
    GROUP BY cw.user_id
  ),
  external_wishes AS (
    SELECT
      NULL::UUID AS user_id,
      ew.roster_cache_id,
      jsonb_agg(
        jsonb_build_object(
          'choice_index', ew.choice_index,
          'class_id', ew.class_id,
          'spec_ids', COALESCE(ew.spec_ids, ARRAY[]::TEXT[]),
          'spec_order', COALESCE(ew.spec_order, ARRAY[]::TEXT[]),
          'comment', ew.comment,
          'validation_status', ew.validation_status,
          'validated_by', ew.validated_by,
          'validated_at', ew.validated_at
        )
        ORDER BY ew.choice_index
      ) AS wishes
    FROM public.external_member_wishes ew
    WHERE ew.guild_id = v_guild_id
      AND ew.roster_id = p_roster_id
      AND ew.season_id = p_season_id
    GROUP BY ew.roster_cache_id
  )
  SELECT
    rsm.id,
    rsm.user_id,
    rsm.roster_cache_id,
    rsm.display_name_snapshot,
    rsm.character_name_snapshot,
    rsm.realm_snapshot,
    rsm.rank_index_snapshot,
    rsm.source,
    rsm.season_status,
    rsm.locked,
    COALESCE(lw.wishes, ew.wishes, '[]'::jsonb) AS wishes,
    COALESCE(rms.selection_status, 'undecided'::public.roster_selection_status) AS selection_status,
    rms.reason_code,
    CASE WHEN v_can_manage THEN rms.comment ELSE NULL END AS selection_comment,
    rms.decided_by,
    rms.decided_at,
    rms.updated_at,
    jsonb_build_object(
      'joined_mid_season', rsm.source IN ('manual_external', 'manual_user', 'sync_auto_add'),
      'left_mid_season', rsm.season_status = 'departed',
      'final_status', rsm.season_status
    ) AS outcome
  FROM public.roster_season_members rsm
  LEFT JOIN linked_wishes lw ON lw.user_id = rsm.user_id
  LEFT JOIN external_wishes ew ON ew.roster_cache_id = rsm.roster_cache_id
  LEFT JOIN public.roster_member_selection rms
    ON rms.roster_id = rsm.roster_id
   AND rms.season_id = rsm.season_id
   AND (
     (rsm.user_id IS NOT NULL AND rms.user_id = rsm.user_id)
     OR (rsm.roster_cache_id IS NOT NULL AND rms.roster_cache_id = rsm.roster_cache_id)
   )
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id
  ORDER BY rsm.rank_index_snapshot NULLS LAST, rsm.display_name_snapshot;
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
  SELECT
    rsm.created_at,
    'season_member_snapshot'::TEXT,
    NULL::UUID,
    jsonb_build_object(
      'display_name', rsm.display_name_snapshot,
      'source', rsm.source,
      'season_status', rsm.season_status
    )
  FROM public.roster_season_members rsm
  WHERE rsm.id = p_roster_season_member_id
    AND rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id

  UNION ALL

  SELECT
    rse.created_at,
    rse.event_type,
    rse.actor_id,
    rse.payload
  FROM public.roster_season_events rse
  WHERE rse.roster_id = p_roster_id
    AND rse.season_id = p_season_id
    AND rse.roster_season_member_id = p_roster_season_member_id

  ORDER BY event_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_roster_season_outcomes(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS TABLE (
  roster_season_member_id UUID,
  user_id UUID,
  roster_cache_id UUID,
  first_choice_granted BOOLEAN,
  granted_choice_index INTEGER,
  final_class_id TEXT,
  final_spec_id TEXT,
  changed_class_during_season BOOLEAN,
  changed_for_raid_need BOOLEAN,
  joined_mid_season BOOLEAN,
  left_mid_season BOOLEAN,
  final_status public.roster_season_member_status
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

  RETURN QUERY
  SELECT
    rsm.id,
    rsm.user_id,
    rsm.roster_cache_id,
    false,
    NULL::INTEGER,
    NULL::TEXT,
    NULL::TEXT,
    false,
    false,
    rsm.source IN ('manual_external', 'manual_user', 'sync_auto_add'),
    rsm.season_status = 'departed',
    rsm.season_status
  FROM public.roster_season_members rsm
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id
  ORDER BY rsm.rank_index_snapshot NULLS LAST, rsm.display_name_snapshot;
END;
$$;
