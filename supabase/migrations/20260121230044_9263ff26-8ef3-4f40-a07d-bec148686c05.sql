-- Create poll respondent access rules table
-- This controls WHO can respond to a poll (different from roster targeting)
CREATE TABLE public.poll_respondent_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.guild_polls(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('rank_range', 'user')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  min_rank_index INTEGER,
  max_rank_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poll_respondent_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Guild managers can manage respondent rules
CREATE POLICY "Poll managers can manage respondent rules"
ON public.poll_respondent_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM guild_polls gp 
    WHERE gp.id = poll_respondent_rules.poll_id 
    AND public.has_guild_permission(gp.guild_id, auth.uid(), 'manage_polls')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guild_polls gp 
    WHERE gp.id = poll_respondent_rules.poll_id 
    AND public.has_guild_permission(gp.guild_id, auth.uid(), 'manage_polls')
  )
);

-- Policy: Guild members can read rules to check their access
CREATE POLICY "Guild members can view respondent rules"
ON public.poll_respondent_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guild_polls gp
    JOIN guilds g ON g.id = gp.guild_id
    WHERE gp.id = poll_respondent_rules.poll_id
    AND public.is_guild_member(g.id, auth.uid())
  )
);

-- Function to check if a user can respond to a poll
CREATE OR REPLACE FUNCTION public.can_respond_to_poll(p_poll_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
  v_roster_id UUID;
  v_has_rules BOOLEAN;
  v_user_rank INTEGER;
BEGIN
  -- Get poll info
  SELECT guild_id, roster_id INTO v_guild_id, v_roster_id 
  FROM guild_polls WHERE id = p_poll_id;
  
  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Must be guild member first
  IF NOT public.is_guild_member(v_guild_id, p_user_id) THEN
    RETURN FALSE;
  END IF;

  -- Check roster access if roster is specified
  IF v_roster_id IS NOT NULL THEN
    IF NOT public.has_roster_access(v_roster_id, p_user_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if there are respondent rules
  SELECT EXISTS(SELECT 1 FROM poll_respondent_rules WHERE poll_id = p_poll_id) INTO v_has_rules;
  
  -- If no rules, all guild members (with roster access if applicable) can respond
  IF NOT v_has_rules THEN
    RETURN TRUE;
  END IF;

  -- Check user-specific access
  IF EXISTS (
    SELECT 1 FROM poll_respondent_rules 
    WHERE poll_id = p_poll_id 
    AND access_type = 'user' 
    AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check rank-based access
  SELECT MIN(wgm.rank_index) INTO v_user_rank
  FROM wow_guild_memberships wgm
  JOIN guilds g ON (
    g.id = v_guild_id 
    AND LOWER(g.name) = LOWER(wgm.guild_name)
    AND LOWER(g.server) = LOWER(wgm.guild_realm_slug)
    AND LOWER(g.region) = LOWER(wgm.guild_region)
  )
  WHERE wgm.user_id = p_user_id;

  IF v_user_rank IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM poll_respondent_rules 
      WHERE poll_id = p_poll_id 
      AND access_type = 'rank_range'
      AND v_user_rank >= COALESCE(min_rank_index, 0)
      AND v_user_rank <= COALESCE(max_rank_index, 999)
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Create index for performance
CREATE INDEX idx_poll_respondent_rules_poll_id ON public.poll_respondent_rules(poll_id);