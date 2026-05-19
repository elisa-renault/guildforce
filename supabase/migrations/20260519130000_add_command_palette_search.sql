-- Global command palette search and account-level recents.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.command_palette_recent_items (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('action', 'page', 'guild', 'member', 'roster', 'poll', 'forum')),
  item_id TEXT NOT NULL,
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  href TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  use_count INTEGER NOT NULL DEFAULT 1 CHECK (use_count > 0),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_command_palette_recent_items_user_last_used
  ON public.command_palette_recent_items(user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_command_palette_recent_items_user_guild
  ON public.command_palette_recent_items(user_id, guild_id, last_used_at DESC)
  WHERE guild_id IS NOT NULL;

ALTER TABLE public.command_palette_recent_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own command palette recents"
  ON public.command_palette_recent_items;
CREATE POLICY "Users can view their own command palette recents"
ON public.command_palette_recent_items
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own command palette recents"
  ON public.command_palette_recent_items;
CREATE POLICY "Users can insert their own command palette recents"
ON public.command_palette_recent_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own command palette recents"
  ON public.command_palette_recent_items;
CREATE POLICY "Users can update their own command palette recents"
ON public.command_palette_recent_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own command palette recents"
  ON public.command_palette_recent_items;
CREATE POLICY "Users can delete their own command palette recents"
ON public.command_palette_recent_items
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_command_palette_recent_items_updated_at
  ON public.command_palette_recent_items;
CREATE TRIGGER update_command_palette_recent_items_updated_at
  BEFORE UPDATE ON public.command_palette_recent_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.record_command_palette_use(text, text, text, text, text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.record_command_palette_use(
  p_item_type TEXT,
  p_item_id TEXT,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_href TEXT DEFAULT NULL,
  p_guild_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_item_type NOT IN ('action', 'page', 'guild', 'member', 'roster', 'poll', 'forum') THEN
    RAISE EXCEPTION 'unsupported command palette item type: %', p_item_type;
  END IF;

  IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    RAISE EXCEPTION 'item id is required';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  IF p_guild_id IS NOT NULL
    AND NOT (
      public.is_guild_member(p_guild_id, v_user_id)
      OR public.is_guild_gm(p_guild_id, v_user_id)
      OR public.has_role(v_user_id, 'admin'::public.app_role)
    )
  THEN
    RAISE EXCEPTION 'not authorized for guild';
  END IF;

  INSERT INTO public.command_palette_recent_items (
    user_id,
    item_type,
    item_id,
    guild_id,
    title,
    subtitle,
    href,
    metadata,
    use_count,
    last_used_at
  )
  VALUES (
    v_user_id,
    p_item_type,
    p_item_id,
    p_guild_id,
    left(p_title, 180),
    NULLIF(left(COALESCE(p_subtitle, ''), 240), ''),
    NULLIF(left(COALESCE(p_href, ''), 500), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    1,
    timezone('utc', now())
  )
  ON CONFLICT (user_id, item_type, item_id)
  DO UPDATE SET
    guild_id = EXCLUDED.guild_id,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    href = EXCLUDED.href,
    metadata = EXCLUDED.metadata,
    use_count = public.command_palette_recent_items.use_count + 1,
    last_used_at = timezone('utc', now());
END;
$$;

REVOKE ALL ON FUNCTION public.record_command_palette_use(text, text, text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_command_palette_use(text, text, text, text, text, uuid, jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.search_command_palette(text, uuid, integer);
CREATE OR REPLACE FUNCTION public.search_command_palette(
  p_query TEXT,
  p_context_guild_id UUID DEFAULT NULL,
  p_limit_per_group INTEGER DEFAULT 6
)
RETURNS TABLE (
  result_type TEXT,
  result_id TEXT,
  guild_id UUID,
  title TEXT,
  subtitle TEXT,
  metadata JSONB,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_query TEXT;
  v_limit INTEGER;
BEGIN
  v_user_id := auth.uid();
  v_query := lower(btrim(COALESCE(p_query, '')));
  v_limit := LEAST(GREATEST(COALESCE(p_limit_per_group, 6), 1), 10);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF v_query = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
  accessible_guilds AS (
    SELECT g.*
    FROM public.guilds g
    WHERE public.is_guild_member(g.id, v_user_id)
      OR public.is_guild_gm(g.id, v_user_id)
      OR public.has_role(v_user_id, 'admin'::public.app_role)
  ),
  guild_matches AS (
    SELECT
      'guild'::text AS result_type,
      g.id::text AS result_id,
      g.id AS guild_id,
      g.name AS title,
      concat_ws(' - ', g.server, upper(COALESCE(g.region, 'eu'))) AS subtitle,
      jsonb_build_object(
        'name', g.name,
        'server', g.server,
        'region', COALESCE(g.region, 'eu'),
        'faction', g.faction,
        'avatar_url', g.avatar_url
      ) AS metadata,
      (
        CASE WHEN p_context_guild_id = g.id THEN 35 ELSE 0 END
        + CASE WHEN lower(g.name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(g.name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(g.name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + CASE WHEN lower(g.server) LIKE '%' || v_query || '%' THEN 18 ELSE 0 END
        + extensions.similarity(lower(g.name || ' ' || g.server), v_query) * 30
      )::numeric AS score
    FROM accessible_guilds g
    WHERE lower(g.name || ' ' || g.server || ' ' || COALESCE(g.region, '')) LIKE '%' || v_query || '%'
      OR extensions.similarity(lower(g.name || ' ' || g.server), v_query) > 0.18
    ORDER BY 7 DESC, g.name ASC
    LIMIT v_limit
  ),
  member_matches AS (
    SELECT
      'member'::text AS result_type,
      grc.id::text AS result_id,
      grc.guild_id,
      grc.character_name AS title,
      concat_ws(' - ', ag.name, COALESCE(p.username, grc.rank_name, 'member')) AS subtitle,
      jsonb_build_object(
        'guild_name', ag.name,
        'server', ag.server,
        'region', COALESCE(ag.region, 'eu'),
        'character_name', grc.character_name,
        'character_realm', grc.character_realm,
        'character_class_id', grc.character_class_id,
        'character_level', grc.character_level,
        'rank_index', grc.rank_index,
        'rank_name', grc.rank_name,
        'is_guild_master', COALESCE(grc.is_guild_master, false),
        'matched_user_id', grc.matched_user_id,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'is_main', COALESCE(wc.is_main, false),
        'is_linked', grc.matched_user_id IS NOT NULL
      ) AS metadata,
      (
        CASE WHEN p_context_guild_id = grc.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(grc.character_name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(grc.character_name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(grc.character_name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + CASE WHEN lower(COALESCE(p.username, '')) LIKE '%' || v_query || '%' THEN 24 ELSE 0 END
        + extensions.similarity(lower(grc.character_name || ' ' || COALESCE(p.username, '')), v_query) * 30
      )::numeric AS score
    FROM public.guild_roster_cache grc
    JOIN accessible_guilds ag ON ag.id = grc.guild_id
    LEFT JOIN public.profiles p ON p.id = grc.matched_user_id
    LEFT JOIN public.wow_characters wc ON wc.id = grc.matched_character_id
    WHERE lower(grc.character_name || ' ' || COALESCE(p.username, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
      OR extensions.similarity(lower(grc.character_name || ' ' || COALESCE(p.username, '')), v_query) > 0.18
    ORDER BY 7 DESC, grc.character_name ASC
    LIMIT v_limit
  ),
  roster_matches AS (
    SELECT
      'roster'::text AS result_type,
      r.id::text AS result_id,
      r.guild_id,
      r.name AS title,
      concat_ws(' - ', ag.name, COALESCE(r.description, 'roster')) AS subtitle,
      jsonb_build_object(
        'guild_name', ag.name,
        'server', ag.server,
        'region', COALESCE(ag.region, 'eu'),
        'name', r.name,
        'description', r.description,
        'is_default', r.is_default,
        'wishes_locked', r.wishes_locked
      ) AS metadata,
      (
        CASE WHEN p_context_guild_id = r.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(r.name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(r.name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(r.name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + extensions.similarity(lower(r.name || ' ' || COALESCE(r.description, '')), v_query) * 30
      )::numeric AS score
    FROM public.rosters r
    JOIN accessible_guilds ag ON ag.id = r.guild_id
    WHERE (
        public.has_roster_access(r.id, v_user_id)
        OR public.is_guild_gm(r.guild_id, v_user_id)
        OR public.has_role(v_user_id, 'admin'::public.app_role)
      )
      AND (
        lower(r.name || ' ' || COALESCE(r.description, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
        OR extensions.similarity(lower(r.name || ' ' || COALESCE(r.description, '')), v_query) > 0.18
      )
    ORDER BY 7 DESC, r.name ASC
    LIMIT v_limit
  ),
  poll_matches AS (
    SELECT
      'poll'::text AS result_type,
      gp.id::text AS result_id,
      gp.guild_id,
      gp.title,
      concat_ws(' - ', ag.name, gp.status::text) AS subtitle,
      jsonb_build_object(
        'guild_name', ag.name,
        'server', ag.server,
        'region', COALESCE(ag.region, 'eu'),
        'title', gp.title,
        'description', gp.description,
        'status', gp.status,
        'roster_id', gp.roster_id,
        'ends_at', gp.ends_at
      ) AS metadata,
      (
        CASE WHEN p_context_guild_id = gp.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(gp.title) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(gp.title) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(gp.title) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + extensions.similarity(lower(gp.title || ' ' || COALESCE(gp.description, '')), v_query) * 30
      )::numeric AS score
    FROM public.guild_polls gp
    JOIN accessible_guilds ag ON ag.id = gp.guild_id
    WHERE (
        public.is_guild_gm(gp.guild_id, v_user_id)
        OR public.has_guild_permission(gp.guild_id, v_user_id, 'manage_polls')
        OR (gp.status <> 'draft' AND public.can_respond_to_poll(gp.id, v_user_id))
        OR (gp.status <> 'draft' AND public.can_view_poll_results(gp.id, v_user_id))
      )
      AND (
        lower(gp.title || ' ' || COALESCE(gp.description, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
        OR extensions.similarity(lower(gp.title || ' ' || COALESCE(gp.description, '')), v_query) > 0.18
      )
    ORDER BY 7 DESC, gp.updated_at DESC
    LIMIT v_limit
  ),
  forum_matches AS (
    SELECT
      'forum'::text AS result_type,
      ft.id::text AS result_id,
      fc.guild_id,
      ft.title,
      concat_ws(' - ', fc.name, COALESCE(ag.name, 'Forum')) AS subtitle,
      jsonb_build_object(
        'category_id', fc.id,
        'category_name', fc.name,
        'category_slug', fc.slug,
        'guild_name', ag.name,
        'server', ag.server,
        'region', COALESCE(ag.region, 'eu'),
        'reply_count', ft.reply_count,
        'is_pinned', ft.is_pinned,
        'is_locked', ft.is_locked,
        'last_reply_at', ft.last_reply_at
      ) AS metadata,
      (
        CASE WHEN p_context_guild_id = fc.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(ft.title) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(ft.title) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(ft.title) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + extensions.similarity(lower(ft.title || ' ' || fc.name), v_query) * 30
      )::numeric AS score
    FROM public.forum_topics ft
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    LEFT JOIN accessible_guilds ag ON ag.id = fc.guild_id
    WHERE (
        fc.is_global
        OR fc.guild_id IS NULL
        OR ag.id IS NOT NULL
        OR public.has_role(v_user_id, 'admin'::public.app_role)
        OR public.has_role(v_user_id, 'moderator'::public.app_role)
      )
      AND (
        lower(ft.title || ' ' || fc.name) LIKE '%' || v_query || '%'
        OR extensions.similarity(lower(ft.title || ' ' || fc.name), v_query) > 0.18
      )
    ORDER BY 7 DESC, ft.last_reply_at DESC NULLS LAST, ft.created_at DESC
    LIMIT v_limit
  )
  SELECT * FROM guild_matches
  UNION ALL SELECT * FROM member_matches
  UNION ALL SELECT * FROM roster_matches
  UNION ALL SELECT * FROM poll_matches
  UNION ALL SELECT * FROM forum_matches
  ORDER BY 7 DESC, 4 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.search_command_palette(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_command_palette(text, uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.search_command_palette(text, uuid, integer)
  IS 'Searches accessible Guildforce command palette entities with explicit permission helper checks.';

COMMENT ON TABLE public.command_palette_recent_items
  IS 'Self-owned command palette recent items and action frequency metadata.';
