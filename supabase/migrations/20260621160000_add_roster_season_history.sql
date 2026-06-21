-- Add roster-season snapshots, effective assignments, and history RPCs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'roster_season_member_source'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.roster_season_member_source AS ENUM (
      'target_rule',
      'manual_external',
      'manual_user',
      'sync_auto_add',
      'selection',
      'wish'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'roster_season_member_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.roster_season_member_status AS ENUM (
      'candidate',
      'confirmed',
      'selected',
      'bench',
      'departed',
      'removed',
      'declined'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'roster_assignment_source'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.roster_assignment_source AS ENUM (
      'wish',
      'manager_decision',
      'recruitment',
      'change_request',
      'raid_need'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.roster_wish_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  guild_season_id UUID REFERENCES public.guild_seasons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  state public.guild_season_state NOT NULL DEFAULT 'draft',
  starts_at DATE,
  ends_at DATE,
  source_season_id UUID REFERENCES public.roster_wish_seasons(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roster_wish_seasons_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT roster_wish_seasons_dates_order CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_wish_seasons_one_active
  ON public.roster_wish_seasons(roster_id)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_roster_wish_seasons_guild_roster_state
  ON public.roster_wish_seasons(guild_id, roster_id, state, created_at DESC);

DROP TRIGGER IF EXISTS update_roster_wish_seasons_updated_at ON public.roster_wish_seasons;
CREATE TRIGGER update_roster_wish_seasons_updated_at
  BEFORE UPDATE ON public.roster_wish_seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.roster_wish_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roster wish seasons visible by roster access" ON public.roster_wish_seasons;
CREATE POLICY "Roster wish seasons visible by roster access"
ON public.roster_wish_seasons
FOR SELECT
USING (
  public.has_roster_access(roster_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Wish managers can manage roster wish seasons" ON public.roster_wish_seasons;
CREATE POLICY "Wish managers can manage roster wish seasons"
ON public.roster_wish_seasons
FOR ALL
USING (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

INSERT INTO public.roster_wish_seasons (
  guild_id,
  roster_id,
  guild_season_id,
  name,
  state,
  starts_at,
  ends_at,
  created_by,
  activated_at,
  archived_at,
  created_at,
  updated_at
)
SELECT
  r.guild_id,
  r.id,
  gs.id,
  gs.name,
  gs.state,
  gs.starts_at,
  gs.ends_at,
  gs.created_by,
  gs.activated_at,
  gs.archived_at,
  gs.created_at,
  gs.updated_at
FROM public.rosters r
INNER JOIN public.guild_seasons gs ON gs.guild_id = r.guild_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.roster_wish_seasons rws
  WHERE rws.roster_id = r.id
    AND rws.guild_season_id = gs.id
);

ALTER TABLE public.class_wishes
  DROP CONSTRAINT IF EXISTS class_wishes_season_id_fkey;

ALTER TABLE public.external_member_wishes
  DROP CONSTRAINT IF EXISTS external_member_wishes_season_id_fkey;

ALTER TABLE public.roster_member_selection
  DROP CONSTRAINT IF EXISTS roster_member_selection_season_id_fkey;

ALTER TABLE public.guild_season_member_intents
  DROP CONSTRAINT IF EXISTS guild_season_member_intents_season_id_fkey,
  DROP CONSTRAINT IF EXISTS guild_season_member_intents_season_id_user_id_key,
  ADD COLUMN IF NOT EXISTS roster_id UUID REFERENCES public.rosters(id) ON DELETE CASCADE;

WITH fallback_rosters AS (
  SELECT DISTINCT ON (guild_id)
    guild_id,
    id AS roster_id
  FROM public.rosters
  ORDER BY guild_id, is_default DESC, created_at ASC
)
UPDATE public.class_wishes cw
SET roster_id = fr.roster_id
FROM fallback_rosters fr
WHERE cw.roster_id IS NULL
  AND fr.guild_id = cw.guild_id;

DELETE FROM public.class_wishes
WHERE roster_id IS NULL;

UPDATE public.class_wishes cw
SET season_id = rws.id
FROM public.roster_wish_seasons rws
WHERE cw.roster_id = rws.roster_id
  AND cw.season_id = rws.guild_season_id;

UPDATE public.external_member_wishes ew
SET season_id = rws.id
FROM public.roster_wish_seasons rws
WHERE ew.roster_id = rws.roster_id
  AND ew.season_id = rws.guild_season_id;

UPDATE public.roster_member_selection rms
SET season_id = rws.id
FROM public.roster_wish_seasons rws
WHERE rms.roster_id = rws.roster_id
  AND rms.season_id = rws.guild_season_id;

CREATE TEMP TABLE tmp_roster_wish_season_member_intents ON COMMIT DROP AS
SELECT
  gsmi.guild_id,
  rws.roster_id,
  rws.id AS season_id,
  gsmi.user_id,
  gsmi.commitment_status,
  gsmi.updated_at
FROM public.guild_season_member_intents gsmi
INNER JOIN public.roster_wish_seasons rws
  ON rws.guild_id = gsmi.guild_id
 AND rws.guild_season_id = gsmi.season_id;

DELETE FROM public.guild_season_member_intents gsmi
WHERE EXISTS (
  SELECT 1
  FROM public.roster_wish_seasons rws
  WHERE rws.guild_id = gsmi.guild_id
    AND rws.guild_season_id = gsmi.season_id
);

INSERT INTO public.guild_season_member_intents (
  guild_id,
  roster_id,
  season_id,
  user_id,
  commitment_status,
  updated_at
)
SELECT
  guild_id,
  roster_id,
  season_id,
  user_id,
  commitment_status,
  updated_at
FROM tmp_roster_wish_season_member_intents;

DELETE FROM public.guild_season_member_intents
WHERE roster_id IS NULL;

ALTER TABLE public.class_wishes
  ADD CONSTRAINT class_wishes_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE;

ALTER TABLE public.external_member_wishes
  ADD CONSTRAINT external_member_wishes_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE;

ALTER TABLE public.roster_member_selection
  ADD CONSTRAINT roster_member_selection_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE;

ALTER TABLE public.guild_season_member_intents
  ALTER COLUMN roster_id SET NOT NULL,
  ADD CONSTRAINT guild_season_member_intents_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS guild_season_member_intents_roster_season_user_idx
  ON public.guild_season_member_intents(roster_id, season_id, user_id);

DROP POLICY IF EXISTS "Members and wish managers can write season intents" ON public.guild_season_member_intents;
CREATE POLICY "Members and wish managers can write season intents"
ON public.guild_season_member_intents
FOR ALL
USING (
  (
    auth.uid() = user_id
    OR public.is_guild_gm(guild_id, auth.uid())
    OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
  )
  AND EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = guild_season_member_intents.season_id
      AND rws.roster_id = guild_season_member_intents.roster_id
      AND rws.guild_id = guild_season_member_intents.guild_id
      AND rws.state = 'active'
  )
)
WITH CHECK (
  (
    auth.uid() = user_id
    OR public.is_guild_gm(guild_id, auth.uid())
    OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
  )
  AND EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = guild_season_member_intents.season_id
      AND rws.roster_id = guild_season_member_intents.roster_id
      AND rws.guild_id = guild_season_member_intents.guild_id
      AND rws.state = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.can_edit_wishes(
  p_guild_id UUID,
  p_roster_id UUID,
  p_user_id UUID,
  p_season_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.guild_season_state;
BEGIN
  SELECT state
  INTO v_state
  FROM public.roster_wish_seasons
  WHERE id = p_season_id
    AND guild_id = p_guild_id
    AND roster_id = p_roster_id;

  IF v_state IS DISTINCT FROM 'active'::public.guild_season_state THEN
    RETURN false;
  END IF;

  RETURN NOT public.are_wishes_locked(p_guild_id, p_roster_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_wishes(
  p_guild_id UUID,
  p_roster_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_season_id UUID;
BEGIN
  SELECT id
  INTO v_active_season_id
  FROM public.roster_wish_seasons
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND state = 'active'
  ORDER BY activated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  RETURN public.can_edit_wishes(p_guild_id, p_roster_id, p_user_id, v_active_season_id);
END;
$$;

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

  IF v_season_state IS DISTINCT FROM 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Season is not active' USING ERRCODE = '25006';
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
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_external_member_wish(
  p_roster_id UUID,
  p_roster_cache_id UUID,
  p_class_id TEXT,
  p_spec_ids TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT NULL,
  p_commitment_status TEXT DEFAULT 'potential',
  p_season_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_matched_user_id UUID;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
  v_existing_id UUID;
  v_spec_order TEXT[] := COALESCE(p_spec_ids, ARRAY[]::TEXT[]);
  v_commitment_status TEXT := COALESCE(NULLIF(p_commitment_status, ''), 'potential');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
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

  IF v_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status' USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_spec_order) = 0 THEN
    RAISE EXCEPTION 'Each wish must include at least one spec' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT rws.id
      FROM public.roster_wish_seasons rws
      WHERE rws.guild_id = v_guild_id
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
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS DISTINCT FROM 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Season is not active' USING ERRCODE = '25006';
  END IF;

  SELECT matched_user_id
  INTO v_matched_user_id
  FROM public.guild_roster_cache
  WHERE id = p_roster_cache_id
    AND guild_id = v_guild_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster cache member not found for this guild' USING ERRCODE = 'P0002';
  END IF;

  IF v_matched_user_id IS NOT NULL THEN
    PERFORM public.upsert_member_roster_wishes(
      v_guild_id,
      p_roster_id,
      v_matched_user_id,
      v_commitment_status,
      jsonb_build_array(jsonb_build_object(
        'class_id', p_class_id,
        'spec_ids', to_jsonb(v_spec_order),
        'comment', p_comment
      )),
      true,
      v_effective_season_id
    );
    RETURN NULL;
  END IF;

  INSERT INTO public.external_member_wishes (
    guild_id,
    roster_id,
    season_id,
    roster_cache_id,
    choice_index,
    class_id,
    spec_ids,
    spec_order,
    comment,
    commitment_status,
    validation_status,
    validated_by,
    validated_at,
    created_by
  )
  VALUES (
    v_guild_id,
    p_roster_id,
    v_effective_season_id,
    p_roster_cache_id,
    1,
    p_class_id,
    v_spec_order,
    v_spec_order,
    p_comment,
    v_commitment_status,
    'pending',
    NULL,
    NULL,
    v_actor
  )
  ON CONFLICT (roster_id, season_id, roster_cache_id, choice_index)
  DO UPDATE SET
    class_id = EXCLUDED.class_id,
    spec_ids = EXCLUDED.spec_ids,
    spec_order = EXCLUDED.spec_order,
    comment = EXCLUDED.comment,
    commitment_status = EXCLUDED.commitment_status
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

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
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_season_state public.guild_season_state;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT state
  INTO v_season_state
  FROM public.roster_wish_seasons
  WHERE id = p_season_id
    AND guild_id = p_guild_id
    AND roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Season not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state <> 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Only active seasons can be changed' USING ERRCODE = '25006';
  END IF;

  IF NOT (
    public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
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
    AND roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;

  DELETE FROM public.roster_season_members
  WHERE guild_id = p_guild_id
    AND roster_id = p_roster_id
    AND season_id = p_season_id
    AND user_id = p_member_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.roster_season_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  roster_cache_id UUID REFERENCES public.guild_roster_cache(id) ON DELETE SET NULL,
  display_name_snapshot TEXT NOT NULL,
  character_name_snapshot TEXT,
  realm_snapshot TEXT,
  rank_index_snapshot INTEGER,
  source public.roster_season_member_source NOT NULL DEFAULT 'target_rule',
  season_status public.roster_season_member_status NOT NULL DEFAULT 'candidate',
  joined_wishlist_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_guild_at TIMESTAMPTZ,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roster_season_members_target_check CHECK (
    user_id IS NOT NULL OR roster_cache_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS roster_season_members_user_unique_idx
  ON public.roster_season_members(roster_id, season_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS roster_season_members_cache_unique_idx
  ON public.roster_season_members(roster_id, season_id, roster_cache_id)
  WHERE roster_cache_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roster_season_members_roster_season
  ON public.roster_season_members(roster_id, season_id, season_status);

DROP TRIGGER IF EXISTS update_roster_season_members_updated_at ON public.roster_season_members;
CREATE TRIGGER update_roster_season_members_updated_at
  BEFORE UPDATE ON public.roster_season_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.roster_season_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roster members visible by roster access" ON public.roster_season_members;
CREATE POLICY "Roster members visible by roster access"
ON public.roster_season_members
FOR SELECT
USING (
  public.has_roster_access(roster_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Wish managers can manage roster season members" ON public.roster_season_members;
CREATE POLICY "Wish managers can manage roster season members"
ON public.roster_season_members
FOR ALL
USING (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

CREATE TABLE IF NOT EXISTS public.roster_member_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_season_member_id UUID NOT NULL REFERENCES public.roster_season_members(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  spec_id TEXT,
  role TEXT,
  source public.roster_assignment_source NOT NULL DEFAULT 'manager_decision',
  choice_index INTEGER,
  reason_code public.roster_selection_reason_code,
  manager_comment TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roster_member_assignments_dates_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS roster_member_assignments_one_active_idx
  ON public.roster_member_assignments(roster_season_member_id)
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_roster_member_assignments_member_dates
  ON public.roster_member_assignments(roster_season_member_id, valid_from DESC);

ALTER TABLE public.roster_member_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roster assignments visible by roster access" ON public.roster_member_assignments;
CREATE POLICY "Roster assignments visible by roster access"
ON public.roster_member_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.roster_season_members rsm
    WHERE rsm.id = roster_member_assignments.roster_season_member_id
      AND (
        public.has_roster_access(rsm.roster_id, auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

DROP POLICY IF EXISTS "Wish managers can manage roster assignments" ON public.roster_member_assignments;
CREATE POLICY "Wish managers can manage roster assignments"
ON public.roster_member_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.roster_season_members rsm
    WHERE rsm.id = roster_member_assignments.roster_season_member_id
      AND (
        public.is_guild_gm(rsm.guild_id, auth.uid())
        OR public.has_guild_permission(rsm.guild_id, auth.uid(), 'manage_wishes')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.roster_season_members rsm
    WHERE rsm.id = roster_member_assignments.roster_season_member_id
      AND (
        public.is_guild_gm(rsm.guild_id, auth.uid())
        OR public.has_guild_permission(rsm.guild_id, auth.uid(), 'manage_wishes')
      )
  )
);

CREATE TABLE IF NOT EXISTS public.roster_season_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.roster_wish_seasons(id) ON DELETE CASCADE,
  roster_season_member_id UUID REFERENCES public.roster_season_members(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_season_events_roster_season
  ON public.roster_season_events(roster_id, season_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_roster_season_events_member
  ON public.roster_season_events(roster_season_member_id, created_at DESC);

ALTER TABLE public.roster_season_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roster events visible by roster access" ON public.roster_season_events;
CREATE POLICY "Roster events visible by roster access"
ON public.roster_season_events
FOR SELECT
USING (
  public.has_roster_access(roster_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Wish managers can manage roster events" ON public.roster_season_events;
CREATE POLICY "Wish managers can manage roster events"
ON public.roster_season_events
FOR ALL
USING (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

CREATE OR REPLACE FUNCTION public.roster_selection_to_season_status(
  p_selection_status public.roster_selection_status
)
RETURNS public.roster_season_member_status
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_selection_status
    WHEN 'selected'::public.roster_selection_status THEN 'selected'::public.roster_season_member_status
    WHEN 'bench'::public.roster_selection_status THEN 'bench'::public.roster_season_member_status
    WHEN 'not_selected'::public.roster_selection_status THEN 'declined'::public.roster_season_member_status
    ELSE 'candidate'::public.roster_season_member_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.materialize_roster_season_members(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_season_state public.guild_season_state;
  v_inserted INTEGER := 0;
  v_rank_count INTEGER := 0;
  v_explicit_count INTEGER := 0;
  v_wish_count INTEGER := 0;
  v_external_count INTEGER := 0;
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

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = p_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Season not found for roster guild' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to materialize roster season members' USING ERRCODE = '42501';
  END IF;

  WITH best_cache AS (
    SELECT DISTINCT ON (grc.matched_user_id)
      grc.matched_user_id AS user_id,
      grc.id AS roster_cache_id,
      grc.character_name,
      grc.character_realm,
      grc.character_realm_slug,
      grc.rank_index
    FROM public.guild_roster_cache grc
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NOT NULL
    ORDER BY grc.matched_user_id, grc.rank_index ASC, grc.updated_at DESC
  ),
  linked_targets AS (
    SELECT
      gm.user_id,
      bc.roster_cache_id,
      COALESCE(NULLIF(p.main_character_name, ''), p.username, gm.user_id::text) AS display_name,
      COALESCE(NULLIF(split_part(p.main_character_name, ' - ', 1), ''), bc.character_name, p.username) AS character_name,
      COALESCE(bc.character_realm, bc.character_realm_slug) AS realm_name,
      bc.rank_index,
      CASE
        WHEN rms.user_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        WHEN cw.user_id IS NOT NULL THEN 'wish'::public.roster_season_member_source
        WHEN rar_user.user_id IS NOT NULL THEN 'manual_user'::public.roster_season_member_source
        ELSE 'target_rule'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN COALESCE(gsmi.commitment_status, gm.status) = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN COALESCE(gsmi.commitment_status, gm.status) = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_members gm
    LEFT JOIN public.profiles p ON p.id = gm.user_id
    LEFT JOIN best_cache bc ON bc.user_id = gm.user_id
    LEFT JOIN public.guild_season_member_intents gsmi
      ON gsmi.guild_id = gm.guild_id
     AND gsmi.season_id = p_season_id
     AND gsmi.roster_id = p_roster_id
     AND gsmi.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.class_wishes
      WHERE guild_id = v_guild_id
        AND roster_id = p_roster_id
        AND season_id = p_season_id
    ) cw ON cw.user_id = gm.user_id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
     AND rms.user_id = gm.user_id
    LEFT JOIN (
      SELECT DISTINCT user_id
      FROM public.roster_access_rules
      WHERE roster_id = p_roster_id
        AND access_type = 'user'
        AND user_id IS NOT NULL
    ) rar_user ON rar_user.user_id = gm.user_id
    WHERE gm.guild_id = v_guild_id
      AND (
        cw.user_id IS NOT NULL
        OR rms.user_id IS NOT NULL
        OR rar_user.user_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.roster_access_rules rar
          WHERE rar.roster_id = p_roster_id
            AND rar.access_type = 'rank'
            AND bc.rank_index IS NOT NULL
            AND bc.rank_index >= COALESCE(rar.min_rank_index, 0)
            AND bc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, bc.rank_index)
        )
      )
  ),
  inserted AS (
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
      season_status
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      user_id,
      roster_cache_id,
      display_name,
      character_name,
      realm_name,
      rank_index,
      source,
      season_status
    FROM linked_targets
    ON CONFLICT (roster_id, season_id, user_id)
    WHERE user_id IS NOT NULL
    DO UPDATE SET
      roster_cache_id = COALESCE(EXCLUDED.roster_cache_id, roster_season_members.roster_cache_id),
      season_status = CASE
        WHEN roster_season_members.season_status IN ('departed', 'removed') THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM inserted;

  WITH external_targets AS (
    SELECT DISTINCT ON (grc.id)
      grc.id AS roster_cache_id,
      grc.character_name,
      COALESCE(grc.character_realm, grc.character_realm_slug) AS realm_name,
      grc.rank_index,
      CASE
        WHEN ew.id IS NOT NULL THEN 'manual_external'::public.roster_season_member_source
        WHEN rms.roster_cache_id IS NOT NULL THEN 'selection'::public.roster_season_member_source
        ELSE 'target_rule'::public.roster_season_member_source
      END AS source,
      CASE
        WHEN rms.selection_status IS NOT NULL THEN public.roster_selection_to_season_status(rms.selection_status)
        WHEN ew.commitment_status = 'confirmed' THEN 'confirmed'::public.roster_season_member_status
        WHEN ew.commitment_status = 'withdrawn' THEN 'declined'::public.roster_season_member_status
        ELSE 'candidate'::public.roster_season_member_status
      END AS season_status
    FROM public.guild_roster_cache grc
    LEFT JOIN public.external_member_wishes ew
      ON ew.guild_id = grc.guild_id
     AND ew.roster_id = p_roster_id
     AND ew.season_id = p_season_id
     AND ew.roster_cache_id = grc.id
    LEFT JOIN public.roster_member_selection rms
      ON rms.roster_id = p_roster_id
     AND rms.season_id = p_season_id
     AND rms.roster_cache_id = grc.id
    WHERE grc.guild_id = v_guild_id
      AND grc.matched_user_id IS NULL
      AND (
        ew.id IS NOT NULL
        OR rms.roster_cache_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.roster_access_rules rar
          WHERE rar.roster_id = p_roster_id
            AND rar.access_type = 'rank'
            AND grc.rank_index >= COALESCE(rar.min_rank_index, 0)
            AND grc.rank_index <= COALESCE(rar.max_rank_index, rar.min_rank_index, grc.rank_index)
        )
      )
    ORDER BY grc.id, ew.created_at DESC NULLS LAST
  ),
  inserted AS (
    INSERT INTO public.roster_season_members (
      guild_id,
      roster_id,
      season_id,
      roster_cache_id,
      display_name_snapshot,
      character_name_snapshot,
      realm_snapshot,
      rank_index_snapshot,
      source,
      season_status
    )
    SELECT
      v_guild_id,
      p_roster_id,
      p_season_id,
      roster_cache_id,
      character_name,
      character_name,
      realm_name,
      rank_index,
      source,
      season_status
    FROM external_targets
    ON CONFLICT (roster_id, season_id, roster_cache_id)
    WHERE roster_cache_id IS NOT NULL
    DO UPDATE SET
      season_status = CASE
        WHEN roster_season_members.season_status IN ('departed', 'removed') THEN roster_season_members.season_status
        ELSE EXCLUDED.season_status
      END,
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_external_count FROM inserted;

  INSERT INTO public.roster_season_events (
    guild_id,
    roster_id,
    season_id,
    actor_id,
    event_type,
    payload
  )
  VALUES (
    v_guild_id,
    p_roster_id,
    p_season_id,
    v_actor,
    'roster_season_materialized',
    jsonb_build_object('linked_count', v_inserted, 'external_count', v_external_count)
  );

  RETURN v_inserted + v_external_count + v_rank_count + v_explicit_count + v_wish_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_roster_member_assignment(
  p_roster_season_member_id UUID,
  p_class_id TEXT,
  p_spec_id TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_source public.roster_assignment_source DEFAULT 'manager_decision',
  p_choice_index INTEGER DEFAULT NULL,
  p_reason_code public.roster_selection_reason_code DEFAULT NULL,
  p_manager_comment TEXT DEFAULT NULL,
  p_valid_from TIMESTAMPTZ DEFAULT now()
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = v_member.season_id
      AND rws.guild_id = v_member.guild_id
      AND rws.state = 'active'
  ) THEN
    RAISE EXCEPTION 'Assignments can only be changed for the active season' USING ERRCODE = '25006';
  END IF;

  IF length(trim(COALESCE(p_class_id, ''))) = 0 THEN
    RAISE EXCEPTION 'Class is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.roster_member_assignments
  SET valid_to = p_valid_from
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from < p_valid_from;

  DELETE FROM public.roster_member_assignments
  WHERE roster_season_member_id = p_roster_season_member_id
    AND valid_to IS NULL
    AND valid_from >= p_valid_from;

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
    approved_by
  )
  VALUES (
    p_roster_season_member_id,
    trim(p_class_id),
    NULLIF(trim(COALESCE(p_spec_id, '')), ''),
    NULLIF(trim(COALESCE(p_role, '')), ''),
    p_source,
    p_choice_index,
    p_reason_code,
    p_manager_comment,
    COALESCE(p_valid_from, now()),
    v_actor
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
      'class_id', p_class_id,
      'spec_id', p_spec_id,
      'source', p_source,
      'choice_index', p_choice_index,
      'reason_code', p_reason_code
    )
  );

  RETURN v_assignment_id;
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
    v_actor,
    CASE WHEN p_activate THEN now() ELSE NULL END
  )
  RETURNING * INTO v_new_season;

  RETURN v_new_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_roster_wish_season(p_season_id UUID)
RETURNS public.roster_wish_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_season public.roster_wish_seasons;
BEGIN
  SELECT * INTO v_season
  FROM public.roster_wish_seasons
  WHERE id = p_season_id;

  IF v_season.id IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_season.guild_id, v_actor)
    OR public.has_guild_permission(v_season.guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.roster_wish_seasons
  SET state = 'archived',
      archived_at = COALESCE(archived_at, now())
  WHERE id = p_season_id
  RETURNING * INTO v_season;

  RETURN v_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_roster_wish_season(p_season_id UUID)
RETURNS public.roster_wish_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_season public.roster_wish_seasons;
BEGIN
  SELECT * INTO v_season
  FROM public.roster_wish_seasons
  WHERE id = p_season_id;

  IF v_season.id IS NULL THEN
    RAISE EXCEPTION 'Roster wish season not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_season.guild_id, v_actor)
    OR public.has_guild_permission(v_season.guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.roster_wish_seasons
  SET state = 'archived',
      archived_at = COALESCE(archived_at, now())
  WHERE roster_id = v_season.roster_id
    AND state = 'active'
    AND id <> p_season_id;

  UPDATE public.roster_wish_seasons
  SET state = 'active',
      activated_at = COALESCE(activated_at, now()),
      archived_at = NULL
  WHERE id = p_season_id
    AND state IN ('draft', 'archived')
  RETURNING * INTO v_season;

  RETURN v_season;
END;
$$;

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
    rma.created_at,
    'assignment_changed'::TEXT,
    rma.approved_by,
    jsonb_build_object(
      'class_id', rma.class_id,
      'spec_id', rma.spec_id,
      'role', rma.role,
      'source', rma.source,
      'choice_index', rma.choice_index,
      'reason_code', rma.reason_code,
      'valid_from', rma.valid_from,
      'valid_to', rma.valid_to
    )
  FROM public.roster_member_assignments rma
  WHERE rma.roster_season_member_id = p_roster_season_member_id

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
  WITH current_assignments AS (
    SELECT DISTINCT ON (rma.roster_season_member_id)
      rma.*
    FROM public.roster_member_assignments rma
    WHERE rma.valid_to IS NULL
    ORDER BY rma.roster_season_member_id, rma.valid_from DESC
  ),
  wished AS (
    SELECT
      rsm.id AS roster_season_member_id,
      w.choice_index,
      w.class_id,
      w.spec_ids
    FROM public.roster_season_members rsm
    CROSS JOIN LATERAL (
      SELECT cw.choice_index, cw.class_id, COALESCE(cw.spec_order, cw.spec_ids) AS spec_ids
      FROM public.class_wishes cw
      WHERE cw.roster_id = rsm.roster_id
        AND cw.season_id = rsm.season_id
        AND cw.user_id = rsm.user_id
      UNION ALL
      SELECT ew.choice_index, ew.class_id, COALESCE(ew.spec_order, ew.spec_ids) AS spec_ids
      FROM public.external_member_wishes ew
      WHERE ew.roster_id = rsm.roster_id
        AND ew.season_id = rsm.season_id
        AND ew.roster_cache_id = rsm.roster_cache_id
    ) w
    WHERE rsm.roster_id = p_roster_id
      AND rsm.season_id = p_season_id
  ),
  granted AS (
    SELECT DISTINCT ON (w.roster_season_member_id)
      w.roster_season_member_id,
      w.choice_index
    FROM wished w
    INNER JOIN current_assignments ca
      ON ca.roster_season_member_id = w.roster_season_member_id
     AND ca.class_id = w.class_id
    ORDER BY w.roster_season_member_id, w.choice_index
  )
  SELECT
    rsm.id,
    rsm.user_id,
    rsm.roster_cache_id,
    COALESCE(granted.choice_index = 1, false),
    granted.choice_index,
    ca.class_id,
    ca.spec_id,
    EXISTS (
      SELECT 1
      FROM public.roster_member_assignments hist
      WHERE hist.roster_season_member_id = rsm.id
      GROUP BY hist.roster_season_member_id
      HAVING count(DISTINCT hist.class_id) > 1
    ),
    EXISTS (
      SELECT 1
      FROM public.roster_member_assignments hist
      WHERE hist.roster_season_member_id = rsm.id
        AND hist.source = 'raid_need'::public.roster_assignment_source
    ),
    rsm.source IN ('manual_external', 'manual_user', 'sync_auto_add'),
    rsm.season_status = 'departed',
    rsm.season_status
  FROM public.roster_season_members rsm
  LEFT JOIN current_assignments ca ON ca.roster_season_member_id = rsm.id
  LEFT JOIN granted ON granted.roster_season_member_id = rsm.id
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = p_season_id
  ORDER BY rsm.rank_index_snapshot NULLS LAST, rsm.display_name_snapshot;
END;
$$;

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
  v_season_member_id UUID;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT r.guild_id INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized to update roster decisions' USING ERRCODE = '42501';
  END IF;

  IF (p_user_id IS NULL AND p_roster_cache_id IS NULL)
    OR (p_user_id IS NOT NULL AND p_roster_cache_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Roster decision target must be exactly one guild member or external roster cache entry' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT rws.id
      FROM public.roster_wish_seasons rws
      WHERE rws.guild_id = v_guild_id
        AND rws.roster_id = p_roster_id
        AND rws.state = 'active'
      ORDER BY rws.activated_at DESC NULLS LAST, rws.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  IF v_effective_season_id IS NULL THEN
    RAISE EXCEPTION 'No active guild season found' USING ERRCODE = 'P0002';
  END IF;

  SELECT rws.state
  INTO v_season_state
  FROM public.roster_wish_seasons rws
  WHERE rws.id = v_effective_season_id
    AND rws.guild_id = v_guild_id
    AND rws.roster_id = p_roster_id;

  IF v_season_state IS NULL THEN
    RAISE EXCEPTION 'Guild season not found for roster' USING ERRCODE = 'P0002';
  END IF;

  IF v_season_state <> 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Roster decisions can only be changed for the active season' USING ERRCODE = '25006';
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF NOT public.is_guild_member(v_guild_id, p_user_id) THEN
      RAISE EXCEPTION 'Target user is not a guild member' USING ERRCODE = '42501';
    END IF;

    SELECT rms.id INTO v_existing_id
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
      RAISE EXCEPTION 'Target external roster cache entry is not valid for this guild' USING ERRCODE = '42501';
    END IF;

    SELECT rms.id INTO v_existing_id
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

  PERFORM public.materialize_roster_season_members(p_roster_id, v_effective_season_id);

  SELECT rsm.id INTO v_season_member_id
  FROM public.roster_season_members rsm
  WHERE rsm.roster_id = p_roster_id
    AND rsm.season_id = v_effective_season_id
    AND (
      (p_user_id IS NOT NULL AND rsm.user_id = p_user_id)
      OR (p_roster_cache_id IS NOT NULL AND rsm.roster_cache_id = p_roster_cache_id)
    )
  LIMIT 1;

  IF v_season_member_id IS NOT NULL THEN
    UPDATE public.roster_season_members
    SET season_status = public.roster_selection_to_season_status(p_selection_status)
    WHERE id = v_season_member_id
      AND season_status NOT IN ('departed', 'removed');

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
      v_guild_id,
      p_roster_id,
      v_effective_season_id,
      v_season_member_id,
      v_actor,
      'roster_selection_changed',
      jsonb_build_object(
        'selection_status', p_selection_status,
        'reason_code', p_reason_code
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_external_wishes_to_matched_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_entry RECORD;
  v_selection RECORD;
  v_guild_id UUID;
  v_target_member_id UUID;
  v_target_season_id UUID;
BEGIN
  IF NEW.matched_user_id IS NULL OR OLD.matched_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_guild_id := NEW.guild_id;

  FOR v_entry IN
    SELECT *
    FROM public.external_member_wishes
    WHERE guild_id = v_guild_id
      AND roster_cache_id = NEW.id
  LOOP
    DELETE FROM public.class_wishes
    WHERE guild_id = v_entry.guild_id
      AND roster_id = v_entry.roster_id
      AND season_id = v_entry.season_id
      AND user_id = NEW.matched_user_id
      AND choice_index = v_entry.choice_index;

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
    ) VALUES (
      v_entry.guild_id,
      v_entry.roster_id,
      v_entry.season_id,
      NEW.matched_user_id,
      v_entry.choice_index,
      v_entry.class_id,
      COALESCE(v_entry.spec_ids, ARRAY[]::TEXT[]),
      COALESCE(v_entry.spec_order, ARRAY[]::TEXT[]),
      v_entry.comment,
      v_entry.validation_status,
      v_entry.validated_by,
      v_entry.validated_at
    );

    INSERT INTO public.guild_season_member_intents (guild_id, roster_id, season_id, user_id, commitment_status)
    VALUES (v_entry.guild_id, v_entry.roster_id, v_entry.season_id, NEW.matched_user_id, v_entry.commitment_status)
    ON CONFLICT (roster_id, season_id, user_id)
    DO UPDATE SET commitment_status = EXCLUDED.commitment_status;

    SELECT id, season_id
    INTO v_target_member_id, v_target_season_id
    FROM public.roster_season_members
    WHERE roster_id = v_entry.roster_id
      AND roster_cache_id = NEW.id
      AND season_id = v_entry.season_id
    LIMIT 1;

    IF v_target_member_id IS NOT NULL THEN
      DELETE FROM public.roster_season_members duplicate
      WHERE duplicate.roster_id = v_entry.roster_id
        AND duplicate.season_id = v_target_season_id
        AND duplicate.user_id = NEW.matched_user_id
        AND duplicate.id <> v_target_member_id;

      UPDATE public.roster_season_members
      SET user_id = NEW.matched_user_id,
          roster_cache_id = NEW.id,
          source = 'manual_user',
          updated_at = now()
      WHERE id = v_target_member_id;

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
        v_entry.guild_id,
        v_entry.roster_id,
        v_target_season_id,
        v_target_member_id,
        NULL,
        'external_member_matched',
        jsonb_build_object('roster_cache_id', NEW.id, 'user_id', NEW.matched_user_id)
      );
    END IF;
  END LOOP;

  FOR v_selection IN
    SELECT rms.*
    FROM public.roster_member_selection rms
    INNER JOIN public.rosters r
      ON r.id = rms.roster_id
    WHERE rms.roster_cache_id = NEW.id
      AND r.guild_id = v_guild_id
  LOOP
    DELETE FROM public.roster_member_selection
    WHERE roster_id = v_selection.roster_id
      AND season_id = v_selection.season_id
      AND user_id = NEW.matched_user_id;

    INSERT INTO public.roster_member_selection (
      roster_id,
      season_id,
      user_id,
      roster_cache_id,
      selection_status,
      reason_code,
      comment,
      decided_by,
      decided_at,
      updated_at
    ) VALUES (
      v_selection.roster_id,
      v_selection.season_id,
      NEW.matched_user_id,
      NULL,
      v_selection.selection_status,
      v_selection.reason_code,
      v_selection.comment,
      v_selection.decided_by,
      v_selection.decided_at,
      v_selection.updated_at
    );
  END LOOP;

  DELETE FROM public.external_member_wishes
  WHERE guild_id = v_guild_id
    AND roster_cache_id = NEW.id;

  DELETE FROM public.roster_member_selection
  WHERE roster_cache_id = NEW.id;

  RETURN NEW;
END;
$$;
