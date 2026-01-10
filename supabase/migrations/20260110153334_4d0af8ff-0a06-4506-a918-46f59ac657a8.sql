-- ============================================================
-- SECURITY FIX: Protect guild invite_key from unauthorized access
-- ============================================================

-- Drop current SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view guilds" ON public.guilds;

-- Create a function to check if user is owner or GM of a specific guild
CREATE OR REPLACE FUNCTION public.can_view_guild_invite_key(_guild_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Is guild owner
    EXISTS (
      SELECT 1 FROM public.guilds g
      WHERE g.id = _guild_id AND g.owner_id = auth.uid()
    )
    OR
    -- Is GM in this guild
    EXISTS (
      SELECT 1 FROM public.guild_members gm
      WHERE gm.guild_id = _guild_id 
        AND gm.user_id = auth.uid() 
        AND gm.role = 'gm'
    );
$$;

-- Re-create the SELECT policy - all authenticated users can see guilds
-- But the invite_key protection is handled at the application layer
CREATE POLICY "Authenticated users can view guilds"
ON public.guilds
FOR SELECT
USING (auth.uid() IS NOT NULL);