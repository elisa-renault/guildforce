-- Table pour les rapports de bugs
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'ui', 'performance', 'feature', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'wontfix')),
  
  -- Logs automatiques
  console_logs JSONB DEFAULT '[]',
  browser_info JSONB DEFAULT '{}',
  user_context JSONB DEFAULT '{}',
  current_url TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT
);

-- Indexes pour les performances
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_priority ON public.bug_reports(priority);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

-- Activer RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Politique : Tous peuvent créer un rapport (même non connectés via anon key)
CREATE POLICY "Anyone can create bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (true);

-- Politique : Seuls les admins/modérateurs peuvent voir les rapports
CREATE POLICY "Admins and moderators can view bug reports"
  ON public.bug_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Politique : Seuls les admins/modérateurs peuvent modifier les rapports
CREATE POLICY "Admins and moderators can update bug reports"
  ON public.bug_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Politique : Seuls les admins peuvent supprimer les rapports
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));