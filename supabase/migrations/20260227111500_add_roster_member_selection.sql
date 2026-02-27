-- Dedicated roster member selection status storage for roster planning decisions.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'roster_selection_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.roster_selection_status AS ENUM (
      'undecided',
      'selected',
      'bench',
      'not_selected'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'roster_selection_reason_code'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.roster_selection_reason_code AS ENUM (
      'role_fit',
      'composition',
      'attendance',
      'performance',
      'trial',
      'conflict',
      'other'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.roster_member_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selection_status public.roster_selection_status NOT NULL DEFAULT 'undecided',
  reason_code public.roster_selection_reason_code,
  comment TEXT,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (roster_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_roster_member_selection_roster
  ON public.roster_member_selection(roster_id);

CREATE INDEX IF NOT EXISTS idx_roster_member_selection_user
  ON public.roster_member_selection(user_id);

ALTER TABLE public.roster_member_selection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild members can view roster member selection" ON public.roster_member_selection;
CREATE POLICY "Guild members can view roster member selection"
ON public.roster_member_selection
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    WHERE r.id = roster_member_selection.roster_id
      AND public.is_guild_member(r.guild_id, auth.uid())
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
    WHERE r.id = roster_member_selection.roster_id
      AND public.is_guild_member(r.guild_id, roster_member_selection.user_id)
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
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
      AND public.is_guild_member(r.guild_id, roster_member_selection.user_id)
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
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
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
  )
);

DROP TRIGGER IF EXISTS update_roster_member_selection_updated_at ON public.roster_member_selection;
CREATE TRIGGER update_roster_member_selection_updated_at
  BEFORE UPDATE ON public.roster_member_selection
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_roster_member_selection(
  p_roster_id UUID
)
RETURNS TABLE (
  user_id UUID,
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
