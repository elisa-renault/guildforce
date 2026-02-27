-- Allow roster decisions for external members (guild_roster_cache entries without matched users).
-- A selection row now targets either a guild member profile (user_id) or an external roster cache entry (roster_cache_id).

ALTER TABLE public.roster_member_selection
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.roster_member_selection
  ADD COLUMN IF NOT EXISTS roster_cache_id UUID REFERENCES public.guild_roster_cache(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'roster_member_selection_roster_id_roster_cache_id_key'
      AND conrelid = 'public.roster_member_selection'::regclass
  ) THEN
    ALTER TABLE public.roster_member_selection
      ADD CONSTRAINT roster_member_selection_roster_id_roster_cache_id_key
      UNIQUE (roster_id, roster_cache_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'roster_member_selection_target_check'
      AND conrelid = 'public.roster_member_selection'::regclass
  ) THEN
    ALTER TABLE public.roster_member_selection
      ADD CONSTRAINT roster_member_selection_target_check
      CHECK (
        (user_id IS NOT NULL AND roster_cache_id IS NULL)
        OR
        (user_id IS NULL AND roster_cache_id IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_roster_member_selection_roster_cache
  ON public.roster_member_selection(roster_cache_id);

DROP POLICY IF EXISTS "Wish managers can insert roster member selection" ON public.roster_member_selection;
CREATE POLICY "Wish managers can insert roster member selection"
ON public.roster_member_selection
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rosters r
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

  IF NOT public.is_guild_member(v_guild_id, v_actor) THEN
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
