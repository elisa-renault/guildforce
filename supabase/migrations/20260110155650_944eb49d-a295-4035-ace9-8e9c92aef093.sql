-- Fix class_wishes SELECT policy to be PERMISSIVE instead of RESTRICTIVE
-- This allows guild members to view each other's wishes

DROP POLICY IF EXISTS "Wishes viewable by guild members" ON class_wishes;

CREATE POLICY "Wishes viewable by guild members"
ON class_wishes
FOR SELECT
USING (is_guild_member(guild_id, auth.uid()));