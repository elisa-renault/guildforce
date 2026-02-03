-- Normalize admin content localization into translation tables.
-- Scope: legal_pages + patch_notes

CREATE TABLE public.legal_page_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_page_id uuid NOT NULL REFERENCES public.legal_pages(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'fr', 'de', 'it', 'ru', 'zh-CN', 'ko')),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legal_page_id, language)
);

ALTER TABLE public.legal_page_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal page translations are publicly readable"
ON public.legal_page_translations
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage legal page translations"
ON public.legal_page_translations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_legal_page_translations_updated_at
  BEFORE UPDATE ON public.legal_page_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.patch_note_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_note_id uuid NOT NULL REFERENCES public.patch_notes(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'fr', 'de', 'it', 'ru', 'zh-CN', 'ko')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patch_note_id, language)
);

ALTER TABLE public.patch_note_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patch note translations are readable if parent note is visible"
ON public.patch_note_translations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.patch_notes pn
    WHERE pn.id = patch_note_id
      AND (
        pn.status = 'published'
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Admins can manage patch note translations"
ON public.patch_note_translations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_patch_note_translations_updated_at
  BEFORE UPDATE ON public.patch_note_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_page_translations (legal_page_id, language, title, content)
SELECT id, 'fr', title_fr, content_fr
FROM public.legal_pages
UNION ALL
SELECT id, 'en', title_en, content_en
FROM public.legal_pages
ON CONFLICT (legal_page_id, language)
DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();

INSERT INTO public.patch_note_translations (patch_note_id, language, title, content)
SELECT id, 'fr', title_fr, content_fr
FROM public.patch_notes
UNION ALL
SELECT id, 'en', title_en, content_en
FROM public.patch_notes
ON CONFLICT (patch_note_id, language)
DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();

ALTER TABLE public.legal_pages
  DROP COLUMN title_fr,
  DROP COLUMN title_en,
  DROP COLUMN content_fr,
  DROP COLUMN content_en;

ALTER TABLE public.patch_notes
  DROP COLUMN title_fr,
  DROP COLUMN title_en,
  DROP COLUMN content_fr,
  DROP COLUMN content_en;
