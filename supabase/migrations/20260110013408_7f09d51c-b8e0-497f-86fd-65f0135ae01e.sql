-- Drop existing broken policies on guild_members
DROP POLICY IF EXISTS "Guild members are viewable by guild members" ON public.guild_members;
DROP POLICY IF EXISTS "GMs can manage members" ON public.guild_members;
DROP POLICY IF EXISTS "GMs can remove members" ON public.guild_members;

-- Create corrected policies for guild_members
CREATE POLICY "Guild members are viewable by guild members"
ON public.guild_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "GMs can manage members"
ON public.guild_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'gm'
  )
);

CREATE POLICY "GMs can remove members"
ON public.guild_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_members.guild_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'gm'
  )
);

-- Also fix the class_wishes policy
DROP POLICY IF EXISTS "Wishes viewable by guild members" ON public.class_wishes;

CREATE POLICY "Wishes viewable by guild members"
ON public.class_wishes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = class_wishes.guild_id 
    AND gm.user_id = auth.uid()
  )
);