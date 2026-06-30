-- Keep get_roster_season_table compatible after roster_member_assignments was retired.
-- Privacy migrations recreated the RPC from an older assignment-backed version,
-- which made PostgREST fail with a missing retired relation.

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
  current_assignment JSONB,
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
  v_can_view_all_wishes BOOLEAN := false;
  v_hide_member_wishes BOOLEAN := false;
  v_season_found BOOLEAN := false;
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

  SELECT COALESCE(rws.hide_member_wishes, false), true
  INTO v_hide_member_wishes, v_season_found
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF NOT v_season_found THEN
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
  v_can_view_all_wishes := v_can_manage OR public.has_role(v_actor, 'admin');

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
      AND (
        NOT v_hide_member_wishes
        OR v_can_view_all_wishes
        OR cw.user_id = v_actor
      )
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
      AND (NOT v_hide_member_wishes OR v_can_view_all_wishes)
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
    NULL::jsonb AS current_assignment,
    jsonb_build_object(
      'first_choice_granted', false,
      'final_class_id', NULL::TEXT,
      'final_spec_id', NULL::TEXT,
      'changed_class_during_season', false,
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
    AND (
      NOT v_hide_member_wishes
      OR v_can_view_all_wishes
      OR rsm.user_id = v_actor
    )
  ORDER BY rsm.rank_index_snapshot NULLS LAST, rsm.display_name_snapshot;
END;
$$;
