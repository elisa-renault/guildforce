-- ============================================================
-- CRITICAL FIX: Protect Battle.net tokens from co-members
-- ============================================================

-- Remove the policy that exposes tokens to co-members
DROP POLICY IF EXISTS "Guild members can view co-members profiles" ON public.profiles;

-- Create a separate table for sensitive tokens (not exposed via RLS)
CREATE TABLE IF NOT EXISTS public.battlenet_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  access_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS - only owner can access their tokens
ALTER TABLE public.battlenet_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tokens"
ON public.battlenet_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Migrate existing tokens to new table
INSERT INTO public.battlenet_tokens (user_id, access_token, expires_at)
SELECT id, battlenet_token, battlenet_token_expires_at
FROM public.profiles
WHERE battlenet_token IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

-- Remove sensitive columns from profiles table (keep battlenet_id and battletag as public info)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS battlenet_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS battlenet_token_expires_at;

-- Now create a safe policy for co-members to see public profile info
CREATE POLICY "Guild members can view co-members public profiles"
ON public.profiles
FOR SELECT
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see profiles of guild co-members
  EXISTS (
    SELECT 1 
    FROM public.guild_members gm1
    JOIN public.guild_members gm2 ON gm1.guild_id = gm2.guild_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = profiles.id
  )
);