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
    )::date AS bucket_day
  ),
  user_activity AS (
    SELECT cw.user_id, cw.guild_id, cw.created_at AS occurred_at
    FROM public.class_wishes cw
    WHERE cw.user_id IS NOT NULL
      AND cw.created_at >= (SELECT MIN(days.bucket_day) FROM days)

    UNION ALL

    SELECT gpr.user_id, gp.guild_id, gpr.created_at AS occurred_at
    FROM public.guild_poll_responses gpr
    JOIN public.guild_poll_questions gpq ON gpq.id = gpr.question_id
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpr.user_id IS NOT NULL
      AND gpr.created_at >= (SELECT MIN(days.bucket_day) FROM days)

    UNION ALL

    SELECT pe.user_id, pe.guild_id, pe.occurred_at
    FROM public.product_events pe
    WHERE pe.user_id IS NOT NULL
      AND pe.occurred_at >= (SELECT MIN(days.bucket_day) FROM days)
      AND pe.event_name IN ('wish_created', 'poll_voted', 'guild_member_invited', 'activated_first_action')
  )
  SELECT
    d.bucket_day AS bucket_date,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day AND ua.occurred_at < d.bucket_day + INTERVAL '1 day')::bigint AS dau_users,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day - INTERVAL '6 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day')::bigint AS wau_users,
    COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day - INTERVAL '29 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day')::bigint AS mau_users,
    CASE
      WHEN COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day - INTERVAL '29 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day') >= 20
      THEN ROUND(
        COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day - INTERVAL '6 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day')::numeric
        / NULLIF(COUNT(DISTINCT ua.user_id) FILTER (WHERE ua.occurred_at >= d.bucket_day - INTERVAL '29 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day'), 0)::numeric
        * 100,
        1
      )
      ELSE NULL
    END AS engagement_wau_mau_pct,
    (SELECT COUNT(*)::bigint FROM public.profiles p WHERE p.created_at >= d.bucket_day AND p.created_at < d.bucket_day + INTERVAL '1 day') AS new_signups,
    NULL::bigint AS activated_users_7d,
    NULL::numeric AS activation_rate_7d_pct,
    COUNT(DISTINCT ua.guild_id) FILTER (WHERE ua.guild_id IS NOT NULL AND ua.occurred_at >= d.bucket_day - INTERVAL '29 days' AND ua.occurred_at < d.bucket_day + INTERVAL '1 day')::bigint AS active_guilds_30d,
    (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.status = 'open' AND br.created_at < d.bucket_day + INTERVAL '1 day') AS open_bugs,
    (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE adr.status = 'pending' AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_day + INTERVAL '1 day') AS pending_deletions,
    (
      (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.status = 'open' AND br.created_at < d.bucket_day + INTERVAL '1 day')
      + (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE adr.status = 'pending' AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_day + INTERVAL '1 day')
    ) AS critical_issues,
    (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.created_at >= d.bucket_day AND br.created_at < d.bucket_day + INTERVAL '1 day') AS created_bugs,
    (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE COALESCE(adr.requested_at, adr.created_at) >= d.bucket_day AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_day + INTERVAL '1 day') AS created_deletions,
    (
      (SELECT COUNT(*)::bigint FROM public.bug_reports br WHERE br.created_at >= d.bucket_day AND br.created_at < d.bucket_day + INTERVAL '1 day')
      + (SELECT COUNT(*)::bigint FROM public.account_deletion_requests adr WHERE COALESCE(adr.requested_at, adr.created_at) >= d.bucket_day AND COALESCE(adr.requested_at, adr.created_at) < d.bucket_day + INTERVAL '1 day')
    ) AS critical_created_issues
  FROM days d
  LEFT JOIN user_activity ua
    ON ua.occurred_at >= d.bucket_day - INTERVAL '29 days'
   AND ua.occurred_at < d.bucket_day + INTERVAL '1 day'
  GROUP BY d.bucket_day
  ORDER BY d.bucket_day;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_timeseries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_timeseries(integer) TO authenticated;
