-- Add RLS policy allowing global admins to read all class_wishes
CREATE POLICY "Admins can read all wishes"
ON public.class_wishes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);