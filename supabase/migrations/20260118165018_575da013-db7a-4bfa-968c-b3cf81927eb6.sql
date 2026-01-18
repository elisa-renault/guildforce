-- Allow staff to view all profiles (needed for Admin user management)
-- RLS is already enabled on public.profiles.

CREATE POLICY "Admins and moderators can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'moderator'::public.app_role)
);
