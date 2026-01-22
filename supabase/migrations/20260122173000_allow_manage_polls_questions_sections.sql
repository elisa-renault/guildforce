-- Allow poll managers to view and manage poll questions
CREATE POLICY "Poll managers can manage questions"
ON public.guild_poll_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.guild_polls p
    WHERE p.id = guild_poll_questions.poll_id
    AND public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_polls p
    WHERE p.id = guild_poll_questions.poll_id
    AND public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
  )
);

-- Allow poll managers to view and manage poll sections
CREATE POLICY "Poll managers can manage sections"
ON public.guild_poll_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.guild_polls p
    WHERE p.id = guild_poll_sections.poll_id
    AND public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_polls p
    WHERE p.id = guild_poll_sections.poll_id
    AND public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
  )
);
