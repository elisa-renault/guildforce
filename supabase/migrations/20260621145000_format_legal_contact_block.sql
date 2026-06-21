-- Improve legal notice publisher/contact formatting and restore in-app contact.

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
    'Publisher: Elsia
Contact: Discord @elsia or email contact@elsia.live.',
    '**Publisher:** Elsia

**Contact:**
- In-app support and bug report tools
- Discord: `@elsia`
- Email: [contact@elsia.live](mailto:contact@elsia.live)'
  ),
  updated_at = now()
FROM legal_notice
WHERE lpt.legal_page_id = legal_notice.id
  AND lpt.language = 'en'
  AND lpt.content LIKE '%Contact: Discord @elsia or email contact@elsia.live%';

COMMIT;
