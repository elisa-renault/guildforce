-- Drop the problematic policy on wow_characters
DROP POLICY IF EXISTS "Users can view guild co-members characters" ON public.wow_characters;

-- Create a security definer function to check if user shares a guild with another user
CREATE OR REPLACE FUNCTION public.shares_wow_guild(
  p_current_user_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wow_guild_memberships m1
    JOIN public.wow_guild_memberships m2 
      ON m1.guild_name ILIKE m2.guild_name 
      AND m1.guild_realm_slug ILIKE m2.guild_realm_slug
      AND m1.guild_region ILIKE m2.guild_region
    WHERE m1.user_id = p_current_user_id
      AND m2.user_id = p_target_user_id
  )
$$;

-- Create a new SELECT policy using the function
CREATE POLICY "Users can view guild co-members characters"
ON public.wow_characters
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.shares_wow_guild(auth.uid(), user_id)
);