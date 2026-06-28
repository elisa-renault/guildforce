-- Add season-scoped privacy for roster wishes.

ALTER TABLE public.roster_wish_seasons
  ADD COLUMN IF NOT EXISTS hide_member_wishes BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.roster_wish_seasons.hide_member_wishes
  IS 'When true, regular roster members can only read their own linked wishes for this roster season. GM, manage_wishes users, and app admins can still read all wishes.';

CREATE OR REPLACE FUNCTION public.can_view_roster_wish(
  p_guild_id UUID,
  p_roster_id UUID,
  p_season_id UUID,
  p_wish_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_hide_member_wishes BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RETURN false;
  END IF;

  IF p_wish_user_id IS NOT NULL AND p_wish_user_id = v_actor THEN
    RETURN true;
  END IF;

  IF public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
    OR public.has_role(v_actor, 'admin')
  THEN
    RETURN true;
  END IF;

  IF p_roster_id IS NULL THEN
    RETURN public.is_guild_member(p_guild_id, v_actor);
  END IF;

  SELECT COALESCE(rws.hide_member_wishes, false)
  INTO v_hide_member_wishes
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.guild_id = p_guild_id
    AND rws.roster_id = p_roster_id;

  IF COALESCE(v_hide_member_wishes, false) THEN
    RETURN false;
  END IF;

  RETURN public.has_roster_access(p_roster_id, v_actor);
END;
$$;

DROP POLICY IF EXISTS "Wishes viewable by guild members" ON public.class_wishes;
CREATE POLICY "Wishes viewable by guild members"
ON public.class_wishes
FOR SELECT
USING (
  public.can_view_roster_wish(guild_id, roster_id, season_id, user_id)
);

DROP POLICY IF EXISTS "Guild members can view external member wishes" ON public.external_member_wishes;
CREATE POLICY "Guild members can view external member wishes"
ON public.external_member_wishes
FOR SELECT
USING (
  public.can_view_roster_wish(guild_id, roster_id, season_id, NULL)
);

DROP FUNCTION IF EXISTS public.get_roster_season_table(UUID, UUID);

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
  ),
  current_assignments AS (
    SELECT
      rma.roster_season_member_id,
      jsonb_build_object(
        'id', rma.id,
        'class_id', rma.class_id,
        'spec_id', rma.spec_id,
        'role', rma.role,
        'source', rma.source,
        'choice_index', rma.choice_index,
        'reason_code', rma.reason_code,
        'manager_comment', CASE WHEN v_can_manage THEN rma.manager_comment ELSE NULL END,
        'valid_from', rma.valid_from,
        'approved_by', rma.approved_by
      ) AS current_assignment
    FROM public.roster_member_assignments rma
    WHERE rma.valid_to IS NULL
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
    ca.current_assignment,
    jsonb_build_object(
      'first_choice_granted',
        CASE
          WHEN ca.current_assignment IS NULL THEN false
          WHEN v_hide_member_wishes
            AND NOT v_can_view_all_wishes
            AND COALESCE(rsm.user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_actor
            THEN false
          ELSE (COALESCE(lw.wishes, ew.wishes, '[]'::jsonb)->0->>'class_id') = (ca.current_assignment->>'class_id')
        END,
      'final_class_id', ca.current_assignment->>'class_id',
      'final_spec_id', ca.current_assignment->>'spec_id',
      'changed_class_during_season',
        EXISTS (
          SELECT 1
          FROM public.roster_member_assignments rma_hist
          WHERE rma_hist.roster_season_member_id = rsm.id
          GROUP BY rma_hist.roster_season_member_id
          HAVING count(DISTINCT rma_hist.class_id) > 1
        ),
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
  LEFT JOIN current_assignments ca ON ca.roster_season_member_id = rsm.id
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id
  ORDER BY rsm.rank_index_snapshot NULLS LAST, rsm.display_name_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_roster_wish_season(
  p_roster_id UUID,
  p_name TEXT,
  p_starts_at DATE DEFAULT NULL,
  p_ends_at DATE DEFAULT NULL,
  p_source_season_id UUID DEFAULT NULL,
  p_activate BOOLEAN DEFAULT true
)
RETURNS public.roster_wish_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_new_season public.roster_wish_seasons;
  v_hide_member_wishes BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF length(trim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Season name is required' USING ERRCODE = '22023';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_starts_at > p_ends_at THEN
    RAISE EXCEPTION 'Season dates are invalid' USING ERRCODE = '22023';
  END IF;

  IF p_source_season_id IS NOT NULL THEN
    SELECT COALESCE(rws.hide_member_wishes, false)
    INTO v_hide_member_wishes
    FROM public.roster_wish_seasons rws
    WHERE rws.id = p_source_season_id
      AND rws.guild_id = v_guild_id
      AND rws.roster_id = p_roster_id;

    v_hide_member_wishes := COALESCE(v_hide_member_wishes, false);
  END IF;

  IF p_activate THEN
    UPDATE public.roster_wish_seasons
    SET state = 'archived',
        archived_at = COALESCE(archived_at, now())
    WHERE roster_id = p_roster_id
      AND state = 'active';
  END IF;

  INSERT INTO public.roster_wish_seasons (
    guild_id,
    roster_id,
    name,
    state,
    starts_at,
    ends_at,
    source_season_id,
    hide_member_wishes,
    created_by,
    activated_at
  )
  VALUES (
    v_guild_id,
    p_roster_id,
    trim(p_name),
    CASE WHEN p_activate THEN 'active'::public.guild_season_state ELSE 'draft'::public.guild_season_state END,
    p_starts_at,
    p_ends_at,
    p_source_season_id,
    v_hide_member_wishes,
    v_actor,
    CASE WHEN p_activate THEN now() ELSE NULL END
  )
  RETURNING * INTO v_new_season;

  RETURN v_new_season;
END;
$$;
