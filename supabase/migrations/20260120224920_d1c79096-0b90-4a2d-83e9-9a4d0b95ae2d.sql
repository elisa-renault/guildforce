
-- Create a function to get guild member counts efficiently
CREATE OR REPLACE FUNCTION public.get_guild_member_counts(p_guild_ids uuid[])
RETURNS TABLE(
  guild_id uuid,
  total_count bigint,
  unique_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    grc.guild_id,
    COUNT(*) as total_count,
    COUNT(DISTINCT grc.matched_user_id) FILTER (WHERE grc.matched_user_id IS NOT NULL) as unique_users
  FROM public.guild_roster_cache grc
  WHERE grc.guild_id = ANY(p_guild_ids)
  GROUP BY grc.guild_id;
$$;
