-- Add officer_rank_threshold column to guilds table
-- This defines the minimum rank index that is considered "officer" (e.g., 3 means ranks 0-3 are officers)
ALTER TABLE public.guilds ADD COLUMN officer_rank_threshold integer NOT NULL DEFAULT 2;

-- Add comment for documentation
COMMENT ON COLUMN public.guilds.officer_rank_threshold IS 'Minimum rank index considered as officer (0 = GM only, 1 = GM + rank 1, etc.)';