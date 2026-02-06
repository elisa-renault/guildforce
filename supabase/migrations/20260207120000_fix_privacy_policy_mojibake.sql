-- Fix mojibake registered trademark symbols in Privacy Policy (EN).
BEGIN;

WITH privacy_page AS (
  SELECT id
  FROM public.legal_pages
  WHERE slug = 'privacy-policy'
),
replacements AS (
  SELECT
    CHR(195) || CHR(8218) || CHR(194) || CHR(174) AS double_mojibake_reg,
    CHR(194) || CHR(174) AS mojibake_reg,
    CHR(174) AS registered_symbol
)
UPDATE public.legal_page_translations lpt
SET
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
WHERE lpt.legal_page_id IN (SELECT id FROM privacy_page)
  AND lpt.language = 'en'
  AND (
    lpt.content LIKE '%' || replacements.double_mojibake_reg || '%'
    OR lpt.content LIKE '%' || replacements.mojibake_reg || '%'
  );

COMMIT;
