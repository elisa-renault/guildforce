-- Drop existing update policy
DROP POLICY IF EXISTS "Authors can update their topics" ON public.forum_topics;

-- Create new update policy that includes admins and moderators from user_roles
CREATE POLICY "Authors and moderators can update topics"
ON public.forum_topics FOR UPDATE
USING (
  auth.uid() = author_id 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.forum_moderators m
    JOIN public.forum_categories c ON c.id = category_id
    WHERE m.user_id = auth.uid() AND (m.is_global_mod = true OR m.guild_id = c.guild_id)
  )
);