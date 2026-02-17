-- Fix admin guild deletion flow:
-- 1) allow app admins to delete guilds from the admin UI
-- 2) make guild activity logging resilient during cascading guild deletion

DROP POLICY IF EXISTS "Guild owners can delete their guilds" ON public.guilds;

CREATE POLICY "Guild owners can delete their guilds"
ON public.guilds
FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.log_guild_activity(
  p_guild_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_target_user_id UUID DEFAULT NULL,
  p_roster_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- During cascading guild deletion, child-row triggers can fire after the parent
  -- guild row is gone. In that case we skip logging instead of failing the delete.
  IF p_guild_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guilds g WHERE g.id = p_guild_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.guild_activity_logs (
    guild_id, user_id, action_type, action_details, target_user_id, roster_id
  ) VALUES (
    p_guild_id, p_user_id, p_action_type, p_action_details, p_target_user_id, p_roster_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN NULL;
END;
$$;
