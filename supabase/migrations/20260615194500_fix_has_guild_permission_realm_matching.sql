-- Align rank-based guild permissions with roster-access realm matching.
-- Battle.net data can store localized realm display names, accented slugs,
-- or ASCII slugs depending on sync vintage and API surface.

CREATE OR REPLACE FUNCTION public.has_guild_permission(
  p_guild_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_curly_apostrophe CONSTANT TEXT := chr(8217);
  v_accent_source CONSTANT TEXT := U&'\00E0\00E1\00E2\00E3\00E4\00E5\00E7\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F1\00F2\00F3\00F4\00F5\00F6\00F9\00FA\00FB\00FC\00FD\00FF\00C0\00C1\00C2\00C3\00C4\00C5\00C7\00C8\00C9\00CA\00CB\00CC\00CD\00CE\00CF\00D1\00D2\00D3\00D4\00D5\00D6\00D9\00DA\00DB\00DC\00DD';
  v_accent_target CONSTANT TEXT := 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';
  v_user_rank INTEGER;
BEGIN
  IF p_guild_id IS NULL OR p_user_id IS NULL OR p_permission IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_guild_gm(p_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.guild_permissions gp
    WHERE gp.guild_id = p_guild_id
      AND gp.permission_type = p_permission
      AND gp.access_type = 'user'
      AND gp.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT MIN(wgm.rank_index)
  INTO v_user_rank
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g ON (
    g.id = p_guild_id
    AND lower(g.name) = lower(wgm.guild_name)
    AND lower(coalesce(g.region, 'eu')) = lower(coalesce(wgm.guild_region, 'eu'))
    AND (
      regexp_replace(
        lower(
          translate(
            replace(replace(coalesce(g.server, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(coalesce(wgm.guild_realm_slug, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
      OR regexp_replace(
        lower(
          translate(
            replace(replace(coalesce(g.server, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      ) = regexp_replace(
        lower(
          translate(
            replace(replace(coalesce(wgm.guild_realm, ''), '''', ''), v_curly_apostrophe, ''),
            v_accent_source,
            v_accent_target
          )
        ),
        '[^a-z0-9]+',
        '',
        'g'
      )
    )
  )
  WHERE wgm.user_id = p_user_id;

  IF v_user_rank IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.guild_permissions gp
    WHERE gp.guild_id = p_guild_id
      AND gp.permission_type = p_permission
      AND gp.access_type = 'rank'
      AND v_user_rank >= gp.min_rank_index
      AND v_user_rank <= gp.max_rank_index
  );
END;
$$;
