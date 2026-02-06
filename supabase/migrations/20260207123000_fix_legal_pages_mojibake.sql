-- Fix mojibake registered trademark symbols across legal pages.
BEGIN;

WITH target_pages AS (
  SELECT id
  FROM public.legal_pages
  WHERE slug IN ('legal-notice', 'terms-of-service', 'privacy-policy')
),
replacements AS (
  SELECT
    CHR(195) || CHR(8218) || CHR(194) || CHR(174) AS double_mojibake_reg,
    CHR(194) || CHR(174) AS mojibake_reg,
    CHR(174) AS registered_symbol
)
UPDATE public.legal_page_translations lpt
SET
  title = REPLACE(
    REPLACE(
      lpt.title,
      replacements.double_mojibake_reg,
      replacements.registered_symbol
    ),
    replacements.mojibake_reg,
    replacements.registered_symbol
  ),
  content = REPLACE(
    REPLACE(
      lpt.content,
      replacements.double_mojibake_reg,
      replacements.registered_symbol
    ),
    replacements.mojibake_reg,
    replacements.registered_symbol
  ),
  updated_at = now()
FROM replacements
WHERE lpt.legal_page_id IN (SELECT id FROM target_pages)
  AND (
    lpt.title LIKE '%' || replacements.double_mojibake_reg || '%'
    OR lpt.title LIKE '%' || replacements.mojibake_reg || '%'
    OR lpt.content LIKE '%' || replacements.double_mojibake_reg || '%'
    OR lpt.content LIKE '%' || replacements.mojibake_reg || '%'
  );

COMMIT;
