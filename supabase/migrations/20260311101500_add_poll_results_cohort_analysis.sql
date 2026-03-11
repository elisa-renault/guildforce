-- Manager-only cohort analysis for poll results, with anonymous safeguards.

CREATE OR REPLACE FUNCTION public.get_poll_results_cohort_analysis(
  p_poll_id UUID,
  p_user_id UUID,
  p_filters JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
  v_is_anonymous BOOLEAN := FALSE;
  v_guard_anonymous BOOLEAN := FALSE;
  v_filters JSONB := COALESCE(p_filters, '[]'::jsonb);
  v_filter_count INTEGER := 0;
  v_result JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not allowed to resolve cohort analysis for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_filters) <> 'array' THEN
    RAISE EXCEPTION 'Cohort filters must be a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  SELECT guild_id, is_anonymous
  INTO v_guild_id, v_is_anonymous
  FROM public.guild_polls
  WHERE id = p_poll_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Poll % was not found.', p_poll_id
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, p_user_id)
    OR public.has_guild_permission(v_guild_id, p_user_id, 'manage_polls')
  ) THEN
    RAISE EXCEPTION 'Only guild GMs and members with manage_polls can use cohort analysis.'
      USING ERRCODE = '42501';
  END IF;

  v_guard_anonymous := v_is_anonymous AND jsonb_array_length(v_filters) > 0;

  WITH filter_rows AS (
    SELECT
      (entry.value->>'question_id')::uuid AS question_id,
      NULLIF(entry.value->>'match_value', '') AS match_value
    FROM jsonb_array_elements(v_filters) AS entry(value)
  )
  SELECT COUNT(*)
  INTO v_filter_count
  FROM filter_rows f
  JOIN public.guild_poll_questions q
    ON q.id = f.question_id
   AND q.poll_id = p_poll_id
  WHERE f.match_value IS NOT NULL
    AND q.question_type IN ('single_choice', 'multiple_choice', 'rating', 'date', 'time', 'datetime', 'scale');

  IF v_filter_count <> jsonb_array_length(v_filters) THEN
    RAISE EXCEPTION 'One or more cohort filters target an invalid or unsupported question.'
      USING ERRCODE = '22023';
  END IF;

  WITH poll_questions AS (
    SELECT q.id, q.display_order, q.question_type
    FROM public.guild_poll_questions q
    WHERE q.poll_id = p_poll_id
  ),
  filter_rows AS (
    SELECT
      (entry.value->>'question_id')::uuid AS question_id,
      NULLIF(entry.value->>'match_value', '') AS match_value
    FROM jsonb_array_elements(v_filters) AS entry(value)
  ),
  validated_filters AS (
    SELECT
      f.question_id,
      f.match_value,
      q.question_type
    FROM filter_rows f
    JOIN poll_questions q ON q.id = f.question_id
  ),
  all_poll_respondents AS (
    SELECT DISTINCT r.user_id
    FROM public.guild_poll_responses r
    JOIN poll_questions q ON q.id = r.question_id
  ),
  cohort_users AS (
    SELECT respondent.user_id
    FROM all_poll_respondents respondent
    WHERE NOT EXISTS (
      SELECT 1
      FROM validated_filters filter_item
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.guild_poll_responses response
        WHERE response.user_id = respondent.user_id
          AND response.question_id = filter_item.question_id
          AND (
            (
              filter_item.question_type IN ('single_choice', 'rating', 'date', 'time', 'datetime', 'scale')
              AND response.response_value->>'value' = filter_item.match_value
            )
            OR (
              filter_item.question_type = 'multiple_choice'
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(COALESCE(response.response_value->'values', '[]'::jsonb)) AS selected(value)
                WHERE selected.value = filter_item.match_value
              )
            )
          )
      )
    )
  ),
  question_results AS (
    SELECT
      q.id AS question_id,
      q.display_order,
      q.question_type,
      COUNT(r.id)::integer AS response_count,
      (
        v_guard_anonymous
        AND (
          q.question_type = 'text'
          OR COUNT(r.id) < 5
        )
      ) AS is_redacted,
      CASE
        WHEN v_guard_anonymous AND q.question_type = 'text' THEN 'text_hidden'
        WHEN v_guard_anonymous AND COUNT(r.id) < 5 THEN 'minimum_sample'
        ELSE NULL
      END AS redaction_reason,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'question_id', r.question_id,
            'user_id', CONCAT(q.id::text, ':', r.id::text),
            'response_value', r.response_value,
            'created_at', r.created_at
          )
          ORDER BY r.created_at
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::jsonb
      ) AS responses
    FROM public.guild_poll_questions q
    LEFT JOIN public.guild_poll_responses r
      ON r.question_id = q.id
     AND EXISTS (
       SELECT 1
       FROM cohort_users cohort
       WHERE cohort.user_id = r.user_id
     )
    WHERE q.poll_id = p_poll_id
      AND public.get_poll_question_results_visibility(q.id, p_user_id) <> 'none'
    GROUP BY q.id, q.display_order, q.question_type
  )
  SELECT jsonb_build_object(
    'cohort_respondent_count',
    COALESCE((SELECT COUNT(*) FROM cohort_users), 0),
    'global_respondent_count',
    COALESCE((SELECT COUNT(*) FROM all_poll_respondents), 0),
    'is_anonymous_guarded',
    v_guard_anonymous,
    'filters',
    v_filters,
    'questions',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'question_id', question_result.question_id,
            'response_count', question_result.response_count,
            'is_redacted', question_result.is_redacted,
            'redaction_reason', question_result.redaction_reason,
            'responses',
            CASE
              WHEN question_result.is_redacted THEN '[]'::jsonb
              ELSE question_result.responses
            END
          )
          ORDER BY question_result.display_order
        )
        FROM question_results question_result
      ),
      '[]'::jsonb
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_results_cohort_analysis(UUID, UUID, JSONB) TO authenticated;
