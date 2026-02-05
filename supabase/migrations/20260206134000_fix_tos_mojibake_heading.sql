-- Fix mojibake artifacts in Terms of Service translations.
-- Handles known broken dash sequences in legal page markdown headings.

BEGIN;

WITH terms_page AS (
  SELECT id
  FROM public.legal_pages
  WHERE slug = 'terms-of-service'
),
replacements AS (
  SELECT
    CHR(195) || CHR(162) || CHR(226) || CHR(8218) || CHR(172) || CHR(226) || CHR(8364) || CHR(339) AS double_mojibake_dash,
    CHR(226) || CHR(8364) || CHR(8220) AS mojibake_dash,
    CHR(8211) AS en_dash
)
UPDATE public.legal_page_translations lpt
SET
  title = REPLACE(
    REPLACE(
      REPLACE(
        lpt.title,
        replacements.double_mojibake_dash,
        '-'
      ),
      replacements.mojibake_dash,
      '-'
    ),
    replacements.en_dash,
    '-'
  ),
  content = REPLACE(
    REPLACE(
      REPLACE(
        lpt.content,
        replacements.double_mojibake_dash,
        '-'
      ),
      replacements.mojibake_dash,
      '-'
    ),
    replacements.en_dash,
    '-'
  ),
  updated_at = now()
FROM replacements
WHERE lpt.legal_page_id IN (SELECT id FROM terms_page)
  AND (
    lpt.title LIKE '%' || replacements.double_mojibake_dash || '%'
    OR lpt.title LIKE '%' || replacements.mojibake_dash || '%'
    OR lpt.title LIKE '%' || replacements.en_dash || '%'
    OR lpt.content LIKE '%' || replacements.double_mojibake_dash || '%'
    OR lpt.content LIKE '%' || replacements.mojibake_dash || '%'
    OR lpt.content LIKE '%' || replacements.en_dash || '%'
  );

COMMIT;
