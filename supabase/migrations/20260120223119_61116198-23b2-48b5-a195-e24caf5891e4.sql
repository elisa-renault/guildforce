-- Allow admins to read battlenet_tokens for user management
CREATE POLICY "Admins can read all battlenet tokens"
ON public.battlenet_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));