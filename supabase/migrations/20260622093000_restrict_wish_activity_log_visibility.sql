-- Restrict guild activity visibility for member wish history.
-- Managers keep access through the existing view_activity_log permission policy;
-- members only get their own wish activity rows.

DROP POLICY IF EXISTS "Guild members can view activity logs" ON public.guild_activity_logs;

DROP POLICY IF EXISTS "Members can view their own wish activity logs" ON public.guild_activity_logs;
CREATE POLICY "Members can view their own wish activity logs"
ON public.guild_activity_logs
FOR SELECT
USING (
  target_user_id = auth.uid()
  AND action_type IN ('wish_created', 'wish_updated', 'wish_deleted', 'wish_validation')
);
