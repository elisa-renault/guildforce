-- Add guild-scoped roster wish seasons and scope wish planning state by season.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'guild_season_state'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.guild_season_state AS ENUM ('draft', 'active', 'archived');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.guild_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state public.guild_season_state NOT NULL DEFAULT 'draft',
  starts_at DATE,
  ends_at DATE,
  source_season_id UUID REFERENCES public.guild_seasons(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_seasons_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT guild_seasons_dates_order CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_seasons_one_active
  ON public.guild_seasons(guild_id)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_guild_seasons_guild_state
  ON public.guild_seasons(guild_id, state, created_at DESC);

ALTER TABLE public.guild_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild members can view seasons" ON public.guild_seasons;
CREATE POLICY "Guild members can view seasons"
ON public.guild_seasons
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Wish managers can insert seasons" ON public.guild_seasons;
CREATE POLICY "Wish managers can insert seasons"
ON public.guild_seasons
FOR INSERT
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

DROP POLICY IF EXISTS "Wish managers can update seasons" ON public.guild_seasons;
CREATE POLICY "Wish managers can update seasons"
ON public.guild_seasons
FOR UPDATE
USING (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

DROP TRIGGER IF EXISTS update_guild_seasons_updated_at ON public.guild_seasons;
CREATE TRIGGER update_guild_seasons_updated_at
  BEFORE UPDATE ON public.guild_seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.guild_seasons (guild_id, name, state, activated_at)
SELECT g.id, 'Season 1', 'active'::public.guild_season_state, now()
FROM public.guilds g
WHERE NOT EXISTS (
  SELECT 1
  FROM public.guild_seasons gs
  WHERE gs.guild_id = g.id
);

ALTER TABLE public.class_wishes
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.guild_seasons(id) ON DELETE CASCADE;

ALTER TABLE public.external_member_wishes
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.guild_seasons(id) ON DELETE CASCADE;

ALTER TABLE public.roster_member_selection
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.guild_seasons(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.guild_season_member_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.guild_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commitment_status TEXT NOT NULL DEFAULT 'potential',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_season_member_intents_commitment_check
    CHECK (commitment_status IN ('confirmed', 'potential', 'withdrawn')),
  UNIQUE (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_season_member_intents_guild_season
  ON public.guild_season_member_intents(guild_id, season_id);

ALTER TABLE public.guild_season_member_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild members can view season intents" ON public.guild_season_member_intents;
CREATE POLICY "Guild members can view season intents"
ON public.guild_season_member_intents
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

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
    FROM public.guild_seasons gs
    WHERE gs.id = guild_season_member_intents.season_id
      AND gs.guild_id = guild_season_member_intents.guild_id
      AND gs.state = 'active'
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
    FROM public.guild_seasons gs
    WHERE gs.id = guild_season_member_intents.season_id
      AND gs.guild_id = guild_season_member_intents.guild_id
      AND gs.state = 'active'
  )
);

DROP TRIGGER IF EXISTS update_guild_season_member_intents_updated_at ON public.guild_season_member_intents;
CREATE TRIGGER update_guild_season_member_intents_updated_at
  BEFORE UPDATE ON public.guild_season_member_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.class_wishes cw
SET season_id = gs.id
FROM public.guild_seasons gs
WHERE cw.season_id IS NULL
  AND gs.guild_id = cw.guild_id
  AND gs.state = 'active';

UPDATE public.external_member_wishes ew
SET season_id = gs.id
FROM public.guild_seasons gs
WHERE ew.season_id IS NULL
  AND gs.guild_id = ew.guild_id
  AND gs.state = 'active';

UPDATE public.roster_member_selection rms
SET season_id = gs.id
FROM public.rosters r
INNER JOIN public.guild_seasons gs
  ON gs.guild_id = r.guild_id
 AND gs.state = 'active'
WHERE rms.season_id IS NULL
  AND r.id = rms.roster_id;

INSERT INTO public.guild_season_member_intents (guild_id, season_id, user_id, commitment_status)
SELECT gm.guild_id, gs.id, gm.user_id, gm.status
FROM public.guild_members gm
INNER JOIN public.guild_seasons gs
  ON gs.guild_id = gm.guild_id
 AND gs.state = 'active'
ON CONFLICT (season_id, user_id) DO NOTHING;

ALTER TABLE public.class_wishes
  ALTER COLUMN season_id SET NOT NULL;

ALTER TABLE public.external_member_wishes
  ALTER COLUMN season_id SET NOT NULL;

ALTER TABLE public.roster_member_selection
  ALTER COLUMN season_id SET NOT NULL;

ALTER TABLE public.class_wishes
  DROP CONSTRAINT IF EXISTS class_wishes_guild_id_user_id_choice_index_key;

DROP INDEX IF EXISTS class_wishes_guild_roster_user_choice_idx;
CREATE UNIQUE INDEX IF NOT EXISTS class_wishes_guild_roster_season_user_choice_idx
  ON public.class_wishes(guild_id, roster_id, season_id, user_id, choice_index)
  WHERE roster_id IS NOT NULL;

ALTER TABLE public.external_member_wishes
  DROP CONSTRAINT IF EXISTS external_member_wishes_roster_id_roster_cache_id_choice_index_key;

DROP INDEX IF EXISTS external_member_wishes_roster_cache_choice_idx;
CREATE UNIQUE INDEX IF NOT EXISTS external_member_wishes_roster_season_cache_choice_idx
  ON public.external_member_wishes(roster_id, season_id, roster_cache_id, choice_index);

ALTER TABLE public.roster_member_selection
  DROP CONSTRAINT IF EXISTS roster_member_selection_roster_id_user_id_key,
  DROP CONSTRAINT IF EXISTS roster_member_selection_roster_id_roster_cache_id_key;

DROP INDEX IF EXISTS roster_member_selection_roster_user_idx;
DROP INDEX IF EXISTS roster_member_selection_roster_cache_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS roster_member_selection_roster_season_user_idx
  ON public.roster_member_selection(roster_id, season_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS roster_member_selection_roster_season_cache_idx
  ON public.roster_member_selection(roster_id, season_id, roster_cache_id)
  WHERE roster_cache_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_active_guild_season(p_guild_id UUID)
RETURNS public.guild_seasons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.guild_seasons
  WHERE guild_id = p_guild_id
    AND state = 'active'
  ORDER BY activated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
$$;

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
  FROM public.guild_seasons
  WHERE id = p_season_id
    AND guild_id = p_guild_id;

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
  FROM public.guild_seasons
  WHERE guild_id = p_guild_id
    AND state = 'active'
  ORDER BY activated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  RETURN public.can_edit_wishes(p_guild_id, p_roster_id, p_user_id, v_active_season_id);
END;
$$;

DROP POLICY IF EXISTS "Users can create wishes for accessible rosters" ON public.class_wishes;
CREATE POLICY "Users can create wishes for accessible rosters"
  ON public.class_wishes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid(), season_id)
  );

DROP POLICY IF EXISTS "Users can update their own wishes" ON public.class_wishes;
CREATE POLICY "Users can update their own wishes"
  ON public.class_wishes FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid(), season_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid(), season_id)
  );

DROP POLICY IF EXISTS "Users can delete their own wishes" ON public.class_wishes;
CREATE POLICY "Users can delete their own wishes"
  ON public.class_wishes FOR DELETE
  USING (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid(), season_id)
  );

DROP POLICY IF EXISTS "Wish managers can manage external member wishes" ON public.external_member_wishes;
CREATE POLICY "Wish managers can manage external member wishes"
ON public.external_member_wishes
FOR ALL
USING (
  (
    public.is_guild_gm(guild_id, auth.uid())
    OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
  )
  AND EXISTS (
    SELECT 1
    FROM public.guild_seasons gs
    WHERE gs.id = external_member_wishes.season_id
      AND gs.guild_id = external_member_wishes.guild_id
      AND gs.state = 'active'
  )
)
WITH CHECK (
  (
    public.is_guild_gm(guild_id, auth.uid())
    OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
  )
  AND EXISTS (
    SELECT 1
    FROM public.guild_seasons gs
    WHERE gs.id = external_member_wishes.season_id
      AND gs.guild_id = external_member_wishes.guild_id
      AND gs.state = 'active'
  )
);

DROP POLICY IF EXISTS "Wish managers can insert roster member selection" ON public.roster_member_selection;
CREATE POLICY "Wish managers can insert roster member selection"
ON public.roster_member_selection
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    INNER JOIN public.guild_seasons gs
      ON gs.id = roster_member_selection.season_id
     AND gs.guild_id = r.guild_id
     AND gs.state = 'active'
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
      AND (
        (
          roster_member_selection.user_id IS NOT NULL
          AND roster_member_selection.roster_cache_id IS NULL
          AND public.is_guild_member(r.guild_id, roster_member_selection.user_id)
        )
        OR
        (
          roster_member_selection.user_id IS NULL
          AND roster_member_selection.roster_cache_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.guild_roster_cache grc
            WHERE grc.id = roster_member_selection.roster_cache_id
              AND grc.guild_id = r.guild_id
              AND grc.matched_user_id IS NULL
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Wish managers can update roster member selection" ON public.roster_member_selection;
CREATE POLICY "Wish managers can update roster member selection"
ON public.roster_member_selection
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    INNER JOIN public.guild_seasons gs
      ON gs.id = roster_member_selection.season_id
     AND gs.guild_id = r.guild_id
     AND gs.state = 'active'
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    INNER JOIN public.guild_seasons gs
      ON gs.id = roster_member_selection.season_id
     AND gs.guild_id = r.guild_id
     AND gs.state = 'active'
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
      AND (
        (
          roster_member_selection.user_id IS NOT NULL
          AND roster_member_selection.roster_cache_id IS NULL
          AND public.is_guild_member(r.guild_id, roster_member_selection.user_id)
        )
        OR
        (
          roster_member_selection.user_id IS NULL
          AND roster_member_selection.roster_cache_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.guild_roster_cache grc
            WHERE grc.id = roster_member_selection.roster_cache_id
              AND grc.guild_id = r.guild_id
              AND grc.matched_user_id IS NULL
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Wish managers can delete roster member selection" ON public.roster_member_selection;
CREATE POLICY "Wish managers can delete roster member selection"
ON public.roster_member_selection
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    INNER JOIN public.guild_seasons gs
      ON gs.id = roster_member_selection.season_id
     AND gs.guild_id = r.guild_id
     AND gs.state = 'active'
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
  )
);

DROP FUNCTION IF EXISTS public.get_roster_member_selection(UUID);
CREATE FUNCTION public.get_roster_member_selection(
  p_roster_id UUID,
  p_season_id UUID DEFAULT NULL
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
  v_effective_season_id UUID;
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

  IF NOT (public.is_guild_member(v_guild_id, v_actor) OR public.has_role(v_actor, 'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_can_manage := public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes');

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
    WHERE rms.roster_id = p_roster_id
      AND rms.season_id = v_effective_season_id;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_member_roster_wishes(UUID, UUID, UUID, TEXT, JSONB, BOOLEAN);
CREATE FUNCTION public.upsert_member_roster_wishes(
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
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_wishes JSONB := COALESCE(p_wishes, '[]'::jsonb);
  v_can_manage BOOLEAN := false;
  v_is_manager_edit BOOLEAN := false;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
  v_current_status TEXT;
  v_previous_selection_status public.roster_selection_status := 'undecided';
  v_any_wish_change BOOLEAN := false;
  v_commitment_changed BOOLEAN := false;
  v_should_reset_selection BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status';
  END IF;

  IF jsonb_typeof(v_wishes) <> 'array' THEN
    RAISE EXCEPTION 'Invalid wishes payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rosters r
    WHERE r.id = p_roster_id
      AND r.guild_id = p_guild_id
  ) THEN
    RAISE EXCEPTION 'Roster not found in guild';
  END IF;

  SELECT COALESCE(
    p_season_id,
    (
      SELECT gs.id
      FROM public.guild_seasons gs
      WHERE gs.guild_id = p_guild_id
        AND gs.state = 'active'
      ORDER BY gs.activated_at DESC NULLS LAST, gs.created_at DESC
      LIMIT 1
    )
  )
  INTO v_effective_season_id;

  SELECT state
  INTO v_season_state
  FROM public.guild_seasons
  WHERE id = v_effective_season_id
    AND guild_id = p_guild_id;

  IF v_season_state IS DISTINCT FROM 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Season is not active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guild_members gm
    WHERE gm.guild_id = p_guild_id
      AND gm.user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Member not found in guild';
  END IF;

  IF NOT public.has_roster_access(p_roster_id, v_actor) THEN
    RAISE EXCEPTION 'No access to roster';
  END IF;

  v_can_manage := public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes');
  v_is_manager_edit := (v_actor <> p_member_id AND v_can_manage)
    OR (COALESCE(p_manager_edit, false) AND v_can_manage);

  IF v_actor <> p_member_id AND NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT v_is_manager_edit AND NOT public.can_edit_wishes(p_guild_id, p_roster_id, p_member_id, v_effective_season_id) THEN
    RAISE EXCEPTION 'Wishes are locked';
  END IF;

  IF EXISTS (
    WITH incoming AS (
      SELECT
        ordinality::INTEGER AS choice_index,
        NULLIF(value->>'class_id', '') AS class_id,
        (
          SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
          FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
        ) AS spec_ids
      FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
    )
    SELECT 1
    FROM incoming
    WHERE class_id IS NOT NULL
      AND cardinality(spec_ids) = 0
  ) THEN
    RAISE EXCEPTION 'Each wish must include at least one spec';
  END IF;

  SELECT COALESCE(
    (
      SELECT gsmi.commitment_status
      FROM public.guild_season_member_intents gsmi
      WHERE gsmi.guild_id = p_guild_id
        AND gsmi.season_id = v_effective_season_id
        AND gsmi.user_id = p_member_id
    ),
    (
      SELECT gm.status
      FROM public.guild_members gm
      WHERE gm.guild_id = p_guild_id
        AND gm.user_id = p_member_id
    )
  )
  INTO v_current_status;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Member not found in guild';
  END IF;

  SELECT rms.selection_status
  INTO v_previous_selection_status
  FROM public.roster_member_selection rms
  WHERE rms.roster_id = p_roster_id
    AND rms.season_id = v_effective_season_id
    AND rms.user_id = p_member_id;

  v_previous_selection_status := COALESCE(v_previous_selection_status, 'undecided'::public.roster_selection_status);
  v_commitment_changed := p_commitment_status IS DISTINCT FROM v_current_status;

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  ),
  existing AS (
    SELECT
      cw.choice_index,
      cw.class_id,
      CASE
        WHEN COALESCE(cardinality(cw.spec_order), 0) > 0 THEN cw.spec_order
        ELSE cw.spec_ids
      END AS ordered_spec_ids,
      cw.comment
    FROM public.class_wishes cw
    WHERE cw.guild_id = p_guild_id
      AND cw.roster_id = p_roster_id
      AND cw.season_id = v_effective_season_id
      AND cw.user_id = p_member_id
  ),
  diff AS (
    SELECT
      COALESCE(e.choice_index, n.choice_index) AS choice_index,
      e.class_id AS old_class_id,
      e.ordered_spec_ids AS old_spec_ids,
      e.comment AS old_comment,
      n.class_id AS new_class_id,
      n.spec_ids AS new_spec_ids,
      n.comment AS new_comment
    FROM existing e
    FULL OUTER JOIN normalized n
      ON n.choice_index = e.choice_index
  )
  SELECT EXISTS (
    SELECT 1
    FROM diff
    WHERE old_class_id IS DISTINCT FROM new_class_id
      OR old_spec_ids IS DISTINCT FROM new_spec_ids
      OR old_comment IS DISTINCT FROM new_comment
  )
  INTO v_any_wish_change;

  INSERT INTO public.guild_season_member_intents (guild_id, season_id, user_id, commitment_status)
  VALUES (p_guild_id, v_effective_season_id, p_member_id, p_commitment_status)
  ON CONFLICT (season_id, user_id)
  DO UPDATE SET commitment_status = EXCLUDED.commitment_status;

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  UPDATE public.class_wishes cw
  SET class_id = normalized.class_id,
      spec_ids = normalized.spec_ids,
      spec_order = normalized.spec_ids,
      comment = normalized.comment,
      validation_status = CASE WHEN v_is_manager_edit THEN cw.validation_status ELSE 'pending' END,
      validated_by = CASE WHEN v_is_manager_edit THEN cw.validated_by ELSE NULL END,
      validated_at = CASE WHEN v_is_manager_edit THEN cw.validated_at ELSE NULL END
  FROM normalized
  WHERE cw.guild_id = p_guild_id
    AND cw.roster_id = p_roster_id
    AND cw.season_id = v_effective_season_id
    AND cw.user_id = p_member_id
    AND cw.choice_index = normalized.choice_index
    AND (
      cw.class_id IS DISTINCT FROM normalized.class_id
      OR (
        CASE
          WHEN COALESCE(cardinality(cw.spec_order), 0) > 0 THEN cw.spec_order
          ELSE cw.spec_ids
        END
      ) IS DISTINCT FROM normalized.spec_ids
      OR cw.comment IS DISTINCT FROM normalized.comment
    );

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id,
      (
        SELECT COALESCE(array_agg(spec_value), ARRAY[]::TEXT[])
        FROM jsonb_array_elements_text(COALESCE(value->'spec_ids', '[]'::jsonb)) AS spec_value
      ) AS spec_ids,
      NULLIF(value->>'comment', '') AS comment
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT
      row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index,
      class_id,
      spec_ids,
      comment
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  INSERT INTO public.class_wishes (
    guild_id,
    user_id,
    roster_id,
    season_id,
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
    p_member_id,
    p_roster_id,
    v_effective_season_id,
    normalized.choice_index,
    normalized.class_id,
    normalized.spec_ids,
    normalized.spec_ids,
    normalized.comment,
    'pending',
    NULL,
    NULL
  FROM normalized
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.class_wishes cw
    WHERE cw.guild_id = p_guild_id
      AND cw.roster_id = p_roster_id
      AND cw.season_id = v_effective_season_id
      AND cw.user_id = p_member_id
      AND cw.choice_index = normalized.choice_index
  );

  WITH incoming AS (
    SELECT
      ordinality::INTEGER AS original_choice_index,
      NULLIF(value->>'class_id', '') AS class_id
    FROM jsonb_array_elements(v_wishes) WITH ORDINALITY AS payload(value, ordinality)
  ),
  normalized AS (
    SELECT row_number() OVER (ORDER BY original_choice_index)::INTEGER AS choice_index
    FROM incoming
    WHERE class_id IS NOT NULL
  )
  DELETE FROM public.class_wishes cw
  WHERE cw.guild_id = p_guild_id
    AND cw.roster_id = p_roster_id
    AND cw.season_id = v_effective_season_id
    AND cw.user_id = p_member_id
    AND NOT EXISTS (
      SELECT 1
      FROM normalized
      WHERE normalized.choice_index = cw.choice_index
    );

  IF NOT v_is_manager_edit THEN
    IF v_any_wish_change AND v_previous_selection_status <> 'undecided'::public.roster_selection_status THEN
      v_should_reset_selection := true;
    ELSIF v_commitment_changed
      AND v_current_status = 'confirmed'
      AND p_commitment_status <> 'confirmed'
      AND v_previous_selection_status IN ('selected'::public.roster_selection_status, 'bench'::public.roster_selection_status) THEN
      v_should_reset_selection := true;
    END IF;
  END IF;

  IF v_should_reset_selection THEN
    UPDATE public.roster_member_selection
    SET selection_status = 'undecided',
        reason_code = NULL,
        comment = NULL,
        decided_by = NULL,
        decided_at = NULL
    WHERE roster_id = p_roster_id
      AND season_id = v_effective_season_id
      AND user_id = p_member_id
      AND selection_status <> 'undecided';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_external_member_wish(UUID, UUID, TEXT, TEXT[], TEXT, TEXT);
CREATE FUNCTION public.upsert_external_member_wish(
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
AS $$
DECLARE
  v_actor UUID;
  v_guild_id UUID;
  v_matched_user_id UUID;
  v_existing_id UUID;
  v_spec_order TEXT[];
  v_commitment_status TEXT;
  v_effective_season_id UUID;
  v_season_state public.guild_season_state;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
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

  SELECT state
  INTO v_season_state
  FROM public.guild_seasons
  WHERE id = v_effective_season_id
    AND guild_id = v_guild_id;

  IF v_season_state IS DISTINCT FROM 'active'::public.guild_season_state THEN
    RAISE EXCEPTION 'Season is not active';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT matched_user_id
    INTO v_matched_user_id
  FROM public.guild_roster_cache
  WHERE id = p_roster_cache_id
    AND guild_id = v_guild_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster cache member not found for this guild';
  END IF;

  v_spec_order := COALESCE(p_spec_ids, ARRAY[]::TEXT[]);
  v_commitment_status := COALESCE(NULLIF(p_commitment_status, ''), 'potential');
  IF v_commitment_status NOT IN ('confirmed', 'potential', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid commitment status';
  END IF;

  IF cardinality(v_spec_order) = 0 THEN
    RAISE EXCEPTION 'Each wish must include at least one spec';
  END IF;

  IF v_matched_user_id IS NOT NULL THEN
    UPDATE public.class_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment
    WHERE guild_id = v_guild_id
      AND roster_id = p_roster_id
      AND season_id = v_effective_season_id
      AND user_id = v_matched_user_id
      AND choice_index = 1;

    IF NOT FOUND THEN
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
        v_guild_id,
        p_roster_id,
        v_effective_season_id,
        v_matched_user_id,
        1,
        p_class_id,
        v_spec_order,
        v_spec_order,
        p_comment,
        'pending',
        NULL,
        NULL
      );
    END IF;

    INSERT INTO public.guild_season_member_intents (guild_id, season_id, user_id, commitment_status)
    VALUES (v_guild_id, v_effective_season_id, v_matched_user_id, v_commitment_status)
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET commitment_status = EXCLUDED.commitment_status;

    RETURN NULL;
  END IF;

  SELECT id
    INTO v_existing_id
  FROM public.external_member_wishes
  WHERE roster_id = p_roster_id
    AND season_id = v_effective_season_id
    AND roster_cache_id = p_roster_cache_id
    AND choice_index = 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.external_member_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment,
        commitment_status = v_commitment_status
    WHERE id = v_existing_id;

    RETURN v_existing_id;
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
  ) VALUES (
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
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_guild_wish_season(
  p_guild_id UUID,
  p_name TEXT,
  p_starts_at DATE DEFAULT NULL,
  p_ends_at DATE DEFAULT NULL,
  p_source_season_id UUID DEFAULT NULL,
  p_prefill_wishes BOOLEAN DEFAULT false,
  p_reset_copied_wishes BOOLEAN DEFAULT true,
  p_activate BOOLEAN DEFAULT true
)
RETURNS public.guild_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_new_season public.guild_seasons;
  v_source_season_id UUID;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF length(trim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Season name is required';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_starts_at > p_ends_at THEN
    RAISE EXCEPTION 'Season dates are invalid';
  END IF;

  SELECT COALESCE(
    p_source_season_id,
    (
      SELECT gs.id
      FROM public.guild_seasons gs
      WHERE gs.guild_id = p_guild_id
        AND gs.state = 'active'
      ORDER BY gs.activated_at DESC NULLS LAST, gs.created_at DESC
      LIMIT 1
    )
  )
  INTO v_source_season_id;

  IF p_activate THEN
    UPDATE public.guild_seasons
    SET state = 'archived',
        archived_at = COALESCE(archived_at, now())
    WHERE guild_id = p_guild_id
      AND state = 'active';
  END IF;

  INSERT INTO public.guild_seasons (
    guild_id,
    name,
    state,
    starts_at,
    ends_at,
    source_season_id,
    created_by,
    activated_at
  )
  VALUES (
    p_guild_id,
    trim(p_name),
    CASE WHEN p_activate THEN 'active'::public.guild_season_state ELSE 'draft'::public.guild_season_state END,
    p_starts_at,
    p_ends_at,
    v_source_season_id,
    v_actor,
    CASE WHEN p_activate THEN now() ELSE NULL END
  )
  RETURNING * INTO v_new_season;

  IF p_prefill_wishes AND v_source_season_id IS NOT NULL THEN
    INSERT INTO public.guild_season_member_intents (guild_id, season_id, user_id, commitment_status)
    SELECT guild_id, v_new_season.id, user_id, commitment_status
    FROM public.guild_season_member_intents
    WHERE guild_id = p_guild_id
      AND season_id = v_source_season_id
    ON CONFLICT (season_id, user_id) DO NOTHING;

    INSERT INTO public.class_wishes (
      guild_id,
      user_id,
      roster_id,
      season_id,
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
      guild_id,
      user_id,
      roster_id,
      v_new_season.id,
      choice_index,
      class_id,
      spec_ids,
      spec_order,
      comment,
      CASE WHEN p_reset_copied_wishes THEN 'pending' ELSE validation_status END,
      CASE WHEN p_reset_copied_wishes THEN NULL ELSE validated_by END,
      CASE WHEN p_reset_copied_wishes THEN NULL ELSE validated_at END
    FROM public.class_wishes
    WHERE guild_id = p_guild_id
      AND season_id = v_source_season_id;

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
    SELECT
      guild_id,
      roster_id,
      v_new_season.id,
      roster_cache_id,
      choice_index,
      class_id,
      spec_ids,
      spec_order,
      comment,
      commitment_status,
      CASE WHEN p_reset_copied_wishes THEN 'pending' ELSE validation_status END,
      CASE WHEN p_reset_copied_wishes THEN NULL ELSE validated_by END,
      CASE WHEN p_reset_copied_wishes THEN NULL ELSE validated_at END,
      v_actor
    FROM public.external_member_wishes
    WHERE guild_id = p_guild_id
      AND season_id = v_source_season_id;
  END IF;

  PERFORM public.log_guild_activity(
    p_guild_id,
    v_actor,
    CASE WHEN p_activate THEN 'wish_season_started' ELSE 'wish_season_drafted' END,
    jsonb_build_object(
      'season_id', v_new_season.id,
      'season_name', v_new_season.name,
      'prefill_wishes', p_prefill_wishes,
      'reset_copied_wishes', p_reset_copied_wishes
    ),
    NULL,
    NULL
  );

  RETURN v_new_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_guild_wish_season(p_season_id UUID)
RETURNS public.guild_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_season public.guild_seasons;
BEGIN
  SELECT guild_id INTO v_guild_id
  FROM public.guild_seasons
  WHERE id = p_season_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.guild_seasons
  SET state = 'archived',
      archived_at = COALESCE(archived_at, now())
  WHERE id = p_season_id
  RETURNING * INTO v_season;

  RETURN v_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_guild_wish_season(p_season_id UUID)
RETURNS public.guild_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_guild_id UUID;
  v_season public.guild_seasons;
BEGIN
  SELECT guild_id INTO v_guild_id
  FROM public.guild_seasons
  WHERE id = p_season_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.guild_seasons
  SET state = 'archived',
      archived_at = COALESCE(archived_at, now())
  WHERE guild_id = v_guild_id
    AND state = 'active'
    AND id <> p_season_id;

  UPDATE public.guild_seasons
  SET state = 'active',
      activated_at = COALESCE(activated_at, now()),
      archived_at = NULL
  WHERE id = p_season_id
    AND state IN ('draft', 'archived')
  RETURNING * INTO v_season;

  IF v_season.id IS NULL THEN
    RAISE EXCEPTION 'Season cannot be activated';
  END IF;

  RETURN v_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_external_wishes_to_matched_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_selection RECORD;
  v_guild_id UUID;
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

    INSERT INTO public.guild_season_member_intents (guild_id, season_id, user_id, commitment_status)
    VALUES (v_entry.guild_id, v_entry.season_id, NEW.matched_user_id, v_entry.commitment_status)
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET commitment_status = EXCLUDED.commitment_status;
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
