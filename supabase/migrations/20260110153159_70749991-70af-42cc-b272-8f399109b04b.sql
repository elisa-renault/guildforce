-- ============================================================
-- SECURITY FIX: Protect sensitive profile data (Battle.net tokens)
-- ============================================================

-- Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a view for public profile data (without sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  battletag,
  avatar_url,
  main_character_name,
  preferred_language,
  created_at
FROM public.profiles;

-- Policy: Users can only view their own full profile (with tokens)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- ============================================================
-- SECURITY FIX: Protect guild invite_key from public access
-- ============================================================

-- Drop the current permissive guilds SELECT policy
DROP POLICY IF EXISTS "Anyone can view guilds" ON public.guilds;

-- Create a function to safely get guilds with conditional invite_key access
CREATE OR REPLACE FUNCTION public.is_guild_owner_or_gm(_guild_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.guilds g
    WHERE g.id = _guild_id 
      AND g.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 
    FROM public.guild_members gm
    WHERE gm.guild_id = _guild_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'gm'
  );
$$;

-- Create a view for guilds that hides invite_key for non-owners/non-GMs
CREATE OR REPLACE VIEW public.public_guilds AS
SELECT 
  id,
  name,
  server,
  faction,
  owner_id,
  created_at,
  updated_at,
  created_by_user_id,
  CASE 
    WHEN public.is_guild_owner_or_gm(id) THEN invite_key
    ELSE NULL
  END AS invite_key
FROM public.guilds;

-- Policy: Anyone authenticated can view guilds (but invite_key is hidden via view)
CREATE POLICY "Authenticated users can view guilds"
ON public.guilds
FOR SELECT
USING (auth.uid() IS NOT NULL);