-- Create table for WoW guild memberships (linking characters to guilds with ranks)
CREATE TABLE public.wow_guild_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  character_id UUID REFERENCES public.wow_characters(id) ON DELETE CASCADE,
  -- Guild info from Battle.net
  guild_name TEXT NOT NULL,
  guild_realm TEXT NOT NULL,
  guild_realm_slug TEXT NOT NULL,
  guild_faction TEXT NOT NULL DEFAULT 'UNKNOWN',
  -- Rank info: 0 = Guild Master, higher = lower rank
  rank_index INTEGER NOT NULL DEFAULT 99,
  rank_name TEXT,
  -- Is this user the guild master?
  is_guild_master BOOLEAN GENERATED ALWAYS AS (rank_index = 0) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one character can only be in one guild
  UNIQUE(character_id)
);

-- Enable RLS
ALTER TABLE public.wow_guild_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view their own guild memberships
CREATE POLICY "Users can view their own guild memberships"
ON public.wow_guild_memberships
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own guild memberships (via edge function with service role)
CREATE POLICY "Users can insert their own guild memberships"
ON public.wow_guild_memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own guild memberships
CREATE POLICY "Users can update their own guild memberships"
ON public.wow_guild_memberships
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own guild memberships
CREATE POLICY "Users can delete their own guild memberships"
ON public.wow_guild_memberships
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_wow_guild_memberships_updated_at
BEFORE UPDATE ON public.wow_guild_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_wow_guild_memberships_user_id ON public.wow_guild_memberships(user_id);
CREATE INDEX idx_wow_guild_memberships_guild_name_realm ON public.wow_guild_memberships(guild_name, guild_realm_slug);