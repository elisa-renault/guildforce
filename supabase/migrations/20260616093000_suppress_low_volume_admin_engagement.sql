-- Keep admin product activity metrics tied to explicit user actions and avoid
-- misleading engagement ratios when the active-user denominator is too small.
-- Battle.net roster/member resyncs and schema backfills can mutate timestamps in bulk;
-- those technical writes must not count as DAU/WAU/MAU, activation, or retention.

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
      cw.created_at AS occurred_at
    FROM public.class_wishes cw
    CROSS JOIN now_ref n
    WHERE cw.user_id IS NOT NULL
      AND cw.created_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT
      ft.author_id AS user_id,
      fc.guild_id,
      ft.created_at AS occurred_at
    FROM public.forum_topics ft
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    CROSS JOIN now_ref n
    WHERE ft.author_id IS NOT NULL
      AND ft.created_at >= n.ts - INTERVAL '90 days'

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
      AND fp.created_at >= n.ts - INTERVAL '90 days'

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
      AND gpr.created_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT
      pe.user_id,
      pe.guild_id,
      pe.occurred_at
    FROM public.product_events pe
    CROSS JOIN now_ref n
    WHERE pe.user_id IS NOT NULL
      AND pe.occurred_at >= n.ts - INTERVAL '90 days'
      AND pe.event_name IN (
        'wish_created',
        'poll_voted',
        'forum_post_created',
        'guild_member_invited',
        'activated_first_action'
      )
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
      AND r.updated_at >= n.ts - INTERVAL '90 days'

    UNION ALL

    SELECT
      gp.guild_id,
      gp.updated_at AS occurred_at
    FROM public.guild_polls gp
    CROSS JOIN now_ref n
    WHERE gp.guild_id IS NOT NULL
      AND gp.updated_at >= n.ts - INTERVAL '90 days'
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
  cohort_users AS (
    SELECT
      p.id,
      p.created_at,
      (p.created_at >= n.ts - INTERVAL '14 days' AND p.created_at < n.ts - INTERVAL '7 days') AS in_d7_cohort,
      (p.created_at >= n.ts - INTERVAL '60 days' AND p.created_at < n.ts - INTERVAL '30 days') AS in_d30_cohort,
      (p.created_at >= n.ts - INTERVAL '7 days') AS in_signup_7d
    FROM public.profiles p
    CROSS JOIN now_ref n
    WHERE p.created_at IS NOT NULL
      AND p.created_at >= n.ts - INTERVAL '60 days'
  ),
  retention_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE cu.in_d7_cohort)::bigint AS d7_cohort_size,
      COUNT(*) FILTER (
        WHERE cu.in_d7_cohort
          AND EXISTS (
            SELECT 1
            FROM user_activity ua
            WHERE ua.user_id = cu.id
              AND ua.occurred_at >= cu.created_at
              AND ua.occurred_at < cu.created_at + INTERVAL '7 days'
          )
      )::bigint AS d7_retained,
      COUNT(*) FILTER (WHERE cu.in_d30_cohort)::bigint AS d30_cohort_size,
      COUNT(*) FILTER (
        WHERE cu.in_d30_cohort
          AND EXISTS (
            SELECT 1
            FROM user_activity ua
            WHERE ua.user_id = cu.id
              AND ua.occurred_at >= cu.created_at
              AND ua.occurred_at < cu.created_at + INTERVAL '30 days'
          )
      )::bigint AS d30_retained,
      COUNT(*) FILTER (WHERE cu.in_signup_7d)::bigint AS signups_7d,
      COUNT(*) FILTER (
        WHERE cu.in_signup_7d
          AND EXISTS (
            SELECT 1
            FROM user_activity ua
            WHERE ua.user_id = cu.id
              AND ua.occurred_at >= cu.created_at
              AND ua.occurred_at < cu.created_at + INTERVAL '7 days'
          )
      )::bigint AS activated_7d
    FROM cohort_users cu
  ),
  activity_metrics AS (
    SELECT
      aw.dau_users,
      aw.wau_users,
      aw.mau_users,
      CASE
        WHEN aw.mau_users >= 20
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
  ),
  cohort_metrics AS (
    SELECT
      CASE
        WHEN rm.d7_cohort_size > 0
          THEN ROUND((rm.d7_retained::numeric / rm.d7_cohort_size::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS retention_d7_pct,
      CASE
        WHEN rm.d30_cohort_size > 0
          THEN ROUND((rm.d30_retained::numeric / rm.d30_cohort_size::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS retention_d30_pct,
      rm.signups_7d AS new_signups_7d,
      CASE
        WHEN rm.signups_7d > 0
          THEN ROUND((rm.activated_7d::numeric / rm.signups_7d::numeric) * 100, 2)
        ELSE NULL::numeric
      END AS activation_rate_7d_pct
    FROM retention_metrics rm
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
    guild_metrics.active_guilds_30d_delta_pct,
    cohort_metrics.retention_d7_pct,
    cohort_metrics.retention_d30_pct,
    cohort_metrics.new_signups_7d,
    cohort_metrics.activation_rate_7d_pct
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
    guild_metrics,
    cohort_metrics;
END;
$$;

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
  pending_reports bigint,
  open_bugs bigint,
  pending_deletions bigint,
  critical_issues bigint,
  created_reports bigint,
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

  v_days := GREATEST(14, LEAST(COALESCE(p_days, 84), 180));

  RETURN QUERY
  WITH
  now_ref AS (
    SELECT timezone('utc', now()) AS ts
  ),
  bounds AS (
    SELECT
      (date_trunc('day', n.ts)::date - (v_days - 1))::date AS start_date,
      date_trunc('day', n.ts)::date AS end_date
    FROM now_ref n
  ),
  buckets AS (
    SELECT generate_series(b.start_date, b.end_date, interval '1 day')::date AS bucket_date
    FROM bounds b
  ),
  user_activity AS (
    SELECT
      cw.user_id,
      cw.guild_id,
      cw.created_at AS occurred_at
    FROM public.class_wishes cw
    JOIN bounds b ON cw.created_at >= b.start_date::timestamp - interval '30 days'
    WHERE cw.user_id IS NOT NULL

    UNION ALL

    SELECT
      ft.author_id AS user_id,
      fc.guild_id,
      ft.created_at AS occurred_at
    FROM public.forum_topics ft
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    JOIN bounds b ON ft.created_at >= b.start_date::timestamp - interval '30 days'
    WHERE ft.author_id IS NOT NULL

    UNION ALL

    SELECT
      fp.author_id AS user_id,
      fc.guild_id,
      fp.created_at AS occurred_at
    FROM public.forum_posts fp
    JOIN public.forum_topics ft ON ft.id = fp.topic_id
    JOIN public.forum_categories fc ON fc.id = ft.category_id
    JOIN bounds b ON fp.created_at >= b.start_date::timestamp - interval '30 days'
    WHERE fp.author_id IS NOT NULL

    UNION ALL

    SELECT
      gpr.user_id,
      gp.guild_id,
      gpr.created_at AS occurred_at
    FROM public.guild_poll_responses gpr
    JOIN public.guild_poll_questions gpq ON gpq.id = gpr.question_id
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    JOIN bounds b ON gpr.created_at >= b.start_date::timestamp - interval '30 days'
    WHERE gpr.user_id IS NOT NULL

    UNION ALL

    SELECT
      pe.user_id,
      pe.guild_id,
      pe.occurred_at
    FROM public.product_events pe
    JOIN bounds b ON pe.occurred_at >= b.start_date::timestamp - interval '30 days'
    WHERE pe.user_id IS NOT NULL
      AND pe.event_name IN (
        'wish_created',
        'poll_voted',
        'forum_post_created',
        'guild_member_invited',
        'activated_first_action'
      )
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
    JOIN bounds b ON r.updated_at >= b.start_date::timestamp - interval '30 days'
    WHERE r.guild_id IS NOT NULL

    UNION ALL

    SELECT
      gp.guild_id,
      gp.updated_at AS occurred_at
    FROM public.guild_polls gp
    JOIN bounds b ON gp.updated_at >= b.start_date::timestamp - interval '30 days'
    WHERE gp.guild_id IS NOT NULL
  ),
  signup_base AS (
    SELECT
      p.id,
      p.created_at,
      date_trunc('day', p.created_at)::date AS signup_date
    FROM public.profiles p
    JOIN bounds b ON p.created_at >= b.start_date::timestamp
      AND p.created_at < (b.end_date::timestamp + interval '1 day')
  )
  SELECT
    b.bucket_date,
    (
      SELECT COUNT(DISTINCT ua.user_id)::bigint
      FROM user_activity ua
      WHERE ua.occurred_at >= b.bucket_date::timestamp
        AND ua.occurred_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS dau_users,
    (
      SELECT COUNT(DISTINCT ua.user_id)::bigint
      FROM user_activity ua
      WHERE ua.occurred_at >= (b.bucket_date::timestamp + interval '1 day' - interval '7 days')
        AND ua.occurred_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS wau_users,
    (
      SELECT COUNT(DISTINCT ua.user_id)::bigint
      FROM user_activity ua
      WHERE ua.occurred_at >= (b.bucket_date::timestamp + interval '1 day' - interval '30 days')
        AND ua.occurred_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS mau_users,
    (
      WITH wau_mau AS (
        SELECT
          (
            SELECT COUNT(DISTINCT ua.user_id)::numeric
            FROM user_activity ua
            WHERE ua.occurred_at >= (b.bucket_date::timestamp + interval '1 day' - interval '7 days')
              AND ua.occurred_at < (b.bucket_date::timestamp + interval '1 day')
          ) AS wau,
          (
            SELECT COUNT(DISTINCT ua.user_id)::numeric
            FROM user_activity ua
            WHERE ua.occurred_at >= (b.bucket_date::timestamp + interval '1 day' - interval '30 days')
              AND ua.occurred_at < (b.bucket_date::timestamp + interval '1 day')
          ) AS mau
      )
      SELECT CASE WHEN mau >= 20 THEN ROUND((wau / mau) * 100, 2) ELSE NULL::numeric END
      FROM wau_mau
    ) AS engagement_wau_mau_pct,
    (
      SELECT COUNT(*)::bigint
      FROM signup_base sb
      WHERE sb.signup_date = b.bucket_date
    ) AS new_signups,
    (
      CASE
        WHEN b.bucket_date <= ((SELECT end_date FROM bounds) - 7)
          THEN (
            SELECT COUNT(*)::bigint
            FROM signup_base sb
            WHERE sb.signup_date = b.bucket_date
              AND EXISTS (
                SELECT 1
                FROM user_activity ua
                WHERE ua.user_id = sb.id
                  AND ua.occurred_at >= sb.created_at
                  AND ua.occurred_at < (sb.created_at + interval '7 days')
              )
          )
        ELSE NULL::bigint
      END
    ) AS activated_users_7d,
    (
      CASE
        WHEN b.bucket_date <= ((SELECT end_date FROM bounds) - 7)
          THEN (
            WITH cohort AS (
              SELECT
                COUNT(*)::numeric AS total,
                COUNT(*) FILTER (
                  WHERE EXISTS (
                    SELECT 1
                    FROM user_activity ua
                    WHERE ua.user_id = sb.id
                      AND ua.occurred_at >= sb.created_at
                      AND ua.occurred_at < (sb.created_at + interval '7 days')
                  )
                )::numeric AS activated
              FROM signup_base sb
              WHERE sb.signup_date = b.bucket_date
            )
            SELECT CASE WHEN total > 0 THEN ROUND((activated / total) * 100, 2) ELSE NULL::numeric END
            FROM cohort
          )
        ELSE NULL::numeric
      END
    ) AS activation_rate_7d_pct,
    (
      SELECT COUNT(DISTINCT ga.guild_id)::bigint
      FROM guild_activity ga
      WHERE ga.occurred_at >= (b.bucket_date::timestamp + interval '1 day' - interval '30 days')
        AND ga.occurred_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS active_guilds_30d,
    (
      SELECT COUNT(*)::bigint
      FROM public.forum_reports fr
      WHERE fr.created_at < (b.bucket_date::timestamp + interval '1 day')
        AND (
          (fr.resolved_at IS NULL AND fr.status = 'pending')
          OR fr.resolved_at >= (b.bucket_date::timestamp + interval '1 day')
        )
    ) AS pending_reports,
    (
      SELECT COUNT(*)::bigint
      FROM public.bug_reports br
      WHERE br.created_at < (b.bucket_date::timestamp + interval '1 day')
        AND (
          (br.resolved_at IS NULL AND br.status IN ('open', 'investigating'))
          OR br.resolved_at >= (b.bucket_date::timestamp + interval '1 day')
        )
    ) AS open_bugs,
    (
      SELECT COUNT(*)::bigint
      FROM public.account_deletion_requests adr
      WHERE COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
        AND (
          (adr.processed_at IS NULL AND adr.status = 'pending')
          OR adr.processed_at >= (b.bucket_date::timestamp + interval '1 day')
        )
    ) AS pending_deletions,
    (
      (
        SELECT COUNT(*)::bigint
        FROM public.forum_reports fr
        WHERE fr.created_at < (b.bucket_date::timestamp + interval '1 day')
          AND (
            (fr.resolved_at IS NULL AND fr.status = 'pending')
            OR fr.resolved_at >= (b.bucket_date::timestamp + interval '1 day')
          )
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.bug_reports br
        WHERE br.created_at < (b.bucket_date::timestamp + interval '1 day')
          AND (
            (br.resolved_at IS NULL AND br.status IN ('open', 'investigating'))
            OR br.resolved_at >= (b.bucket_date::timestamp + interval '1 day')
          )
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.account_deletion_requests adr
        WHERE COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
          AND (
            (adr.processed_at IS NULL AND adr.status = 'pending')
            OR adr.processed_at >= (b.bucket_date::timestamp + interval '1 day')
          )
      )
    ) AS critical_issues,
    (
      SELECT COUNT(*)::bigint
      FROM public.forum_reports fr
      WHERE fr.created_at >= b.bucket_date::timestamp
        AND fr.created_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS created_reports,
    (
      SELECT COUNT(*)::bigint
      FROM public.bug_reports br
      WHERE br.created_at >= b.bucket_date::timestamp
        AND br.created_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS created_bugs,
    (
      SELECT COUNT(*)::bigint
      FROM public.account_deletion_requests adr
      WHERE COALESCE(adr.requested_at, adr.created_at) >= b.bucket_date::timestamp
        AND COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
    ) AS created_deletions,
    (
      (
        SELECT COUNT(*)::bigint
        FROM public.forum_reports fr
        WHERE fr.created_at >= b.bucket_date::timestamp
          AND fr.created_at < (b.bucket_date::timestamp + interval '1 day')
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.bug_reports br
        WHERE br.created_at >= b.bucket_date::timestamp
          AND br.created_at < (b.bucket_date::timestamp + interval '1 day')
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.account_deletion_requests adr
        WHERE COALESCE(adr.requested_at, adr.created_at) >= b.bucket_date::timestamp
          AND COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
      )
    ) AS critical_created_issues
  FROM buckets b
  ORDER BY b.bucket_date ASC;
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_stats()
  IS 'Admin dashboard KPI snapshot. Product activity windows intentionally exclude Battle.net membership sync/backfill timestamps; WAU/MAU is null until MAU reaches 20 users.';

COMMENT ON FUNCTION public.get_admin_dashboard_timeseries(integer)
  IS 'Admin dashboard daily trend points. Product activity uses explicit user actions, excludes Battle.net membership sync/backfill timestamps, and returns null WAU/MAU until MAU reaches 20 users.';
