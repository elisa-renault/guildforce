-- Replace recursive guild_members policies with function-based ones
DROP POLICY IF EXISTS "Guild members are viewable by guild members" ON public.guild_members;
DROP POLICY IF EXISTS "GMs can manage members" ON public.guild_members;
DROP POLICY IF EXISTS "GMs can remove members" ON public.guild_members;
DROP POLICY IF EXISTS "Users with manage_members permission can update members" ON public.guild_members;
DROP POLICY IF EXISTS "Users can update their own status" ON public.guild_members;
DROP POLICY IF EXISTS "Users can join guilds" ON public.guild_members;
DROP POLICY IF EXISTS "Users can leave guilds" ON public.guild_members;

CREATE POLICY "Guild members are viewable by guild members"
ON public.guild_members
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()));

CREATE POLICY "Users can join guilds"
ON public.guild_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
ON public.guild_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users with manage_members permission can update members"
ON public.guild_members
FOR UPDATE
USING (public.has_guild_permission(guild_id, auth.uid(), 'manage_members'))
WITH CHECK (public.has_guild_permission(guild_id, auth.uid(), 'manage_members'));

CREATE POLICY "Users can leave guilds"
ON public.guild_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users with manage_members permission can remove members"
ON public.guild_members
FOR DELETE
USING (public.has_guild_permission(guild_id, auth.uid(), 'manage_members'));
