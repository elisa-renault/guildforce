-- Fix can_view_poll_results to use consistent matching and best (lowest) rank
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

  -- Get user's best rank in the guild (lowest rank_index = highest rank)
  SELECT MIN(wgm.rank_index) INTO v_user_rank
  FROM wow_guild_memberships wgm
  JOIN guilds g ON (
    LOWER(g.name) = LOWER(wgm.guild_name)
    AND LOWER(g.server) = LOWER(wgm.guild_realm_slug)
    AND LOWER(g.region) = LOWER(wgm.guild_region)
  )
  WHERE wgm.user_id = p_user_id AND g.id = v_guild_id;

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
