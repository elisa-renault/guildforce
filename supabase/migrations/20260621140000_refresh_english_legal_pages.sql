-- Refresh public legal content after the English-only legal page update.
-- Data-only migration: keeps the legal page rows and replaces the English content.

BEGIN;

WITH pages(slug, title, content) AS (
  VALUES
    ('legal-notice', 'Legal Notice', $content$
## Site publisher

Guildforce is published as an independent World of Warcraft community operations platform.

Publisher: Guildforce
Contact: Use the in-app support and bug report tools, or contact the publisher through the official Guildforce communication channel made available to your guild.

The publisher's postal address may be provided upon justified request to the publisher or to competent authorities, in accordance with applicable law.

---

## Hosting

This site is hosted on an IONOS VPS:

**IONOS SE**  
Elgendorfer Str. 57  
56410 Montabaur  
Germany  
Phone: +49 (0) 721 170 5522  
Website: https://www.ionos.com

---

## Intellectual Property

Guildforce, its interface, documentation, application structure, and original content are protected by applicable intellectual property laws.

World of Warcraft, Battle.net, Blizzard Entertainment, and related names, marks, assets, game data, icons, classes, races, realms, factions, spells, and other references belong to Blizzard Entertainment, Inc. or its affiliates. Guildforce is an independent fan and guild-management tool and is not affiliated with, endorsed by, sponsored by, or approved by Blizzard Entertainment.

Users remain responsible for the content they create or upload in Guildforce, including guild Atlas documents, poll text, roster notes, secret labels, uploaded illustrations, and other guild-managed resources. Users must only publish content they are authorized to use.

---

## Open-source and third-party components

Guildforce uses third-party open-source software and external services, including Supabase, Battle.net OAuth APIs, PostHog Cloud EU analytics when consented, and hosting infrastructure operated by IONOS. Those services may be subject to their own terms and notices.

---

## Contact

For legal, privacy, security, or rights requests, contact the publisher through the available Guildforce support channel. Please include enough context to identify the relevant account, guild, page, or request without sending passwords, Battle.net tokens, recovery codes, or guild vault secrets.
$content$),
    ('privacy-policy', 'Privacy Policy', $content$
## Introduction

Guildforce helps World of Warcraft communities manage guild workspaces, Battle.net character synchronization, rosters, wishes, polls, guild permissions, the guild vault, Atlas documents, notifications, administration, and operational support.

This Privacy Policy explains what personal data is processed, why it is processed, how long it is kept, and how users can exercise their rights. Guildforce is designed for European users and follows GDPR principles of transparency, purpose limitation, data minimization, access control, and security.

---

## Data we process

Guildforce may process the following categories of data:

- **Account data:** Supabase authentication identifier, email address for legacy email/password accounts, username, avatar, language and interface preferences, account creation and update timestamps.
- **Battle.net data:** Battle.net account identifier, BattleTag where available and authorized, OAuth linkage state, access and refresh tokens stored server-side, selected region, World of Warcraft characters, realms, guild memberships, ranks, guild master status, and related roster cache data.
- **Guild workspace data:** guild records, membership status, permissions, roster access rules, activity logs, guild aliases, guild navigation preferences, command palette recent items, and admin actions.
- **Roster and wish data:** rosters, roster access rules, class and specialization wishes, comments, commitment state, approval or rejection status, wish locks, seasons, external member wishes, and roster selection decisions.
- **Poll data:** poll titles, descriptions, sections, questions, answer options, responses, targeting rules, result-visibility rules, AI-generated summaries where enabled, and poll status.
- **Guild vault metadata and audit data:** secret names, types, URLs, masked previews, access rules, audit events, actor identifiers, timestamps, reasons, and optional public illustrations. Secret values, tokens, passwords, notes, and recovery codes are encrypted and handled through server-side reveal or copy flows.
- **Atlas data:** guild knowledge documents, titles, summaries, Markdown content, collections, tags, visibility rules, status, ownership, timestamps, and images uploaded to the public guild Atlas storage bucket.
- **Support and compliance data:** bug reports, account deletion requests, legal page and changelog administration records, and sanitized authentication diagnostics used to troubleshoot Battle.net OAuth flows.
- **Product analytics data:** consented explicit usage events, such as app sessions, first login, activation, wish creation, poll votes, and guild invitations.

Guildforce does not intentionally collect payment data, government identifiers, or special categories of personal data.

---

## Purposes and legal bases

Guildforce processes data for these purposes:

- **Providing the service:** authentication, account management, guild workspaces, rosters, wishes, polls, permissions, vault access, Atlas documents, support, and administration. Legal basis: performance of the service contract.
- **Battle.net synchronization:** linking a Battle.net account, importing characters and guild memberships, detecting guild master status, refreshing guild roster cache, and keeping guild access accurate. Legal basis: user consent and performance of the service.
- **Security and abuse prevention:** enforcing RLS policies, validating permissions, protecting vault access, logging sensitive actions, investigating errors, and preventing unauthorized access. Legal basis: legitimate interest and legal obligations where applicable.
- **Product improvement and operational analytics:** measuring product adoption and feature usage with explicit, limited events. Legal basis: consent for PostHog Cloud EU analytics and legitimate interest for necessary operational metrics.
- **Legal and compliance requests:** processing account deletion, data rights requests, and required legal notices. Legal basis: legal obligation and legitimate interest.

---

## Battle.net OAuth and synchronization

Battle.net is the primary authentication and synchronization provider for World of Warcraft data. When a user links Battle.net, Guildforce may store OAuth tokens in a restricted server-side table to refresh character and guild membership data. Tokens are not exposed to client-side code and are protected by access rules.

Guildforce uses Battle.net data to identify the user's characters, guild memberships, guild ranks, region, realm, and guild master status. This enables automatic guild joining, guild claiming, roster matching, permission checks, and guild roster cache synchronization.

Users can unlink Battle.net where the interface permits it. Some product features may stop working or become unavailable when Battle.net is not linked.

---

## Guild vault and sensitive shared secrets

The guild vault is intended for shared guild operational credentials, tokens, secure notes, and recovery codes. Guildforce applies a stricter security model to this feature:

- Secret values are encrypted and are not stored in plaintext in client-readable tables.
- Access is controlled by guild permissions and per-secret rules.
- Reveal, copy, rotate, archive, and denied-access events may be logged for audit purposes.
- Audit logs do not include the secret value itself.
- Optional vault illustrations are public storage assets and must not contain secrets.

Users should never place personal passwords, payment details, private government identifiers, or other unrelated sensitive personal data in the guild vault.

---

## Atlas documents and user-generated content

Atlas lets authorized guild members publish guild knowledge such as rules, onboarding guides, raid notes, addon setup, recruitment processes, and officer-maintained resources. Atlas documents can contain Markdown text and public images.

Guild officers and delegated managers control visibility. A document may be visible to all confirmed members, officers, a rank threshold, or a specific roster. Draft and archived documents are limited to managers.

Users are responsible for ensuring they have the right to publish the content and images they add.

---

## Cookies and local storage

Guildforce uses cookies and browser storage that are necessary for authentication, session persistence, security, preferences, and interface operation.

With consent, Guildforce also uses PostHog Cloud EU product analytics. Analytics consent can be accepted, refused, or withdrawn from cookie settings. Withdrawing consent stops analytics capture after the preference is changed.

Guildforce does not use advertising cookies.

---

## Product analytics

With consent, Guildforce uses PostHog Cloud EU to measure explicit product usage events. Autocapture, automatic pageviews, and session replay are disabled.

Analytics events may include an internal user id and guild, roster, or poll identifiers for aggregation. They must not include email addresses, BattleTags, usernames, character names, comments, poll content, Atlas content, page text, guild vault secret values, or audit payloads.

Guildforce may also keep limited operational metrics in Supabase, such as feature adoption, active user counts, bug report counts, and account deletion queues.

---

## Data sharing and processors

Guildforce may rely on the following processors or external services:

- **Supabase:** authentication, database, storage, RLS policies, Edge Functions, and backend processing.
- **Battle.net / Blizzard APIs:** OAuth authentication and World of Warcraft character, guild, realm, rank, and roster data synchronization.
- **IONOS:** virtual private server hosting.
- **PostHog Cloud EU:** consented product analytics.

Guildforce does not sell personal data.

---

## International transfers

Guildforce aims to use European infrastructure where practical, including PostHog Cloud EU for analytics. Some third-party providers, including Battle.net / Blizzard and infrastructure or support providers, may process data outside the European Economic Area. Where required, transfers rely on appropriate safeguards such as contractual protections or adequacy mechanisms.

---

## Retention

Data is kept only as long as needed for the purposes described above:

- Account, profile, guild membership, roster, wish, poll, vault metadata, Atlas, and permission data are generally retained while the account or relevant guild workspace remains active.
- Battle.net tokens are retained while the account remains linked and are removed or invalidated when unlinking or account deletion is completed.
- Guild vault audit events and activity logs may be retained for security, accountability, and dispute handling.
- Bug reports, deletion requests, and authentication diagnostics are retained as long as needed for support, security, and compliance.
- Published guild content may remain visible to authorized guild members until deleted, archived, or otherwise removed by authorized users.

Users may request account deletion from the product interface or support channel. Some records may be retained where legally required or where necessary to protect the service, document security events, or preserve guild-level records that are not solely personal to one user.

---

## Security

Guildforce applies technical and organizational safeguards including Supabase Row Level Security, server-side permission helpers, restricted token storage, encrypted guild vault secret values, audit logs for sensitive actions, and separation between public metadata and sensitive payloads.

No online service can guarantee absolute security. Users must protect their own accounts, avoid sharing passwords, and avoid storing unrelated personal secrets in guild-managed workspaces.

---

## User rights

Under the GDPR, users may have the right to request access, rectification, erasure, restriction, portability, objection, and withdrawal of consent where applicable.

To exercise these rights, use the account deletion flow or contact the publisher through the available Guildforce support channel. Requests should include enough information to identify the relevant Guildforce account and guild context.

Users also have the right to lodge a complaint with a competent data protection authority.

---

## Changes to this policy

This policy may be updated to reflect product, legal, or security changes. Significant changes may be announced in the application or changelog.
$content$),
    ('terms-of-service', 'Terms of Service', $content$
## 1. Purpose

These Terms of Service govern access to and use of Guildforce, an independent guild operations platform for World of Warcraft communities.

Guildforce provides tools for guild management, Battle.net synchronization, rosters, class and specialization wishes, polls, guild permissions, guild vault access, Atlas documents, notifications, administration, changelogs, support, and related operational workflows.

---

## 2. Acceptance

By accessing or using Guildforce, you agree to these Terms. If you use Guildforce on behalf of a guild, you confirm that you are authorized to manage or contribute to that guild workspace according to your role and permissions.

If you do not agree with these Terms, do not use the service.

---

## 3. Accounts and authentication

Battle.net OAuth is the primary authentication and synchronization method. Legacy email and password login may remain available for existing accounts.

You are responsible for keeping your account secure and for maintaining control over your Battle.net account and email account. You must not share authentication credentials or attempt to access another user's account.

Guildforce may rely on Battle.net data to determine characters, guild membership, guild rank, and guild master status. If Battle.net data changes, Guildforce permissions, ownership, or access may also change after synchronization.

---

## 4. Guild workspaces and permissions

Guildforce uses guild roles, Battle.net rank data, Guildforce permissions, roster access rules, and feature-specific visibility rules to control access.

Guild masters, administrators, officers, and delegated managers are responsible for configuring guild workspaces, rosters, wishes, polls, vault access, Atlas visibility, and member permissions correctly.

Users must not try to bypass RLS policies, permission helpers, access checks, or protected routes.

---

## 5. Acceptable use

You agree not to:

- Use Guildforce for unlawful, harmful, abusive, harassing, discriminatory, or fraudulent activity.
- Upload, publish, or store content you do not have the right to use.
- Store unrelated personal secrets, payment information, government identifiers, malware, or illegal material in guild workspaces or the guild vault.
- Attempt to compromise, scan, overload, reverse engineer, or disrupt the service.
- Abuse Battle.net, Supabase, analytics, storage, or other third-party integrations.
- Misrepresent your identity, guild role, or authority.
- Use Guildforce to collect data about other users beyond legitimate guild operations.

---

## 6. User and guild content

Users and guild managers are responsible for the content they create, upload, configure, or publish, including roster notes, wish comments, poll text and responses, Atlas documents, uploaded images, guild vault labels, and support submissions.

Guildforce may remove or restrict content that appears unlawful, abusive, security-sensitive, infringing, or harmful to the service or its users.

Do not publish confidential information unless you are authorized to share it with the intended audience.

---

## 7. Guild vault responsibilities

The guild vault is a controlled storage feature for shared guild operational secrets. Authorized users are responsible for deciding what may be stored, who may access it, and when it should be rotated or archived.

Guildforce provides encryption, access checks, and audit logs, but it does not guarantee that a guild's internal access decisions are appropriate. Guild managers must review vault access regularly and remove access when members change roles or leave.

---

## 8. Atlas documents and knowledge base

Atlas is a guild-managed documentation space. Officers and delegated managers may publish documents for members, officers, rank thresholds, or rosters.

Guildforce does not verify the accuracy of guild-created Atlas content. Guild managers are responsible for keeping documents accurate, lawful, and appropriate for the intended audience.

---

## 9. Polls, wishes, and roster decisions

Polls, wishes, roster selections, and related analytics are guild operations tools. They should be used fairly and transparently within the guild's own rules.

Guildforce does not make roster decisions, membership decisions, loot decisions, or disciplinary decisions on behalf of guilds.

---

## 10. Administration, moderation, and support

Guildforce administrators may access administrative tools needed to maintain the service, investigate bugs, handle account deletion requests, review operational metrics, update legal content, publish changelogs, and protect the platform.

Access may be suspended, restricted, or removed if these Terms are breached, if security is at risk, if a legal request requires action, or if continued access would harm the service or other users.

---

## 11. Third-party services

Guildforce depends on third-party services including Supabase, Battle.net / Blizzard APIs, IONOS hosting, and PostHog Cloud EU analytics when consented.

Guildforce is not responsible for outages, API changes, account restrictions, data inaccuracies, or policy changes caused by third-party services. World of Warcraft, Battle.net, Blizzard Entertainment, and related marks belong to Blizzard Entertainment, Inc. Guildforce is not affiliated with Blizzard Entertainment.

---

## 12. Availability and changes

Guildforce is provided on a best-effort basis. The service may be updated, interrupted, restricted, or discontinued for maintenance, security, legal, technical, or product reasons.

Features may change over time. The forum product surface has been retired, and Guildforce may remove or replace other features when necessary.

---

## 13. Intellectual property

Guildforce retains rights in its original code, design, documentation, interface, and product materials.

Users retain responsibility for the content they submit, subject to the rights needed for Guildforce to host, process, display, back up, secure, and operate that content within the service.

---

## 14. Liability

Guildforce is provided "as is" and "as available." To the maximum extent permitted by law, Guildforce disclaims warranties of uninterrupted availability, error-free operation, fitness for a particular purpose, and accuracy of third-party data.

Guildforce is not liable for guild management decisions, lost game opportunities, roster outcomes, deleted guild content, third-party service failures, or misuse of shared guild secrets by authorized guild users.

Nothing in these Terms excludes liability where exclusion is prohibited by applicable law.

---

## 15. Termination and deletion

You may stop using Guildforce at any time and may request account deletion through the product or support channel.

Guildforce may suspend or terminate access where necessary to protect users, guilds, the service, or legal compliance. Some guild-level records, audit logs, or security records may be retained after account deletion where necessary and lawful.

---

## 16. Changes to these Terms

Guildforce may update these Terms to reflect product, security, legal, or operational changes. Significant updates may be announced in the application or changelog.

Continued use of Guildforce after an update means you accept the updated Terms.

---

## 17. Governing law

These Terms are governed by French law, unless mandatory consumer or data protection rules provide otherwise. Disputes are submitted to the competent courts under applicable law.
$content$)
)
UPDATE public.legal_page_translations lpt
SET
  title = pages.title,
  content = pages.content,
  updated_at = now()
FROM public.legal_pages lp
JOIN pages ON pages.slug = lp.slug
WHERE lpt.legal_page_id = lp.id
  AND lpt.language = 'en';

WITH pages(slug, title, content) AS (
  VALUES
    ('legal-notice', 'Legal Notice', $content$
## Site publisher

Guildforce is published as an independent World of Warcraft community operations platform.

Publisher: Guildforce
Contact: Use the in-app support and bug report tools, or contact the publisher through the official Guildforce communication channel made available to your guild.

The publisher's postal address may be provided upon justified request to the publisher or to competent authorities, in accordance with applicable law.

---

## Hosting

This site is hosted on an IONOS VPS:

**IONOS SE**  
Elgendorfer Str. 57  
56410 Montabaur  
Germany  
Phone: +49 (0) 721 170 5522  
Website: https://www.ionos.com

---

## Intellectual Property

Guildforce, its interface, documentation, application structure, and original content are protected by applicable intellectual property laws.

World of Warcraft, Battle.net, Blizzard Entertainment, and related names, marks, assets, game data, icons, classes, races, factions, spells, and other references belong to Blizzard Entertainment, Inc. or its affiliates. Guildforce is an independent fan and guild-management tool and is not affiliated with, endorsed by, sponsored by, or approved by Blizzard Entertainment.

Users remain responsible for the content they create or upload in Guildforce, including guild Atlas documents, poll text, roster notes, secret labels, uploaded illustrations, and other guild-managed resources. Users must only publish content they are authorized to use.

---

## Open-source and third-party components

Guildforce uses third-party open-source software and external services, including Supabase, Battle.net OAuth APIs, PostHog Cloud EU analytics when consented, and hosting infrastructure operated by IONOS. Those services may be subject to their own terms and notices.

---

## Contact

For legal, privacy, security, or rights requests, contact the publisher through the available Guildforce support channel. Please include enough context to identify the relevant account, guild, page, or request without sending passwords, Battle.net tokens, recovery codes, or guild vault secrets.
$content$),
    ('privacy-policy', 'Privacy Policy', $content$
## Introduction

Guildforce helps World of Warcraft communities manage guild workspaces, Battle.net character synchronization, rosters, wishes, polls, guild permissions, the guild vault, Atlas documents, notifications, administration, and operational support.

This Privacy Policy explains what personal data is processed, why it is processed, how long it is kept, and how users can exercise their rights. Guildforce is designed for European users and follows GDPR principles of transparency, purpose limitation, data minimization, access control, and security.

---

## Data we process

Guildforce may process the following categories of data:

- **Account data:** Supabase authentication identifier, email address for legacy email/password accounts, username, avatar, language and interface preferences, account creation and update timestamps.
- **Battle.net data:** Battle.net account identifier, BattleTag where available and authorized, OAuth linkage state, access and refresh tokens stored server-side, selected region, World of Warcraft characters, realms, guild memberships, ranks, guild master status, and related roster cache data.
- **Guild workspace data:** guild records, membership status, permissions, roster access rules, activity logs, guild aliases, guild navigation preferences, command palette recent items, and admin actions.
- **Roster and wish data:** rosters, roster access rules, class and specialization wishes, comments, commitment state, approval or rejection status, wish locks, seasons, external member wishes, and roster selection decisions.
- **Poll data:** poll titles, descriptions, sections, questions, answer options, responses, targeting rules, result-visibility rules, AI-generated summaries where enabled, and poll status.
- **Guild vault metadata and audit data:** secret names, types, URLs, masked previews, access rules, audit events, actor identifiers, timestamps, reasons, and optional public illustrations. Secret values, tokens, passwords, notes, and recovery codes are encrypted and handled through server-side reveal or copy flows.
- **Atlas data:** guild knowledge documents, titles, summaries, Markdown content, collections, tags, visibility rules, status, ownership, timestamps, and images uploaded to the public guild Atlas storage bucket.
- **Support and compliance data:** bug reports, account deletion requests, legal page and changelog administration records, and sanitized authentication diagnostics used to troubleshoot Battle.net OAuth flows.
- **Product analytics data:** consented explicit usage events, such as app sessions, first login, activation, wish creation, poll votes, and guild invitations.

Guildforce does not intentionally collect payment data, government identifiers, or special categories of personal data.

---

## Purposes and legal bases

Guildforce processes data for these purposes:

- **Providing the service:** authentication, account management, guild workspaces, rosters, wishes, polls, permissions, vault access, Atlas documents, support, and administration. Legal basis: performance of the service contract.
- **Battle.net synchronization:** linking a Battle.net account, importing characters and guild memberships, detecting guild master status, refreshing guild roster cache, and keeping guild access accurate. Legal basis: user consent and performance of the service.
- **Security and abuse prevention:** enforcing RLS policies, validating permissions, protecting vault access, logging sensitive actions, investigating errors, and preventing unauthorized access. Legal basis: legitimate interest and legal obligations where applicable.
- **Product improvement and operational analytics:** measuring product adoption and feature usage with explicit, limited events. Legal basis: consent for PostHog Cloud EU analytics and legitimate interest for necessary operational metrics.
- **Legal and compliance requests:** processing account deletion, data rights requests, and required legal notices. Legal basis: legal obligation and legitimate interest.

---

## Battle.net OAuth and synchronization

Battle.net is the primary authentication and synchronization provider for World of Warcraft data. When a user links Battle.net, Guildforce may store OAuth tokens in a restricted server-side table to refresh character and guild membership data. Tokens are not exposed to client-side code and are protected by access rules.

Guildforce uses Battle.net data to identify the user's characters, guild memberships, guild ranks, region, realm, and guild master status. This enables automatic guild joining, guild claiming, roster matching, permission checks, and guild roster cache synchronization.

Users can unlink Battle.net where the interface permits it. Some product features may stop working or become unavailable when Battle.net is not linked.

---

## Guild vault and sensitive shared secrets

The guild vault is intended for shared guild operational credentials, tokens, secure notes, and recovery codes. Guildforce applies a stricter security model to this feature:

- Secret values are encrypted and are not stored in plaintext in client-readable tables.
- Access is controlled by guild permissions and per-secret rules.
- Reveal, copy, rotate, archive, and denied-access events may be logged for audit purposes.
- Audit logs do not include the secret value itself.
- Optional vault illustrations are public storage assets and must not contain secrets.

Users should never place personal passwords, payment details, private government identifiers, or other unrelated sensitive personal data in the guild vault.

---

## Atlas documents and user-generated content

Atlas lets authorized guild members publish guild knowledge such as rules, onboarding guides, raid notes, addon setup, recruitment processes, and officer-maintained resources. Atlas documents can contain Markdown text and public images.

Guild officers and delegated managers control visibility. A document may be visible to all confirmed members, officers, a rank threshold, or a specific roster. Draft and archived documents are limited to managers.

Users are responsible for ensuring they have the right to publish the content and images they add.

---

## Cookies and local storage

Guildforce uses cookies and browser storage that are necessary for authentication, session persistence, security, preferences, and interface operation.

With consent, Guildforce also uses PostHog Cloud EU product analytics. Analytics consent can be accepted, refused, or withdrawn from cookie settings. Withdrawing consent stops analytics capture after the preference is changed.

Guildforce does not use advertising cookies.

---

## Product analytics

With consent, Guildforce uses PostHog Cloud EU to measure explicit product usage events. Autocapture, automatic pageviews, and session replay are disabled.

Analytics events may include an internal user id and guild, roster, or poll identifiers for aggregation. They must not include email addresses, BattleTags, usernames, character names, comments, poll content, Atlas content, page text, guild vault secret values, or audit payloads.

Guildforce may also keep limited operational metrics in Supabase, such as feature adoption, active user counts, bug report counts, and account deletion queues.

---

## Data sharing and processors

Guildforce may rely on the following processors or external services:

- **Supabase:** authentication, database, storage, RLS policies, Edge Functions, and backend processing.
- **Battle.net / Blizzard APIs:** OAuth authentication and World of Warcraft character, guild, realm, rank, and roster data synchronization.
- **IONOS:** virtual private server hosting.
- **PostHog Cloud EU:** consented product analytics.

Guildforce does not sell personal data.

---

## International transfers

Guildforce aims to use European infrastructure where practical, including PostHog Cloud EU for analytics. Some third-party providers, including Battle.net / Blizzard and infrastructure or support providers, may process data outside the European Economic Area. Where required, transfers rely on appropriate safeguards such as contractual protections or adequacy mechanisms.

---

## Retention

Data is kept only as long as needed for the purposes described above:

- Account, profile, guild membership, roster, wish, poll, vault metadata, Atlas, and permission data are generally retained while the account or relevant guild workspace remains active.
- Battle.net tokens are retained while the account remains linked and are removed or invalidated when unlinking or account deletion is completed.
- Guild vault audit events and activity logs may be retained for security, accountability, and dispute handling.
- Bug reports, deletion requests, and authentication diagnostics are retained as long as needed for support, security, and compliance.
- Published guild content may remain visible to authorized guild members until deleted, archived, or otherwise removed by authorized users.

Users may request account deletion from the product interface or support channel. Some records may be retained where legally required or where necessary to protect the service, document security events, or preserve guild-level records that are not solely personal to one user.

---

## Security

Guildforce applies technical and organizational safeguards including Supabase Row Level Security, server-side permission helpers, restricted token storage, encrypted guild vault secret values, audit logs for sensitive actions, and separation between public metadata and sensitive payloads.

No online service can guarantee absolute security. Users must protect their own accounts, avoid sharing passwords, and avoid storing unrelated personal secrets in guild-managed workspaces.

---

## User rights

Under the GDPR, users may have the right to request access, rectification, erasure, restriction, portability, objection, and withdrawal of consent where applicable.

To exercise these rights, use the account deletion flow or contact the publisher through the available Guildforce support channel. Requests should include enough information to identify the relevant Guildforce account and guild context.

Users also have the right to lodge a complaint with a competent data protection authority.

---

## Changes to this policy

This policy may be updated to reflect product, legal, or security changes. Significant changes may be announced in the application or changelog.
$content$),
    ('terms-of-service', 'Terms of Service', $content$
## 1. Purpose

These Terms of Service govern access to and use of Guildforce, an independent guild operations platform for World of Warcraft communities.

Guildforce provides tools for guild management, Battle.net synchronization, rosters, class and specialization wishes, polls, guild permissions, guild vault access, Atlas documents, notifications, administration, changelogs, support, and related operational workflows.

---

## 2. Acceptance

By accessing or using Guildforce, you agree to these Terms. If you use Guildforce on behalf of a guild, you confirm that you are authorized to manage or contribute to that guild workspace according to your role and permissions.

If you do not agree with these Terms, do not use the service.

---

## 3. Accounts and authentication

Battle.net OAuth is the primary authentication and synchronization method. Legacy email and password login may remain available for existing accounts.

You are responsible for keeping your account secure and for maintaining control over your Battle.net account and email account. You must not share authentication credentials or attempt to access another user's account.

Guildforce may rely on Battle.net data to determine characters, guild membership, guild rank, and guild master status. If Battle.net data changes, Guildforce permissions, ownership, or access may also change after synchronization.

---

## 4. Guild workspaces and permissions

Guildforce uses guild roles, Battle.net rank data, Guildforce permissions, roster access rules, and feature-specific visibility rules to control access.

Guild masters, administrators, officers, and delegated managers are responsible for configuring guild workspaces, rosters, wishes, polls, vault access, Atlas visibility, and member permissions correctly.

Users must not try to bypass RLS policies, permission helpers, access checks, or protected routes.

---

## 5. Acceptable use

You agree not to:

- Use Guildforce for unlawful, harmful, abusive, harassing, discriminatory, or fraudulent activity.
- Upload, publish, or store content you do not have the right to use.
- Store unrelated personal secrets, payment information, government identifiers, malware, or illegal material in guild workspaces or the guild vault.
- Attempt to compromise, scan, overload, reverse engineer, or disrupt the service.
- Abuse Battle.net, Supabase, analytics, storage, or other third-party integrations.
- Misrepresent your identity, guild role, or authority.
- Use Guildforce to collect data about other users beyond legitimate guild operations.

---

## 6. User and guild content

Users and guild managers are responsible for the content they create, upload, configure, or publish, including roster notes, wish comments, poll text and responses, Atlas documents, uploaded images, guild vault labels, and support submissions.

Guildforce may remove or restrict content that appears unlawful, abusive, security-sensitive, infringing, or harmful to the service or its users.

Do not publish confidential information unless you are authorized to share it with the intended audience.

---

## 7. Guild vault responsibilities

The guild vault is a controlled storage feature for shared guild operational secrets. Authorized users are responsible for deciding what may be stored, who may access it, and when it should be rotated or archived.

Guildforce provides encryption, access checks, and audit logs, but it does not guarantee that a guild's internal access decisions are appropriate. Guild managers must review vault access regularly and remove access when members change roles or leave.

---

## 8. Atlas documents and knowledge base

Atlas is a guild-managed documentation space. Officers and delegated managers may publish documents for members, officers, rank thresholds, or rosters.

Guildforce does not verify the accuracy of guild-created Atlas content. Guild managers are responsible for keeping documents accurate, lawful, and appropriate for the intended audience.

---

## 9. Polls, wishes, and roster decisions

Polls, wishes, roster selections, and related analytics are guild operations tools. They should be used fairly and transparently within the guild's own rules.

Guildforce does not make roster decisions, membership decisions, loot decisions, or disciplinary decisions on behalf of guilds.

---

## 10. Administration, moderation, and support

Guildforce administrators may access administrative tools needed to maintain the service, investigate bugs, handle account deletion requests, review operational metrics, update legal content, publish changelogs, and protect the platform.

Access may be suspended, restricted, or removed if these Terms are breached, if security is at risk, if a legal request requires action, or if continued access would harm the service or other users.

---

## 11. Third-party services

Guildforce depends on third-party services including Supabase, Battle.net / Blizzard APIs, IONOS hosting, and PostHog Cloud EU analytics when consented.

Guildforce is not responsible for outages, API changes, account restrictions, data inaccuracies, or policy changes caused by third-party services. World of Warcraft, Battle.net, Blizzard Entertainment, and related marks belong to Blizzard Entertainment, Inc. Guildforce is not affiliated with Blizzard Entertainment.

---

## 12. Availability and changes

Guildforce is provided on a best-effort basis. The service may be updated, interrupted, restricted, or discontinued for maintenance, security, legal, technical, or product reasons.

Features may change over time. The forum product surface has been retired, and Guildforce may remove or replace other features when necessary.

---

## 13. Intellectual property

Guildforce retains rights in its original code, design, documentation, interface, and product materials.

Users retain responsibility for the content they submit, subject to the rights needed for Guildforce to host, process, display, back up, secure, and operate that content within the service.

---

## 14. Liability

Guildforce is provided "as is" and "as available." To the maximum extent permitted by law, Guildforce disclaims warranties of uninterrupted availability, error-free operation, fitness for a particular purpose, and accuracy of third-party data.

Guildforce is not liable for guild management decisions, lost game opportunities, roster outcomes, deleted guild content, third-party service failures, or misuse of shared guild secrets by authorized guild users.

Nothing in these Terms excludes liability where exclusion is prohibited by applicable law.

---

## 15. Termination and deletion

You may stop using Guildforce at any time and may request account deletion through the product or support channel.

Guildforce may suspend or terminate access where necessary to protect users, guilds, the service, or legal compliance. Some guild-level records, audit logs, or security records may be retained after account deletion where necessary and lawful.

---

## 16. Changes to these Terms

Guildforce may update these Terms to reflect product, security, legal, or operational changes. Significant updates may be announced in the application or changelog.

Continued use of Guildforce after an update means you accept the updated Terms.

---

## 17. Governing law

These Terms are governed by French law, unless mandatory consumer or data protection rules provide otherwise. Disputes are submitted to the competent courts under applicable law.
$content$)
)
INSERT INTO public.legal_page_translations (legal_page_id, language, title, content)
SELECT lp.id, 'en', pages.title, pages.content
FROM public.legal_pages lp
JOIN pages ON pages.slug = lp.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_page_translations lpt
  WHERE lpt.legal_page_id = lp.id
    AND lpt.language = 'en'
);

UPDATE public.legal_pages
SET updated_at = now()
WHERE slug IN ('legal-notice', 'privacy-policy', 'terms-of-service');

DELETE FROM public.legal_page_translations
WHERE language <> 'en'
  AND legal_page_id IN (
    SELECT id
    FROM public.legal_pages
    WHERE slug IN ('legal-notice', 'privacy-policy', 'terms-of-service')
  );

COMMIT;
