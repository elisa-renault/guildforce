-- Drop the problematic recursive policy for guild_members
DROP POLICY IF EXISTS "Guild members are viewable by guild members" ON public.guild_members;

-- Create a security definer function to check guild membership
CREATE OR REPLACE FUNCTION public.is_guild_member(_guild_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guild_members
    WHERE guild_id = _guild_id
      AND user_id = _user_id
  )
$$;

-- Create non-recursive policy using the function
CREATE POLICY "Guild members are viewable by guild members" 
ON public.guild_members 
FOR SELECT 
USING (public.is_guild_member(guild_id, auth.uid()));

-- Also fix class_wishes SELECT policy to use the function
DROP POLICY IF EXISTS "Wishes viewable by guild members" ON public.class_wishes;

CREATE POLICY "Wishes viewable by guild members" 
ON public.class_wishes 
FOR SELECT 
USING (public.is_guild_member(guild_id, auth.uid()));