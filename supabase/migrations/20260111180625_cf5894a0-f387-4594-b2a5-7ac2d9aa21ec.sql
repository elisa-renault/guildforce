-- Forum Categories
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_category_slug_per_scope UNIQUE (slug, guild_id)
);

-- Forum Topics
CREATE TABLE public.forum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum Posts (replies)
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  quoted_post_id UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum Reactions
CREATE TABLE public.forum_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT one_reaction_per_item CHECK (
    (topic_id IS NOT NULL AND post_id IS NULL) OR 
    (topic_id IS NULL AND post_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_topic_reaction UNIQUE (user_id, topic_id, reaction_type),
  CONSTRAINT unique_user_post_reaction UNIQUE (user_id, post_id, reaction_type)
);

-- Forum Moderators (for guild forums)
CREATE TABLE public.forum_moderators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  is_global_mod BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_moderator UNIQUE (user_id, category_id, guild_id)
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_moderators ENABLE ROW LEVEL SECURITY;

-- Categories: visible to authenticated users (global) or guild members (guild-specific)
CREATE POLICY "Global categories are visible to all authenticated users"
ON public.forum_categories FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_global = true OR 
    guild_id IS NULL OR
    is_guild_member(guild_id, auth.uid())
  )
);

CREATE POLICY "Moderators can manage categories"
ON public.forum_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.forum_moderators 
    WHERE user_id = auth.uid() AND (is_global_mod = true OR guild_id = forum_categories.guild_id)
  ) OR
  (guild_id IS NOT NULL AND is_guild_gm(guild_id, auth.uid()))
);

-- Topics: visible based on category access
CREATE POLICY "Topics are visible based on category access"
ON public.forum_topics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_categories c
    WHERE c.id = category_id AND (
      c.is_global = true OR 
      c.guild_id IS NULL OR
      is_guild_member(c.guild_id, auth.uid())
    )
  )
);

CREATE POLICY "Authenticated users can create topics"
ON public.forum_topics FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.forum_categories c
    WHERE c.id = category_id AND (
      c.is_global = true OR 
      c.guild_id IS NULL OR
      is_guild_member(c.guild_id, auth.uid())
    )
  )
);

CREATE POLICY "Authors can update their topics"
ON public.forum_topics FOR UPDATE
USING (auth.uid() = author_id OR EXISTS (
  SELECT 1 FROM public.forum_moderators m
  JOIN public.forum_categories c ON c.id = category_id
  WHERE m.user_id = auth.uid() AND (m.is_global_mod = true OR m.guild_id = c.guild_id)
));

CREATE POLICY "Authors and moderators can delete topics"
ON public.forum_topics FOR DELETE
USING (auth.uid() = author_id OR EXISTS (
  SELECT 1 FROM public.forum_moderators m
  JOIN public.forum_categories c ON c.id = category_id
  WHERE m.user_id = auth.uid() AND (m.is_global_mod = true OR m.guild_id = c.guild_id)
));

-- Posts: similar to topics
CREATE POLICY "Posts are visible based on topic access"
ON public.forum_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_topics t
    JOIN public.forum_categories c ON c.id = t.category_id
    WHERE t.id = topic_id AND (
      c.is_global = true OR 
      c.guild_id IS NULL OR
      is_guild_member(c.guild_id, auth.uid())
    )
  )
);

CREATE POLICY "Authenticated users can create posts"
ON public.forum_posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.forum_topics t
    WHERE t.id = topic_id AND t.is_locked = false
  )
);

CREATE POLICY "Authors can update their posts"
ON public.forum_posts FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors and moderators can delete posts"
ON public.forum_posts FOR DELETE
USING (auth.uid() = author_id OR EXISTS (
  SELECT 1 FROM public.forum_topics t
  JOIN public.forum_categories c ON c.id = t.category_id
  JOIN public.forum_moderators m ON m.guild_id = c.guild_id OR m.is_global_mod = true
  WHERE t.id = topic_id AND m.user_id = auth.uid()
));

-- Reactions
CREATE POLICY "Reactions are visible to all"
ON public.forum_reactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their reactions"
ON public.forum_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reactions"
ON public.forum_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Moderators
CREATE POLICY "Moderators list is visible to authenticated users"
ON public.forum_moderators FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "GMs can manage guild moderators"
ON public.forum_moderators FOR ALL
USING (
  (guild_id IS NOT NULL AND is_guild_gm(guild_id, auth.uid())) OR
  is_global_mod = true
);

-- Function to update topic stats
CREATE OR REPLACE FUNCTION public.update_topic_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics 
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        last_reply_by = NEW.author_id,
        updated_at = now()
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics 
    SET reply_count = GREATEST(0, reply_count - 1),
        updated_at = now()
    WHERE id = OLD.topic_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for reply stats
CREATE TRIGGER on_forum_post_change
AFTER INSERT OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_topic_reply_stats();

-- Enable realtime for topics and posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;

-- Indexes for performance
CREATE INDEX idx_forum_topics_category ON public.forum_topics(category_id);
CREATE INDEX idx_forum_topics_author ON public.forum_topics(author_id);
CREATE INDEX idx_forum_topics_last_reply ON public.forum_topics(last_reply_at DESC);
CREATE INDEX idx_forum_posts_topic ON public.forum_posts(topic_id);
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_reactions_topic ON public.forum_reactions(topic_id);
CREATE INDEX idx_forum_reactions_post ON public.forum_reactions(post_id);
CREATE INDEX idx_forum_categories_guild ON public.forum_categories(guild_id);
CREATE INDEX idx_forum_categories_global ON public.forum_categories(is_global) WHERE is_global = true;