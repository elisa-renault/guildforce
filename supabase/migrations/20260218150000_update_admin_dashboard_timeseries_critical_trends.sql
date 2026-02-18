-- Extend admin dashboard time-series with critical issue creation trends.
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
      cw.updated_at AS occurred_at
    FROM public.class_wishes cw
    JOIN bounds b ON cw.updated_at >= b.start_date::timestamp - interval '30 days'
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
      gm.user_id,
      gm.guild_id,
      gm.joined_at AS occurred_at
    FROM public.guild_members gm
    JOIN bounds b ON gm.joined_at >= b.start_date::timestamp - interval '30 days'
    WHERE gm.user_id IS NOT NULL

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
      SELECT CASE WHEN mau > 0 THEN ROUND((wau / mau) * 100, 2) ELSE NULL::numeric END
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
      WHERE fr.status = 'pending'
        AND fr.created_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS pending_reports,
    (
      SELECT COUNT(*)::bigint
      FROM public.bug_reports br
      WHERE br.status = 'open'
        AND br.created_at < (b.bucket_date::timestamp + interval '1 day')
    ) AS open_bugs,
    (
      SELECT COUNT(*)::bigint
      FROM public.account_deletion_requests adr
      WHERE adr.status = 'pending'
        AND COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
    ) AS pending_deletions,
    (
      (
        SELECT COUNT(*)::bigint
        FROM public.forum_reports fr
        WHERE fr.status = 'pending'
          AND fr.created_at < (b.bucket_date::timestamp + interval '1 day')
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.bug_reports br
        WHERE br.status = 'open'
          AND br.created_at < (b.bucket_date::timestamp + interval '1 day')
      )
      +
      (
        SELECT COUNT(*)::bigint
        FROM public.account_deletion_requests adr
        WHERE adr.status = 'pending'
          AND COALESCE(adr.requested_at, adr.created_at) < (b.bucket_date::timestamp + interval '1 day')
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
