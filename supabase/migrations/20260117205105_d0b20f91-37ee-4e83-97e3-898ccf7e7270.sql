-- Fix permissive INSERT policy on forum_notifications
-- Current policy allows any authenticated user to insert notifications for any user
-- New policy restricts to only inserting notifications where user_id matches auth.uid()
-- Note: SECURITY DEFINER trigger functions (notify_topic_author, notify_topic_participants) 
-- will bypass RLS and continue to work properly

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.forum_notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.forum_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);