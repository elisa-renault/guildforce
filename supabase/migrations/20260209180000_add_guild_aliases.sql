-- Add guild aliases to support safe routing and manual rename reconciliation
CREATE TABLE IF NOT EXISTS public.guild_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  old_name text NOT NULL,
  server text NOT NULL,
  region text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(region, server, old_name)
);

ALTER TABLE public.guild_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild aliases are viewable by everyone"
ON public.guild_aliases
FOR SELECT
USING (true);

CREATE POLICY "Guild owner or GM can insert aliases"
ON public.guild_aliases
FOR INSERT
WITH CHECK (public.is_guild_owner_or_gm(guild_id));

CREATE POLICY "Guild owner or GM can update aliases"
ON public.guild_aliases
FOR UPDATE
USING (public.is_guild_owner_or_gm(guild_id))
WITH CHECK (public.is_guild_owner_or_gm(guild_id));

CREATE POLICY "Guild owner or GM can delete aliases"
ON public.guild_aliases
FOR DELETE
USING (public.is_guild_owner_or_gm(guild_id));

CREATE INDEX IF NOT EXISTS idx_guild_aliases_lookup
  ON public.guild_aliases(region, server, old_name);

CREATE INDEX IF NOT EXISTS idx_guild_aliases_guild_id
  ON public.guild_aliases(guild_id);

