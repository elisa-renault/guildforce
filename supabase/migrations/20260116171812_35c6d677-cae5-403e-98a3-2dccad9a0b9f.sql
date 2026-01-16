-- Create poll results access rules table
CREATE TABLE public.poll_results_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.guild_polls(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('rank_range', 'user')),
  min_rank_index INTEGER,
  max_rank_index INTEGER,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_rank_range CHECK (
    (access_type = 'rank_range' AND min_rank_index IS NOT NULL AND max_rank_index IS NOT NULL) OR
    (access_type = 'user' AND user_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.poll_results_access_rules ENABLE ROW LEVEL SECURITY;

-- Policies: Guild GMs can manage access rules
CREATE POLICY "GM can manage poll results access"
  ON public.poll_results_access_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = poll_results_access_rules.poll_id
      AND public.is_guild_gm(p.guild_id, auth.uid())
    )
  );

-- Poll managers can manage access rules (correct argument order)
CREATE POLICY "Poll manager can manage poll results access"
  ON public.poll_results_access_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = poll_results_access_rules.poll_id
      AND public.has_guild_permission(p.guild_id, auth.uid(), 'manage_polls')
    )
  );

-- Create function to check if user can view poll results
CREATE OR REPLACE FUNCTION public.can_view_poll_results(p_poll_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
  v_is_gm BOOLEAN;
  v_has_permission BOOLEAN;
  v_has_rules BOOLEAN;
  v_user_rank INTEGER;
BEGIN
  -- Get guild_id from poll
  SELECT guild_id INTO v_guild_id FROM guild_polls WHERE id = p_poll_id;
  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- GMs always see results
  SELECT is_guild_gm(v_guild_id, p_user_id) INTO v_is_gm;
  IF v_is_gm THEN
    RETURN TRUE;
  END IF;

  -- Users with manage_polls permission always see results
  SELECT has_guild_permission(v_guild_id, p_user_id, 'manage_polls') INTO v_has_permission;
  IF v_has_permission THEN
    RETURN TRUE;
  END IF;

  -- Check if there are any access rules for this poll
  SELECT EXISTS (
    SELECT 1 FROM poll_results_access_rules WHERE poll_id = p_poll_id
  ) INTO v_has_rules;

  -- If no rules exist, everyone in the guild can see results (default behavior)
  IF NOT v_has_rules THEN
    RETURN TRUE;
  END IF;

  -- Check if user has explicit access
  IF EXISTS (
    SELECT 1 FROM poll_results_access_rules 
    WHERE poll_id = p_poll_id AND access_type = 'user' AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Get user's rank in the guild
  SELECT rank_index INTO v_user_rank
  FROM wow_guild_memberships wgm
  JOIN guilds g ON (
    wgm.guild_name = g.name 
    AND wgm.guild_realm_slug = LOWER(REPLACE(g.server, ' ', '-'))
    AND wgm.guild_region = g.region
  )
  WHERE wgm.user_id = p_user_id AND g.id = v_guild_id
  LIMIT 1;

  IF v_user_rank IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user's rank falls within any rank range rule
  RETURN EXISTS (
    SELECT 1 FROM poll_results_access_rules
    WHERE poll_id = p_poll_id 
    AND access_type = 'rank_range'
    AND v_user_rank >= min_rank_index 
    AND v_user_rank <= max_rank_index
  );
END;
$$;