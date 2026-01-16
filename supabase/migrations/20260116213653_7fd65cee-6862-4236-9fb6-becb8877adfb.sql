-- Add policy to allow users with manage_rosters permission to manage roster access rules
CREATE POLICY "Users with manage_rosters permission can manage access rules"
ON public.roster_access_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.id = roster_access_rules.roster_id
      AND has_guild_permission(r.guild_id, auth.uid(), 'manage_rosters'::text)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.id = roster_access_rules.roster_id
      AND has_guild_permission(r.guild_id, auth.uid(), 'manage_rosters'::text)
  )
);