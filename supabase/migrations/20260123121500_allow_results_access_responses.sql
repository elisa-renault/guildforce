-- Allow users with results access to view all poll responses
CREATE POLICY "Users with results access can view all responses"
ON public.guild_poll_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpq.id = guild_poll_responses.question_id
    AND public.can_view_poll_results(gp.id, auth.uid())
  )
);
