-- Align poll RLS with the respondent/results access RPCs.
-- This fixes cases where members can view results in the editor config
-- but remain blocked from the poll record, questions, sections, or counts.

DROP POLICY IF EXISTS "Guild members can view active polls" ON public.guild_polls;

CREATE POLICY "Users can view accessible polls"
ON public.guild_polls
FOR SELECT
USING (
  public.has_guild_permission(guild_id, auth.uid(), 'manage_polls')
  OR public.is_guild_gm(guild_id, auth.uid())
  OR (
    status = 'active'
    AND public.can_respond_to_poll(id, auth.uid())
  )
  OR public.can_view_poll_results(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view questions of visible polls" ON public.guild_poll_questions;

CREATE POLICY "Users can view accessible poll questions"
ON public.guild_poll_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.guild_polls gp
    WHERE gp.id = guild_poll_questions.poll_id
      AND (
        public.has_guild_permission(gp.guild_id, auth.uid(), 'manage_polls')
        OR public.is_guild_gm(gp.guild_id, auth.uid())
        OR (
          gp.status = 'active'
          AND public.can_respond_to_poll(gp.id, auth.uid())
        )
        OR public.get_poll_question_results_visibility(guild_poll_questions.id, auth.uid()) <> 'none'
      )
  )
);

DROP POLICY IF EXISTS "Guild members can view poll sections" ON public.guild_poll_sections;

CREATE POLICY "Users can view accessible poll sections"
ON public.guild_poll_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.guild_polls p
    WHERE p.id = guild_poll_sections.poll_id
      AND (
        public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
        OR public.is_guild_gm(p.guild_id, auth.uid())
        OR (
          p.status = 'active'
          AND public.can_respond_to_poll(p.id, auth.uid())
        )
        OR public.can_view_poll_results(p.id, auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Users can submit responses to active polls" ON public.guild_poll_responses;

CREATE POLICY "Users can submit responses to active polls"
ON public.guild_poll_responses
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpq.id = guild_poll_responses.question_id
      AND gp.status = 'active'
      AND public.can_respond_to_poll(gp.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their own responses" ON public.guild_poll_responses;

CREATE POLICY "Users can update their own responses"
ON public.guild_poll_responses
FOR UPDATE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpq.id = guild_poll_responses.question_id
      AND gp.status = 'active'
      AND public.can_respond_to_poll(gp.id, auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.get_poll_response_counts(p_poll_ids UUID[])
RETURNS TABLE (
  poll_id UUID,
  response_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS poll_id,
    COALESCE(COUNT(DISTINCT r.user_id), 0)::INTEGER AS response_count
  FROM unnest(p_poll_ids) AS pid
  JOIN public.guild_polls p ON p.id = pid
  LEFT JOIN public.guild_poll_questions q ON q.poll_id = p.id
  LEFT JOIN public.guild_poll_responses r ON r.question_id = q.id
  WHERE (
    public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
    OR public.is_guild_gm(p.guild_id, auth.uid())
    OR (p.status = 'active' AND public.can_respond_to_poll(p.id, auth.uid()))
    OR public.can_view_poll_results(p.id, auth.uid())
  )
  GROUP BY p.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_response_counts(UUID[]) TO authenticated;
