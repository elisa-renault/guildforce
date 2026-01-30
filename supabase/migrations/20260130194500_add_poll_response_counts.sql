-- Allow guild members to view response counts without exposing results
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
    OR (
      (p.status = 'active' AND public.can_respond_to_poll(p.id, auth.uid()))
      OR (p.status = 'closed' AND public.is_guild_member(p.guild_id, auth.uid()))
    )
  )
  GROUP BY p.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_response_counts(UUID[]) TO authenticated;
