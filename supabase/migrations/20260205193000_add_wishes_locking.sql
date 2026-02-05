-- Add wishes locking (roster + member) and scheduling support

-- 1) Schema changes
ALTER TABLE public.rosters
  ADD COLUMN IF NOT EXISTS wishes_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wishes_lock_at TIMESTAMPTZ;

COMMENT ON COLUMN public.rosters.wishes_locked IS 'Locks wish editing for the roster when true.';
COMMENT ON COLUMN public.rosters.wishes_lock_at IS 'Optional scheduled lock timestamp for roster wishes.';

CREATE INDEX IF NOT EXISTS idx_rosters_wishes_lock_at ON public.rosters(wishes_lock_at);

ALTER TABLE public.guild_members
  ADD COLUMN IF NOT EXISTS wishes_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.guild_members.wishes_locked IS 'Locks wish editing for this member inside the guild.';

-- 2) Lock state helpers
CREATE OR REPLACE FUNCTION public.are_wishes_locked(
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
  v_roster_locked BOOLEAN;
  v_roster_lock_at TIMESTAMPTZ;
  v_member_locked BOOLEAN;
BEGIN
  IF p_roster_id IS NOT NULL THEN
    SELECT wishes_locked, wishes_lock_at
      INTO v_roster_locked, v_roster_lock_at
    FROM public.rosters
    WHERE id = p_roster_id;
  END IF;

  SELECT wishes_locked
    INTO v_member_locked
  FROM public.guild_members
  WHERE guild_id = p_guild_id
    AND user_id = p_user_id;

  IF COALESCE(v_roster_locked, false) THEN
    RETURN true;
  END IF;

  IF v_roster_lock_at IS NOT NULL AND v_roster_lock_at <= now() THEN
    RETURN true;
  END IF;

  IF COALESCE(v_member_locked, false) THEN
    RETURN true;
  END IF;

  RETURN false;
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
BEGIN
  RETURN NOT public.are_wishes_locked(p_guild_id, p_roster_id, p_user_id);
END;
$$;

-- 3) RLS: prevent user edits when locked
DROP POLICY IF EXISTS "Users can create wishes for accessible rosters" ON public.class_wishes;
CREATE POLICY "Users can create wishes for accessible rosters"
  ON public.class_wishes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own wishes" ON public.class_wishes;
CREATE POLICY "Users can update their own wishes"
  ON public.class_wishes FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own wishes" ON public.class_wishes;
CREATE POLICY "Users can delete their own wishes"
  ON public.class_wishes FOR DELETE
  USING (
    auth.uid() = user_id
    AND (roster_id IS NULL OR public.has_roster_access(roster_id, auth.uid()))
    AND public.can_edit_wishes(guild_id, roster_id, auth.uid())
  );

-- 4) Admin RPCs for locks
CREATE OR REPLACE FUNCTION public.lock_roster_wishes(p_roster_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  SELECT guild_id INTO v_guild_id FROM public.rosters WHERE id = p_roster_id;
  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  IF NOT (public.is_guild_gm(v_guild_id, auth.uid()) OR public.has_guild_permission(v_guild_id, auth.uid(), 'manage_wishes')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.rosters
    SET wishes_locked = true,
        wishes_lock_at = NULL
  WHERE id = p_roster_id;

  PERFORM public.log_guild_activity(
    v_guild_id,
    auth.uid(),
    'roster_wishes_locked',
    jsonb_build_object('scope', 'roster'),
    NULL,
    p_roster_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_roster_wishes(p_roster_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  SELECT guild_id INTO v_guild_id FROM public.rosters WHERE id = p_roster_id;
  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  IF NOT (public.is_guild_gm(v_guild_id, auth.uid()) OR public.has_guild_permission(v_guild_id, auth.uid(), 'manage_wishes')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.rosters
    SET wishes_locked = false,
        wishes_lock_at = NULL
  WHERE id = p_roster_id;

  PERFORM public.log_guild_activity(
    v_guild_id,
    auth.uid(),
    'roster_wishes_unlocked',
    jsonb_build_object('scope', 'roster'),
    NULL,
    p_roster_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_roster_wishes_lock(
  p_roster_id UUID,
  p_lock_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  SELECT guild_id INTO v_guild_id FROM public.rosters WHERE id = p_roster_id;
  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  IF NOT (public.is_guild_gm(v_guild_id, auth.uid()) OR public.has_guild_permission(v_guild_id, auth.uid(), 'manage_wishes')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.rosters
    SET wishes_lock_at = p_lock_at
  WHERE id = p_roster_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_wishes_locked(
  p_guild_id UUID,
  p_member_id UUID,
  p_locked BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_guild_gm(p_guild_id, auth.uid()) OR public.has_guild_permission(p_guild_id, auth.uid(), 'manage_wishes')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id
      AND user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  UPDATE public.guild_members
    SET wishes_locked = p_locked
  WHERE guild_id = p_guild_id
    AND user_id = p_member_id;

  PERFORM public.log_guild_activity(
    p_guild_id,
    auth.uid(),
    CASE WHEN p_locked THEN 'member_wishes_locked' ELSE 'member_wishes_unlocked' END,
    jsonb_build_object('scope', 'member'),
    p_member_id,
    NULL
  );
END;
$$;

-- 5) Scheduled job to apply roster locks
CREATE OR REPLACE FUNCTION public.apply_scheduled_wish_locks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_roster RECORD;
BEGIN
  FOR v_roster IN
    SELECT id, guild_id, wishes_lock_at
    FROM public.rosters
    WHERE wishes_lock_at IS NOT NULL
      AND wishes_lock_at <= now()
      AND wishes_locked = false
  LOOP
    UPDATE public.rosters
      SET wishes_locked = true
    WHERE id = v_roster.id;

    PERFORM public.log_guild_activity(
      v_roster.guild_id,
      NULL,
      'roster_wishes_locked',
      jsonb_build_object('scope', 'roster', 'scheduled', true, 'lock_at', v_roster.wishes_lock_at),
      NULL,
      v_roster.id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'apply-roster-wish-locks'
  ) THEN
    PERFORM cron.schedule(
      'apply-roster-wish-locks',
      '* * * * *',
      $$SELECT public.apply_scheduled_wish_locks();$$
    );
  END IF;
END $$;
