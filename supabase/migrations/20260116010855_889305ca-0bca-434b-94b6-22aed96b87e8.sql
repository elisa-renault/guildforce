-- Create a table to cache full guild roster from Blizzard API
CREATE TABLE public.guild_roster_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  character_realm text NOT NULL,
  character_realm_slug text NOT NULL,
  character_class_id integer NOT NULL,
  character_level integer NOT NULL DEFAULT 1,
  rank_index integer NOT NULL DEFAULT 99,
  rank_name text,
  is_guild_master boolean DEFAULT false,
  -- Link to Guildforce user if they exist (matched by character name + realm)
  matched_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  matched_character_id uuid REFERENCES public.wow_characters(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Unique constraint on guild + character
  UNIQUE(guild_id, character_name, character_realm_slug)
);

-- Enable RLS
ALTER TABLE public.guild_roster_cache ENABLE ROW LEVEL SECURITY;

-- Guild members can view the roster cache
CREATE POLICY "Guild members can view roster cache"
ON public.guild_roster_cache
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_roster_cache.guild_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'confirmed'
  )
);

-- GMs can manage roster cache
CREATE POLICY "GMs can manage roster cache"
ON public.guild_roster_cache
FOR ALL
USING (public.is_guild_owner_or_gm(guild_id))
WITH CHECK (public.is_guild_owner_or_gm(guild_id));

-- Create index for faster lookups
CREATE INDEX idx_guild_roster_cache_guild_id ON public.guild_roster_cache(guild_id);
CREATE INDEX idx_guild_roster_cache_matched_user ON public.guild_roster_cache(matched_user_id) WHERE matched_user_id IS NOT NULL;