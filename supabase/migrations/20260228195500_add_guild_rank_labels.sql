CREATE TABLE public.guild_rank_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  rank_index INTEGER NOT NULL CHECK (rank_index >= 0),
  label TEXT NOT NULL CHECK (char_length(trim(label)) > 0 AND char_length(label) <= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  UNIQUE (guild_id, rank_index)
);

CREATE INDEX idx_guild_rank_labels_guild_id ON public.guild_rank_labels (guild_id);

CREATE TRIGGER update_guild_rank_labels_updated_at
BEFORE UPDATE ON public.guild_rank_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.guild_rank_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members can view guild rank labels"
ON public.guild_rank_labels
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()));

CREATE POLICY "Guild GMs can insert guild rank labels"
ON public.guild_rank_labels
FOR INSERT
WITH CHECK (public.is_guild_gm(guild_id, auth.uid()));

CREATE POLICY "Guild GMs can update guild rank labels"
ON public.guild_rank_labels
FOR UPDATE
USING (public.is_guild_gm(guild_id, auth.uid()))
WITH CHECK (public.is_guild_gm(guild_id, auth.uid()));

CREATE POLICY "Guild GMs can delete guild rank labels"
ON public.guild_rank_labels
FOR DELETE
USING (public.is_guild_gm(guild_id, auth.uid()));
