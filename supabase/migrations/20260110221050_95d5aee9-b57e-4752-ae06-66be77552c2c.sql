-- ============================================================
-- Remove invite_key functionality - everything now managed via Battle.net
-- ============================================================

-- Drop the RPC functions related to invite_key
DROP FUNCTION IF EXISTS public.get_guild_with_invite_key(_guild_id uuid);
DROP FUNCTION IF EXISTS public.can_view_guild_invite_key(_guild_id uuid);

-- Drop the public_guilds view if it exists
DROP VIEW IF EXISTS public.public_guilds;

-- Remove the invite_key column from guilds table
ALTER TABLE public.guilds DROP COLUMN IF EXISTS invite_key;