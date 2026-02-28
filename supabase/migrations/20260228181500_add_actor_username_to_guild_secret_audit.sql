DROP FUNCTION IF EXISTS public.list_guild_secret_audit(UUID, UUID);

CREATE OR REPLACE FUNCTION public.list_guild_secret_audit(
  p_guild_id UUID,
  p_secret_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  guild_id UUID,
  secret_id UUID,
  secret_label TEXT,
  actor_user_id UUID,
  actor_username TEXT,
  action_type TEXT,
  action_context JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.guild_id,
    e.secret_id,
    s.label,
    e.actor_user_id,
    p.username,
    e.action_type,
    e.action_context,
    e.created_at
  FROM public.guild_secret_audit_events e
  JOIN public.guild_secrets s
    ON s.id = e.secret_id
  LEFT JOIN public.profiles p
    ON p.id = e.actor_user_id
  WHERE e.guild_id = p_guild_id
    AND (p_secret_id IS NULL OR e.secret_id = p_secret_id)
    AND public.can_access_guild_secret(e.secret_id, v_actor, 'audit')
  ORDER BY e.created_at DESC;
END;
$$;
