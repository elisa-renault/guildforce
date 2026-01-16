-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view guild co-members" ON public.wow_guild_memberships;

-- Create a security definer function to check if user is in same guild
CREATE OR REPLACE FUNCTION public.is_same_wow_guild(
  p_user_id uuid,
  p_guild_name text,
  p_guild_realm_slug text,
  p_guild_region text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wow_guild_memberships
    WHERE user_id = p_user_id
      AND guild_name ILIKE p_guild_name
      AND guild_realm_slug ILIKE p_guild_realm_slug
      AND guild_region ILIKE p_guild_region
  )
$$;

-- Create a new SELECT policy using the function
CREATE POLICY "Users can view guild co-members"
ON public.wow_guild_memberships
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_same_wow_guild(
    auth.uid(), 
    guild_name, 
    guild_realm_slug, 
    guild_region
  )
);