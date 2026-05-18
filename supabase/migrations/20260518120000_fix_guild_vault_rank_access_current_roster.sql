-- Rank-based guild vault access must follow the current synced guild roster.
-- `wow_guild_memberships` can retain user-owned character membership rows that
-- no longer represent the user's effective rank in a specific guild roster.

CREATE OR REPLACE FUNCTION public.can_access_guild_secret(
  p_secret_id UUID,
  p_user_id UUID,
  p_capability TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_capability NOT IN ('metadata', 'reveal', 'manage', 'audit') THEN
    RETURN FALSE;
  END IF;

  SELECT guild_id
  INTO v_guild_id
  FROM public.guild_secrets
  WHERE id = p_secret_id;

  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_guild_gm(v_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.has_guild_permission(v_guild_id, p_user_id, 'manage_vault') THEN
    RETURN TRUE;
  END IF;

  IF p_capability = 'audit'
    AND public.has_guild_permission(v_guild_id, p_user_id, 'view_vault_audit')
  THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.guild_secret_access_rules r
    WHERE r.secret_id = p_secret_id
      AND r.capability = p_capability
      AND (
        (r.access_type = 'user' AND r.user_id = p_user_id)
        OR
        (
          r.access_type = 'rank'
          AND EXISTS (
            SELECT 1
            FROM public.guild_roster_cache grc
            WHERE grc.guild_id = v_guild_id
              AND grc.matched_user_id = p_user_id
              AND grc.rank_index >= COALESCE(r.min_rank_index, 0)
              AND grc.rank_index <= r.max_rank_index
          )
        )
      )
  );
END;
$$;
