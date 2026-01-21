-- Allow global admins to read guild members and rosters (read-only mode)

CREATE POLICY "Admins can read all guild members"
ON public.guild_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can read all rosters"
ON public.rosters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);
