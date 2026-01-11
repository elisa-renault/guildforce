-- Create topic subscriptions table
CREATE TABLE public.forum_topic_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  notify_replies BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Create indexes
CREATE INDEX idx_forum_topic_subscriptions_user ON public.forum_topic_subscriptions(user_id);
CREATE INDEX idx_forum_topic_subscriptions_topic ON public.forum_topic_subscriptions(topic_id);

-- Enable RLS
ALTER TABLE public.forum_topic_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.forum_topic_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
ON public.forum_topic_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.forum_topic_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.forum_topic_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Auto-subscribe topic author when creating a topic
CREATE OR REPLACE FUNCTION public.auto_subscribe_topic_author()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.forum_topic_subscriptions (user_id, topic_id, notify_replies)
  VALUES (NEW.author_id, NEW.id, true)
  ON CONFLICT (user_id, topic_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_subscribe_topic_author
AFTER INSERT ON public.forum_topics
FOR EACH ROW
EXECUTE FUNCTION public.auto_subscribe_topic_author();

-- Auto-subscribe when replying to a topic (if not already subscribed)
CREATE OR REPLACE FUNCTION public.auto_subscribe_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.forum_topic_subscriptions (user_id, topic_id, notify_replies)
  VALUES (NEW.author_id, NEW.topic_id, true)
  ON CONFLICT (user_id, topic_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_subscribe_on_reply
AFTER INSERT ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.auto_subscribe_on_reply();

-- Update notification triggers to respect subscription preferences
-- Replace notify_topic_author to check subscription
CREATE OR REPLACE FUNCTION public.notify_topic_author()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify topic author if they are subscribed and not the post author
  INSERT INTO public.forum_notifications (user_id, type, topic_id, post_id, triggered_by)
  SELECT t.author_id, 'topic_reply', NEW.topic_id, NEW.id, NEW.author_id
  FROM public.forum_topics t
  LEFT JOIN public.forum_topic_subscriptions s 
    ON s.topic_id = NEW.topic_id AND s.user_id = t.author_id
  WHERE t.id = NEW.topic_id
    AND t.author_id != NEW.author_id
    AND (s.notify_replies IS NULL OR s.notify_replies = true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace notify_topic_participants to check subscription
CREATE OR REPLACE FUNCTION public.notify_topic_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all subscribed participants who previously replied to this topic
  INSERT INTO public.forum_notifications (user_id, type, topic_id, post_id, triggered_by)
  SELECT DISTINCT s.user_id, 'post_reply', NEW.topic_id, NEW.id, NEW.author_id
  FROM public.forum_topic_subscriptions s
  JOIN public.forum_topics t ON t.id = NEW.topic_id
  WHERE s.topic_id = NEW.topic_id
    AND s.notify_replies = true
    AND s.user_id != NEW.author_id  -- Don't notify the post author
    AND s.user_id != t.author_id;   -- Don't notify topic author (already notified)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;