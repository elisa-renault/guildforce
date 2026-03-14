-- Backfill orphan guild ownership from guild_roster_cache when Blizzard roster
-- already identifies a unique matched Guild Master for the guild.

WITH gm_candidates AS (
  SELECT
    grc.guild_id,
    grc.matched_user_id AS user_id
  FROM public.guild_roster_cache grc
  JOIN public.guilds g
    ON g.id = grc.guild_id
  WHERE g.owner_id IS NULL
    AND grc.is_guild_master IS TRUE
    AND grc.matched_user_id IS NOT NULL
  GROUP BY grc.guild_id, grc.matched_user_id
),
unique_gm_candidates AS (
  SELECT
    guild_id,
    min(user_id::text)::uuid AS user_id
  FROM gm_candidates
  GROUP BY guild_id
  HAVING count(*) = 1
),
claimed_guilds AS (
  UPDATE public.guilds g
  SET owner_id = ug.user_id
  FROM unique_gm_candidates ug
  WHERE g.id = ug.guild_id
    AND g.owner_id IS NULL
  RETURNING g.id, ug.user_id
)
INSERT INTO public.guild_members (guild_id, user_id, role, status)
SELECT
  claimed_guilds.id,
  claimed_guilds.user_id,
  'gm',
  'confirmed'
FROM claimed_guilds
ON CONFLICT (guild_id, user_id) DO UPDATE
SET
  role = 'gm',
  status = 'confirmed';
