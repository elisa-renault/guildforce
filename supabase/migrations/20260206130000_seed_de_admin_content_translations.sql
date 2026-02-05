-- Seed German content rows for admin dynamic content tables.
-- Idempotent: inserts only when DE row is missing.

BEGIN;

INSERT INTO public.legal_page_translations (legal_page_id, language, title, content)
SELECT
  lp.id,
  'de'::text,
  COALESCE(
    CASE lp.slug
      WHEN 'legal-notice' THEN 'Impressum'
      WHEN 'privacy-policy' THEN 'Datenschutzerklaerung'
      WHEN 'terms-of-service' THEN 'Nutzungsbedingungen'
      ELSE NULL
    END,
    en.title,
    fr.title,
    lp.slug
  ) AS title,
  COALESCE(en.content, fr.content, '') AS content
FROM public.legal_pages lp
LEFT JOIN public.legal_page_translations de
  ON de.legal_page_id = lp.id AND de.language = 'de'
LEFT JOIN public.legal_page_translations en
  ON en.legal_page_id = lp.id AND en.language = 'en'
LEFT JOIN public.legal_page_translations fr
  ON fr.legal_page_id = lp.id AND fr.language = 'fr'
WHERE de.id IS NULL;

INSERT INTO public.patch_note_translations (patch_note_id, language, title, content)
SELECT
  pn.id,
  'de'::text,
  COALESCE(en.title, fr.title, CONCAT('Version ', pn.version)) AS title,
  COALESCE(en.content, fr.content, '') AS content
FROM public.patch_notes pn
LEFT JOIN public.patch_note_translations de
  ON de.patch_note_id = pn.id AND de.language = 'de'
LEFT JOIN public.patch_note_translations en
  ON en.patch_note_id = pn.id AND en.language = 'en'
LEFT JOIN public.patch_note_translations fr
  ON fr.patch_note_id = pn.id AND fr.language = 'fr'
WHERE de.id IS NULL;

COMMIT;
