-- Track roster wish activity at season granularity.

ALTER TABLE public.guild_activity_logs
  ADD COLUMN IF NOT EXISTS season_id UUID;

ALTER TABLE public.guild_activity_logs
  DROP CONSTRAINT IF EXISTS guild_activity_logs_season_id_fkey;

ALTER TABLE public.guild_activity_logs
  ADD CONSTRAINT guild_activity_logs_season_id_fkey
  FOREIGN KEY (season_id)
  REFERENCES public.roster_wish_seasons(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guild_activity_logs_season_id
  ON public.guild_activity_logs(season_id);

CREATE INDEX IF NOT EXISTS idx_guild_activity_logs_roster_season_target
  ON public.guild_activity_logs(roster_id, season_id, target_user_id, created_at DESC);

UPDATE public.guild_activity_logs gal
SET season_id = (gal.action_details ->> 'season_id')::uuid
WHERE gal.season_id IS NULL
  AND gal.action_details ? 'season_id'
  AND (gal.action_details ->> 'season_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.roster_wish_seasons rws
    WHERE rws.id = (gal.action_details ->> 'season_id')::uuid
  );

DROP FUNCTION IF EXISTS public.log_guild_activity(UUID, UUID, TEXT, JSONB, UUID, UUID);

CREATE OR REPLACE FUNCTION public.log_guild_activity(
  p_guild_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_target_user_id UUID DEFAULT NULL,
  p_roster_id UUID DEFAULT NULL,
  p_season_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF p_guild_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guilds g WHERE g.id = p_guild_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.guild_activity_logs (
    guild_id,
    user_id,
    action_type,
    action_details,
    target_user_id,
    roster_id,
    season_id
  )
  VALUES (
    p_guild_id,
    p_user_id,
    p_action_type,
    p_action_details,
    p_target_user_id,
    p_roster_id,
    p_season_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_wish_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_action_details JSONB;
  v_target_user_id UUID;
  v_roster_id UUID;
  v_guild_id UUID;
  v_actor_user_id UUID;
  v_season_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'wish_created';
    v_action_details := jsonb_build_object(
      'class_id', NEW.class_id,
      'spec_ids', NEW.spec_ids,
      'choice_index', NEW.choice_index,
      'season_id', NEW.season_id
    );
    v_target_user_id := NEW.user_id;
    v_actor_user_id := COALESCE(auth.uid(), NEW.user_id);
    v_roster_id := NEW.roster_id;
    v_guild_id := NEW.guild_id;
    v_season_id := NEW.season_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
      v_action_type := 'wish_validation';
      v_action_details := jsonb_build_object(
        'class_id', NEW.class_id,
        'spec_ids', NEW.spec_ids,
        'old_status', OLD.validation_status,
        'new_status', NEW.validation_status,
        'season_id', NEW.season_id
      );
      v_target_user_id := NEW.user_id;
      v_actor_user_id := COALESCE(NEW.validated_by, auth.uid(), NEW.user_id);
      v_roster_id := NEW.roster_id;
      v_guild_id := NEW.guild_id;
      v_season_id := NEW.season_id;
    ELSIF (
      OLD.class_id IS DISTINCT FROM NEW.class_id
      OR OLD.spec_ids IS DISTINCT FROM NEW.spec_ids
      OR OLD.comment IS DISTINCT FROM NEW.comment
      OR OLD.choice_index IS DISTINCT FROM NEW.choice_index
    ) THEN
      v_action_type := 'wish_updated';
      v_action_details := jsonb_build_object(
        'old_class_id', OLD.class_id,
        'new_class_id', NEW.class_id,
        'old_spec_ids', OLD.spec_ids,
        'new_spec_ids', NEW.spec_ids,
        'old_choice_index', OLD.choice_index,
        'new_choice_index', NEW.choice_index,
        'season_id', NEW.season_id
      );
      v_target_user_id := NEW.user_id;
      v_actor_user_id := COALESCE(auth.uid(), NEW.user_id);
      v_roster_id := NEW.roster_id;
      v_guild_id := NEW.guild_id;
      v_season_id := NEW.season_id;
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'wish_deleted';
    v_action_details := jsonb_build_object(
      'class_id', OLD.class_id,
      'spec_ids', OLD.spec_ids,
      'choice_index', OLD.choice_index,
      'season_id', OLD.season_id
    );
    v_target_user_id := OLD.user_id;
    v_actor_user_id := COALESCE(auth.uid(), OLD.user_id);
    v_roster_id := OLD.roster_id;
    v_guild_id := OLD.guild_id;
    v_season_id := OLD.season_id;
  END IF;

  PERFORM public.log_guild_activity(
    v_guild_id,
    v_actor_user_id,
    v_action_type,
    v_action_details,
    v_target_user_id,
    v_roster_id,
    v_season_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_roster_selection_activity ON public.roster_member_selection;

CREATE OR REPLACE FUNCTION public.log_roster_selection_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
  v_actor_user_id UUID;
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.selection_status IS NOT DISTINCT FROM NEW.selection_status
    AND OLD.reason_code IS NOT DISTINCT FROM NEW.reason_code
    AND OLD.comment IS NOT DISTINCT FROM NEW.comment THEN
    RETURN NEW;
  END IF;

  SELECT r.guild_id
  INTO v_guild_id
  FROM public.rosters r
  WHERE r.id = NEW.roster_id;

  IF v_guild_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_actor_user_id := COALESCE(NEW.decided_by, auth.uid());

  PERFORM public.log_guild_activity(
    v_guild_id,
    v_actor_user_id,
    'roster_selection_changed',
    jsonb_build_object(
      'old_selection_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.selection_status ELSE NULL END,
      'new_selection_status', NEW.selection_status,
      'reason_code', NEW.reason_code,
      'comment_changed', CASE WHEN TG_OP = 'UPDATE' THEN OLD.comment IS DISTINCT FROM NEW.comment ELSE NEW.comment IS NOT NULL END,
      'roster_cache_id', NEW.roster_cache_id,
      'season_id', NEW.season_id
    ),
    NEW.user_id,
    NEW.roster_id,
    NEW.season_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_roster_selection_activity
AFTER INSERT OR UPDATE ON public.roster_member_selection
FOR EACH ROW
EXECUTE FUNCTION public.log_roster_selection_activity();

DROP POLICY IF EXISTS "Members can view their own wish activity logs" ON public.guild_activity_logs;
CREATE POLICY "Members can view their own wish activity logs"
ON public.guild_activity_logs
FOR SELECT
USING (
  target_user_id = auth.uid()
  AND action_type IN ('wish_created', 'wish_updated', 'wish_deleted', 'wish_validation', 'roster_selection_changed')
);
