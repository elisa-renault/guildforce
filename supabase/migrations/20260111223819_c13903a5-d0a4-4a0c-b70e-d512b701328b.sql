-- Fix overly permissive RLS policy on characters table
-- Currently allows any authenticated user to view all characters

DROP POLICY IF EXISTS "Users can view characters of guild members" ON public.characters;

-- Create restrictive policy: users can only see their own characters
-- or characters of users who share at least one guild with them
CREATE POLICY "Users can view own and co-members characters"
ON public.characters
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id  -- Own characters
  OR
  EXISTS (  -- Characters of guild co-members
    SELECT 1 
    FROM guild_members gm1
    JOIN guild_members gm2 ON gm1.guild_id = gm2.guild_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = characters.user_id
      AND gm1.status = 'confirmed'
      AND gm2.status = 'confirmed'
  )
);