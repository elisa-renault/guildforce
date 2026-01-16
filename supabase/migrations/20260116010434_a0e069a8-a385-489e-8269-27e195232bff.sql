-- Drop the restrictive SELECT policy on wow_guild_memberships
DROP POLICY IF EXISTS "Users can view their own guild memberships" ON public.wow_guild_memberships;

-- Create a new SELECT policy that allows viewing memberships for the same guild
CREATE POLICY "Users can view guild co-members"
ON public.wow_guild_memberships
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.wow_guild_memberships m
    WHERE m.user_id = auth.uid()
      AND m.guild_name = wow_guild_memberships.guild_name
      AND m.guild_realm_slug = wow_guild_memberships.guild_realm_slug
      AND m.guild_region = wow_guild_memberships.guild_region
  )
);

-- Drop the restrictive SELECT policy on wow_characters
DROP POLICY IF EXISTS "Users can view their own characters" ON public.wow_characters;

-- Create a new SELECT policy that allows viewing characters of guild co-members
CREATE POLICY "Users can view guild co-members characters"
ON public.wow_characters
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.wow_guild_memberships m1
    JOIN public.wow_guild_memberships m2 
      ON m1.guild_name = m2.guild_name 
      AND m1.guild_realm_slug = m2.guild_realm_slug
      AND m1.guild_region = m2.guild_region
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = wow_characters.user_id
  )
);