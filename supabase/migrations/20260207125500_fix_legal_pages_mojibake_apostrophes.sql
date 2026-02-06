-- Fix mojibake apostrophes across legal pages.
BEGIN;

WITH target_pages AS (
  SELECT id
  FROM public.legal_pages
  WHERE slug IN ('legal-notice', 'terms-of-service', 'privacy-policy')
),
replacements AS (
  SELECT
    CHR(195) || CHR(162) || CHR(226) || CHR(8218) || CHR(172) || CHR(226) || CHR(8222) || CHR(162) AS double_mojibake_right,
    CHR(226) || CHR(8364) || CHR(153) AS mojibake_right,
    CHR(39) AS replacement
)
UPDATE public.legal_page_translations lpt
SET
  title = REPLACE(
    REPLACE(
      lpt.title,
      replacements.double_mojibake_right,
      replacements.replacement
    ),
    replacements.mojibake_right,
    replacements.replacement
  ),
  content = REPLACE(
    REPLACE(
      lpt.content,
      replacements.double_mojibake_right,
      replacements.replacement
    ),
    replacements.mojibake_right,
    replacements.replacement
  ),
  updated_at = now()
FROM replacements
WHERE lpt.legal_page_id IN (SELECT id FROM target_pages)
  AND (
    lpt.title LIKE '%' || replacements.double_mojibake_right || '%'
    OR lpt.title LIKE '%' || replacements.mojibake_right || '%'
    OR lpt.content LIKE '%' || replacements.double_mojibake_right || '%'
    OR lpt.content LIKE '%' || replacements.mojibake_right || '%'
  );

COMMIT;
