-- Backfill inconsistent realm values in guild_roster_cache.
-- Some rows have a valid character_realm_slug but an incorrect character_realm fallback.
-- We align character_realm with the slug to keep display and matching consistent.

UPDATE public.guild_roster_cache
SET character_realm = character_realm_slug,
    updated_at = now()
WHERE COALESCE(character_realm_slug, '') <> ''
  AND lower(regexp_replace(COALESCE(character_realm, ''), '[-_\s]+', ' ', 'g'))
      <> lower(regexp_replace(COALESCE(character_realm_slug, ''), '[-_\s]+', ' ', 'g'));
