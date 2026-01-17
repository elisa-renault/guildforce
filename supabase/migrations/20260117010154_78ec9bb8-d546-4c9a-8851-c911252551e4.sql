-- Fix security issue: Restrict guilds table visibility to members and admins only
-- This replaces the overly permissive "Authenticated users can view guilds" policy

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view guilds" ON public.guilds;

-- Create new restrictive policy: Users can view guilds they are members of OR if they are admin
CREATE POLICY "Members and admins can view guilds"
ON public.guilds
FOR SELECT
TO authenticated
USING (
  is_guild_member(id, auth.uid()) OR 
  public.has_role(auth.uid(), 'admin')
);

-- Fix security issue: Restrict forum_moderators visibility
-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Moderators list is visible to authenticated users" ON public.forum_moderators;

-- Create new restrictive policy: Users can view moderators if:
-- 1. They are a member of the related guild (guild_id is NOT NULL and they are member)
-- 2. They are viewing global moderators (guild_id IS NULL) and are authenticated (for forum moderation visibility)
-- 3. They have admin or moderator role
CREATE POLICY "Moderators visible to guild members and privileged users"
ON public.forum_moderators
FOR SELECT
TO authenticated
USING (
  -- Guild-specific moderators: only visible to guild members
  (guild_id IS NOT NULL AND is_guild_member(guild_id, auth.uid()))
  OR 
  -- Global moderators: visible to admins/moderators only (to prevent targeting)
  (guild_id IS NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')))
  OR
  -- Admins and moderators can see all moderator entries
  public.has_role(auth.uid(), 'admin')
  OR
  public.has_role(auth.uid(), 'moderator')
);