-- Battle.net GM ownership is stored on guilds.owner_id during sync.
-- Treat that owner as an effective GM in permission helpers so a freshly
-- claimed GM keeps immediate management access even if guild_members lags.

CREATE OR REPLACE FUNCTION public.is_guild_gm(p_guild_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.guilds g
    WHERE g.id = p_guild_id
      AND g.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.guild_members
    WHERE guild_id = p_guild_id
      AND user_id = p_user_id
      AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_guild_owner_or_gm(_guild_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_guild_gm(_guild_id, auth.uid());
$$;
