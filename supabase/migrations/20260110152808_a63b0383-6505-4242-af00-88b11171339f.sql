-- Fix SECURITY DEFINER function with proper access control
-- Users can only check their own membership OR check other users if they are already in the guild

CREATE OR REPLACE FUNCTION public.is_guild_member(_guild_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow checking own membership OR if caller is already a member of the guild
  IF _user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.guild_members 
    WHERE guild_id = _guild_id AND user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = _guild_id AND user_id = _user_id
  );
END;
$$;