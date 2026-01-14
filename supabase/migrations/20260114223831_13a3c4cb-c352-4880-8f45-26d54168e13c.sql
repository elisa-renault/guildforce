-- Create enum for sanction types
CREATE TYPE public.forum_sanction_type AS ENUM ('timeout', 'ban');

-- Create table for user sanctions
CREATE TABLE public.forum_user_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sanction_type forum_sanction_type NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.forum_user_sanctions ENABLE ROW LEVEL SECURITY;

-- Everyone can view active sanctions (to check if someone is banned)
CREATE POLICY "Anyone can view sanctions"
ON public.forum_user_sanctions
FOR SELECT
TO authenticated
USING (true);

-- Only admins and moderators can create sanctions
CREATE POLICY "Admins and moderators can create sanctions"
ON public.forum_user_sanctions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Only admins and moderators can update sanctions (to revoke them)
CREATE POLICY "Admins and moderators can update sanctions"
ON public.forum_user_sanctions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Create index for quick lookups
CREATE INDEX idx_forum_user_sanctions_user_active 
ON public.forum_user_sanctions(user_id, is_active) 
WHERE is_active = true;

-- Create function to check if user is sanctioned
CREATE OR REPLACE FUNCTION public.is_user_forum_sanctioned(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.forum_user_sanctions
    WHERE user_id = p_user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create function to get active sanction details
CREATE OR REPLACE FUNCTION public.get_user_forum_sanction(p_user_id UUID)
RETURNS TABLE(
  sanction_type forum_sanction_type,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sanction_type, reason, expires_at, created_at
  FROM public.forum_user_sanctions
  WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
$$;