-- Remove manage_members permission from guild_permissions table
DELETE FROM public.guild_permissions WHERE permission_type = 'manage_members';

-- Replace the RLS policy to only allow self-updates or GM updates
DROP POLICY IF EXISTS "Users with manage_members permission can update members" ON public.guild_members;

CREATE POLICY "Users can update own membership or GM can update"
ON public.guild_members
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.is_guild_owner_or_gm(guild_id)
)
WITH CHECK (
  user_id = auth.uid() 
  OR public.is_guild_owner_or_gm(guild_id)
);