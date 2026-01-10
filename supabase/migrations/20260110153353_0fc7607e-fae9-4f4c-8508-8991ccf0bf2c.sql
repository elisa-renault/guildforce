-- ============================================================
-- Create secure RPC function for getting guild with invite_key
-- ============================================================

-- RPC function that returns guild info with invite_key only if user is owner/GM
CREATE OR REPLACE FUNCTION public.get_guild_with_invite_key(_guild_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  server text,
  faction text,
  owner_id uuid,
  invite_key text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is owner or GM
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.guilds g
      WHERE g.id = _guild_id AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = _guild_id 
        AND gm.user_id = auth.uid() 
        AND gm.role = 'gm'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You must be guild owner or GM to access invite key';
  END IF;

  RETURN QUERY
  SELECT g.id, g.name, g.server, g.faction, g.owner_id, g.invite_key, g.created_at, g.updated_at
  FROM public.guilds g
  WHERE g.id = _guild_id;
END;
$$;