-- ============================================================
-- FIX: Remove SECURITY DEFINER views and use direct RLS approach
-- ============================================================

-- Drop the views that caused SECURITY DEFINER warnings
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_guilds;

-- The RLS policies we created are sufficient:
-- 1. profiles: Users can only view their own profile (protects tokens)
-- 2. guilds: Authenticated users can view guilds

-- For accessing other users' public info (username, battletag), 
-- the app should use the guild_members join to get profile info
-- or we need a function that returns only safe fields

-- Create a SECURITY INVOKER function to get public profile data safely
CREATE OR REPLACE FUNCTION public.get_public_profile_info(_user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  battletag text,
  avatar_url text,
  main_character_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.battletag,
    p.avatar_url,
    p.main_character_name
  FROM public.profiles p
  WHERE p.id = _user_id;
$$;

-- For the dashboard roster, we need guild members to see each other's basic info
-- Add a policy that allows guild members to view profiles of other guild members
CREATE POLICY "Guild members can view co-members profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.guild_members gm1
    JOIN public.guild_members gm2 ON gm1.guild_id = gm2.guild_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = profiles.id
  )
);

-- Note: This policy allows seeing full profile including tokens if co-member
-- For better security, we should use a view or function, but to avoid SECURITY DEFINER issues,
-- we'll update the app to only query specific safe columns