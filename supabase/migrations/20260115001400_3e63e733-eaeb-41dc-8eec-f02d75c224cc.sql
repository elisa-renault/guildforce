-- Table for guild permissions
CREATE TABLE public.guild_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL, -- 'manage_wishes', 'manage_polls', 'manage_rosters', 'view_activity_log', 'manage_members'
  access_type TEXT NOT NULL, -- 'user' or 'rank'
  user_id UUID, -- If access_type = 'user'
  min_rank_index INTEGER DEFAULT 0, -- If access_type = 'rank' (always 0 = GM)
  max_rank_index INTEGER, -- If access_type = 'rank'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_access_type CHECK (access_type IN ('user', 'rank')),
  CONSTRAINT valid_permission_type CHECK (permission_type IN ('manage_wishes', 'manage_polls', 'manage_rosters', 'view_activity_log', 'manage_members')),
  CONSTRAINT user_rule_requires_user_id CHECK (access_type != 'user' OR user_id IS NOT NULL),
  CONSTRAINT rank_rule_requires_max_rank CHECK (access_type != 'rank' OR max_rank_index IS NOT NULL)
);

-- Index for faster lookups
CREATE INDEX idx_guild_permissions_guild_id ON public.guild_permissions(guild_id);
CREATE INDEX idx_guild_permissions_user_id ON public.guild_permissions(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.guild_permissions ENABLE ROW LEVEL SECURITY;

-- Only GMs can manage permissions
CREATE POLICY "GMs can manage guild permissions"
ON public.guild_permissions
FOR ALL
USING (public.is_guild_gm(guild_id, auth.uid()))
WITH CHECK (public.is_guild_gm(guild_id, auth.uid()));

-- Guild members can view permissions (to know what they can do)
CREATE POLICY "Guild members can view permissions"
ON public.guild_permissions
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()));

-- Function to check if a user has a specific guild permission
CREATE OR REPLACE FUNCTION public.has_guild_permission(
  p_guild_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- GMs always have all permissions
    public.is_guild_gm(p_guild_id, p_user_id)
    OR
    -- Check user-specific permission
    EXISTS (
      SELECT 1 FROM public.guild_permissions
      WHERE guild_id = p_guild_id
        AND permission_type = p_permission
        AND access_type = 'user'
        AND user_id = p_user_id
    )
    OR
    -- Check rank-based permission
    EXISTS (
      SELECT 1 FROM public.guild_permissions gp
      JOIN public.guilds g ON g.id = gp.guild_id
      JOIN public.wow_guild_memberships wgm ON 
        wgm.user_id = p_user_id
        AND LOWER(wgm.guild_name) = LOWER(g.name)
        AND LOWER(wgm.guild_realm) = LOWER(g.server)
        AND UPPER(wgm.guild_region) = UPPER(g.region)
      WHERE gp.guild_id = p_guild_id
        AND gp.permission_type = p_permission
        AND gp.access_type = 'rank'
        AND wgm.rank_index >= gp.min_rank_index
        AND wgm.rank_index <= gp.max_rank_index
    )
$$;

-- Update class_wishes RLS to use the new permission for validation
DROP POLICY IF EXISTS "GMs can update wishes for validation" ON public.class_wishes;
CREATE POLICY "Users with manage_wishes permission can update wishes"
ON public.class_wishes
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  user_id = auth.uid() 
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

-- Update guild_polls RLS to use the new permission
DROP POLICY IF EXISTS "GMs can manage polls" ON public.guild_polls;
CREATE POLICY "Users with manage_polls permission can manage polls"
ON public.guild_polls
FOR ALL
USING (public.has_guild_permission(guild_id, auth.uid(), 'manage_polls'))
WITH CHECK (public.has_guild_permission(guild_id, auth.uid(), 'manage_polls'));

-- Update rosters RLS to use the new permission
DROP POLICY IF EXISTS "Guild owners and GMs can manage rosters" ON public.rosters;
CREATE POLICY "Users with manage_rosters permission can manage rosters"
ON public.rosters
FOR ALL
USING (public.has_guild_permission(guild_id, auth.uid(), 'manage_rosters'))
WITH CHECK (public.has_guild_permission(guild_id, auth.uid(), 'manage_rosters'));

-- Update guild_members RLS to use the new permission for managing members
DROP POLICY IF EXISTS "GMs can update member commitment" ON public.guild_members;
CREATE POLICY "Users with manage_members permission can update members"
ON public.guild_members
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_members')
)
WITH CHECK (
  user_id = auth.uid() 
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_members')
);

-- Update guild_activity_logs RLS to use the new permission
DROP POLICY IF EXISTS "GMs can view guild activity" ON public.guild_activity_logs;
CREATE POLICY "Users with view_activity_log permission can view logs"
ON public.guild_activity_logs
FOR SELECT
USING (public.has_guild_permission(guild_id, auth.uid(), 'view_activity_log'));