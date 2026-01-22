-- Avoid RLS recursion by disabling row security inside helper functions
CREATE OR REPLACE FUNCTION public.is_guild_member(_guild_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guild_members
    WHERE guild_id = _guild_id
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_guild_gm(p_guild_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id
      AND user_id = p_user_id
      AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, row_security = off;
