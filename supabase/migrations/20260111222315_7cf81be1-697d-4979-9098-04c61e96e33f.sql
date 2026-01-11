-- Drop the overly permissive policy and create a more restrictive one
DROP POLICY IF EXISTS "System can insert notifications" ON public.forum_notifications;

-- Only authenticated users can create notifications
-- This allows the trigger functions to insert (running as SECURITY DEFINER)
-- while preventing anonymous access
CREATE POLICY "Authenticated users can insert notifications"
ON public.forum_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);