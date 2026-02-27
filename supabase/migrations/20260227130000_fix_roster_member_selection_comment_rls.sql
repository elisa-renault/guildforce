-- Prevent direct table SELECT from exposing manager-only decision comments.
-- Non-managers must read via get_roster_member_selection(), which masks comment.

DROP POLICY IF EXISTS "Guild members can view roster member selection" ON public.roster_member_selection;

CREATE POLICY "Wish managers can view roster member selection"
ON public.roster_member_selection
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rosters r
    WHERE r.id = roster_member_selection.roster_id
      AND (
        public.is_guild_gm(r.guild_id, auth.uid())
        OR public.has_guild_permission(r.guild_id, auth.uid(), 'manage_wishes')
      )
  )
);
