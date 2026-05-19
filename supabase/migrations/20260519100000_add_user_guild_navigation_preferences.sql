-- Persist per-user guild switcher preferences without changing guild permissions.

CREATE TABLE IF NOT EXISTS public.user_guild_navigation_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  last_visited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_user_guild_navigation_preferences_recent
  ON public.user_guild_navigation_preferences(user_id, last_visited_at DESC)
  WHERE last_visited_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_guild_navigation_preferences_favorites
  ON public.user_guild_navigation_preferences(user_id, is_favorite)
  WHERE is_favorite = true;

ALTER TABLE public.user_guild_navigation_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own guild navigation preferences"
  ON public.user_guild_navigation_preferences;
CREATE POLICY "Users can view their own guild navigation preferences"
ON public.user_guild_navigation_preferences
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own guild navigation preferences"
  ON public.user_guild_navigation_preferences;
CREATE POLICY "Users can insert their own guild navigation preferences"
ON public.user_guild_navigation_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own guild navigation preferences"
  ON public.user_guild_navigation_preferences;
CREATE POLICY "Users can update their own guild navigation preferences"
ON public.user_guild_navigation_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own guild navigation preferences"
  ON public.user_guild_navigation_preferences;
CREATE POLICY "Users can delete their own guild navigation preferences"
ON public.user_guild_navigation_preferences
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_guild_navigation_preferences_updated_at
  ON public.user_guild_navigation_preferences;
CREATE TRIGGER update_user_guild_navigation_preferences_updated_at
  BEFORE UPDATE ON public.user_guild_navigation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
