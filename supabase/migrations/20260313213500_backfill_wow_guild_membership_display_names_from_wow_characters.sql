-- Repair malformed guild realm display names in `wow_guild_memberships`
-- using the authoritative character-level guild display name already stored
-- in `wow_characters`, then re-backfill `guilds.server` from the repaired
-- membership data.

WITH constants AS (
  SELECT
    U&'\2019'::text AS curly_apostrophe,
    U&'\00E0\00E1\00E2\00E3\00E4\00E5\0101\0103\0105\00E7\0107\010D\010F\00E8\00E9\00EA\00EB\0113\0115\0117\0119\011B\00EC\00ED\00EE\00EF\012B\012D\012F\0131\00F1\0144\0148\00F2\00F3\00F4\00F5\00F6\00F8\014D\014F\0151\00F9\00FA\00FB\00FC\016B\016D\016F\0171\0173\00FD\00FF\017E\017A\017C'::text AS accent_source,
    'aaaaaaaaacccdeeeeeeeeeiiiiiiiinnnoooooooouuuuuuuuuyyzzz'::text AS accent_target
),
membership_backfill_candidates AS (
  SELECT
    wgm.id,
    trim(replace(wc.guild_realm, constants.curly_apostrophe, '''')) AS canonical_guild_realm
  FROM public.wow_guild_memberships wgm
  JOIN public.wow_characters wc
    ON wc.id = wgm.character_id
  CROSS JOIN constants
  WHERE wc.guild_name IS NOT NULL
    AND wc.guild_name <> ''
    AND wc.guild_realm IS NOT NULL
    AND wc.guild_realm <> ''
    AND lower(COALESCE(wgm.guild_name, '')) = lower(wc.guild_name)
    AND wgm.guild_realm IS DISTINCT FROM wc.guild_realm
    AND regexp_replace(
      lower(
        translate(
          replace(replace(COALESCE(wgm.guild_realm, ''), '''', ''), constants.curly_apostrophe, ''),
          constants.accent_source,
          constants.accent_target
        )
      ),
      '[^a-z0-9]+',
      '',
      'g'
    ) = regexp_replace(
      lower(
        translate(
          replace(replace(COALESCE(wgm.guild_realm_slug, ''), '''', ''), constants.curly_apostrophe, ''),
          constants.accent_source,
          constants.accent_target
        )
      ),
      '[^a-z0-9]+',
      '',
      'g'
    )
)
UPDATE public.wow_guild_memberships wgm
SET guild_realm = candidates.canonical_guild_realm
FROM membership_backfill_candidates candidates
WHERE wgm.id = candidates.id;

WITH constants AS (
  SELECT
    U&'\2019'::text AS curly_apostrophe,
    U&'\00E0\00E1\00E2\00E3\00E4\00E5\0101\0103\0105\00E7\0107\010D\010F\00E8\00E9\00EA\00EB\0113\0115\0117\0119\011B\00EC\00ED\00EE\00EF\012B\012D\012F\0131\00F1\0144\0148\00F2\00F3\00F4\00F5\00F6\00F8\014D\014F\0151\00F9\00FA\00FB\00FC\016B\016D\016F\0171\0173\00FD\00FF\017E\017A\017C'::text AS accent_source,
    'aaaaaaaaacccdeeeeeeeeeiiiiiiiinnnoooooooouuuuuuuuuyyzzz'::text AS accent_target
),
membership_counts AS (
  SELECT
    wgm.guild_name,
    wgm.guild_region,
    wgm.guild_realm_slug,
    trim(replace(wgm.guild_realm, constants.curly_apostrophe, '''')) AS guild_realm,
    COUNT(*) AS usage_count
  FROM public.wow_guild_memberships wgm
  CROSS JOIN constants
  WHERE wgm.guild_name IS NOT NULL
    AND wgm.guild_name <> ''
    AND wgm.guild_region IS NOT NULL
    AND wgm.guild_region <> ''
    AND wgm.guild_realm_slug IS NOT NULL
    AND wgm.guild_realm_slug <> ''
    AND wgm.guild_realm IS NOT NULL
    AND wgm.guild_realm <> ''
  GROUP BY 1, 2, 3, 4
),
canonical_realms AS (
  SELECT DISTINCT ON (guild_name, guild_region, guild_realm_slug)
    guild_name,
    guild_region,
    guild_realm_slug,
    guild_realm
  FROM membership_counts
  ORDER BY
    guild_name,
    guild_region,
    guild_realm_slug,
    usage_count DESC,
    length(guild_realm) DESC,
    guild_realm DESC
),
guild_backfill_candidates AS (
  SELECT
    g.id,
    c.guild_realm AS canonical_server
  FROM public.guilds g
  JOIN canonical_realms c
    ON lower(g.name) = lower(c.guild_name)
   AND lower(COALESCE(g.region, 'eu')) = lower(COALESCE(c.guild_region, 'eu'))
  CROSS JOIN constants
  WHERE g.server IS DISTINCT FROM c.guild_realm
    AND (
      regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(g.server, ''), '''', ''), constants.curly_apostrophe, ''),
            constants.accent_source,
            constants.accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(c.guild_realm_slug, ''), '''', ''), constants.curly_apostrophe, ''),
            constants.accent_source,
            constants.accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
      OR
      regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(g.server, ''), '''', ''), constants.curly_apostrophe, ''),
            constants.accent_source,
            constants.accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(c.guild_realm, ''), '''', ''), constants.curly_apostrophe, ''),
            constants.accent_source,
            constants.accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
    )
)
UPDATE public.guilds g
SET server = candidates.canonical_server
FROM guild_backfill_candidates candidates
WHERE g.id = candidates.id;
