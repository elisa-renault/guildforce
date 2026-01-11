-- Add region column to guilds table
ALTER TABLE public.guilds ADD COLUMN region text NOT NULL DEFAULT 'eu';

-- Create a unique constraint to prevent duplicate guilds in same region/server
CREATE UNIQUE INDEX idx_guilds_region_server_name ON public.guilds (region, server, name);

-- Add region to wow_guild_memberships for tracking
ALTER TABLE public.wow_guild_memberships ADD COLUMN guild_region text NOT NULL DEFAULT 'eu';