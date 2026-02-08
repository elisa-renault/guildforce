-- Expand admin dashboard RPC with activity-based KPIs (DAU/WAU/MAU, stickiness, deltas, active guilds/users)
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE (
  total_users bigint,
  total_guilds bigint,
  total_topics bigint,
  total_posts bigint,
  pending_reports bigint,
  active_sanctions bigint,
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
  active_guilds_30d_delta_pct numeric
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
  now_ref AS (
    SELECT timezone('utc', now()) AS ts
  ),
  users AS (
    SELECT COUNT(*)::bigint AS total_users
    FROM public.profiles
  ),
  guilds AS (
    SELECT COUNT(*)::bigint AS total_guilds
    FROM public.guilds
  ),
  topics AS (
    SELECT COUNT(*)::bigint AS total_topics
    FROM public.forum_topics
  ),
  posts AS (
    SELECT COUNT(*)::bigint AS total_posts
    FROM public.forum_posts
  ),
  reports AS (
    SELECT COUNT(*)::bigint AS pending_reports
    FROM public.forum_reports
    WHERE status = 'pending'
  ),
  sanctions AS (
    SELECT COUNT(*)::bigint AS active_sanctions
    FROM public.forum_user_sanctions
    WHERE is_active = true
  ),
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
    WHERE guild_wish_user_counts.wish_user_count >= 2
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
    SELECT
      cw.user_id,
      cw.guild_id,
      cw.updated_at AS occurred_at
    FROM public.class_wishes cw
    CROSS JOIN now_ref n
    WHERE cw.user_id IS NOT NULL
      AND cw.updated_at >= n.ts - INTERVAL '60 days'

    UNION ALL

    SELECT
      ft.author_id AS user_id,
      fc.guild_id,
      ft.created_at AS occurred_at
    FROM public.forum_topics ft
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    CROSS JOIN now_ref n
    WHERE ft.author_id IS NOT NULL
      AND ft.created_at >= n.ts - INTERVAL '60 days'

    UNION ALL

    SELECT
      fp.author_id AS user_id,
      fc.guild_id,
      fp.created_at AS occurred_at
    FROM public.forum_posts fp
    JOIN public.forum_topics ft ON ft.id = fp.topic_id
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    CROSS JOIN now_ref n
    WHERE fp.author_id IS NOT NULL
      AND fp.created_at >= n.ts - INTERVAL '60 days'

    UNION ALL

    SELECT
      gpr.user_id,
      gp.guild_id,
      gpr.created_at AS occurred_at
    FROM public.guild_poll_responses gpr
    JOIN public.guild_poll_questions gpq ON gpq.id = gpr.question_id
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    CROSS JOIN now_ref n
    WHERE gpr.user_id IS NOT NULL
      AND gpr.created_at >= n.ts - INTERVAL '60 days'

    UNION ALL

    SELECT
      gm.user_id,
      gm.guild_id,
      gm.joined_at AS occurred_at
    FROM public.guild_members gm
    CROSS JOIN now_ref n
    WHERE gm.user_id IS NOT NULL
      AND gm.joined_at >= n.ts - INTERVAL '60 days'
  ),
  guild_activity AS (
    SELECT
      ua.guild_id,
      ua.occurred_at
    FROM user_activity ua
    WHERE ua.guild_id IS NOT NULL

    UNION ALL

    SELECT
      r.guild_id,
      r.updated_at AS occurred_at
    FROM public.rosters r
    CROSS JOIN now_ref n
    WHERE r.guild_id IS NOT NULL
      AND r.updated_at >= n.ts - INTERVAL '60 days'

    UNION ALL

    SELECT
      gp.guild_id,
      gp.updated_at AS occurred_at
    FROM public.guild_polls gp
    CROSS JOIN now_ref n
    WHERE gp.guild_id IS NOT NULL
      AND gp.updated_at >= n.ts - INTERVAL '60 days'
  ),
  activity_windows AS (
    SELECT
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '1 day'
      )::bigint AS dau_users,
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '2 days'
          AND ua.occurred_at < n.ts - INTERVAL '1 day'
      )::bigint AS dau_users_prev,
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '7 days'
      )::bigint AS wau_users,
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '14 days'
          AND ua.occurred_at < n.ts - INTERVAL '7 days'
      )::bigint AS wau_users_prev,
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '30 days'
      )::bigint AS mau_users,
      COUNT(DISTINCT ua.user_id) FILTER (
        WHERE ua.occurred_at >= n.ts - INTERVAL '60 days'
          AND ua.occurred_at < n.ts - INTERVAL '30 days'
      )::bigint AS mau_users_prev
    FROM user_activity ua
    CROSS JOIN now_ref n
  ),
  guild_activity_windows AS (
    SELECT
      COUNT(DISTINCT ga.guild_id) FILTER (
        WHERE ga.occurred_at >= n.ts - INTERVAL '30 days'
      )::bigint AS active_guilds_30d,
      COUNT(DISTINCT ga.guild_id) FILTER (
        WHERE ga.occurred_at >= n.ts - INTERVAL '60 days'
          AND ga.occurred_at < n.ts - INTERVAL '30 days'
      )::bigint AS active_guilds_30d_prev
    FROM guild_activity ga
    CROSS JOIN now_ref n
  ),
  activity_metrics AS (
    SELECT
      aw.dau_users,
      aw.wau_users,
      aw.mau_users,
      CASE
        WHEN aw.mau_users > 0
          THEN ROUND((aw.wau_users::numeric / aw.mau_users::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS wau_mau_ratio,
      CASE
        WHEN aw.dau_users_prev > 0
          THEN ROUND(((aw.dau_users - aw.dau_users_prev)::numeric / aw.dau_users_prev::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS dau_delta_pct,
      CASE
        WHEN aw.wau_users_prev > 0
          THEN ROUND(((aw.wau_users - aw.wau_users_prev)::numeric / aw.wau_users_prev::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS wau_delta_pct,
      CASE
        WHEN aw.mau_users_prev > 0
          THEN ROUND(((aw.mau_users - aw.mau_users_prev)::numeric / aw.mau_users_prev::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS mau_delta_pct,
      aw.mau_users AS active_users_30d,
      CASE
        WHEN aw.mau_users_prev > 0
          THEN ROUND(((aw.mau_users - aw.mau_users_prev)::numeric / aw.mau_users_prev::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS active_users_30d_delta_pct
    FROM activity_windows aw
  ),
  guild_metrics AS (
    SELECT
      gaw.active_guilds_30d,
      CASE
        WHEN gaw.active_guilds_30d_prev > 0
          THEN ROUND(((gaw.active_guilds_30d - gaw.active_guilds_30d_prev)::numeric / gaw.active_guilds_30d_prev::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS active_guilds_30d_delta_pct
    FROM guild_activity_windows gaw
  )
  SELECT
    users.total_users,
    guilds.total_guilds,
    topics.total_topics,
    posts.total_posts,
    reports.pending_reports,
    sanctions.active_sanctions,
    bugs.open_bugs,
    deletions.pending_deletions,
    wishes.unique_wish_users,
    wishes.total_wishes,
    wishes.guilds_with_wishes,
    wishes.guilds_with_roster_wishes,
    CASE
      WHEN guilds.total_guilds > 0
        THEN ROUND((wishes.guilds_with_roster_wishes::numeric / guilds.total_guilds::numeric) * 100)::int
      ELSE 0
    END AS guild_engagement_rate,
    guilds_with_two_members.guilds_with_two_members,
    guilds_with_two_wish_users.guilds_with_two_wish_users,
    polls.total_polls,
    polls.active_polls,
    polls.closed_polls,
    poll_voters.poll_voters,
    activity_metrics.dau_users,
    activity_metrics.wau_users,
    activity_metrics.mau_users,
    activity_metrics.wau_mau_ratio,
    activity_metrics.dau_delta_pct,
    activity_metrics.wau_delta_pct,
    activity_metrics.mau_delta_pct,
    activity_metrics.active_users_30d,
    activity_metrics.active_users_30d_delta_pct,
    guild_metrics.active_guilds_30d,
    guild_metrics.active_guilds_30d_delta_pct
  FROM users,
    guilds,
    topics,
    posts,
    reports,
    sanctions,
    bugs,
    deletions,
    wishes,
    guilds_with_two_members,
    guilds_with_two_wish_users,
    polls,
    poll_voters,
    activity_metrics,
    guild_metrics;
END;
$$;
