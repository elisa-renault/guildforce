-- Allow managers to optionally tie an effective roster assignment to one of the member's characters.

ALTER TABLE public.roster_member_assignments
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.wow_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS character_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS character_realm_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_roster_member_assignments_character
  ON public.roster_member_assignments(character_id)
  WHERE character_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.set_roster_member_assignment(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  public.roster_assignment_source,
  INTEGER,
  public.roster_selection_reason_code,
  TEXT,
  TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.set_roster_member_assignment(
  p_roster_season_member_id UUID,
  p_class_id TEXT,
  p_spec_id TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_source public.roster_assignment_source DEFAULT 'manager_decision',
  p_choice_index INTEGER DEFAULT NULL,
  p_reason_code public.roster_selection_reason_code DEFAULT NULL,
  p_manager_comment TEXT DEFAULT NULL,
  p_valid_from TIMESTAMPTZ DEFAULT now(),
  p_character_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_member public.roster_season_members;
  v_assignment_id UUID;
  v_valid_from TIMESTAMPTZ := COALESCE(p_valid_from, now());
  v_season_state public.guild_season_state;
  v_character public.wow_characters;
  v_expected_class_id INTEGER;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_member
  FROM public.roster_season_members
  WHERE id = p_roster_season_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Roster season member not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_member.guild_id, v_actor)
    OR public.has_guild_permission(v_member.guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update roster assignments' USING ERRCODE = '42501';
  END IF;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_member.season_id
    AND rws.guild_id = v_member.guild_id
    AND rws.roster_id = v_member.roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF length(trim(COALESCE(p_class_id, ''))) = 0 THEN
    RAISE EXCEPTION 'Class is required' USING ERRCODE = '22023';
  END IF;

  v_expected_class_id := CASE trim(p_class_id)
    WHEN 'warrior' THEN 1
    WHEN 'paladin' THEN 2
    WHEN 'hunter' THEN 3
    WHEN 'rogue' THEN 4
    WHEN 'priest' THEN 5
    WHEN 'death-knight' THEN 6
    WHEN 'shaman' THEN 7
    WHEN 'mage' THEN 8
    WHEN 'warlock' THEN 9
    WHEN 'monk' THEN 10
    WHEN 'druid' THEN 11
    WHEN 'demon-hunter' THEN 12
    WHEN 'evoker' THEN 13
    ELSE NULL
  END;

  IF p_character_id IS NOT NULL THEN
    IF v_member.user_id IS NULL THEN
      RAISE EXCEPTION 'Character selection requires a matched user' USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO v_character
    FROM public.wow_characters
    WHERE id = p_character_id
      AND user_id = v_member.user_id;

    IF v_character.id IS NULL THEN
      RAISE EXCEPTION 'Character not found for this member' USING ERRCODE = 'P0002';
    END IF;

    IF v_expected_class_id IS NULL OR v_character.class_id <> v_expected_class_id THEN
      RAISE EXCEPTION 'Selected character does not match assignment class' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.roster_member_assignments
  SET valid_to = v_valid_from
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from < v_valid_from;

  DELETE FROM public.roster_member_assignments
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from >= v_valid_from;

  INSERT INTO public.roster_member_assignments (
    roster_season_member_id,
    class_id,
    spec_id,
    role,
    source,
    choice_index,
    reason_code,
    manager_comment,
    valid_from,
    approved_by,
    character_id,
    character_name_snapshot,
    character_realm_snapshot
  )
  VALUES (
    p_roster_season_member_id,
    trim(p_class_id),
    NULLIF(trim(COALESCE(p_spec_id, '')), ''),
    NULLIF(trim(COALESCE(p_role, '')), ''),
    p_source,
    p_choice_index,
    p_reason_code,
    NULLIF(trim(COALESCE(p_manager_comment, '')), ''),
    v_valid_from,
    v_actor,
    p_character_id,
    v_character.name,
    COALESCE(v_character.realm, v_character.realm_slug)
  )
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.roster_season_events (
    guild_id,
    roster_id,
    season_id,
    roster_season_member_id,
    actor_id,
    event_type,
    payload
  )
  VALUES (
    v_member.guild_id,
    v_member.roster_id,
    v_member.season_id,
    v_member.id,
    v_actor,
    'assignment_changed',
    jsonb_build_object(
      'assignment_id', v_assignment_id,
      'class_id', trim(p_class_id),
      'spec_id', NULLIF(trim(COALESCE(p_spec_id, '')), ''),
      'role', NULLIF(trim(COALESCE(p_role, '')), ''),
      'source', p_source,
      'choice_index', p_choice_index,
      'reason_code', p_reason_code,
      'valid_from', v_valid_from,
      'season_state', v_season_state,
      'character_id', p_character_id,
      'character_name', v_character.name,
      'character_realm', COALESCE(v_character.realm, v_character.realm_slug)
    )
  );

  RETURN v_assignment_id;
END;
$$;
