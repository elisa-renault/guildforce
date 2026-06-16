-- Remove the forum product surface and its database objects.

DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE (
  total_users bigint,
  total_guilds bigint,
  open_bugs bigint,
  pending_deletions bigint,
  unique_wish_users bigint,
  total_wishes bigint,
  guilds_with_wishes bigint,
  guilds_with_roster_wishes bigint,
  guild_engagement_rate integer,
  guilds_with_two_members bigint,
  guilds_with_two_wish_users bigint,
  total_polls bigint,
  active_polls bigint,
  closed_polls bigint,
  poll_voters bigint,
  dau_users bigint,
  wau_users bigint,
  mau_users bigint,
  wau_mau_ratio numeric,
  dau_delta_pct numeric,
  wau_delta_pct numeric,
  mau_delta_pct numeric,
  active_users_30d bigint,
  active_users_30d_delta_pct numeric,
  active_guilds_30d bigint,
  active_guilds_30d_delta_pct numeric,
  retention_d7_pct numeric,
  retention_d30_pct numeric,
  new_signups_7d bigint,
  activation_rate_7d_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH
  now_ref AS (SELECT timezone('utc', now()) AS ts),
  users AS (SELECT COUNT(*)::bigint AS total_users FROM public.profiles),
  guilds AS (SELECT COUNT(*)::bigint AS total_guilds FROM public.guilds),
  bugs AS (
    SELECT COUNT(*)::bigint AS open_bugs
    FROM public.bug_reports
    WHERE status = 'open'
  ),
  deletions AS (
    SELECT COUNT(*)::bigint AS pending_deletions
    FROM public.account_deletion_requests
    WHERE status = 'pending'
  ),
  wishes AS (
    SELECT
      COUNT(*)::bigint AS total_wishes,
      COUNT(DISTINCT user_id)::bigint AS unique_wish_users,
      COUNT(DISTINCT guild_id)::bigint AS guilds_with_wishes,
      COUNT(DISTINCT guild_id) FILTER (WHERE roster_id IS NOT NULL)::bigint AS guilds_with_roster_wishes
    FROM public.class_wishes
  ),
  guild_member_counts AS (
    SELECT guild_id, COUNT(DISTINCT user_id)::bigint AS unique_members
    FROM public.guild_members
    GROUP BY guild_id
  ),
  guilds_with_two_members AS (
    SELECT COUNT(*)::bigint AS guilds_with_two_members
    FROM guild_member_counts
    WHERE unique_members >= 2
  ),
  guild_wish_user_counts AS (
    SELECT guild_id, COUNT(DISTINCT user_id)::bigint AS wish_user_count
    FROM public.class_wishes
    WHERE roster_id IS NOT NULL
    GROUP BY guild_id
  ),
  guilds_with_two_wish_users AS (
    SELECT COUNT(*)::bigint AS guilds_with_two_wish_users
    FROM guild_wish_user_counts
    WHERE wish_user_count >= 2
  ),
  polls AS (
    SELECT
      COUNT(*)::bigint AS total_polls,
      COUNT(*) FILTER (WHERE status = 'active')::bigint AS active_polls,
      COUNT(*) FILTER (WHERE status = 'closed')::bigint AS closed_polls
    FROM public.guild_polls
  ),
  poll_voters AS (
    SELECT COUNT(DISTINCT user_id)::bigint AS poll_voters
    FROM public.guild_poll_responses
  ),
  user_activity AS (
    SELECT cw.user_id, cw.guild_id, cw.created_at AS occurred_at
    FROM public.class_wishes cw
    CROSS JOIN now_ref n
    WHERE cw.user_id IS NOT NULL
      AND cw.created_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT gpr.user_id, gp.guild_id, gpr.created_at AS occurred_at
    FROM public.guild_poll_responses gpr
    JOIN public.guild_poll_questions gpq ON gpq.id = gpr.question_id
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    CROSS JOIN now_ref n
    WHERE gpr.user_id IS NOT NULL
      AND gpr.created_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT pe.user_id, pe.guild_id, pe.occurred_at
    FROM public.product_events pe
    CROSS JOIN now_ref n
    WHERE pe.user_id IS NOT NULL
      AND pe.occurred_at >= n.ts - INTERVAL '90 days'
      AND pe.event_name IN ('wish_created', 'poll_voted', 'guild_member_invited', 'activated_first_action')
  ),
  guild_activity AS (
    SELECT ua.guild_id, ua.occurred_at
    FROM user_activity ua
    WHERE ua.guild_id IS NOT NULL

    UNION ALL

    SELECT r.guild_id, r.updated_at AS occurred_at
    FROM public.rosters r
    CROSS JOIN now_ref n
    WHERE r.guild_id IS NOT NULL
      AND r.updated_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT gp.guild_id, gp.updated_at AS occurred_at
    FROM public.guild_polls gp
    CROSS JOIN now_ref n
    WHERE gp.guild_id IS NOT NULL
      AND gp.updated_at >= n.ts - INTERVAL '90 days'
  ),
  activity_windows AS (
    SELECT
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '1 day')::bigint AS dau_users,
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '2 days' AND ua.occurred_at < n.ts - INTERVAL '1 day')::bigint AS dau_users_prev,
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '7 days')::bigint AS wau_users,
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '14 days' AND ua.occurred_at < n.ts - INTERVAL '7 days')::bigint AS wau_users_prev,
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '30 days')::bigint AS mau_users,
      COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= n.ts - INTERVAL '60 days' AND ua.occurred_at < n.ts - INTERVAL '30 days')::bigint AS mau_users_prev
    FROM user_activity ua
    CROSS JOIN now_ref n
  ),
  guild_activity_windows AS (
    SELECT
      COUNT(DISTINCT ga.guild_id) FILTER (WHERE ga.occurred_at >= n.ts - INTERVAL '30 days')::bigint AS active_guilds_30d,
      COUNT(DISTINCT ga.guild_id) FILTER (WHERE ga.occurred_at >= n.ts - INTERVAL '60 days' AND ga.occurred_at < n.ts - INTERVAL '30 days')::bigint AS active_guilds_30d_prev
    FROM guild_activity ga
    CROSS JOIN now_ref n
  ),
  signup_activation AS (
    SELECT
      COUNT(*) FILTER (WHERE p.created_at >= n.ts - INTERVAL '7 days')::bigint AS new_signups_7d,
      COUNT(*) FILTER (
        WHERE p.created_at >= n.ts - INTERVAL '7 days'
          AND EXISTS (
            SELECT 1
            FROM user_activity ua
            WHERE ua.user_id = p.id
              AND ua.occurred_at >= p.created_at
              AND ua.occurred_at < p.created_at + INTERVAL '7 days'
          )
      )::bigint AS activated_signups_7d
    FROM public.profiles p
    CROSS JOIN now_ref n
  )
  SELECT
    users.total_users,
    guilds.total_guilds,
    bugs.open_bugs,
    deletions.pending_deletions,
    wishes.unique_wish_users,
    wishes.total_wishes,
    wishes.guilds_with_wishes,
    wishes.guilds_with_roster_wishes,
    CASE WHEN guilds.total_guilds > 0 THEN ROUND((wishes.guilds_with_roster_wishes::numeric / guilds.total_guilds::numeric) * 100)::integer ELSE 0 END,
    guilds_with_two_members.guilds_with_two_members,
    guilds_with_two_wish_users.guilds_with_two_wish_users,
    polls.total_polls,
    polls.active_polls,
    polls.closed_polls,
    poll_voters.poll_voters,
    COALESCE(activity_windows.dau_users, 0),
    COALESCE(activity_windows.wau_users, 0),
    COALESCE(activity_windows.mau_users, 0),
    CASE WHEN activity_windows.mau_users >= 20 THEN ROUND((activity_windows.wau_users::numeric / NULLIF(activity_windows.mau_users, 0)::numeric) * 100, 1) ELSE NULL END,
    CASE WHEN activity_windows.dau_users_prev > 0 THEN ROUND(((activity_windows.dau_users - activity_windows.dau_users_prev)::numeric / activity_windows.dau_users_prev::numeric) * 100, 1) ELSE NULL END,
    CASE WHEN activity_windows.wau_users_prev > 0 THEN ROUND(((activity_windows.wau_users - activity_windows.wau_users_prev)::numeric / activity_windows.wau_users_prev::numeric) * 100, 1) ELSE NULL END,
    CASE WHEN activity_windows.mau_users_prev > 0 THEN ROUND(((activity_windows.mau_users - activity_windows.mau_users_prev)::numeric / activity_windows.mau_users_prev::numeric) * 100, 1) ELSE NULL END,
    COALESCE(activity_windows.mau_users, 0),
    CASE WHEN activity_windows.mau_users_prev > 0 THEN ROUND(((activity_windows.mau_users - activity_windows.mau_users_prev)::numeric / activity_windows.mau_users_prev::numeric) * 100, 1) ELSE NULL END,
    COALESCE(guild_activity_windows.active_guilds_30d, 0),
    CASE WHEN guild_activity_windows.active_guilds_30d_prev > 0 THEN ROUND(((guild_activity_windows.active_guilds_30d - guild_activity_windows.active_guilds_30d_prev)::numeric / guild_activity_windows.active_guilds_30d_prev::numeric) * 100, 1) ELSE NULL END,
    NULL::numeric,
    NULL::numeric,
    signup_activation.new_signups_7d,
    CASE WHEN signup_activation.new_signups_7d > 0 THEN ROUND((signup_activation.activated_signups_7d::numeric / signup_activation.new_signups_7d::numeric) * 100, 1) ELSE NULL END
  FROM users, guilds, bugs, deletions, wishes, guilds_with_two_members, guilds_with_two_wish_users, polls, poll_voters, activity_windows, guild_activity_windows, signup_activation;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

DROP FUNCTION IF EXISTS public.get_admin_dashboard_timeseries(integer);
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_timeseries(p_days integer DEFAULT 84)
RETURNS TABLE (
  bucket_date date,
  dau_users bigint,
  wau_users bigint,
  mau_users bigint,
  engagement_wau_mau_pct numeric,
  new_signups bigint,
  activated_users_7d bigint,
  activation_rate_7d_pct numeric,
  active_guilds_30d bigint,
  open_bugs bigint,
  pending_deletions bigint,
  critical_issues bigint,
  created_bugs bigint,
  created_deletions bigint,
  critical_created_issues bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_days := LEAST(GREATEST(COALESCE(p_days, 84), 14), 180);

  RETURN QUERY
  WITH
  days AS (
    SELECT generate_series(
      (timezone('utc', now())::date - (v_days - 1)),
      timezone('utc', now())::date,
      INTERVAL '1 day'
    )::date AS bucket_date
  ),
  user_activity AS (
    SELECT cw.user_id, cw.guild_id, cw.created_at AS occurred_at
    FROM public.class_wishes cw
    WHERE cw.user_id IS NOT NULL
      AND cw.created_at >= (SELECT MIN(bucket_date) FROM days)

    UNION ALL

    SELECT gpr.user_id, gp.guild_id, gpr.created_at AS occurred_at
    FROM public.guild_poll_responses gpr
    JOIN public.guild_poll_questions gpq ON gpq.id = gpr.question_id
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpr.user_id IS NOT NULL
      AND gpr.created_at >= (SELECT MIN(bucket_date) FROM days)

    UNION ALL

    SELECT pe.user_id, pe.guild_id, pe.occurred_at
    FROM public.product_events pe
    WHERE pe.user_id IS NOT NULL
      AND pe.occurred_at >= (SELECT MIN(bucket_date) FROM days)
      AND pe.event_name IN ('wish_created', 'poll_voted', 'guild_member_invited', 'activated_first_action')
  )
  SELECT
    d.bucket_date,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date AND ua.occurred_at < d.bucket_date + INTERVAL '1 day')::bigint AS dau_users,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date - INTERVAL '6 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day')::bigint AS wau_users,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date - INTERVAL '29 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day')::bigint AS mau_users,
    CASE
      WHEN COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date - INTERVAL '29 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day') >= 20
      THEN ROUND(
        COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date - INTERVAL '6 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day')::numeric
        / NULLIF(COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_date - INTERVAL '29 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day'), 0)::numeric
        * 100,
        1
      )
      ELSE NULL
    END AS engagement_wau_mau_pct,
    (SELECT COUNT(*)::bigint FROM public.profiles p WHERE p.created_at >= d.bucket_date AND p.created_at < d.bucket_date + INTERVAL '1 day') AS new_signups,
    NULL::bigint AS activated_users_7d,
    NULL::numeric AS activation_rate_7d_pct,
    COUNT(DISTINCT ua.guild_id) FILTER (WHERE ua.guild_id IS NOT NULL AND ua.occurred_at >= d.bucket_date - INTERVAL '29 days' AND ua.occurred_at < d.bucket_date + INTERVAL '1 day')::bigint AS active_guilds_30d,
    (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.status = 'open' AND br.created_at < d.bucket_date + INTERVAL '1 day') AS open_bugs,
    (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE adr.status = 'pending' AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_date + INTERVAL '1 day') AS pending_deletions,
    (
      (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.status = 'open' AND br.created_at < d.bucket_date + INTERVAL '1 day')
      + (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE adr.status = 'pending' AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_date + INTERVAL '1 day')
    ) AS critical_issues,
    (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.created_at >= d.bucket_date AND br.created_at < d.bucket_date + INTERVAL '1 day') AS created_bugs,
    (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE COALESCE(adr.requested_at, adr.created_at) >= d.bucket_date AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_date + INTERVAL '1 day') AS created_deletions,
    (
      (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.created_at >= d.bucket_date AND br.created_at < d.bucket_date + INTERVAL '1 day')
      + (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE COALESCE(adr.requested_at, adr.created_at) >= d.bucket_date AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_date + INTERVAL '1 day')
    ) AS critical_created_issues
  FROM days d
  LEFT JOIN user_activity ua
    ON ua.occurred_at >= d.bucket_date - INTERVAL '29 days'
   AND ua.occurred_at < d.bucket_date + INTERVAL '1 day'
  GROUP BY d.bucket_date
  ORDER BY d.bucket_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_timeseries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_timeseries(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.track_product_event(
  p_event_name text,
  p_guild_id uuid DEFAULT NULL,
  p_event_source text DEFAULT NULL,
  p_event_context jsonb DEFAULT '{}'::jsonb,
  p_occurred_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_allowed_events text[] := ARRAY[
    'first_login',
    'wish_created',
    'poll_voted',
    'guild_member_invited',
    'activated_first_action'
  ];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_event_name IS NULL OR btrim(p_event_name) = '' THEN
    RAISE EXCEPTION 'event name is required';
  END IF;

  IF NOT (p_event_name = ANY (v_allowed_events)) THEN
    RAISE EXCEPTION 'event not allowed: %', p_event_name;
  END IF;

  IF p_event_name = 'first_login' THEN
    INSERT INTO public.product_events (user_id, guild_id, event_name, event_source, event_context, occurred_at)
    SELECT v_user_id, p_guild_id, p_event_name, p_event_source, COALESCE(p_event_context, '{}'::jsonb), COALESCE(p_occurred_at, timezone('utc', now()))
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_events pe
      WHERE pe.user_id = v_user_id AND pe.event_name = 'first_login'
    );
    RETURN;
  END IF;

  INSERT INTO public.product_events (user_id, guild_id, event_name, event_source, event_context, occurred_at)
  VALUES (v_user_id, p_guild_id, p_event_name, p_event_source, COALESCE(p_event_context, '{}'::jsonb), COALESCE(p_occurred_at, timezone('utc', now())));
END;
$$;

DELETE FROM public.command_palette_recent_items WHERE item_type = 'forum';
ALTER TABLE public.command_palette_recent_items
  DROP CONSTRAINT IF EXISTS command_palette_recent_items_item_type_check;
ALTER TABLE public.command_palette_recent_items
  ADD CONSTRAINT command_palette_recent_items_item_type_check
  CHECK (item_type IN ('action', 'page', 'guild', 'member', 'roster', 'poll'));

CREATE OR REPLACE FUNCTION public.record_command_palette_use(
  p_item_type TEXT,
  p_item_id TEXT,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_href TEXT DEFAULT NULL,
  p_guild_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_item_type NOT IN ('action', 'page', 'guild', 'member', 'roster', 'poll') THEN
    RAISE EXCEPTION 'unsupported command palette item type: %', p_item_type;
  END IF;

  IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    RAISE EXCEPTION 'item id is required';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  IF p_guild_id IS NOT NULL
    AND NOT (
      public.is_guild_member(p_guild_id, v_user_id)
      OR public.is_guild_gm(p_guild_id, v_user_id)
      OR public.has_role(v_user_id, 'admin'::public.app_role)
    )
  THEN
    RAISE EXCEPTION 'not authorized for guild';
  END IF;

  INSERT INTO public.command_palette_recent_items (
    user_id, item_type, item_id, guild_id, title, subtitle, href, metadata, use_count, last_used_at
  )
  VALUES (
    v_user_id,
    p_item_type,
    p_item_id,
    p_guild_id,
    left(p_title, 180),
    NULLIF(left(COALESCE(p_subtitle, ''), 240), ''),
    NULLIF(left(COALESCE(p_href, ''), 500), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    1,
    timezone('utc', now())
  )
  ON CONFLICT (user_id, item_type, item_id)
  DO UPDATE SET
    guild_id = EXCLUDED.guild_id,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    href = EXCLUDED.href,
    metadata = EXCLUDED.metadata,
    use_count = public.command_palette_recent_items.use_count + 1,
    last_used_at = timezone('utc', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.search_command_palette(
  p_query TEXT,
  p_context_guild_id UUID DEFAULT NULL,
  p_limit_per_group INTEGER DEFAULT 6
)
RETURNS TABLE (
  result_type TEXT,
  result_id TEXT,
  guild_id UUID,
  title TEXT,
  subtitle TEXT,
  metadata JSONB,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_query TEXT;
  v_limit INTEGER;
BEGIN
  v_user_id := auth.uid();
  v_query := lower(btrim(COALESCE(p_query, '')));
  v_limit := LEAST(GREATEST(COALESCE(p_limit_per_group, 6), 1), 10);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF v_query = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
  accessible_guilds AS (
    SELECT g.*
    FROM public.guilds g
    WHERE public.is_guild_member(g.id, v_user_id)
      OR public.is_guild_gm(g.id, v_user_id)
      OR public.has_role(v_user_id, 'admin'::public.app_role)
  ),
  guild_matches AS (
    SELECT 'guild'::text, g.id::text, g.id, g.name,
      concat_ws(' - ', g.server, upper(COALESCE(g.region, 'eu'))),
      jsonb_build_object('name', g.name, 'server', g.server, 'region', COALESCE(g.region, 'eu'), 'faction', g.faction, 'avatar_url', g.avatar_url),
      (CASE WHEN p_context_guild_id = g.id THEN 35 ELSE 0 END
        + CASE WHEN lower(g.name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(g.name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(g.name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + CASE WHEN lower(g.server) LIKE '%' || v_query || '%' THEN 18 ELSE 0 END
        + extensions.similarity(lower(g.name || ' ' || g.server), v_query) * 30)::numeric
    FROM accessible_guilds g
    WHERE lower(g.name || ' ' || g.server || ' ' || COALESCE(g.region, '')) LIKE '%' || v_query || '%'
      OR extensions.similarity(lower(g.name || ' ' || g.server), v_query) > 0.18
    ORDER BY 7 DESC, g.name ASC
    LIMIT v_limit
  ),
  member_matches AS (
    SELECT 'member'::text, grc.id::text, grc.guild_id, grc.character_name,
      concat_ws(' - ', ag.name, COALESCE(p.username, grc.rank_name, 'member')),
      jsonb_build_object('guild_name', ag.name, 'server', ag.server, 'region', COALESCE(ag.region, 'eu'), 'character_name', grc.character_name, 'character_realm', grc.character_realm, 'character_class_id', grc.character_class_id, 'character_level', grc.character_level, 'rank_index', grc.rank_index, 'rank_name', grc.rank_name, 'is_guild_master', COALESCE(grc.is_guild_master, false), 'matched_user_id', grc.matched_user_id, 'username', p.username, 'avatar_url', p.avatar_url, 'is_main', COALESCE(wc.is_main, false), 'is_linked', grc.matched_user_id IS NOT NULL),
      (CASE WHEN p_context_guild_id = grc.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(grc.character_name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(grc.character_name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(grc.character_name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + CASE WHEN lower(COALESCE(p.username, '')) LIKE '%' || v_query || '%' THEN 24 ELSE 0 END
        + extensions.similarity(lower(grc.character_name || ' ' || COALESCE(p.username, '')), v_query) * 30)::numeric
    FROM public.guild_roster_cache grc
    JOIN accessible_guilds ag ON ag.id = grc.guild_id
    LEFT JOIN public.profiles p ON p.id = grc.matched_user_id
    LEFT JOIN public.wow_characters wc ON wc.id = grc.matched_character_id
    WHERE lower(grc.character_name || ' ' || COALESCE(p.username, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
      OR extensions.similarity(lower(grc.character_name || ' ' || COALESCE(p.username, '')), v_query) > 0.18
    ORDER BY 7 DESC, grc.character_name ASC
    LIMIT v_limit
  ),
  roster_matches AS (
    SELECT 'roster'::text, r.id::text, r.guild_id, r.name,
      concat_ws(' - ', ag.name, COALESCE(r.description, 'roster')),
      jsonb_build_object('guild_name', ag.name, 'server', ag.server, 'region', COALESCE(ag.region, 'eu'), 'name', r.name, 'description', r.description, 'is_default', r.is_default, 'wishes_locked', r.wishes_locked),
      (CASE WHEN p_context_guild_id = r.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(r.name) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(r.name) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(r.name) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + extensions.similarity(lower(r.name || ' ' || COALESCE(r.description, '')), v_query) * 30)::numeric
    FROM public.rosters r
    JOIN accessible_guilds ag ON ag.id = r.guild_id
    WHERE (
        public.has_roster_access(r.id, v_user_id)
        OR public.is_guild_gm(r.guild_id, v_user_id)
        OR public.has_role(v_user_id, 'admin'::public.app_role)
      )
      AND (
        lower(r.name || ' ' || COALESCE(r.description, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
        OR extensions.similarity(lower(r.name || ' ' || COALESCE(r.description, '')), v_query) > 0.18
      )
    ORDER BY 7 DESC, r.name ASC
    LIMIT v_limit
  ),
  poll_matches AS (
    SELECT 'poll'::text, gp.id::text, gp.guild_id, gp.title,
      concat_ws(' - ', ag.name, gp.status::text),
      jsonb_build_object('guild_name', ag.name, 'server', ag.server, 'region', COALESCE(ag.region, 'eu'), 'title', gp.title, 'description', gp.description, 'status', gp.status, 'roster_id', gp.roster_id, 'ends_at', gp.ends_at),
      (CASE WHEN p_context_guild_id = gp.guild_id THEN 35 ELSE 0 END
        + CASE WHEN lower(gp.title) = v_query THEN 80 ELSE 0 END
        + CASE WHEN lower(gp.title) LIKE v_query || '%' THEN 55 ELSE 0 END
        + CASE WHEN lower(gp.title) LIKE '%' || v_query || '%' THEN 35 ELSE 0 END
        + extensions.similarity(lower(gp.title || ' ' || COALESCE(gp.description, '')), v_query) * 30)::numeric
    FROM public.guild_polls gp
    JOIN accessible_guilds ag ON ag.id = gp.guild_id
    WHERE (
        public.is_guild_gm(gp.guild_id, v_user_id)
        OR public.has_guild_permission(gp.guild_id, v_user_id, 'manage_polls')
        OR (gp.status <> 'draft' AND public.can_respond_to_poll(gp.id, v_user_id))
        OR (gp.status <> 'draft' AND public.can_view_poll_results(gp.id, v_user_id))
      )
      AND (
        lower(gp.title || ' ' || COALESCE(gp.description, '') || ' ' || ag.name) LIKE '%' || v_query || '%'
        OR extensions.similarity(lower(gp.title || ' ' || COALESCE(gp.description, '')), v_query) > 0.18
      )
    ORDER BY 7 DESC, gp.updated_at DESC
    LIMIT v_limit
  )
  SELECT * FROM guild_matches
  UNION ALL SELECT * FROM member_matches
  UNION ALL SELECT * FROM roster_matches
  UNION ALL SELECT * FROM poll_matches
  ORDER BY 7 DESC, 4 ASC;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_event_forum_post_created ON public.forum_posts;
DROP TRIGGER IF EXISTS on_forum_post_change ON public.forum_posts;
DROP TRIGGER IF EXISTS trigger_notify_topic_author ON public.forum_posts;
DROP TRIGGER IF EXISTS trigger_notify_topic_participants ON public.forum_posts;
DROP TRIGGER IF EXISTS trigger_auto_subscribe_on_reply ON public.forum_posts;
DROP TRIGGER IF EXISTS trigger_auto_subscribe_topic_author ON public.forum_topics;

DROP FUNCTION IF EXISTS public.log_product_event_from_forum_post();
DROP FUNCTION IF EXISTS public.update_topic_reply_stats();
DROP FUNCTION IF EXISTS public.notify_topic_author();
DROP FUNCTION IF EXISTS public.notify_topic_participants();
DROP FUNCTION IF EXISTS public.auto_subscribe_topic_author();
DROP FUNCTION IF EXISTS public.auto_subscribe_on_reply();
DROP FUNCTION IF EXISTS public.is_user_forum_sanctioned(uuid);
DROP FUNCTION IF EXISTS public.get_user_forum_sanction(uuid);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_notifications;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_reports;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_reactions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_posts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.forum_topics;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DROP TABLE IF EXISTS public.forum_notifications CASCADE;
DROP TABLE IF EXISTS public.forum_topic_subscriptions CASCADE;
DROP TABLE IF EXISTS public.forum_reports CASCADE;
DROP TABLE IF EXISTS public.forum_reactions CASCADE;
DROP TABLE IF EXISTS public.forum_moderators CASCADE;
DROP TABLE IF EXISTS public.forum_user_sanctions CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_topics CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;
DROP TYPE IF EXISTS public.forum_sanction_type;

UPDATE public.legal_page_translations
SET
  content = replace(
    replace(
      replace(
        replace(content, 'poll votes, forum posts, and guild invitations', 'poll votes and guild invitations'),
        'comments, forum content, poll content', 'comments, poll content'
      ),
      'messages forum et les invitations de guilde', 'votes de sondage et les invitations de guilde'
    ),
    'contenus forum, contenus de sondage', 'contenus de sondage'
  ),
  updated_at = now()
WHERE content ILIKE '%forum%';
