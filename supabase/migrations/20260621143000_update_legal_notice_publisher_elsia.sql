-- Correct legal notice publisher identity.

BEGIN;

WITH legal_notice AS (
  SELECT lp.id
  FROM public.legal_pages lp
  WHERE lp.slug = 'legal-notice'
)
UPDATE public.legal_page_translations lpt
SET
  content = replace(
    lpt.content,
    'Publisher: Guildforce
Contact: Use the in-app support and bug report tools, or contact the publisher through the official Guildforce communication channel made available to your guild.',
    'Publisher: Elsia
Contact: Use the in-app support and bug report tools, or contact Elsia through the official Guildforce communication channel.'
  ),
  updated_at = now()
FROM legal_notice
WHERE lpt.legal_page_id = legal_notice.id
  AND lpt.language = 'en'
  AND lpt.content LIKE '%Publisher: Guildforce%';

COMMIT;
