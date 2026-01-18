-- Add region column to battlenet_tokens table
ALTER TABLE public.battlenet_tokens 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'eu';

-- Add a comment explaining the column
COMMENT ON COLUMN public.battlenet_tokens.region IS 'Battle.net region used during OAuth connection (eu, us, kr, tw)';