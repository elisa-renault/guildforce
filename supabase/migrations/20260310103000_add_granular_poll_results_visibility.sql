-- Granular poll results visibility by poll/section/question/question_type
-- with audience targeting by base audience, rank range, or specific user.

-- 1) Poll-level defaults
ALTER TABLE public.guild_polls
ADD COLUMN IF NOT EXISTS results_base_audience TEXT NOT NULL DEFAULT 'guild_members',
ADD COLUMN IF NOT EXISTS results_base_visibility TEXT NOT NULL DEFAULT 'full';

ALTER TABLE public.guild_polls
DROP CONSTRAINT IF EXISTS guild_polls_results_base_audience_check;

ALTER TABLE public.guild_polls
ADD CONSTRAINT guild_polls_results_base_audience_check
CHECK (results_base_audience IN ('guild_members', 'eligible_respondents', 'restricted'));

ALTER TABLE public.guild_polls
DROP CONSTRAINT IF EXISTS guild_polls_results_base_visibility_check;

ALTER TABLE public.guild_polls
ADD CONSTRAINT guild_polls_results_base_visibility_check
CHECK (results_base_visibility IN ('none', 'non_text', 'full'));

UPDATE public.guild_polls
SET results_base_audience = COALESCE(results_base_audience, 'guild_members'),
    results_base_visibility = COALESCE(results_base_visibility, 'full');

-- 2) Extend overrides table
ALTER TABLE public.poll_results_access_rules
ADD COLUMN IF NOT EXISTS audience_type TEXT,
ADD COLUMN IF NOT EXISTS visibility_level TEXT,
ADD COLUMN IF NOT EXISTS target_type TEXT,
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.guild_poll_sections(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.guild_poll_questions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS question_type public.poll_question_type;

-- Backfill from legacy shape
UPDATE public.poll_results_access_rules
SET audience_type = CASE
      WHEN access_type = 'rank_range' THEN 'rank_range'
      WHEN access_type = 'user' THEN 'user'
      ELSE COALESCE(audience_type, 'base_audience')
    END,
    visibility_level = COALESCE(visibility_level, 'full'),
    target_type = COALESCE(target_type, 'poll')
WHERE audience_type IS NULL
   OR visibility_level IS NULL
   OR target_type IS NULL;

ALTER TABLE public.poll_results_access_rules
ALTER COLUMN audience_type SET NOT NULL,
ALTER COLUMN audience_type SET DEFAULT 'base_audience',
ALTER COLUMN visibility_level SET NOT NULL,
ALTER COLUMN visibility_level SET DEFAULT 'full',
ALTER COLUMN target_type SET NOT NULL,
ALTER COLUMN target_type SET DEFAULT 'poll';

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS poll_results_access_rules_audience_type_check;

ALTER TABLE public.poll_results_access_rules
ADD CONSTRAINT poll_results_access_rules_audience_type_check
CHECK (audience_type IN ('base_audience', 'rank_range', 'user'));

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS poll_results_access_rules_visibility_level_check;

ALTER TABLE public.poll_results_access_rules
ADD CONSTRAINT poll_results_access_rules_visibility_level_check
CHECK (visibility_level IN ('none', 'non_text', 'full'));

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS poll_results_access_rules_target_type_check;

ALTER TABLE public.poll_results_access_rules
ADD CONSTRAINT poll_results_access_rules_target_type_check
CHECK (target_type IN ('poll', 'section', 'question', 'question_type'));

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS poll_results_access_rules_valid_audience_target;

ALTER TABLE public.poll_results_access_rules
ADD CONSTRAINT poll_results_access_rules_valid_audience_target
CHECK (
  (
    audience_type = 'base_audience'
    AND user_id IS NULL
    AND min_rank_index IS NULL
    AND max_rank_index IS NULL
  ) OR (
    audience_type = 'rank_range'
    AND user_id IS NULL
    AND min_rank_index IS NOT NULL
    AND max_rank_index IS NOT NULL
  ) OR (
    audience_type = 'user'
    AND user_id IS NOT NULL
    AND min_rank_index IS NULL
    AND max_rank_index IS NULL
  )
);

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS poll_results_access_rules_valid_target;

ALTER TABLE public.poll_results_access_rules
ADD CONSTRAINT poll_results_access_rules_valid_target
CHECK (
  (
    target_type = 'poll'
    AND section_id IS NULL
    AND question_id IS NULL
    AND question_type IS NULL
  ) OR (
    target_type = 'section'
    AND section_id IS NOT NULL
    AND question_id IS NULL
    AND question_type IS NULL
  ) OR (
    target_type = 'question'
    AND section_id IS NULL
    AND question_id IS NOT NULL
    AND question_type IS NULL
  ) OR (
    target_type = 'question_type'
    AND section_id IS NULL
    AND question_id IS NULL
    AND question_type IS NOT NULL
  )
);

ALTER TABLE public.poll_results_access_rules
DROP CONSTRAINT IF EXISTS valid_rank_range;

ALTER TABLE public.poll_results_access_rules
DROP COLUMN IF EXISTS access_type;

CREATE INDEX IF NOT EXISTS idx_poll_results_access_rules_poll_id
  ON public.poll_results_access_rules(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_results_access_rules_target
  ON public.poll_results_access_rules(poll_id, target_type, section_id, question_id, question_type);
CREATE INDEX IF NOT EXISTS idx_poll_results_access_rules_audience
  ON public.poll_results_access_rules(poll_id, audience_type, user_id, min_rank_index, max_rank_index);

-- 3) Visibility resolution per question
CREATE OR REPLACE FUNCTION public.get_poll_question_results_visibility(p_question_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll_id UUID;
  v_guild_id UUID;
  v_section_id UUID;
  v_question_type public.poll_question_type;
  v_base_audience TEXT;
  v_base_visibility TEXT;
  v_is_manager BOOLEAN := FALSE;
  v_is_base_audience_member BOOLEAN := FALSE;
  v_user_rank INTEGER;
  v_visibility TEXT := 'none';
  v_override_visibility TEXT;
BEGIN
  SELECT q.poll_id, q.section_id, q.question_type, p.guild_id, p.results_base_audience, p.results_base_visibility
  INTO v_poll_id, v_section_id, v_question_type, v_guild_id, v_base_audience, v_base_visibility
  FROM public.guild_poll_questions q
  JOIN public.guild_polls p ON p.id = q.poll_id
  WHERE q.id = p_question_id;

  IF v_poll_id IS NULL OR v_guild_id IS NULL THEN
    RETURN 'none';
  END IF;

  IF public.is_guild_gm(v_guild_id, p_user_id)
     OR public.has_guild_permission(v_guild_id, p_user_id, 'manage_polls') THEN
    RETURN 'full';
  END IF;

  IF v_base_audience = 'guild_members' THEN
    v_is_base_audience_member := public.is_guild_member(v_guild_id, p_user_id);
  ELSIF v_base_audience = 'eligible_respondents' THEN
    v_is_base_audience_member := public.can_respond_to_poll(v_poll_id, p_user_id);
  ELSE
    v_is_base_audience_member := FALSE;
  END IF;

  IF v_is_base_audience_member THEN
    v_visibility := v_base_visibility;
  END IF;

  SELECT MIN(wgm.rank_index)
  INTO v_user_rank
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g
    ON g.id = v_guild_id
   AND LOWER(g.name) = LOWER(wgm.guild_name)
   AND LOWER(g.server) = LOWER(wgm.guild_realm_slug)
   AND LOWER(g.region) = LOWER(wgm.guild_region)
  WHERE wgm.user_id = p_user_id;

  SELECT visibility_level
  INTO v_override_visibility
  FROM (
    SELECT
      r.visibility_level,
      CASE r.target_type
        WHEN 'question' THEN 4
        WHEN 'section' THEN 3
        WHEN 'question_type' THEN 2
        ELSE 1
      END AS target_priority,
      CASE r.visibility_level
        WHEN 'full' THEN 3
        WHEN 'non_text' THEN 2
        ELSE 1
      END AS visibility_priority
    FROM public.poll_results_access_rules r
    WHERE r.poll_id = v_poll_id
      AND (
        (r.audience_type = 'base_audience' AND v_is_base_audience_member)
        OR (r.audience_type = 'user' AND r.user_id = p_user_id)
        OR (
          r.audience_type = 'rank_range'
          AND v_user_rank IS NOT NULL
          AND v_user_rank >= r.min_rank_index
          AND v_user_rank <= r.max_rank_index
        )
      )
      AND (
        (r.target_type = 'poll')
        OR (r.target_type = 'section' AND r.section_id = v_section_id)
        OR (r.target_type = 'question' AND r.question_id = p_question_id)
        OR (r.target_type = 'question_type' AND r.question_type = v_question_type)
      )
    ORDER BY target_priority DESC, visibility_priority DESC
    LIMIT 1
  ) ranked;

  IF v_override_visibility IS NOT NULL THEN
    v_visibility := v_override_visibility;
  END IF;

  IF v_visibility = 'non_text' AND v_question_type = 'text' THEN
    RETURN 'none';
  END IF;

  RETURN v_visibility;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_poll_results_visibility_map(p_poll_id UUID, p_user_id UUID)
RETURNS TABLE(question_id UUID, visibility_level TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id AS question_id,
    public.get_poll_question_results_visibility(q.id, p_user_id) AS visibility_level
  FROM public.guild_poll_questions q
  WHERE q.poll_id = p_poll_id
  ORDER BY q.display_order;
$$;

CREATE OR REPLACE FUNCTION public.can_view_poll_results(p_poll_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guild_poll_questions q
    WHERE q.poll_id = p_poll_id
      AND public.get_poll_question_results_visibility(q.id, p_user_id) <> 'none'
  );
$$;

-- 4) Response visibility policy based on question-level visibility
DROP POLICY IF EXISTS "Users with results access can view all responses" ON public.guild_poll_responses;

CREATE POLICY "Users with granular results access can view responses"
ON public.guild_poll_responses
FOR SELECT
USING (
  public.get_poll_question_results_visibility(guild_poll_responses.question_id, auth.uid()) <> 'none'
);
