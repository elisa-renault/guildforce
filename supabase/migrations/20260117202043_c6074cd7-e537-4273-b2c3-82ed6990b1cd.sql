-- Table for patch notes / changelog
CREATE TABLE public.patch_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_fr TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.patch_notes ENABLE ROW LEVEL SECURITY;

-- Public can read published notes only
CREATE POLICY "Public can read published patch notes"
  ON public.patch_notes FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage patch notes"
  ON public.patch_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for sorting by publication date
CREATE INDEX idx_patch_notes_published_at ON public.patch_notes(published_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_patch_notes_updated_at
  BEFORE UPDATE ON public.patch_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();