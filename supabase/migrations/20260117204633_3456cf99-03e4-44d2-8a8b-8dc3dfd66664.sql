-- Fix 1: Remove the public SELECT policy on guilds table
-- Keep only the member-based access policy for proper security
DROP POLICY IF EXISTS "Guilds are viewable by everyone" ON public.guilds;

-- Fix 2: For forum_moderators, ensure only the proper SELECT policy exists
-- The current policy seems correct but let me verify by recreating it properly
-- First drop any potentially conflicting policies and ensure proper access control

-- Verify forum_moderators has RLS enabled and proper restrictive policy
-- The current policy allows:
-- - Guild members to see guild moderators
-- - Admins/Moderators to see all moderators
-- This is correct - no changes needed for forum_moderators as the policy is already proper