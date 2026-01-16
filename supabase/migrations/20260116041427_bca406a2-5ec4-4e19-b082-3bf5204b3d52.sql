-- Fix: has_role signature is (uuid, app_role)

CREATE POLICY "Admins and moderators can view roster cache"
ON public.guild_roster_cache
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);
