-- Create notifications table
CREATE TABLE public.forum_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'topic_reply', 'post_reply')),
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_forum_notifications_user_id ON public.forum_notifications(user_id);
CREATE INDEX idx_forum_notifications_is_read ON public.forum_notifications(user_id, is_read);
CREATE INDEX idx_forum_notifications_created_at ON public.forum_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.forum_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.forum_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.forum_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.forum_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via service role or triggers)
CREATE POLICY "System can insert notifications"
ON public.forum_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_notifications;

-- Function to create notifications for topic replies (notifies topic author)
CREATE OR REPLACE FUNCTION public.notify_topic_author()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify topic author if they are not the post author
  INSERT INTO public.forum_notifications (user_id, type, topic_id, post_id, triggered_by)
  SELECT t.author_id, 'topic_reply', NEW.topic_id, NEW.id, NEW.author_id
  FROM public.forum_topics t
  WHERE t.id = NEW.topic_id
    AND t.author_id != NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notifications for participants (users who replied to the topic)
CREATE OR REPLACE FUNCTION public.notify_topic_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Get topic author to exclude them (they already get notified by notify_topic_author)
  -- Notify all unique participants who previously replied to this topic
  INSERT INTO public.forum_notifications (user_id, type, topic_id, post_id, triggered_by)
  SELECT DISTINCT p.author_id, 'post_reply', NEW.topic_id, NEW.id, NEW.author_id
  FROM public.forum_posts p
  JOIN public.forum_topics t ON t.id = NEW.topic_id
  WHERE p.topic_id = NEW.topic_id
    AND p.author_id != NEW.author_id  -- Don't notify the post author
    AND p.author_id != t.author_id    -- Don't notify topic author (already notified)
    AND p.id != NEW.id;               -- Exclude the new post itself
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for topic author notification
CREATE TRIGGER trigger_notify_topic_author
AFTER INSERT ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_topic_author();

-- Trigger for participants notification
CREATE TRIGGER trigger_notify_topic_participants
AFTER INSERT ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_topic_participants();