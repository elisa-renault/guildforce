CREATE OR REPLACE FUNCTION public.has_roster_access(p_roster_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_guild_id UUID;
  v_user_rank INTEGER;
  v_curly_apostrophe CONSTANT TEXT := chr(8217);
  v_accent_source CONSTANT TEXT := U&'\00E0\00E1\00E2\00E3\00E4\00E5\00E7\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F1\00F2\00F3\00F4\00F5\00F6\00F9\00FA\00FB\00FC\00FD\00FF\00C0\00C1\00C2\00C3\00C4\00C5\00C7\00C8\00C9\00CA\00CB\00CC\00CD\00CE\00CF\00D1\00D2\00D3\00D4\00D5\00D6\00D9\00DA\00DB\00DC\00DD';
  v_accent_target CONSTANT TEXT := 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';
BEGIN
  SELECT guild_id INTO v_guild_id FROM public.rosters WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_guild_gm(v_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.roster_access_rules
    WHERE roster_id = p_roster_id
      AND access_type = 'user'
      AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT MIN(wgm.rank_index) INTO v_user_rank
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g ON (
    LOWER(g.name) = LOWER(wgm.guild_name)
    AND LOWER(COALESCE(g.region, 'eu')) = LOWER(COALESCE(wgm.guild_region, 'eu'))
    AND (
      regexp_replace(
        lower(
          translate(
            replace(replace(COALESCE(g.server, ''), '''', ''), v_curly_apostrophe, ''),
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
            replace(replace(COALESCE(wgm.guild_realm_slug, ''), '''', ''), v_curly_apostrophe, ''),
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
            replace(replace(COALESCE(g.server, ''), '''', ''), v_curly_apostrophe, ''),
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
            replace(replace(COALESCE(wgm.guild_realm, ''), '''', ''), v_curly_apostrophe, ''),
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
  WHERE g.id = v_guild_id
    AND wgm.user_id = p_user_id;

  IF v_user_rank IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.roster_access_rules
      WHERE roster_id = p_roster_id
        AND access_type = 'rank'
        AND v_user_rank >= min_rank_index
        AND v_user_rank <= max_rank_index
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
