-- Allow users to update their own guild_members status
CREATE POLICY "Users can update their own status"
ON public.guild_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);