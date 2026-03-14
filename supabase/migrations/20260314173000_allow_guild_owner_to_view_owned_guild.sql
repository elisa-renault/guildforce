-- Battle.net sync can promote a user to guild owner (`guilds.owner_id`)
-- before the mirrored `guild_members` row is updated.
-- Let owners read their guild row immediately so Guildforce can render the
-- guild and management screens without waiting for `guild_members`.

DROP POLICY IF EXISTS "Members and admins can view guilds" ON public.guilds;

CREATE POLICY "Members owners and admins can view guilds"
ON public.guilds
FOR SELECT
TO authenticated
USING (
  is_guild_member(id, auth.uid())
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);
