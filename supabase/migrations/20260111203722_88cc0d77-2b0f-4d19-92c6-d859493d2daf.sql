-- Allow GMs to update validation status on wishes
CREATE POLICY "GMs can update validation status"
ON public.class_wishes
FOR UPDATE
USING (
  is_guild_gm(guild_id, auth.uid())
)
WITH CHECK (
  is_guild_gm(guild_id, auth.uid())
);