-- Add admin dashboard stats RPC for efficient aggregation
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
  poll_voters bigint
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
    SELECT guild_id, COUNT(DISTINCT user_id)::bigint AS unique_wish_users
    FROM public.class_wishes
    WHERE roster_id IS NOT NULL
    GROUP BY guild_id
  ),
  guilds_with_two_wish_users AS (
    SELECT COUNT(*)::bigint AS guilds_with_two_wish_users
    FROM guild_wish_user_counts
    WHERE unique_wish_users >= 2
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
    poll_voters.poll_voters
  FROM users, guilds, topics, posts, reports, sanctions, bugs, deletions, wishes,
       guilds_with_two_members, guilds_with_two_wish_users, polls, poll_voters;
END;
$$;
