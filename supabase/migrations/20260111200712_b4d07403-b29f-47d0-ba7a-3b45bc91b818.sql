-- Create forum_reports table for reporting posts/topics
CREATE TABLE public.forum_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  CONSTRAINT report_target CHECK (post_id IS NOT NULL OR topic_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.forum_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.forum_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Admins and moderators can view all reports
CREATE POLICY "Admins can view all reports"
ON public.forum_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Admins and moderators can update reports
CREATE POLICY "Admins can update reports"
ON public.forum_reports
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Create index for faster queries
CREATE INDEX idx_forum_reports_status ON public.forum_reports(status);
CREATE INDEX idx_forum_reports_created_at ON public.forum_reports(created_at DESC);

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reports;