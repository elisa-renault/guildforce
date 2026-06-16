-- Add PostHog Cloud EU analytics disclosure to the privacy policy.
-- Data-only and idempotent: appends once to existing translated rows.

BEGIN;

WITH privacy_page AS (
  SELECT id
  FROM public.legal_pages
  WHERE slug = 'privacy-policy'
),
notices(language, notice) AS (
  VALUES
    ('en', $notice$
## Product analytics

With your consent, Guildforce uses PostHog Cloud EU to measure explicit product usage events such as app sessions, activation, wishes, poll votes, forum posts, and guild invitations. Autocapture, automatic pageviews, and session replay are disabled. Analytics events may include the internal user id and guild, roster, or poll identifiers for aggregation, but they do not include email addresses, BattleTags, usernames, character names, comments, forum content, poll content, page text, secrets, or audit payloads. You can withdraw analytics consent at any time from cookie settings; analytics capture stops when consent is disabled.
$notice$),
    ('fr', $notice$
## Analytics produit

Avec votre consentement, Guildforce utilise PostHog Cloud EU pour mesurer des événements explicites d’usage produit, comme les sessions applicatives, l’activation, les vœux, les votes de sondage, les messages forum et les invitations de guilde. L’autocapture, les pageviews automatiques et le session replay sont désactivés. Les événements analytics peuvent inclure l’identifiant utilisateur interne et des identifiants de guilde, roster ou sondage pour l’agrégation, mais n’incluent pas les emails, BattleTags, pseudos, noms de personnages, commentaires, contenus forum, contenus de sondage, textes de page, secrets ou payloads d’audit. Vous pouvez retirer votre consentement analytics à tout moment depuis les paramètres cookies ; la capture analytics s’arrête lorsque le consentement est désactivé.
$notice$),
    ('de', $notice$
## Produktanalyse

Mit Ihrer Zustimmung verwendet Guildforce PostHog Cloud EU, um explizite Produktnutzungsereignisse wie App-Sitzungen, Aktivierung, Wünsche, Abstimmungen, Forenbeiträge und Gildeneinladungen zu messen. Autocapture, automatische Pageviews und Session Replay sind deaktiviert. Analyseereignisse können die interne Benutzer-ID sowie Gilden-, Roster- oder Umfrage-IDs zur Aggregation enthalten, aber keine E-Mail-Adressen, BattleTags, Benutzernamen, Charakternamen, Kommentare, Foreninhalte, Umfrageinhalte, Seitentexte, Geheimnisse oder Audit-Payloads. Sie können Ihre Zustimmung zu Analytics jederzeit in den Cookie-Einstellungen widerrufen; die Erfassung stoppt, sobald die Zustimmung deaktiviert ist.
$notice$),
    ('ru', $notice$
## Продуктовая аналитика

С твоего согласия Guildforce использует PostHog Cloud EU для измерения явных событий использования продукта: сессий приложения, активации, пожеланий, голосов в опросах, сообщений форума и приглашений в гильдию. Автосбор, автоматические просмотры страниц и запись сессий отключены. Аналитические события могут содержать внутренний идентификатор пользователя и идентификаторы гильдии, ростера или опроса для агрегирования, но не содержат email, BattleTag, имена пользователей, имена персонажей, комментарии, содержимое форума, содержимое опросов, текст страниц, секреты или audit payloads. Согласие на аналитику можно отозвать в любой момент в настройках cookie; сбор аналитики прекращается после отключения согласия.
$notice$)
)
UPDATE public.legal_page_translations lpt
SET
  content = rtrim(COALESCE(lpt.content, '')) || E'\n\n' || notices.notice,
  updated_at = now()
FROM privacy_page, notices
WHERE lpt.legal_page_id = privacy_page.id
  AND lpt.language = notices.language
  AND lpt.content NOT ILIKE '%PostHog Cloud EU%';

COMMIT;

